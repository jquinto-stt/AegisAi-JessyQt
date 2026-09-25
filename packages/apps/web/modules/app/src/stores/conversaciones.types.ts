// ═══════════════════════════════════════════════════════════════════════════
// CONVERSACIONES — TIPOS Y CONTRATOS DEL DOMINIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Contratos TypeScript del módulo Conversaciones (alias `@/`). Frontend-only,
// solo canal `whatsapp` y solo contenido de tipo `texto`. El modelo queda
// PREPARADO para multimodal y multicanal sin implementar ese procesamiento
// (Requirements 10.3, 10.6).

// ── Identificadores y enumeraciones ──────────────────────────────────────────

// ── LA MÁQUINA DE ESTADOS DEL HILO ───────────────────────────────────────────
//
// Un hilo de conversación tiene CUATRO estados y ni uno más. Este tipo es el
// ÚNICO vocabulario de estado del hilo en todo el frontend: no se declara un
// quinto valor en ninguna vista, ni se cubre un estado con una cadena suelta.
//
//   abierta   ── el bot lo lleva y nadie lo ha reclamado
//   en_espera ── el cliente PIDIÓ un asesor y aún nadie lo ha tomado
//   atendida  ── un operador lo está trabajando
//   cerrada   ── resuelto; es el ÚNICO terminal
//
// Transiciones (los cuatro verbos del store, y no hay más):
//
//   solicitarHumano()  abierta   → en_espera     (el cliente pide un humano)
//   tomar()            abierta   → atendida      (un operador lo reclama)
//                      en_espera → atendida
//   devolver()         atendida  → abierta       (vuelve al bot)
//   cerrar()           *        → cerrada        (resuelto)
//
// Los tres predicados de lectura —`estaResuelta` / `estaPendiente` /
// `estaEnProgreso` en el store— son exhaustivos y mutuamente excluyentes sobre
// este tipo: cada hilo cae en exactamente uno. Cualquier selector nuevo que
// necesite preguntar «¿requiere atención?» debe ser una RESTRICCIÓN de uno de
// esos tres (`en_espera`) y no una partición paralela; ver
// `requiereAtencionHumana` en el store para el porqué de ese matiz.
//
// El vocabulario de PRESENTACIÓN de estos cuatro valores (etiqueta, color de
// badge y punto de presencia) vive en un solo sitio:
// `ESTADO_CONVERSACION_META` en `@/stores/conversaciones.store`. Ninguna
// superficie escribe la etiqueta como literal.
/**
 * Estado del hilo de conversación (máquina de estados del handoff).
 *
 * @see La máquina de estados del hilo, arriba, para las transiciones válidas.
 */
export type EstadoConversacion = "abierta" | "en_espera" | "atendida" | "cerrada";

/**
 * Presencia del contacto en la lista, derivada del estado del hilo.
 *
 * Es una VISTA del estado, no un eje propio: se deriva de `EstadoConversacion`
 * con `presenciaDe()` y no se almacena ni se escribe a mano en una fila.
 */
export type PresenciaContacto = "online" | "busy" | "offline";

/** Quién atiende ahora mismo la conversación. */
export type ModoAtencion = "bot" | "humano";

/** Autoría de un mensaje. "negocio" = operador humano; "bot" = Necto Intelligence. */
export type AutorMensaje = "cliente" | "negocio" | "bot";

/**
 * Módulo de dominio al que un mensaje/acción hace referencia (para el panel de contexto).
 *
 * `turnos` y `agendamiento` se retiraron: eran vocabulario de dos módulos que ya
 * no existen en el producto, y su única función era que `MODULO_DESTINO_LABEL`
 * los rotulase como `disponible: false`. Un valor de tipo que ninguna superficie
 * puede alcanzar no es "declaración de intención": es una etiqueta que nadie lee.
 *
 * `inventario` se queda y es distinto: existe en `CATALOGO_MODULOS` y aparece en
 * el seed de conversaciones como procedencia real de mensajes.
 */
export type ModuloDestino = "pedidos" | "inventario" | "general";

/** Canal de comunicación (WhatsApp, Telegram). */
export type CanalId = "whatsapp" | "telegram";

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
  origen: "whatsapp" | "telegram";
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
  /**
   * @deprecated NO USAR. Campo declarado y nunca poblado (el seed lo deja
   * `undefined`), porque sería una SEGUNDA FUENTE DE VERDAD frente a
   * `pedidosStore`: guardar aquí el id del pedido activo obliga a mantenerlo
   * sincronizado a mano y se queda obsoleto en cuanto el pedido cambia de
   * estado o se cierra. Se conserva solo por compatibilidad del tipo.
   *
   * La verdad se DERIVA en la capa de UI desde el teléfono del contacto:
   * `pedidosStore.pedidoActivoDe(conv.contacto.telefono)`. Es una lectura
   * reactiva (MobX) y siempre fresca; no puede desincronizarse.
   */
  pedidoActivoId?: string;
}

/** Filtros de la bandeja. `requieren_atencion` == estado "en_espera". */
export type FiltroBandeja = "todas" | "no_leidas" | "requieren_atencion" | "cerradas";

/**
 * Intención de una conversación: QUÉ QUIERE EL CLIENTE.
 *
 * Es un eje DISTINTO del dominio (`ModuloDestino`) y del estado de atención
 * (`EstadoConversacion`), y no debe confundirse con ninguno de los dos:
 *
 *   - Dominio   ¿de qué negocio se habla?   pedidos | inventario | general
 *   - Intención ¿qué quiere el cliente?     consultar | comprar | seguir_pedido | reclamar
 *   - Atención  ¿quién lo atiende?          abierta | en_espera | atendida | cerrada
 *
 * Contraejemplo que obliga a separarlos: un hilo sobre un pedido ya entregado
 * es dominio `pedidos` pero intención `seguir_pedido` (no `comprar`); y una
 * pregunta de existencias es dominio `inventario` con intención `consultar`.
 * Con un solo eje, uno de los dos casos se rotularía mal.
 *
 * NO se persiste: se DERIVA de los efectos observables del hilo (ver
 * `intencionDe` en `pages/conversaciones/conversaciones.clasificacion.ts`).
 * Guardarla como campo de `Conversacion` sería una segunda fuente de verdad que
 * habría que mantener sincronizada a mano — el mismo antipatrón por el que
 * `Conversacion.pedidoActivoId` está deprecado.
 */
export type IntencionConversacion =
  /** Información pura: catálogo, horarios, disponibilidad. Sin pedido. */
  | "consultar"
  /** El pedido NACIÓ en este hilo (el cliente pidió y confirmó aquí). */
  | "comprar"
  /** Postventa: el cliente pregunta por un pedido que ya existía. */
  | "seguir_pedido"
  /** Problema o escalamiento: requiere criterio humano. */
  | "reclamar";

/** Filtro por intención de la bandeja. Eje INDEPENDIENTE de `FiltroBandeja`. */
export type FiltroIntencion = "todas" | IntencionConversacion;

/** Item de la línea de tiempo unificada que consume el ChatView. */
export type ItemLineaTiempo =
  | { clase: "mensaje"; data: Mensaje }
  | { clase: "evento"; data: EventoSistema };
