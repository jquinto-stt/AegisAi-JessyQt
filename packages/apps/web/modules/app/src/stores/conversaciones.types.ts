// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES — TIPOS Y CONTRATOS DEL DOMINIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Contratos TypeScript del módulo Conversaciones (alias `@/`). Frontend-only,
// solo canal `whatsapp` y solo contenido de tipo `texto`. El modelo queda
// PREPARADO para multimodal y multicanal sin implementar ese procesamiento
// (Requirements 10.3, 10.6).

// ── Identificadores y enumeraciones ──────────────────────────────────────────

/** Estado del hilo de conversación (máquina de estados del handoff). */
export type EstadoConversacion = "abierta" | "en_espera" | "atendida" | "cerrada";

/** Quién atiende ahora mismo la conversación. */
export type ModoAtencion = "bot" | "humano";

/** Autoría de un mensaje. "negocio" = operador humano; "bot" = Necto Intelligence. */
export type AutorMensaje = "cliente" | "negocio" | "bot";

/** Módulo de dominio al que un mensaje/acción hace referencia (para el panel de contexto). */
export type ModuloDestino = "pedidos" | "turnos" | "agendamiento" | "inventario" | "general";

/** Canal de comunicación. Hoy solo WhatsApp; preparado para más. */
export type CanalId = "whatsapp"; // futuro: "instagram" | "webchat" | ...

// ── Contenido del mensaje (preparado para multimodal) ────────────────────────

/**
 * Contenido de un mensaje. En el MVP SOLO texto (`tipo: "texto"`), pero el
 * envoltorio discriminado por `tipo` deja lista la extensión multimodal
 * (imagen/audio) sin romper el modelo ni los consumidores existentes.
 */
export interface MensajeContenido {
  tipo: "texto"; // futuro: "imagen" | "audio" | "documento" | ...
  texto: string;
}

// ── Mensaje ──────────────────────────────────────────────────────────────────

/**
 * Un mensaje dentro de una conversación. `payload` transporta referencias de
 * dominio SIN acoplar el store a Pedidos (solo ids/valores primitivos).
 */
export interface Mensaje {
  id: string;
  conversacionId: string;
  autor: AutorMensaje;
  contenido: MensajeContenido;
  timestamp: string; // ISO 8601
  /** Módulo de dominio con el que se relaciona el mensaje (si aplica). */
  moduloContexto?: ModuloDestino;
  /**
   * Datos de dominio referenciados por el mensaje. Solo primitivos/ids: NO se
   * incrusta la entidad Pedido, para respetar el encapsulamiento (invariante D2).
   */
  payload?: {
    pedidoId?: string;
    turnoNumero?: string;
    items?: Array<{ nombre: string; cantidad: number; precio?: number }>;
  };
}

// ── Evento de sistema ─────────────────────────────────────────────────────────

/** Tipo de evento de sistema (transiciones y anotaciones del hilo). */
export type TipoEventoSistema =
  | "handoff_solicitado"
  | "tomada"
  | "devuelta"
  | "cerrada"
  | "reabierta";

/**
 * Evento de sistema intercalado en la línea de tiempo (no es un mensaje de
 * ninguna de las partes; es una anotación del hilo: "Ana tomó la conversación").
 */
export interface EventoSistema {
  id: string;
  conversacionId: string;
  tipo: TipoEventoSistema;
  texto: string;          // legible: "El cliente pidió hablar con un asesor"
  timestamp: string;      // ISO 8601
  actorId?: string;       // operadorId cuando aplica
}

// ── Contacto y conversación ────────────────────────────────────────────────────

/**
 * Contacto del canal. Es la identidad ligera del cliente en el canal, NO una
 * entidad Cliente del dominio (que no existe). El teléfono es la clave de
 * cruce con Pedidos vía `pedidosStore.porTelefono`.
 */
export interface Contacto {
  telefono: string;
  nombre: string;
  origen: "whatsapp";
}

/**
 * Cabecera de una conversación. Los mensajes y eventos NO viven aquí (ver
 * decisión "Línea de tiempo" del diseño): se guardan en índices separados del
 * store, de modo que la cabecera sea barata de observar en la bandeja.
 */
export interface Conversacion {
  id: string;
  canal: CanalId;
  contacto: Contacto;
  estado: EstadoConversacion;
  atencion: ModoAtencion;
  operadorAsignadoId: string | null;
  noLeidos: number;
  ultimaActividad: string; // ISO 8601
  /** Referencias de dominio activas (solo ids; encapsulamiento). */
  pedidoActivoId?: string;
  turnoActivoId?: string;
}

/** Filtros de la bandeja. `requieren_atencion` == estado "en_espera". */
export type FiltroBandeja = "todas" | "no_leidas" | "requieren_atencion" | "cerradas";

/** Item de la línea de tiempo unificada que consume el ChatView. */
export type ItemLineaTiempo =
  | { clase: "mensaje"; data: Mensaje }
  | { clase: "evento"; data: EventoSistema };
