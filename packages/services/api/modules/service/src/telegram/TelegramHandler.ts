import * as fs from 'fs';
import * as path from 'path';
import { TelegramDAO } from './TelegramDAO.js';
import type { TelegramBot } from './TelegramBot.js';
import { TelegramNLU } from './TelegramNLU.js';
import { TelegramFSM } from './TelegramFSM.js';
import { TelegramCognitiveEngine } from './TelegramCognitiveEngine.js';
import type { CartDraft, NLUResult } from './types.js';

export interface TelegramIncomingMessage {
  chatId: number;
  userId: number;
  username?: string;
  fullName: string;
  text: string;
  messageId: number;
  contact?: {
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    userId?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class TelegramHandler {
  private nlu = new TelegramNLU();
  private fsm = new TelegramFSM();
  private cognitiveEngine = new TelegramCognitiveEngine();
  private chatLocks = new Map<number, Promise<void>>();

  constructor(
    private dao: TelegramDAO,
    private bot: TelegramBot
  ) {}

  async onMessage(msg: TelegramIncomingMessage): Promise<void> {
    const { chatId } = msg;
    // Encadenar en la cola de este chatId para evitar condiciones de carrera por ráfagas
    const prevLock = this.chatLocks.get(chatId) || Promise.resolve();
    const currentTask = prevLock
      .then(() => this.processMessage(msg))
      .catch(err => {
        console.error(`[TelegramHandler] Error procesando mensaje de [${chatId}]:`, err);
      });
    this.chatLocks.set(chatId, currentTask);
    await currentTask;
  }

  private async processMessage(msg: TelegramIncomingMessage): Promise<void> {
    const { chatId, fullName, text, messageId } = msg;
    console.log(`[TelegramHandler] 📥 [${chatId}] ${fullName}: "${text}"`);

    // 0. Feedback visual inmediato en Telegram (< 50ms)
    this.bot.sendChatAction(chatId, 'typing').catch(() => {});

    // 1. Asegurar contacto y conversación (Caché + lectura consolidada en 1 paso)
    const estadoConv = await this.dao.asegurarConversacion(chatId, fullName);
    const { conversacionId, modo } = estadoConv;

    // 2. Guardar mensaje del cliente en BD en segundo plano sin frenar el flujo
    const guardarMsgPromise = this.dao.guardarMensaje(conversacionId, 'cliente', text || (msg.contact ? `[Contacto: ${msg.contact.phoneNumber}]` : ''), messageId);

    // 2. Comandos de operador y estado
    const normText = text.toLowerCase().trim();
    const esComandoReinicio = normText === '/start' || normText.startsWith('/start') || normText === '/reiniciar' || normText === 'reiniciar' || normText === '/reset' || normText === 'reset';
    const esReinicioTotal = normText === '/reiniciar' || normText === 'reiniciar' || normText === '/reset' || normText === 'reset';
    const quiereVolverAlBot = esComandoReinicio || ['volver al bot', 'bot', 'menu', 'catalogo', 'hola', 'nuevo pedido', 'pedir', 'inicio', 'menu principal'].some(w => normText.includes(w));

    if (modo === 'humano' && !quiereVolverAlBot) {
      console.log(`[TelegramHandler] Conversación ${conversacionId} en modo humano. Bot en silencio.`);
      await guardarMsgPromise;
      return;
    }

    if (modo === 'humano' && quiereVolverAlBot) {
      await this.dao.actualizarModoAtencion(conversacionId, 'bot');
      estadoConv.modo = 'bot';
    }

    if (esComandoReinicio) {
      if (esReinicioTotal || !estadoConv.clientePerfil?.completado) {
        await this.dao.guardarEstadoConversacion(conversacionId, 'ONBOARDING_NOMBRE', null, {
          clientePerfil: null,
        });
        estadoConv.fsmState = 'ONBOARDING_NOMBRE';
        estadoConv.draft = null;
        estadoConv.clientePerfil = null;
      } else {
        await this.dao.guardarEstadoConversacion(conversacionId, 'IDLE', null, {
          clientePerfil: estadoConv.clientePerfil,
        });
        estadoConv.fsmState = 'IDLE';
        estadoConv.draft = null;
      }
    }

    // 3. Módulos activos de la organización
    const modulos = await this.dao.obtenerModulosActivos();

    // 4. Catálogo desde memoria RAM (< 1ms)
    const { catalogo, perfil } = await this.dao.obtenerCatalogoYPerfil();

    // 5. Inferencia de Intención y Entidades
    let nluResult: NLUResult | null = null;

    // 5.0 Procesamiento prioritario de ubicación GPS en tiempo real
    if (msg.location) {
      const { latitude, longitude } = msg.location;
      if (estadoConv.fsmState === 'SOLICITANDO_DIRECCION_PREVIA' || estadoConv.fsmState === 'SOLICITANDO_DIRECCION') {
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const dirStr = `Ubicación GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) - ${mapsLink}`;
        nluResult = {
          intent: 'DAR_DIRECCION',
          confidence: 1.0,
          entities: { direccion: dirStr },
          rawText: dirStr,
        };
      } else {
        const bodegas = await this.dao.obtenerBodegas();
        let textoResultado = '';
        if (bodegas.length === 0) {
          textoResultado = `📍 Recibimos tu ubicación actual (<code>${latitude.toFixed(4)}, ${longitude.toFixed(4)}</code>).\n\nEn este momento no hay tiendas o bodegas activas registradas en la organización.`;
        } else {
          const items = bodegas.map(b => {
            const badge = b.principal ? ' ⭐ (Sede Principal)' : '';
            const dirText = b.direccion ? `\n   📍 Dirección: <i>${b.direccion}</i>` : '';
            const destQuery = encodeURIComponent((b.direccion || b.nombre) + ', Colombia');
            const rutaUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${destQuery}`;
            return `• <b>${b.nombre}</b>${badge}${dirText}\n   🗺️ <a href="${rutaUrl}">Ver ruta en Google Maps</a>`;
          }).join('\n\n');

          textoResultado = `📍 <b>¡Ubicación recibida con éxito!</b>\n` +
            `<i>Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</i>\n\n` +
            `Encontramos las siguientes sucursales disponibles para ti:\n\n` +
            items +
            `\n\n──────────────────────────\n¿Deseas realizar un pedido a domicilio o para retiro en local?`;
        }

        const botones = ['Realizar pedido 🥪', 'Seguir pedido 📌', 'Menú principal 📋'];
        await this.bot.sendMessage(chatId, textoResultado, { buttons: botones });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoResultado);
        await guardarMsgPromise;
        return;
      }
    }

    if (!nluResult) {
      const enOnboarding = estadoConv.fsmState.startsWith('ONBOARDING_');
      const mencionaInventarioOAsesor = ['inventario', 'stock', 'bodega', 'alerta', 'asesor', 'humano'].some(w => normText.includes(w));

      if (enOnboarding && !mencionaInventarioOAsesor) {
        nluResult = {
          intent: esComandoReinicio ? 'REINICIAR_PEDIDO' : 'DESCONOCIDO',
          confidence: 1.0,
          entities: {},
          rawText: text,
        };
      } else {
        // Capa 1: FAST-PATH DETERMINISTA (< 1ms)
        nluResult = this.nlu.interpretarFastPath(text, catalogo, estadoConv.fsmState);

        // Capa 2: Si es lenguaje natural libre, invocar NLU semántico real con contexto multi-turno
        if (!nluResult) {
          const historialPrevio = await this.dao.obtenerHistorialReciente(conversacionId, 4);
          nluResult = await this.cognitiveEngine.extraerIntencionYEntidades({
            textoUsuario: text,
            catalogo,
            perfil,
            estadoActual: estadoConv.fsmState,
            draft: estadoConv.draft,
            historialPrevio,
            esOperador: true, // Modo desarrollo: sin obstáculo de login
            tieneInventarios: modulos.tieneInventarios,
            tienePedidos: modulos.tienePedidos,
          });

          // Capa 3: Fallback de emergencia local
          if (!nluResult) {
            nluResult = this.nlu.interpretarFallbackLocal(text, catalogo, estadoConv.fsmState);
          }
        }
      }
    }

    console.log(`[TelegramHandler] 🎯 Intent resuelto: ${nluResult.intent} (conf: ${nluResult.confidence})`);

    // 5.1 RUTAS EXCLUSIVAS DE INVENTARIO
    const esIntentInventario =
      nluResult.intent === 'CONSULTAR_STOCK_INVENTARIO' ||
      nluResult.intent === 'CONSULTAR_ALERTAS_INVENTARIO' ||
      nluResult.intent === 'CONSULTAR_RESUMEN_INVENTARIO' ||
      nluResult.intent === 'CONSULTAR_BODEGAS' ||
      nluResult.intent === 'BUSCAR_SUCURSALES_GPS' ||
      nluResult.intent === 'VER_TODAS_BODEGAS';

    if (esIntentInventario) {

      if (nluResult.intent === 'CONSULTAR_STOCK_INVENTARIO') {
        const queryTerm = nluResult.entities.articulo || text;
        const stockRes = await this.dao.consultarStockArticulo(queryTerm, nluResult.entities.bodega);

        let textoStock = '';
        if (!stockRes.encontrado || !stockRes.articulo) {
          textoStock = `🔍 No encontré ningún artículo registrado con el nombre <b>"${queryTerm}"</b> en el inventario de Necto.\n\n💡 <i>Prueba con otra palabra clave o consulta el resumen general.</i>`;
        } else {
          const art = stockRes.articulo;
          const alertaIcon = stockRes.bajoPuntoReorden ? '⚠️' : '✅';
          const alertaMsg = stockRes.bajoPuntoReorden
            ? `\n\n⚠️ <i>¡Atención! Este artículo está por debajo o igual al punto de reorden (${art.puntoReorden} ${art.unidad}).</i>`
            : '';

          let bodegasDetalle = '';
          if (stockRes.porBodega.length > 0) {
            bodegasDetalle = '\n\n<b>Distribución por Bodega:</b>\n' +
              stockRes.porBodega.map(b => `• <b>${b.bodegaNombre}</b>: <code>${b.cantidad} ${art.unidad}</code>`).join('\n');
          }

          textoStock = `📦 <b>Consulta de Stock — Necto</b>\n` +
            `──────────────────────────\n` +
            `<b>Artículo:</b> ${art.nombre}\n` +
            `<b>Categoría:</b> ${art.categoria}\n` +
            `<b>Stock Total:</b> <code>${stockRes.stockTotal} ${art.unidad}</code> ${alertaIcon}\n` +
            `<b>Punto de Reorden:</b> <code>${art.puntoReorden} ${art.unidad}</code>\n` +
            `<b>Costo Estimado:</b> <code>$${Number(art.costo).toLocaleString('es-CO')} COP</code>\n` +
            `──────────────────────────` +
            alertaMsg +
            bodegasDetalle;
        }

        const botonesSugeridos = ['Realizar pedido 🥪', 'Seguir pedido 📌', 'Menú principal 📋'];

        await this.bot.sendMessage(chatId, textoStock, { buttons: botonesSugeridos });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoStock);
        await guardarMsgPromise;
        return;
      }

      if (nluResult.intent === 'CONSULTAR_ALERTAS_INVENTARIO') {
        const alertas = await this.dao.consultarAlertasInventario();
        let textoAlertas = '';
        if (alertas.length === 0) {
          textoAlertas = `✅ <b>¡Todo en orden!</b>\n\nNo hay artículos por debajo del punto mínimo de reorden en este momento. El inventario se encuentra dentro de los niveles operativos normales.`;
        } else {
          const lista = alertas.map((a, i) =>
            `${i + 1}. <b>${a.nombre}</b> (${a.categoria})\n   • Stock: <code>${a.stockTotal} ${a.unidad}</code> / Mínimo: <code>${a.puntoReorden}</code> (Déficit: <b>${a.deficit}</b>)`
          ).join('\n\n');

          textoAlertas = `⚠️ <b>Alertas de Reorden de Inventario</b>\n` +
            `Se encontraron <b>${alertas.length}</b> artículos con existencias críticas:\n\n` +
            lista +
            `\n\n💡 <i>Se recomienda coordinar compra o reabastecimiento para estos ítems.</i>`;
        }

        const botonesSugeridos = ['Realizar pedido 🥪', 'Seguir pedido 📌', 'Menú principal 📋'];

        await this.bot.sendMessage(chatId, textoAlertas, { buttons: botonesSugeridos });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoAlertas);
        await guardarMsgPromise;
        return;
      }

      if (nluResult.intent === 'CONSULTAR_RESUMEN_INVENTARIO') {
        const resumen = await this.dao.obtenerResumenInventario();
        const bodegasNombres = resumen.bodegas.map(b => b.nombre + (b.principal ? ' ⭐' : '')).join(', ') || 'Sin bodegas';
        const valorFmt = Number(resumen.valorTotalEstimado).toLocaleString('es-CO');

        const textoResumen = `📊 <b>Balance General de Inventario — Necto</b>\n` +
          `──────────────────────────\n` +
          `• <b>Artículos Registrados:</b> <code>${resumen.totalArticulos}</code>\n` +
          `• <b>Unidades Totales en Existencia:</b> <code>${resumen.totalUnidades}</code>\n` +
          `• <b>Valorización Estimada de Stock:</b> <code>$${valorFmt} COP</code>\n` +
          `• <b>Artículos en Alerta de Reorden:</b> <code>${resumen.articulosBajoReorden}</code> ${resumen.articulosBajoReorden > 0 ? '⚠️' : '✅'}\n` +
          `• <b>Bodegas Activas:</b> ${resumen.bodegas.length}\n` +
          `  <i>${bodegasNombres}</i>\n` +
          `──────────────────────────`;

        const botonesSugeridos = ['Realizar pedido 🥪', 'Seguir pedido 📌', 'Menú principal 📋'];

        await this.bot.sendMessage(chatId, textoResumen, { buttons: botonesSugeridos });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoResumen);
        await guardarMsgPromise;
        return;
      }

      if (nluResult.intent === 'CONSULTAR_BODEGAS') {
        const textoIntro = `Vamos a buscar tus sucursales más cercanas. 🔍📍\n\n` +
          `¿Cómo deseas buscar tu sede? 👇\n\n` +
          `Puedes compartir tu <b>ubicación actual</b> desde tu celular para indicarte la ruta a la más cercana, o consultar la lista completa de tiendas.`;
        const botones = ['📍 Por ubicación actual', '🏬 Ver todas las sedes', 'Menú principal 📋'];

        await this.bot.sendMessage(chatId, textoIntro, { buttons: botones });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoIntro);
        await guardarMsgPromise;
        return;
      }

      if (nluResult.intent === 'BUSCAR_SUCURSALES_GPS') {
        const textoPedirUbicacion = `Para encontrar tu tienda más cercana, presiona el botón de abajo para <b>compartir tu ubicación actual</b> desde tu celular 📱📍👇`;
        await this.bot.sendMessage(chatId, textoPedirUbicacion, {
          requestLocationButton: '📍 Enviar mi ubicación actual',
          buttons: ['🏬 Ver todas las sedes', 'Menú principal 📋'],
        });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoPedirUbicacion);
        await guardarMsgPromise;
        return;
      }

      if (nluResult.intent === 'VER_TODAS_BODEGAS') {
        const bodegas = await this.dao.obtenerBodegas();
        let textoBodegas = '';
        if (bodegas.length === 0) {
          textoBodegas = `🏬 No hay bodegas o tiendas activas registradas en la organización.`;
        } else {
          const lista = bodegas.map(b => {
            const badge = b.principal ? ' ⭐ (Sede Principal)' : '';
            const dir = b.direccion ? `\n   📍 <i>${b.direccion}</i>` : '';
            return `• <b>${b.nombre}</b>${badge}${dir}`;
          }).join('\n\n');

          textoBodegas = `🏬 <b>Sucursales y Sedes de Atención</b>\n` +
            `──────────────────────────\n` +
            lista +
            `\n──────────────────────────`;
        }

        const botonesSugeridos = ['📍 Por ubicación actual', 'Realizar pedido 🥪', 'Menú principal 📋'];

        await this.bot.sendMessage(chatId, textoBodegas, { buttons: botonesSugeridos });
        await this.dao.guardarMensaje(conversacionId, 'asistente', textoBodegas);
        await guardarMsgPromise;
        return;
      }
    }

    // 6. Lazy Loading de Pedidos solo si la intención lo requiere
    let pedidosCliente: Array<{ id: string; numero: string; estado: string; total: number; creadoEn?: string }> = [];
    if (
      nluResult.intent === 'CONSULTA_ESTADO_PEDIDO' ||
      nluResult.intent === 'CANCELAR_PEDIDO' ||
      nluResult.intent === 'CONFIRMAR_CANCELACION_SI'
    ) {
      pedidosCliente = await this.dao.obtenerPedidosRecientes(chatId, 5);
    }
    const ultimoPedido = pedidosCliente.length > 0 ? pedidosCliente[0] : null;

    // 7. LA FSM EJECUTA LA TRANSICIÓN DE ESTADO (Autoridad Única e Inmutable)
    const transition = this.fsm.transition(
      estadoConv.fsmState,
      estadoConv.draft,
      nluResult,
      catalogo,
      perfil,
      fullName,
      ultimoPedido,
      pedidosCliente,
      estadoConv.clientePerfil
    );

    let textoFinal = transition.replyText;
    let botonesFinales = transition.buttons;
    let borradorFinal = transition.nextDraft;
    let nextState = transition.nextState;
    const removeKeyboard = Boolean(transition.removeKeyboard);
    let customReplyMarkup: any = undefined;
    const clientePerfilSiguiente = transition.clientePerfil !== undefined ? transition.clientePerfil : estadoConv.clientePerfil;
    let baseUrl = (process.env as any)['CHECKOUT_BASE_URL'] || 'http://localhost:6020';
    try {
      const linkPath = path.resolve(process.cwd(), 'scratch/link.txt');
      if (fs.existsSync(linkPath)) {
        const link = fs.readFileSync(linkPath, 'utf-8').trim();
        if (link && link.startsWith('https://')) {
          baseUrl = link;
        }
      }
    } catch {}

    // Si el usuario acaba de completar el onboarding, actualizar contacto en BD
    if (clientePerfilSiguiente?.completado && (!estadoConv.clientePerfil || !estadoConv.clientePerfil.completado)) {
      await this.dao.actualizarPerfilContacto(estadoConv.contactoId, clientePerfilSiguiente);
    }

    // 8. Efectos secundarios de negocio gobernados por la FSM:
    // A. Si la FSM ordenó crear el pedido final
    if (transition.orderCreated) {
      const lineas = transition.orderCreated.lineas || estadoConv.draft?.lineas || [];
      const modalidad = transition.orderCreated.modalidad || estadoConv.draft?.modalidad || 'retiro';
      const direccion = transition.orderCreated.direccion || estadoConv.draft?.direccion || null;

      const destinatario = transition.orderCreated.destinatario || estadoConv.draft?.destinatario || null;
      const draftParaCrear: CartDraft = {
        lineas,
        modalidad,
        direccion,
        destinatario,
        updatedAt: new Date().toISOString(),
      };

      const nombreCliente = clientePerfilSiguiente?.nombre
        ? `${clientePerfilSiguiente.nombre} ${clientePerfilSiguiente.apellido || ''}`.trim()
        : fullName;

      const pedidoCreado = await this.dao.crearPedidoFinal(chatId, nombreCliente, draftParaCrear, perfil.costoEnvio);
      const refLink = pedidoCreado.numero.toLowerCase().replace(/[^a-z0-9]/g, '');
      const totalFmt = Number(pedidoCreado.total).toLocaleString('es-CO');
      const resumenLineas = draftParaCrear.lineas
        .map(l => `• ${l.cantidad} × <b>${l.nombre}</b> — <code>$${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')} COP</code>`)
        .join('\n');
      const entregaStr = draftParaCrear.modalidad === 'domicilio'
        ? `Domicilio en <i>${draftParaCrear.direccion}</i>`
        : `Retiro en local`;
      const destinatarioStr = (draftParaCrear.destinatario && draftParaCrear.destinatario.tipo === 'tercero')
        ? `\n<b>Destinatario:</b> ${draftParaCrear.destinatario.nombre || 'Otra persona'} (Tel: ${draftParaCrear.destinatario.telefono || 'Sin especificar'}) 🎁`
        : '';

      const checkoutLink = `${baseUrl}/checkout/${pedidoCreado.numero}?cliente=${encodeURIComponent(nombreCliente)}&total=${pedidoCreado.total}&email=${encodeURIComponent(clientePerfilSiguiente?.email || '')}&chatId=${encodeURIComponent(chatId)}&modalidad=${encodeURIComponent(draftParaCrear.modalidad || 'retiro')}&direccion=${encodeURIComponent(draftParaCrear.direccion || '')}`;

      textoFinal = `<b>PEDIDO REGISTRADO CON ÉXITO</b>\n<blockquote>` +
        `<b>Orden:</b> <code>#${pedidoCreado.numero}</code>\n` +
        `<b>Cliente:</b> ${nombreCliente}\n` +
        `──────────────────────────\n` +
        `${resumenLineas}\n` +
        `──────────────────────────\n` +
        `<b>Total a pagar:</b> <code>$${totalFmt} COP</code>\n` +
        `<b>Modalidad:</b> ${entregaStr}${destinatarioStr}</blockquote>\n\n` +
        `<b>Enlace de pago seguro (GlobalPay Redeban):</b>\n${checkoutLink}\n\n` +
        `<i>Acepta Tarjeta de crédito/débito y PSE. Una vez confirmado el pago, iniciamos la preparación de tu orden.</i>`;

      botonesFinales = ['Estado de mis pedidos', 'Hacer otro pedido', 'Hablar con asesor'];
      borradorFinal = null;
      nextState = 'IDLE';

      if (baseUrl.startsWith('https://')) {
        customReplyMarkup = {
          inline_keyboard: [
            [{ text: '💳 Pagar con GlobalPay Redeban', url: checkoutLink }],
          ],
        };
      }
    }

    // B. Si la FSM canceló un pedido ya existente
    if (transition.orderCancelledId) {
      await this.dao.cancelarPedido(transition.orderCancelledId);
    }

    // C. Si la FSM pasó a modo humano
    if (nextState === 'MODO_HUMANO') {
      await this.dao.actualizarModoAtencion(conversacionId, 'humano');
    }

    // D. Enlace de catálogo o pago seguro si aplica (sin sobreescribir el teclado de opciones)
    // SOLO cuando el usuario está explícitamente en el catálogo activo (NUNCA en el menú principal)
    if (nextState === 'CATALOGO_ACTIVO') {
      const nombreCliente = clientePerfilSiguiente?.nombre || estadoConv.clientePerfil?.nombre || fullName || 'Cliente';
      if (baseUrl.startsWith('https://')) {
        const menuUrl = `${baseUrl}/catalogo-clientes?cliente=${encodeURIComponent(nombreCliente)}&sede=${encodeURIComponent('Sede Principal')}&direccion=${encodeURIComponent(borradorFinal?.direccion || 'Medellín')}&chatId=${encodeURIComponent(chatId)}&modalidad=${encodeURIComponent(borradorFinal?.modalidad || 'retiro')}`;
        textoFinal += `\n\n🔗 <b>Catálogo interactivo:</b> <a href="${menuUrl}">Abrir catálogo en línea</a>`;
      }
    } else if (nluResult.intent === 'CONSULTA_ESTADO_PEDIDO') {
      const pedidoPendiente = pedidosCliente.find(p => p.estado === 'nuevo' || p.estado === 'pendiente');
      if (pedidoPendiente && baseUrl.startsWith('https://')) {
        const nombreCliente = clientePerfilSiguiente?.nombre || estadoConv.clientePerfil?.nombre || fullName || 'Cliente';
        const payUrl = `${baseUrl}/checkout/${pedidoPendiente.numero}?cliente=${encodeURIComponent(nombreCliente)}&total=${pedidoPendiente.total}&chatId=${encodeURIComponent(chatId)}`;
        textoFinal += `\n\n💳 <b>Pagar orden #${pedidoPendiente.numero}:</b> <a href="${payUrl}">Pagar ahora en línea</a>`;
      }
    }

    // 9. Persistir estado y enviar respuesta a Telegram de forma concurrente
    const [envio] = await Promise.all([
      this.bot.sendMessage(chatId, textoFinal, { buttons: botonesFinales, removeKeyboard, customReplyMarkup }),
      this.dao.guardarEstadoConversacion(conversacionId, nextState, borradorFinal, {
        ultimoPedidoId: ultimoPedido?.id || null,
        clientePerfil: clientePerfilSiguiente || null,
      }),
      guardarMsgPromise,
    ]);

    if (!envio.ok) {
      console.error(`[TelegramHandler] ❌ Error enviando mensaje a [${chatId}]:`, envio.error);
    } else {
      console.log(`[TelegramHandler] 📤 Respuesta enviada con éxito a [${chatId}] (ID: ${envio.messageId})`);
    }

    // 10. Guardar mensaje saliente del asistente en segundo plano
    if (envio.messageId) {
      this.dao.guardarMensaje(conversacionId, 'asistente', textoFinal, envio.messageId).catch(() => {});
    }
  }
}
