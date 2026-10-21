import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import * as path from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

export class WhatsAppBaileysService {
  private static instance: WhatsAppBaileysService | null = null;
  private sock: WASocket | null = null;
  private authDir: string;
  private supabase: any = null;
  private organizacionId: string | null = null;
  private qrActual: string | null = null;
  private estado: "desconectado" | "esperando_qr" | "conectado" | "reconectando" = "desconectado";
  private numeroConectado: string | null = null;

  private constructor() {
    this.authDir = path.resolve(process.cwd(), "data/baileys_auth");
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    this.initSupabase();
  }

  public static getInstance(): WhatsAppBaileysService {
    if (!WhatsAppBaileysService.instance) {
      WhatsAppBaileysService.instance = new WhatsAppBaileysService();
    }
    return WhatsAppBaileysService.instance;
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  public async iniciar() {
    try {
      console.info("[Baileys] Iniciando servicio WhatsApp...");
      this.estado = "reconectando";
      await this.syncEstadoSupabase();

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrActual = await QRCode.toDataURL(qr);
            this.estado = "esperando_qr";
            console.info("[Baileys] Nuevo código QR generado.");
            await this.syncEstadoSupabase();
          } catch (err) {
            console.error("[Baileys] Error generando DataURL de QR:", err);
          }
        }

        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !==
            DisconnectReason.loggedOut;
          console.warn("[Baileys] Conexión cerrada. Reconectar:", shouldReconnect);
          this.estado = shouldReconnect ? "reconectando" : "desconectado";
          this.qrActual = null;
          await this.syncEstadoSupabase();

          if (shouldReconnect) {
            setTimeout(() => this.iniciar(), 5000);
          } else {
            // Limpiar credenciales si cerró sesión
            try {
              fs.rmSync(this.authDir, { recursive: true, force: true });
            } catch (e) {}
          }
        } else if (connection === "open") {
          this.estado = "conectado";
          this.qrActual = null;
          const userJid = this.sock?.user?.id || "";
          this.numeroConectado = userJid.split(":")[0] || userJid.split("@")[0];
          console.info("[Baileys] ¡WhatsApp conectado con éxito! Número:", this.numeroConectado);
          await this.syncEstadoSupabase();
        }
      });

      this.sock.ev.on("messages.upsert", async (m) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue;

          const texto =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

          const pushName = msg.pushName || "Cliente WhatsApp";
          const telefono = remoteJid.split("@")[0];
          const lid = remoteJid.endsWith("@lid") ? remoteJid : null;

          console.info(`[Baileys] Mensaje recibido de ${telefono}: "${texto}"`);
          await this.guardarMensajeEntrante({
            telefono,
            lid,
            nombre: pushName,
            texto,
            waMessageId: msg.key.id || undefined,
          });
        }
      });
    } catch (err: any) {
      console.error("[Baileys] Error inicializando socket:", err);
      this.estado = "desconectado";
      await this.syncEstadoSupabase();
    }
  }

  public async desconectar() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {}
      this.sock = null;
    }
    this.estado = "desconectado";
    this.qrActual = null;
    this.numeroConectado = null;
    try {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    } catch (e) {}
    await this.syncEstadoSupabase();
  }

  public getEstadoActual() {
    return {
      estado: this.estado,
      qr: this.qrActual,
      numero: this.numeroConectado,
    };
  }

  private async syncEstadoSupabase() {
    if (!this.supabase) return;
    try {
      // Obtener o asignar organización principal
      if (!this.organizacionId) {
        const { data } = await this.supabase
          .schema("necto")
          .from("organizacion")
          .select("id")
          .limit(1)
          .single();
        if (data?.id) this.organizacionId = data.id;
      }
      if (!this.organizacionId) return;

      await this.supabase
        .schema("necto")
        .from("config_ia_asistente")
        .upsert(
          {
            organizacion_id: this.organizacionId,
            whatsapp_estado: this.estado,
            whatsapp_qr: this.qrActual,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "organizacion_id" }
        );

      await this.supabase
        .schema("necto")
        .from("integracion_canal")
        .upsert(
          {
            organizacion_id: this.organizacionId,
            proveedor: "baileys",
            conectado: this.estado === "conectado",
            numero: this.numeroConectado,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "organizacion_id,proveedor" }
        );
    } catch (err) {
      console.error("[Baileys] Error sincronizando estado con Supabase:", err);
    }
  }

  private async guardarMensajeEntrante({
    telefono,
    lid,
    nombre,
    texto,
    waMessageId,
  }: {
    telefono: string;
    lid: string | null;
    nombre: string;
    texto: string;
    waMessageId?: string;
  }) {
    if (!this.supabase || !this.organizacionId) return;
    try {
      // 1. Buscar o crear contacto
      let contactoId: string | null = null;
      const { data: contactoExistente } = await this.supabase
        .schema("necto")
        .from("contacto")
        .select("id")
        .eq("organizacion_id", this.organizacionId)
        .eq("telefono", telefono)
        .maybeSingle();

      if (contactoExistente?.id) {
        contactoId = contactoExistente.id;
        await this.supabase
          .schema("necto")
          .from("contacto")
          .update({
            lid: lid || undefined,
            ultimo_mensaje_at: new Date().toISOString(),
          })
          .eq("id", contactoId);
      } else {
        const { data: nuevoContacto } = await this.supabase
          .schema("necto")
          .from("contacto")
          .insert({
            organizacion_id: this.organizacionId,
            telefono,
            nombre,
            lid,
            ultimo_mensaje_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        contactoId = nuevoContacto?.id || null;
      }

      if (!contactoId) return;

      // 2. Buscar o crear conversación abierta
      let convId: string | null = null;
      const { data: convExistente } = await this.supabase
        .schema("necto")
        .from("conversacion")
        .select("id, no_leidos")
        .eq("organizacion_id", this.organizacionId)
        .eq("contacto_id", contactoId)
        .neq("estado", "cerrada")
        .maybeSingle();

      if (convExistente?.id) {
        convId = convExistente.id;
        await this.supabase
          .schema("necto")
          .from("conversacion")
          .update({
            no_leidos: (convExistente.no_leidos || 0) + 1,
            actualizada_en: new Date().toISOString(),
          })
          .eq("id", convId);
      } else {
        const { data: nuevaConv } = await this.supabase
          .schema("necto")
          .from("conversacion")
          .insert({
            organizacion_id: this.organizacionId,
            contacto_id: contactoId,
            canal: "whatsapp",
            estado: "abierta",
            modo_atencion: "bot",
            modulo_destino: "pedidos",
            no_leidos: 1,
            ia_activa: true,
          })
          .select("id")
          .single();
        convId = nuevaConv?.id || null;
      }

      if (!convId) return;

      // 3. Insertar mensaje entrante
      await this.supabase
        .schema("necto")
        .from("mensaje")
        .insert({
          conversacion_id: convId,
          autor: "cliente",
          contenido: { tipo: "texto", texto },
          wa_message_id: waMessageId,
          enviado_en: new Date().toISOString(),
        });
    } catch (err) {
      console.error("[Baileys] Error guardando mensaje en Supabase:", err);
    }
  }
}
