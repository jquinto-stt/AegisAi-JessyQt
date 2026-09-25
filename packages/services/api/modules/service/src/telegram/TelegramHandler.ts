import { TelegramDAO } from './TelegramDAO.js';
import type { TelegramBot } from './TelegramBot.js';
import { TelegramNLU } from './TelegramNLU.js';
import { TelegramFSM } from './TelegramFSM.js';
import { TelegramCognitiveEngine } from './TelegramCognitiveEngine.js';
import type { CartDraft } from './types.js';

export interface TelegramIncomingMessage {
  chatId: number;
  userId: number;
  username?: string;
  fullName: string;
  text: string;
  messageId: number;
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
    const guardarMsgPromise = this.dao.guardarMensaje(conversacionId, 'cliente', text, messageId);

    // 3. Si está en modo humano, verificar si pide volver al bot
    const normText = text.toLowerCase().trim();
    const quiereVolverAlBot = ['volver al bot', 'bot', 'menu', 'catalogo', 'hola', 'nuevo pedido'].some(w => normText.includes(w));

    if (modo === 'humano' && !quiereVolverAlBot) {
      console.log(`[TelegramHandler] Conversación ${conversacionId} en modo humano. Bot en silencio.`);
      await guardarMsgPromise;
      return;
    }

    if (modo === 'humano' && quiereVolverAlBot) {
      await this.dao.actualizarModoAtencion(conversacionId, 'bot');
    }

    // 4. Catálogo desde memoria RAM (< 1ms)
    const { catalogo, perfil } = await this.dao.obtenerCatalogoYPerfil();

    // 5. Inferencia de Intención y Entidades
    // Capa 1: FAST-PATH DETERMINISTA (< 1ms)
    let nluResult = this.nlu.interpretarFastPath(text, catalogo, estadoConv.fsmState);

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
      });

      // Capa 3: Fallback de emergencia local
      if (!nluResult) {
        nluResult = this.nlu.interpretarFallbackLocal(text, catalogo, estadoConv.fsmState);
      }
    }

    console.log(`[TelegramHandler] 🎯 Intent resuelto: ${nluResult.intent} (conf: ${nluResult.confidence})`);

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
      pedidosCliente
    );

    let textoFinal = transition.replyText;
    let botonesFinales = transition.buttons;
    let borradorFinal = transition.nextDraft;
    let nextState = transition.nextState;
    const removeKeyboard = Boolean(transition.removeKeyboard);

    // 8. Efectos secundarios de negocio gobernados por la FSM:
    // A. Si la FSM ordenó crear el pedido final
    if (transition.orderCreated) {
      const lineas = transition.orderCreated.lineas || estadoConv.draft?.lineas || [];
      const modalidad = transition.orderCreated.modalidad || estadoConv.draft?.modalidad || 'retiro';
      const direccion = transition.orderCreated.direccion || estadoConv.draft?.direccion || null;

      const draftParaCrear: CartDraft = {
        lineas,
        modalidad,
        direccion,
        updatedAt: new Date().toISOString(),
      };

      const pedidoCreado = await this.dao.crearPedidoFinal(chatId, fullName, draftParaCrear, perfil.costoEnvio);
      const refLink = pedidoCreado.numero.toLowerCase().replace(/[^a-z0-9]/g, '');
      const totalFmt = Number(pedidoCreado.total).toLocaleString('es-CO');
      const resumenLineas = draftParaCrear.lineas
        .map(l => `• ${l.cantidad} × <b>${l.nombre}</b> — <code>$${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')} COP</code>`)
        .join('\n');
      const entregaStr = draftParaCrear.modalidad === 'domicilio'
        ? `Domicilio en <i>${draftParaCrear.direccion}</i>`
        : `Retiro en local`;

      textoFinal = `<b>PEDIDO REGISTRADO CON ÉXITO</b>\n<blockquote>` +
        `<b>Orden:</b> <code>#${pedidoCreado.numero}</code>\n` +
        `<b>Cliente:</b> ${fullName}\n` +
        `──────────────────────────\n` +
        `${resumenLineas}\n` +
        `──────────────────────────\n` +
        `<b>Total a pagar:</b> <code>$${totalFmt} COP</code>\n` +
        `<b>Modalidad:</b> ${entregaStr}</blockquote>\n\n` +
        `<b>Enlace de pago seguro:</b>\nhttps://necto.io/pagos/pay_${refLink}\n\n` +
        `<i>Acepta Nequi, Daviplata, PSE y tarjetas. Una vez confirmado el pago, iniciamos la preparación de tu orden.</i>`;

      botonesFinales = ['Estado de mis pedidos', 'Hacer otro pedido', 'Hablar con asesor'];
      borradorFinal = null;
      nextState = 'IDLE';
    }

    // B. Si la FSM canceló un pedido ya existente
    if (transition.orderCancelledId) {
      await this.dao.cancelarPedido(transition.orderCancelledId);
    }

    // C. Si la FSM pasó a modo humano
    if (nextState === 'MODO_HUMANO') {
      await this.dao.actualizarModoAtencion(conversacionId, 'humano');
    }

    // 9. Persistir estado y enviar respuesta a Telegram de forma concurrente
    const [envio] = await Promise.all([
      this.bot.sendMessage(chatId, textoFinal, { buttons: botonesFinales, removeKeyboard }),
      this.dao.guardarEstadoConversacion(conversacionId, nextState, borradorFinal, {
        ultimoPedidoId: ultimoPedido?.id || null,
      }),
      guardarMsgPromise,
    ]);

    // 10. Guardar mensaje saliente del asistente en segundo plano
    if (envio.messageId) {
      this.dao.guardarMensaje(conversacionId, 'asistente', textoFinal, envio.messageId).catch(() => {});
    }
  }
}
