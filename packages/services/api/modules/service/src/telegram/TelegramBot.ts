import { TelegramHandler, type TelegramIncomingMessage } from './TelegramHandler.js';
import { TelegramDAO } from './TelegramDAO.js';

export interface TelegramSendOptions {
  buttons?: string[];
  removeKeyboard?: boolean;
}

export class TelegramBot {
  private token: string;
  private apiUrl: string;
  private offset = 0;
  private running = false;
  private handler: TelegramHandler;

  constructor(token?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.token) {
      throw new Error('[TelegramBot] TELEGRAM_BOT_TOKEN no está definido.');
    }
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    const dao = new TelegramDAO();
    this.handler = new TelegramHandler(dao, this);
  }

  async sendMessage(chatId: number | string, text: string, options: TelegramSendOptions = {}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    let reply_markup: any = undefined;

    if (options.buttons && options.buttons.length > 0) {
      const rows: { text: string }[][] = [];
      for (let i = 0; i < options.buttons.length; i += 2) {
        rows.push(options.buttons.slice(i, i + 2).map((b) => ({ text: b })));
      }
      reply_markup = {
        keyboard: rows,
        resize_keyboard: true,
        one_time_keyboard: false,
        is_persistent: true,
      };
    } else if (options.removeKeyboard || options.buttons?.length === 0) {
      reply_markup = { remove_keyboard: true };
    }

    const payload: Record<string, any> = {
      chat_id: chatId,
      text,
      reply_markup,
    };

    try {
      // Intento 1: con formato HTML enriquecido (blockquotes, code, b, i)
      const res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, parse_mode: 'HTML' }),
      });
      const data = (await res.json()) as any;

      if (!data.ok) {
        // Fallback a texto plano si falla el parseo de HTML
        const resFb = await fetch(`${this.apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const dataFb = (await resFb.json()) as any;
        return {
          ok: Boolean(dataFb.ok),
          messageId: dataFb.result?.message_id ? String(dataFb.result.message_id) : undefined,
          error: dataFb.description,
        };
      }

      return {
        ok: true,
        messageId: String(data.result.message_id),
      };
    } catch (err: any) {
      console.error('[TelegramBot] Error de red enviando mensaje:', err);
      return { ok: false, error: err.message };
    }
  }

  async sendChatAction(chatId: number | string, action: 'typing' = 'typing'): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action }),
      });
    } catch (e) {
      // Silenciar error en typing para no interrumpir el flujo
    }
  }

  async start(): Promise<void> {
    this.running = true;
    console.info('🚀 [TelegramBot] Conectado y escuchando mensajes en tiempo real (Lienzo en blanco)...');
    this.configurarMetadatosBot().catch(() => {});

    while (this.running) {
      try {
        const res = await fetch(`${this.apiUrl}/getUpdates?offset=${this.offset}&timeout=20`);
        const data = (await res.json()) as any;

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.processUpdate(update);
          }
        } else if (!data.ok) {
          console.warn('[TelegramBot] Advertencia en getUpdates:', data.description);
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err: any) {
        console.error('[TelegramBot] Excepción en polling:', err.message);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }

  async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      });
    } catch {
      // Silenciar
    }
  }

  private async processUpdate(update: any): Promise<void> {
    if (update.callback_query?.id) {
      this.answerCallbackQuery(update.callback_query.id).catch(() => {});
    }

    const msg = update.message || update.callback_query?.message;
    const textRaw = update.message?.text || update.callback_query?.data || '';
    if (!msg || !textRaw) return;

    const from = update.message?.from || update.callback_query?.from;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || from?.username || 'Cliente';

    const incoming: TelegramIncomingMessage = {
      chatId: msg.chat.id,
      userId: from?.id || msg.chat.id,
      username: from?.username,
      fullName,
      text: textRaw.trim(),
      messageId: msg.message_id,
    };

    try {
      await this.handler.onMessage(incoming);
    } catch (err) {
      console.error('[TelegramBot] Error en handler.onMessage:', err);
      try {
        await this.sendMessage(incoming.chatId, 'Ocurrió un inconveniente temporal al procesar tu mensaje. Por favor intenta de nuevo.');
      } catch (sendErr) {
        console.error('[TelegramBot] Error enviando mensaje de error:', sendErr);
      }
    }
  }

  private async configurarMetadatosBot(): Promise<void> {
    try {
      const desc = '¡Te damos la bienvenida a Necto!\n\nAquí puedes consultar nuestro menú en tiempo real, armar tu orden personalizada, coordinar entregas a domicilio o retiros en el local, y pagar en línea de forma segura.\n\nPresiona el botón de abajo para comenzar.';
      const shortDesc = 'Gestiona tus pedidos en Necto: consulta el menú, pide a domicilio o retiro y paga seguro.';

      await Promise.all([
        fetch(`${this.apiUrl}/setMyDescription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: desc }),
        }),
        fetch(`${this.apiUrl}/setMyShortDescription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ short_description: shortDesc }),
        }),
      ]);
    } catch {
      // Ignorar fallas transitorias de red al iniciar
    }
  }

  stop(): void {
    this.running = false;
  }
}
