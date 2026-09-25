import type {
  FSMState,
  CartDraft,
  CartLine,
  CatalogItem,
  BusinessProfile,
  NLUResult,
  FSMTransitionResult,
} from './types.js';

function normStr(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export class TelegramFSM {
  transition(
    currentState: FSMState,
    incomingDraft: CartDraft | null,
    nlu: NLUResult,
    catalogo: CatalogItem[],
    perfil: BusinessProfile,
    clienteNombre: string,
    ultimoPedido?: { id: string; numero: string; estado: string; total: number } | null,
    pedidosCliente?: Array<{ id: string; numero: string; estado: string; total: number; creadoEn?: string }>
  ): FSMTransitionResult {
    // Clon profundo para garantizar inmutabilidad
    const draft: CartDraft | null = incomingDraft ? structuredClone(incomingDraft) : null;
    const nombreRef = clienteNombre ? clienteNombre.split(' ')[0] : 'amigo/a';

    // ─────────────────────────────────────────────────────────────
    // REGLA: Bloqueo de Fuera de Dominio
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'FUERA_DE_DOMINIO') {
      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: 'Soy el asistente de pedidos de Necto. Puedo colaborarte consultando productos, precios o gestionando tu pedido. ¿Qué deseas consultar?',
        buttons: ['Ver menú', 'Estado de mis pedidos', 'Hablar con asesor'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Consulta factual de producto y precio
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'CONSULTAR_PRODUCTO') {
      const q = normStr(nlu.entities.nombreItem || '');
      const item = catalogo.find(c => normStr(c.nombre).includes(q) || q.includes(normStr(c.nombre)));
      if (item) {
        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `<b>INFORMACIÓN DE PRODUCTO</b>\n<blockquote><b>${item.nombre}</b>\nPrecio: <code>$${item.precio.toLocaleString('es-CO')} COP</code></blockquote>\n¿Deseas agregarlo a tu pedido?`,
          buttons: [`Ordenar ${item.nombre.slice(0, 16)}`, 'Ver menú'],
        };
      }
      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: `En este momento no encuentro "${nlu.entities.nombreItem || ''}" en el catálogo disponible.\n\n¿Deseas ver las opciones disponibles?`,
        buttons: ['Ver menú', 'Hablar con asesor'],
      };
    }

    if (nlu.intent === 'CONSULTAR_PRECIO') {
      const q = normStr(nlu.entities.nombreItem || '');
      const item = catalogo.find(c => normStr(c.nombre).includes(q) || q.includes(normStr(c.nombre)));
      if (item) {
        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `<b>PRECIO DEL PRODUCTO</b>\n<blockquote><b>${item.nombre}</b>: <code>$${item.precio.toLocaleString('es-CO')} COP</code></blockquote>`,
          buttons: [`Ordenar ${item.nombre.slice(0, 16)}`, 'Ver menú'],
        };
      }
      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: `No encuentro ese producto en el catálogo disponible para consultar su precio.\n\n¿Deseas revisar el menú completo?`,
        buttons: ['Ver menú', 'Hablar con asesor'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // VER CATÁLOGO (Sin borrar el carrito si ya existe uno activo)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'VER_CATALOGO') {
      const catTexto = this.formatearCatalogo(catalogo, perfil.etiquetaCatalogo);
      const botonesCat = catalogo.slice(0, 4).map((c, idx) => `${idx + 1}. ${c.nombre.slice(0, 18)}`);

      if (draft && draft.lineas.length > 0) {
        const total = this.calcularTotal(draft);
        return {
          nextState: 'CARRITO_EN_CONSTRUCCION',
          nextDraft: draft,
          replyText: `${catTexto}\n\n<blockquote><b>Pedido en curso:</b> ${draft.lineas.length} producto(s) — Subtotal: <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n\nPuedes seleccionar otro producto o presionar <b>Proceder a la entrega</b> cuando termines.`,
          buttons: ['Proceder a la entrega', ...botonesCat.slice(0, 2)],
        };
      }

      return {
        nextState: 'CATALOGO_ACTIVO',
        nextDraft: null,
        replyText: `${catTexto}\n\nPuedes seleccionar un producto de la lista o indicarme qué deseas ordenar.`,
        buttons: botonesCat,
      };
    }

    if (nlu.intent === 'DUDA_PROCESO_PEDIDO') {
      if (currentState === 'SOLICITANDO_ENTREGA' && draft) {
        const subtotal = this.calcularTotal(draft);
        return {
          nextState: 'SOLICITANDO_ENTREGA',
          nextDraft: draft,
          replyText: `<b>OPCIONES DE ENTREGA</b>\n<blockquote>1. <b>Envío a domicilio:</b> Te lo llevamos a tu dirección (Tarifa: <code>$${Number(perfil.costoEnvio).toLocaleString('es-CO')} COP</code>).\n2. <b>Retiro en local:</b> Puedes recoger tu orden directamente sin costo adicional.</blockquote>\n\nSubtotal actual: <code>$${subtotal.toLocaleString('es-CO')} COP</code>.\n¿Cuál de las dos opciones prefieres?`,
          buttons: ['Envío a domicilio', 'Retiro en local'],
        };
      }

      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: 'Puedes agregar todos los productos que desees a tu pedido. ¿Qué más te gustaría ordenar?',
        buttons: ['Ver menú', 'Proceder a la entrega'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // PROCEDER A LA ENTREGA (Fin de selección de productos)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'PROCEDER_ENTREGA') {
      if (!draft || draft.lineas.length === 0) {
        return {
          nextState: 'IDLE',
          nextDraft: null,
          replyText: 'No tienes productos agregados a tu pedido actualmente.\n\n¿Deseas ver nuestro catálogo para ordenar?',
          buttons: ['Ver menú', 'Hablar con asesor'],
        };
      }

      if (!draft.modalidad) {
        const subtotal = this.calcularTotal(draft);
        return {
          nextState: 'SOLICITANDO_ENTREGA',
          nextDraft: draft,
          replyText: `<b>MÉTODO DE ENTREGA</b>\n<blockquote>Subtotal acumulado: <code>$${subtotal.toLocaleString('es-CO')} COP</code></blockquote>\n¿Cómo prefieres recibir tu entrega?`,
          buttons: ['Envío a domicilio', 'Retiro en local'],
        };
      }

      if (draft.modalidad === 'domicilio' && !draft.direccion) {
        return {
          nextState: 'SOLICITANDO_DIRECCION',
          nextDraft: draft,
          replyText: 'Por favor compártenos tu dirección completa de entrega en Colombia (calle, número y barrio):',
          buttons: [],
          removeKeyboard: true,
        };
      }

      const subtotal = this.calcularTotal(draft);
      const costoEnvio = draft.modalidad === 'domicilio' ? perfil.costoEnvio : 0;
      const total = subtotal + costoEnvio;
      const entregaStr = draft.modalidad === 'domicilio'
        ? `Domicilio en <i>${draft.direccion}</i>`
        : `Retiro en local`;

      return {
        nextState: 'CONFIRMANDO_PEDIDO',
        nextDraft: draft,
        replyText: `<b>RESUMEN DEL PEDIDO</b>\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code>\n${costoEnvio > 0 ? `<b>Envío:</b> <code>$${costoEnvio.toLocaleString('es-CO')} COP</code>\n` : ''}<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n<b>Entrega:</b> ${entregaStr}</blockquote>\n¿Deseas confirmar tu orden para generar el enlace de pago seguro?`,
        buttons: ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Solicitud explícita de agente humano
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'SOLICITAR_HUMANO') {
      return {
        nextState: 'MODO_HUMANO',
        nextDraft: draft,
        replyText: `Te comunico de inmediato con uno de nuestros asesores para que te atienda personalmente. Tu conversación y pedido quedan registrados para el equipo. En breve te responderán por este medio.`,
        buttons: [],
        removeKeyboard: true,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Reiniciar pedido (Nueva orden sin confundir al usuario)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'REINICIAR_PEDIDO') {
      const catTexto = this.formatearCatalogo(catalogo, perfil.etiquetaCatalogo);
      const botonesCat = catalogo.slice(0, 4).map((c, idx) => `${idx + 1}. ${c.nombre.slice(0, 18)}`);

      return {
        nextState: 'CATALOGO_ACTIVO',
        nextDraft: null,
        replyText: `Iniciamos una nueva orden. (Tus pedidos confirmados anteriores siguen guardados y en proceso).\n\n${catTexto}\nPuedes seleccionar un producto o decirme qué deseas pedir.`,
        buttons: botonesCat,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Consultas laterales: Costo de envío y Horario
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'CONSULTA_COSTO_ENVIO') {
      const costoEnvioFmt = Number(perfil.costoEnvio).toLocaleString('es-CO');
      let resumenActual = '';
      if (draft && draft.lineas.length > 0) {
        const total = this.calcularTotal(draft);
        resumenActual = `\n\nTu pedido actual tiene un valor de <b>$${total.toLocaleString('es-CO')} COP</b> (${draft.lineas.map(l => `${l.cantidad} × ${l.nombre}`).join(', ')}).\n¿Cómo deseas recibirlo?`;
      } else {
        resumenActual = `\n\nPuedes indicarme qué deseas ordenar cuando estés listo.`;
      }

      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: `<b>TARIFA DE ENVÍO</b>\n<blockquote>El servicio a domicilio en la zona tiene un costo fijo de <code>$${costoEnvioFmt} COP</code>.</blockquote>${resumenActual}`,
        buttons: draft && draft.lineas.length > 0 ? ['Envío a domicilio', 'Retiro en local'] : ['Ver menú', 'Hablar con asesor'],
      };
    }

    if (nlu.intent === 'CONSULTA_HORARIO') {
      let resumenActual = '';
      if (draft && draft.lineas.length > 0) {
        const total = this.calcularTotal(draft);
        resumenActual = `\n\nTu pedido sigue guardado por <b>$${total.toLocaleString('es-CO')} COP</b>.\n¿Deseas entrega a domicilio o retiro en el local?`;
      } else {
        resumenActual = `\n\n¿En qué podemos colaborar con tu orden?`;
      }

      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: `<b>HORARIO DE ATENCIÓN</b>\n<blockquote>${perfil.horarioAtencion}</blockquote>${resumenActual}`,
        buttons: draft && draft.lineas.length > 0 ? ['Envío a domicilio', 'Retiro en local'] : ['Ver menú', 'Hablar con asesor'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // CONSULTA ESTADO DE PEDIDOS (Muestra todos los pedidos recientes)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'CONSULTA_ESTADO_PEDIDO') {
      const listaPedidos = pedidosCliente && pedidosCliente.length > 0
        ? pedidosCliente
        : (ultimoPedido ? [ultimoPedido] : []);

      if (listaPedidos.length > 0) {
        const resumen = listaPedidos.map(p => {
          let estadoDesc = p.estado;
          if (p.estado === 'nuevo' || p.estado === 'pendiente') estadoDesc = `${p.estado} (pendiente de pago)`;
          return `• <b>Orden #${p.numero}</b> — <code>$${Number(p.total).toLocaleString('es-CO')} COP</code>\n  Estado: <i>${estadoDesc}</i>`;
        }).join('\n\n');

        const pedidosCancelables = listaPedidos.filter(p => p.estado === 'nuevo' || p.estado === 'pendiente');
        let cancelButtons: string[] = [];
        if (pedidosCancelables.length === 1) {
          cancelButtons = [`Cancelar orden #${pedidosCancelables[0].numero}`];
        } else if (pedidosCancelables.length > 1) {
          cancelButtons = ['Cancelar orden'];
        }

        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `<b>TUS PEDIDOS REGISTRADOS</b>\n<blockquote>${resumen}</blockquote>\n¿Deseas realizar un nuevo pedido, cancelar alguna orden o consultar algo adicional?`,
          buttons: ['Hacer otro pedido', ...cancelButtons, 'Hablar con asesor'],
        };
      }
      return {
        nextState: currentState,
        nextDraft: draft,
        replyText: `No encontramos pedidos registrados asociados a tu número en este momento.\n\n¿Deseas ver nuestro catálogo para ordenar?`,
        buttons: ['Ver menú', 'Hablar con asesor'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Retoma de carrito tras abandono
    // ─────────────────────────────────────────────────────────────
    if (currentState === 'CONFIRMANDO_RETOMA') {
      if (nlu.intent === 'CONTINUAR_RETOMA' && draft) {
        const total = this.calcularTotal(draft);
        return {
          nextState: 'SOLICITANDO_ENTREGA',
          nextDraft: draft,
          replyText: `<b>RETOMANDO TU PEDIDO</b>\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Total:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n¿Cómo prefieres recibir tu entrega?`,
          buttons: ['Envío a domicilio', 'Retiro en local'],
        };
      }
      return this.mostrarCatalogoInicial(catalogo, perfil, nombreRef);
    }

    // ─────────────────────────────────────────────────────────────
    // Cancelación de pedidos (Inmediata si aún no está en preparación)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'CANCELAR_PEDIDO' || nlu.intent === 'CONFIRMAR_CANCELACION_SI') {
      const listaPedidos = pedidosCliente && pedidosCliente.length > 0
        ? pedidosCliente
        : (ultimoPedido ? [ultimoPedido] : []);

      const pedidosCancelables = listaPedidos.filter(p => p.estado === 'nuevo' || p.estado === 'pendiente');

      // 1. Detectar si el usuario especificó un número de pedido en la entidad o en el texto
      const rawText = nlu.rawText || '';
      const numBuscado = nlu.entities.numeroPedido || rawText.match(/(?:#?WEB-|\b)(\d{2,4})\b/i)?.[1];

      let pedidoObjetivo: typeof listaPedidos[0] | null = null;

      if (numBuscado) {
        pedidoObjetivo = listaPedidos.find(p => p.numero.toLowerCase().includes(numBuscado.toLowerCase()) || p.id.includes(numBuscado)) || null;
      }

      // 2. Si no especificó número pero dijo "el anterior" o "el otro", buscar el pedido cancelable
      if (!pedidoObjetivo && (rawText.toLowerCase().includes('anterior') || rawText.toLowerCase().includes('el otro') || rawText.toLowerCase().includes('primero'))) {
        pedidoObjetivo = pedidosCancelables[0] || (listaPedidos.length > 1 ? listaPedidos[1] : null);
      }

      // 3. Si sigue sin identificarse y solo hay UN pedido cancelable
      if (!pedidoObjetivo && pedidosCancelables.length === 1) {
        pedidoObjetivo = pedidosCancelables[0];
      }

      // 4. Si hay múltiples pedidos cancelables y no se especificó cuál
      if (!pedidoObjetivo && pedidosCancelables.length > 1) {
        const botonesCancel = pedidosCancelables.map(p => `Cancelar orden #${p.numero}`);
        const items = pedidosCancelables.map(p => `• <b>Orden #${p.numero}</b> — <code>$${Number(p.total).toLocaleString('es-CO')} COP</code>`).join('\n');
        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `<b>CANCELACIÓN DE PEDIDO</b>\n<blockquote>${items}</blockquote>\nTienes varias órdenes pendientes. ¿Cuál de ellas deseas cancelar?`,
          buttons: [...botonesCancel, 'Mantener pedidos'],
        };
      }

      // 5. Si identificamos un pedido objetivo
      if (pedidoObjetivo) {
        if (pedidoObjetivo.estado === 'nuevo' || pedidoObjetivo.estado === 'pendiente') {
          return {
            nextState: 'IDLE',
            nextDraft: null,
            orderCancelledId: pedidoObjetivo.id,
            replyText: `<b>ORDEN CANCELADA</b>\n<blockquote>Tu pedido <b>#${pedidoObjetivo.numero}</b> ha sido cancelado con éxito en el sistema.</blockquote>\nCuando desees realizar un nuevo pedido, con gusto te atenderemos.`,
            buttons: ['Hacer pedido', 'Ver menú', 'Hablar con asesor'],
          };
        } else if (pedidoObjetivo.estado === 'en_preparacion' || pedidoObjetivo.estado === 'en_camino' || pedidoObjetivo.estado === 'listo') {
          return {
            nextState: 'MODO_HUMANO',
            nextDraft: draft,
            replyText: `Tu pedido <b>#${pedidoObjetivo.numero}</b> ya se encuentra en estado <b>${pedidoObjetivo.estado}</b>, por lo que no es posible cancelarlo de forma automática.\n\nTe comunico de inmediato con un asesor del local para que te colabore personalmente.`,
            buttons: [],
            removeKeyboard: true,
          };
        } else if (pedidoObjetivo.estado === 'cancelado') {
          return {
            nextState: currentState,
            nextDraft: draft,
            replyText: `El pedido <b>#${pedidoObjetivo.numero}</b> ya se encuentra cancelado en el sistema.\n\n¿Deseas realizar un nuevo pedido o consultar algo adicional?`,
            buttons: ['Hacer otro pedido', 'Ver menú', 'Hablar con asesor'],
          };
        }
      }

      // 6. Si no hay pedidos en BD o no son cancelables, pero hay un borrador en curso
      if (draft && draft.lineas.length > 0) {
        return {
          nextState: 'IDLE',
          nextDraft: null,
          replyText: `Tu orden en curso ha sido cancelada. Cuando desees empezar de nuevo, solo escribe un mensaje.`,
          buttons: ['Ver menú', 'Hablar con asesor'],
        };
      }

      return {
        nextState: 'IDLE',
        nextDraft: null,
        replyText: `No tienes ningún pedido activo pendiente de cancelación en este momento.\n\n¿Deseas revisar nuestro catálogo para ordenar?`,
        buttons: ['Ver menú', 'Hablar con asesor'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Corrección de cantidad
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'MODIFICAR_CANTIDAD' && draft && draft.lineas.length > 0) {
      const nuevaCantidad = nlu.entities.cantidad || 1;
      const ultimaLinea = draft.lineas[draft.lineas.length - 1];
      ultimaLinea.cantidad = nuevaCantidad;

      const total = this.calcularTotal(draft);
      const siguienteEstado = draft.modalidad ? 'CONFIRMANDO_PEDIDO' : 'SOLICITANDO_ENTREGA';

      return {
        nextState: siguienteEstado,
        nextDraft: draft,
        replyText: `<b>CANTIDAD ACTUALIZADA</b>\n<blockquote>${nuevaCantidad}x ${ultimaLinea.nombre}\n<b>Nuevo total:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n${draft.modalidad ? '¿Confirmas tu pedido modificado?' : '¿Deseas recibirlo a domicilio o prefieres retirarlo en local?'}`,
        buttons: draft.modalidad ? ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'] : ['Envío a domicilio', 'Retiro en local'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Eliminar producto
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'ELIMINAR_ITEM' && draft && draft.lineas.length > 0) {
      const qElim = normStr(nlu.entities.nombreItem || '');
      const lineasFiltradas = draft.lineas.filter(l => {
        const lNorm = normStr(l.nombre);
        const matchDirecto = lNorm.includes(qElim) || qElim.includes(lNorm);
        const matchPalabras = qElim.split(' ').some(w => w.length > 2 && lNorm.includes(w));
        return !matchDirecto && !matchPalabras;
      });

      if (lineasFiltradas.length === 0) {
        return {
          nextState: 'IDLE',
          nextDraft: null,
          replyText: `El producto fue retirado y tu pedido ha quedado vacío.\n\nPuedes consultar el catálogo o indicarme qué deseas ordenar.`,
          buttons: ['Ver menú', 'Hablar con asesor'],
        };
      }

      draft.lineas = lineasFiltradas;
      const total = this.calcularTotal(draft);
      return {
        nextState: 'CARRITO_EN_CONSTRUCCION',
        nextDraft: draft,
        replyText: `<b>PRODUCTO RETIRADO</b>\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Subtotal:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n¿Deseas agregar algo más o proceder con la entrega?`,
        buttons: ['Proceder a la entrega', 'Agregar más productos', 'Cancelar orden'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Sustitución de producto
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'SUSTITUIR_ITEM' && draft && draft.lineas.length > 0) {
      const itemQuitar = normStr(nlu.entities.reemplazarItem || '');
      const itemAgregar = normStr(nlu.entities.nuevoItem || '');

      const nuevoEncontrado = catalogo.find(c => {
        const cNorm = normStr(c.nombre);
        return cNorm.includes(itemAgregar) || itemAgregar.includes(cNorm);
      });

      if (!nuevoEncontrado) {
        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `No encontramos "${nlu.entities.nuevoItem}" en nuestro catálogo de productos disponibles.\n\nConservas tu pedido actual intacto:\n<blockquote>${this.formatearLineas(draft)}</blockquote>\n¿Deseas elegir otra opción disponible?`,
          buttons: ['Ver menú', 'Proceder a la entrega'],
        };
      }

      // Quitar ítem viejo usando matching flexible
      draft.lineas = draft.lineas.filter(l => {
        const lNorm = normStr(l.nombre);
        const matchDirecto = lNorm.includes(itemQuitar) || itemQuitar.includes(lNorm);
        const matchPalabras = itemQuitar.split(' ').some(w => w.length > 2 && lNorm.includes(w));
        return !matchDirecto && !matchPalabras;
      });

      draft.lineas.push({
        productId: nuevoEncontrado.id,
        nombre: nuevoEncontrado.nombre,
        precioUnitario: nuevoEncontrado.precio,
        cantidad: 1,
      });

      const total = this.calcularTotal(draft);
      return {
        nextState: 'SOLICITANDO_ENTREGA',
        nextDraft: draft,
        replyText: `<b>PRODUCTO ACTUALIZADO</b>\n<blockquote>Se agregó: ${nuevoEncontrado.nombre} (<code>$${nuevoEncontrado.precio.toLocaleString('es-CO')} COP</code>)\n\n<b>Pedido actual:</b>\n${this.formatearLineas(draft)}\n──────────────────────────\n<b>Total:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n¿Cómo prefieres recibir tu pedido?`,
        buttons: ['Envío a domicilio', 'Retiro en local'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Selección por Ordinal
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'SELECCION_POR_ORDINAL' && nlu.entities.ordinalIndex) {
      const idx = nlu.entities.ordinalIndex - 1;
      if (idx >= 0 && idx < catalogo.length) {
        const itemSeleccionado = catalogo[idx];
        const activeDraft: CartDraft = draft || { lineas: [], modalidad: null, direccion: null, updatedAt: new Date().toISOString() };

        const existente = activeDraft.lineas.find(x => x.productId === itemSeleccionado.id);
        if (existente) {
          existente.cantidad += 1;
        } else {
          activeDraft.lineas.push({
            productId: itemSeleccionado.id,
            nombre: itemSeleccionado.nombre,
            precioUnitario: itemSeleccionado.precio,
            cantidad: 1,
          });
        }

        const total = this.calcularTotal(activeDraft);
        return {
          nextState: 'CARRITO_EN_CONSTRUCCION',
          nextDraft: activeDraft,
          replyText: `<b>PRODUCTO AGREGADO</b>\n<blockquote>1x ${itemSeleccionado.nombre} — <code>$${itemSeleccionado.precio.toLocaleString('es-CO')} COP</code>\n\n<b>Subtotal acumulado:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n¿Deseas agregar algo más o proceder con la entrega?`,
          buttons: ['Agregar más productos', 'Proceder a la entrega'],
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // AGREGAR ÍTEMS AL CARRITO
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'AGREGAR_ITEMS' && nlu.itemsParaAgregar && nlu.itemsParaAgregar.length > 0) {
      const lineasNuevas: CartLine[] = [];
      const noEncontrados: string[] = [];
      let mensajeStockExcedido: string | null = null;

      for (const req of nlu.itemsParaAgregar) {
        // Resolver pronombres o anáforas de repetición (ej. "otra", "otro", "lo mismo")
        if (/^(?:otra|otro|lo mismo|uno mas|una mas|otra mas|otro mas)$/i.test(req.query.trim()) && draft && draft.lineas.length > 0) {
          const ultimaLinea = draft.lineas[draft.lineas.length - 1];
          req.query = ultimaLinea.nombre;
        }

        // Limpiar frases de personalización (ej. "sin cebolla", "con salsa") para emparejar con el producto base
        const coreQuery = req.query.replace(/\s+(?:sin|con\s+extra|sin\s+salsas?|sin\s+cebolla|sin\s+tomate|con\s+todo)\b.*$/i, '').trim();
        const qNorm = normStr(coreQuery || req.query);
        const qWords = qNorm.split(/\s+/).map(w => w.replace(/s$/i, '')).filter(w => w.length >= 3);

        const matched = catalogo.find(c => {
          const cNorm = normStr(c.nombre);
          if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) return true;
          const cWords = cNorm.split(/\s+/).map(w => w.replace(/s$/i, ''));
          return qWords.length > 0 && qWords.some(qw => qw.length >= 3 && cWords.some(cw => cw.includes(qw) || qw.includes(cw)));
        });

        if (!matched) {
          noEncontrados.push(req.query);
        } else {
          if (matched.stock < req.cantidad) {
            mensajeStockExcedido = `Solo disponemos de <b>${matched.stock} unidades</b> de <b>${matched.nombre}</b> (solicitaste ${req.cantidad}).\n\n¿Deseas llevar las ${matched.stock} unidades disponibles o prefieres elegir otro producto?`;
            break;
          }

          lineasNuevas.push({
            productId: matched.id,
            nombre: matched.nombre,
            precioUnitario: matched.precio,
            cantidad: req.cantidad,
          });
        }
      }

      if (mensajeStockExcedido) {
        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: mensajeStockExcedido,
          buttons: ['Llevar disponibles', 'Ver menú', 'Cancelar orden'],
        };
      }

      if (noEncontrados.length > 0 && lineasNuevas.length === 0) {
        const listaOpciones = catalogo.map(c => `• <b>${c.nombre}</b> — <code>$${c.precio.toLocaleString('es-CO')} COP</code>`).join('\n');
        const estadoPrevioTexto = draft && draft.lineas.length > 0
          ? `\n\nConservas tu pedido previo:\n<blockquote>${this.formatearLineas(draft)}</blockquote>`
          : '';

        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `Por el momento no disponemos de "${noEncontrados.join(', ')}" en nuestro catálogo.\n\nOpciones disponibles:\n<blockquote>${listaOpciones}</blockquote>${estadoPrevioTexto}\n¿Deseas añadir alguna de las opciones disponibles?`,
          buttons: catalogo.slice(0, 3).map(c => c.nombre.slice(0, 18)),
        };
      }

      const activeDraft: CartDraft = draft || { lineas: [], modalidad: null, direccion: null, updatedAt: new Date().toISOString() };
      for (const l of lineasNuevas) {
        const existente = activeDraft.lineas.find(x => x.productId === l.productId);
        if (existente) {
          existente.cantidad += l.cantidad;
        } else {
          activeDraft.lineas.push(l);
        }
      }

      // Slot-filling: Si vinieron modalidad y dirección juntas en el mismo mensaje
      if (nlu.entities.modalidad === 'domicilio' && nlu.entities.direccion) {
        activeDraft.modalidad = 'domicilio';
        activeDraft.direccion = nlu.entities.direccion;
        const subtotal = this.calcularTotal(activeDraft);
        const costoEnvio = perfil.costoEnvio;
        const total = subtotal + costoEnvio;

        return {
          nextState: 'CONFIRMANDO_PEDIDO',
          nextDraft: activeDraft,
          replyText: `<b>RESUMEN DEL PEDIDO</b>\n<blockquote>${this.formatearLineas(activeDraft)}\n──────────────────────────\n<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code>\n<b>Envío:</b> <code>$${costoEnvio.toLocaleString('es-CO')} COP</code>\n<b>Total:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n<b>Entrega:</b> Domicilio en <i>${activeDraft.direccion}</i></blockquote>\n¿Confirmas tu orden con estos datos?`,
          buttons: ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'],
        };
      }

      // Slot-filling: Si indicó retiro directamente al pedir
      if (nlu.entities.modalidad === 'retiro') {
        activeDraft.modalidad = 'retiro';
        const total = this.calcularTotal(activeDraft);
        return {
          nextState: 'CONFIRMANDO_PEDIDO',
          nextDraft: activeDraft,
          replyText: `<b>RESUMEN DEL PEDIDO</b>\n<blockquote>${this.formatearLineas(activeDraft)}\n──────────────────────────\n<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n<b>Entrega:</b> Retiro en local</blockquote>\n¿Confirmas tu orden para generar el enlace de pago seguro?`,
          buttons: ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'],
        };
      }

      // Slot-filling: Si indicó domicilio pero falta dirección
      if (nlu.entities.modalidad === 'domicilio' && !nlu.entities.direccion) {
        activeDraft.modalidad = 'domicilio';
        const subtotal = this.calcularTotal(activeDraft);
        return {
          nextState: 'SOLICITANDO_DIRECCION',
          nextDraft: activeDraft,
          replyText: `<b>PRODUCTO AGREGADO</b>\n<blockquote>${this.formatearLineas(activeDraft)}\n──────────────────────────\n<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code></blockquote>\nPara coordinar tu entrega a domicilio, indícanos por favor tu <b>dirección completa</b> (calle, número y barrio):`,
          buttons: ['Hablar con asesor', 'Cancelar orden'],
          removeKeyboard: true,
        };
      }

      const total = this.calcularTotal(activeDraft);
      const avisoNoEncontrados = noEncontrados.length > 0
        ? `\n\n<i>(Nota: no se agregó "${noEncontrados.join(', ')}" por no figurar en el menú).</i>`
        : '';

      return {
        nextState: 'CARRITO_EN_CONSTRUCCION',
        nextDraft: activeDraft,
        replyText: `<b>PRODUCTO AGREGADO</b>\n<blockquote>${this.formatearLineas(activeDraft)}\n──────────────────────────\n<b>Subtotal acumulado:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>${avisoNoEncontrados}\n¿Deseas agregar algo más o proceder con la entrega?`,
        buttons: ['Agregar más productos', 'Proceder a la entrega'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // MODALIDAD DE ENTREGA
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'ELEGIR_MODALIDAD' && draft && draft.lineas.length > 0) {
      draft.modalidad = nlu.entities.modalidad || 'domicilio';

      if (draft.modalidad === 'retiro') {
        const total = this.calcularTotal(draft);
        return {
          nextState: 'CONFIRMANDO_PEDIDO',
          nextDraft: draft,
          replyText: `<b>RESUMEN DEL PEDIDO</b>\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n<b>Entrega:</b> Retiro en local</blockquote>\n¿Confirmas tu orden para generar el enlace de pago seguro?`,
          buttons: ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'],
        };
      } else {
        return {
          nextState: 'SOLICITANDO_DIRECCION',
          nextDraft: draft,
          replyText: `Por favor indícanos tu <b>dirección completa de entrega</b> en Colombia (calle, número, apartamento o referencias):`,
          buttons: [],
          removeKeyboard: true,
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // DIRECCIÓN DE ENTREGA
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'DAR_DIRECCION' && draft && draft.lineas.length > 0) {
      draft.direccion = nlu.entities.direccion || nlu.rawText;
      draft.modalidad = 'domicilio';
      const subtotal = this.calcularTotal(draft);
      const costoEnvio = perfil.costoEnvio;
      const total = subtotal + costoEnvio;

      return {
        nextState: 'CONFIRMANDO_PEDIDO',
        nextDraft: draft,
        replyText: `<b>RESUMEN DEL PEDIDO</b>\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code>\n<b>Envío:</b> <code>$${costoEnvio.toLocaleString('es-CO')} COP</code>\n<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n<b>Entrega:</b> Domicilio en <i>${draft.direccion}</i></blockquote>\n¿Confirmas tu orden para generar el enlace de pago seguro?`,
        buttons: ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden'],
      };
    }

    // ─────────────────────────────────────────────────────────────
    // CONFIRMAR PEDIDO (Creación en base de datos)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'CONFIRMAR_PEDIDO' && draft && draft.lineas.length > 0) {
      // Si faltan datos clave, redirigir formalmente sin recursión arbitraria
      if (!draft.modalidad) {
        const subtotal = this.calcularTotal(draft);
        return {
          nextState: 'SOLICITANDO_ENTREGA',
          nextDraft: draft,
          replyText: `<b>MÉTODO DE ENTREGA</b>\n<blockquote>Subtotal acumulado: <code>$${subtotal.toLocaleString('es-CO')} COP</code></blockquote>\n¿Cómo prefieres recibir tu pedido?`,
          buttons: ['Envío a domicilio', 'Retiro en local'],
        };
      }

      if (draft.modalidad === 'domicilio' && !draft.direccion) {
        return {
          nextState: 'SOLICITANDO_DIRECCION',
          nextDraft: draft,
          replyText: 'Para poder confirmar tu pedido a domicilio, indícanos por favor tu dirección completa de entrega:',
          buttons: [],
          removeKeyboard: true,
        };
      }

      const subtotal = this.calcularTotal(draft);
      const costoEnvio = draft.modalidad === 'domicilio' ? perfil.costoEnvio : 0;
      const total = subtotal + costoEnvio;

      return {
        nextState: 'IDLE',
        nextDraft: null,
        replyText: ``, // Se construye dinámicamente con los datos de BD en el handler
        buttons: ['Estado de mis pedidos', 'Hacer otro pedido', 'Hablar con asesor'],
        orderCreated: {
          id: '',
          numero: '',
          total,
          modalidad: draft.modalidad || 'retiro',
          direccion: draft.direccion,
          lineas: draft.lineas,
        },
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Fuera de dominio o Entrada no reconocida (Irracionalidades, bromas, preguntas ajenas)
    // ─────────────────────────────────────────────────────────────
    if (nlu.intent === 'FUERA_DE_DOMINIO' || nlu.intent === 'DESCONOCIDO') {
      if (currentState === 'SOLICITANDO_DIRECCION' && draft) {
        return {
          nextState: 'SOLICITANDO_DIRECCION',
          nextDraft: draft,
          replyText: `Para poder enviarte tu pedido (${draft.lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(', ')}), necesitamos una dirección de entrega válida (calle, carrera, número o referencias):`,
          buttons: ['Hablar con asesor', 'Cancelar orden'],
          removeKeyboard: true,
        };
      }

      if (draft && draft.lineas.length > 0) {
        const total = this.calcularTotal(draft);
        const botonesRecuperacion = currentState === 'CONFIRMANDO_PEDIDO'
          ? ['Confirmar pedido', 'Modificar pedido', 'Cancelar orden']
          : currentState === 'SOLICITANDO_ENTREGA'
          ? ['Envío a domicilio', 'Retiro en local']
          : ['Proceder a la entrega', 'Agregar más productos', 'Cancelar orden'];

        return {
          nextState: currentState,
          nextDraft: draft,
          replyText: `Soy un asistente especializado en gestionar pedidos en Necto.\n\nTu pedido sigue intacto y guardado:\n<blockquote>${this.formatearLineas(draft)}\n──────────────────────────\n<b>Total:</b> <code>$${total.toLocaleString('es-CO')} COP</code></blockquote>\n¿Deseas continuar con tu orden?`,
          buttons: botonesRecuperacion,
        };
      }

      const catTexto = this.formatearCatalogo(catalogo, perfil.etiquetaCatalogo);
      const botonesCat = catalogo.slice(0, 4).map((c, idx) => `${idx + 1}. ${c.nombre.slice(0, 18)}`);

      return {
        nextState: 'CATALOGO_ACTIVO',
        nextDraft: null,
        replyText: `Te compartimos nuestro menú disponible para que elijas lo que deseas pedir:\n\n${catTexto}\n\nPuedes seleccionar una opción o indicarme qué deseas ordenar.`,
        buttons: botonesCat,
      };
    }

    // Por defecto: Saludo o Menú inicial
    return this.mostrarCatalogoInicial(catalogo, perfil, nombreRef);
  }

  private mostrarCatalogoInicial(catalogo: CatalogItem[], perfil: BusinessProfile, nombre: string): FSMTransitionResult {
    const catTexto = this.formatearCatalogo(catalogo, perfil.etiquetaCatalogo);
    const botonesCat = catalogo.slice(0, 4).map((c, idx) => `${idx + 1}. ${c.nombre.slice(0, 18)}`);

    return {
      nextState: 'CATALOGO_ACTIVO',
      nextDraft: null,
      replyText: `Hola, ${nombre}. Te damos la bienvenida a <b>Necto</b>.\n\n${catTexto}\nPuedes seleccionar un producto de la lista o indicarme qué deseas pedir.`,
      buttons: botonesCat,
    };
  }

  private formatearCatalogo(catalogo: CatalogItem[], etiqueta: string): string {
    const lineas = catalogo.map((c, idx) => `${idx + 1}. <b>${c.nombre}</b> — <code>$${c.precio.toLocaleString('es-CO')} COP</code>`);
    return `<b>${etiqueta.toUpperCase()}</b>\n<blockquote>${lineas.join('\n')}</blockquote>`;
  }

  private formatearLineas(draft: CartDraft): string {
    return draft.lineas.map(l => `• <b>${l.cantidad}x ${l.nombre}</b> — <code>$${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')} COP</code>`).join('\n');
  }

  private calcularTotal(draft: CartDraft): number {
    return draft.lineas.reduce((acc, l) => acc + (l.precioUnitario * l.cantidad), 0);
  }
}