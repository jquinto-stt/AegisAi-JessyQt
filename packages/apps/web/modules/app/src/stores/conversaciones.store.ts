import { makeAutoObservable } from "mobx";

import type { AssistantMessage } from "@/assistant";
import type { BadgeColor } from "@/elements/ui/badge";
// Adaptador delgado al AssistantEngine. Import DIRECTO del singleton sin riesgo
// de ciclo (invariante D3/D4): el adaptador importa de `@/assistant`,
// `@/assistant/bootstrap`, `@/assistant/engine/local-rule-engine` y
// `@/stores/conversaciones.types`, pero NUNCA de este store. El grafo es
// unidireccional (store → adaptador → núcleo del asistente + tipos), por lo que
// no se forma ningún ciclo de imports y no hace falta inyección diferida.
import { conversacionesBotAdapter } from "@/pages/conversaciones/bot/conversaciones-bot.adapter";
import { cargarMensajes, cargarTodo } from "@/lib/conversaciones.repo";
import { convertirFilaMensaje } from "@/lib/db.adapters";
import { cambiarModoAtencion } from "@/lib/atencion.repo";
import { enviarMensajeOperador } from "@/lib/envio.repo";
import {
  CONVERSACIONES_SEED,
  type ConversacionesSeed,
} from "@/stores/conversaciones.seed";
import type {
  Conversacion,
  EstadoConversacion,
  EventoSistema,
  FiltroBandeja,
  ItemLineaTiempo,
  Mensaje,
  ModoAtencion,
  ModuloDestino,
  PresenciaContacto,
} from "@/stores/conversaciones.types";

// NOTA DE ENCAPSULAMIENTO (invariante D2 / Req 10.5): este archivo NO importa
// `pedidos.store`. El cruce con Pedidos ocurre siempre desde la capa de UI vía
// los métodos públicos `pedidosStore.porTelefono` / `pedidosStore.crearPedido`.

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ═══════════════════════════════════════════════════════════════════════════

/** Clave propia del módulo en `localStorage` (Req 9.1). Versionada para invalidar mocks viejos. */
const STORAGE_KEY = "necto.conversaciones_v3";

/**
 * Límite de caracteres del mensaje del cliente en `/wa` (Req 6.2/6.3): se
 * rechaza el envío que exceda este máximo.
 */
const LIMITE_TEXTO_CLIENTE = 2000;

/**
 * Límite de caracteres del mensaje del operador/negocio en la consola
 * (Req 3.1/3.5): se rechaza el envío que exceda este máximo.
 */
const LIMITE_TEXTO_NEGOCIO = 4096;

/** Timestamp ISO 8601 del momento actual (mismo patrón que `pedidos.store`). */
const nowIso = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRESENTACIÓN DEL ESTADO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CATÁLOGO DE PRESENTACIÓN DEL ESTADO — la ÚNICA tabla de los cuatro estados.
 *
 * Etiqueta, color de badge y presencia del contacto son TRES caras del mismo
 * dato, así que viven en UNA tabla y no en tres mapas paralelos que pueden
 * divergir. Antes había `ESTADO_CONVERSACION_LABEL`, `ESTADO_CONVERSACION_BADGE`
 * y un `statusDe()` en `conversaciones.utils` con su propia escala: tres
 * estructuras que había que mantener sincronizadas a mano, y un cuarto estado
 * obligaba a tocar las tres.
 *
 * El `Record<EstadoConversacion, …>` ancla la cobertura al tipo: añadir un
 * estado sin darle las tres caras es un error de COMPILACIÓN, no una celda
 * vacía que alguien descubre en pantalla.
 *
 * ── Por qué las etiquetas están en ESPAÑOL (Revisión de 22/09) ──────────────
 *
 * Eran `Open`/`Pending`/`In progress`/`Solved`. Una píldora roja con la palabra
 * «Open» justo al lado de una X, en la cabecera de un panel, no se lee como un
 * dato sino como una ACCIÓN DE CIERRE, y un operador inexperto la interpreta
 * como el botón para terminar la conversación. El vocabulario pasa a describir
 * el hilo en el idioma de la interfaz.
 *
 * `abierta` es el ticket que lleva el bot y nadie ha reclamado: «Sin atender» lo
 * dice sin ambigüedad, frente al «Open» anterior, que se confundía con «abrir».
 * `atendida` es el único estado con un operador trabajándolo: «En curso».
 *
 * ── Por qué estos colores ──────────────────────────────────────────────────
 *
 * `success` = resuelto, `primary` = un operador lo está trabajando, `info` = lo
 * lleva el bot, `light` = en espera (neutro, sin dueño claro).
 *
 * `abierta` NO es `warning`: `warning` se pinta con la rampa naranja, y el
 * naranja `#FF3C10` es el color PRIMARIO DE LA MARCA. Un badge de estado en
 * naranja compite con la marca y, peor, convierte un estado normal (el bot
 * atendiendo) en una alarma. La urgencia real —un cliente pidiendo un asesor—
 * ya la comunica el estado `en_espera`, que sí tiene su propio tratamiento de
 * urgencia en la lista. Aquí el badge solo describe, así que va en colores que
 * no gritan.
 *
 * ── Por qué `presencia` vive aquí y no en un `statusDe()` aparte ────────────
 *
 * La presencia del avatar es una cuarta codificación del mismo estado. Tenía su
 * propio mapeo sin tipar (`(estado: string)`), y por eso `atendida` y `cerrada`
 * acababan pintando ambas «offline»: un hilo que un operador tiene entre manos
 * se veía igual que uno resuelto. Con la presencia en la tabla, cada estado
 * declara la suya y `cerrada` puede bajar el contacto a `offline` sin arrastrar
 * consigo a `atendida`.
 */
export const ESTADO_CONVERSACION_META: Record<
  EstadoConversacion,
  { label: string; badge: BadgeColor; presencia: PresenciaContacto }
> = {
  abierta: { label: "Sin atender", badge: "info", presencia: "online" },
  en_espera: { label: "En espera", badge: "light", presencia: "busy" },
  atendida: { label: "En curso", badge: "primary", presencia: "online" },
  cerrada: { label: "Resuelta", badge: "success", presencia: "offline" },
};

/**
 * Etiqueta legible de un estado de conversación.
 *
 * Atajo de lectura sobre el catálogo. Existe para que las superficies no
 * escriban `ESTADO_CONVERSACION_META[e].label` a mano en cada celda de tabla,
 * que es donde nacen las copias.
 */
export const etiquetaEstado = (e: EstadoConversacion): string =>
  ESTADO_CONVERSACION_META[e].label;

/** Color de badge de un estado de conversación. Atajo de lectura del catálogo. */
export const badgeEstado = (e: EstadoConversacion): BadgeColor =>
  ESTADO_CONVERSACION_META[e].badge;

/**
 * Presencia del contacto en la lista para un estado del hilo.
 *
 * Es lo que consume el `Avatar` de la bandeja, el chat y el panel de contexto.
 * Recibe `EstadoConversacion` y no `string` a propósito: la versión anterior sin
 * tipar dejaba pasar cualquier cadena y devolvía `offline` en silencio.
 */
export const presenciaDe = (e: EstadoConversacion): PresenciaContacto =>
  ESTADO_CONVERSACION_META[e].presencia;

/**
 * EL CONJUNTO «REQUIERE ATENCIÓN», y solo este.
 *
 * Un hilo requiere atención humana en el eje de conversación si y solo si está
 * `en_espera`: el cliente pidió un asesor y nadie lo ha tomado. Es el ÚNICO
 * estado que significa eso, y esta constante existe para que no se re-derive
 * con un literal suelto en una vista.
 *
 * No confundir con las dos preguntas vecinas, que son DISTINTAS a propósito:
 *
 *   ¿requiere atención?  → `en_espera`                        (esta constante)
 *   ¿está pendiente?     → `abierta` ∨ `en_espera`            (`estaPendiente`)
 *   ¿está en curso?      → `atendida`                         (`estaEnProgreso`)
 *
 * «Pendiente» es «ni resuelto ni en curso»; «requiere atención» es «alguien está
 * esperando una respuesta mía». Un hilo que lleva el bot está pendiente y NO
 * requiere atención. Eran el mismo rótulo para dos conjuntos distintos en dos
 * pantallas, y de ahí salían dos cifras discrepantes con la misma pregunta.
 */
const ESTADOS_CON_ATENCION: readonly EstadoConversacion[] = ["en_espera"];

/**
 * Rótulo de la acción que resuelve un hilo (`cerrar()`), en UN solo sitio.
 *
 * La misma operación se ofrecía como «Marcar como resuelto» en el menú de la
 * tabla del historial y como «Cerrar conversación» en el menú del chat: dos
 * nombres para un solo verbo, en dos pantallas del mismo módulo. Vive aquí, junto
 * al método que la ejecuta, siguiendo el vocabulario del estado al que lleva
 * (`cerrada` → «Resuelta»).
 */
export const ETIQUETA_RESOLVER = "Marcar como resuelta";

/**
 * Etiqueta de ATENCIÓN de una conversación: QUIÉN la lleva ahora mismo.
 *
 * Es un eje DISTINTO del estado y no debe confundirse con él. El estado dice en
 * qué punto del ciclo está el ticket (`abierta`/`en_espera`/`atendida`/`cerrada`);
 * la atención dice quién responde (`bot` o un operador). Un hilo `abierta` lo
 * lleva el bot y un hilo `atendida` lo lleva un humano, pero eso es una
 * correlación de las transiciones actuales, no una identidad: por eso cada eje
 * tiene su propio catálogo y ninguna superficie debe derivar uno del otro.
 */
export const ATENCION_LABEL: Record<ModoAtencion, string> = {
  bot: "Atendido por el bot",
  humano: "Atendido por un asesor",
};

/**
 * Color de badge para el eje de atención. El bot es un actor automático
 * (`primary`, el mismo tono con el que se le identifica en el hilo) y el asesor
 * humano un actor activo (`info`). NO reutiliza `success`/`warning`: esos
 * pertenecen al eje de estado y mezclarlos haría que dos ejes distintos
 * compartieran vocabulario cromático.
 */
export const ATENCION_BADGE: Record<ModoAtencion, BadgeColor> = {
  bot: "primary",
  humano: "info",
};

/**
 * Catálogo de presentación del DOMINIO de una conversación: DE QUÉ NEGOCIO SE
 * HABLA. Tercer eje, independiente de estado y atención.
 *
 * Existe por el mismo motivo que los otros dos catálogos: sin él, la primera
 * superficie que rotule un dominio escribirá `"Inventario"` como literal y el
 * segundo escribirá `"inventario"`, y el vocabulario divergirá sin que nadie lo
 * note. El `Record<ModuloDestino, …>` obliga a que todo valor del tipo tenga
 * etiqueta: añadir un módulo sin rotularlo es un error de compilación.
 *
 * `disponible` NO es decorativo y es la parte importante del catálogo:
 *
 *  - `true`  ⟹ el dominio tiene provider, datos y, por tanto, puede ofrecerse
 *    como filtro o como destino de navegación.
 *  - `false` ⟹ el dominio está DECLARADO en el tipo pero todavía no existe como
 *    capacidad. La UI puede nombrarlo (es la procedencia de un mensaje que ya se
 *    envió) pero **no** debe ofrecer navegación ni filtros hacia él: prometer un
 *    módulo sin datos es el defecto que el test de consistencia del asistente ya
 *    previene con `MODULOS_CONOCIDOS`.
 *
 * Hoy los dos módulos de negocio están implementados (`modules-tools/` tiene el
 * provider de Pedidos y el de Inventario), así que ninguno queda en `false`:
 * `inventario` pasó a `true` el 21/09, a la vez que su proveedor. El día que se
 * implemente otro, este catálogo es el ÚNICO sitio que hay que tocar: la bandeja
 * mostrará el badge sola porque lee de aquí.
 */
export const MODULO_DESTINO_LABEL: Record<
  ModuloDestino,
  { etiqueta: string; disponible: boolean }
> = {
  pedidos: { etiqueta: "Pedidos", disponible: true },
  inventario: { etiqueta: "Inventario", disponible: true },
  general: { etiqueta: "General", disponible: true },
};

/**
 * Normaliza un teléfono a su forma canónica COMPARABLE: solo dígitos.
 *
 * Motivación (defecto real de datos, no de estilo): el mismo cliente se escribe
 * de dos maneras en el mock. `pedidos.seed` guarda `"+573001112233"` (plano) y
 * `conversaciones.seed` guarda `"+57 300 555 1122"` (con espacios). Comparar las
 * cadenas crudas con `===` hace que ninguna conversación resuelva contra su
 * pedido — el botón de WhatsApp de las tarjetas nunca encontraba hilo.
 *
 * La normalización vive AQUÍ, en un único sitio, para que resolver por teléfono
 * sea una sola derivación y no una regla re-implementada en cada consumidor.
 * Conserva el `+` de prefijo internacional si está presente, para no colapsar
 * números de países distintos con la misma parte numérica.
 */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return digitos === "" ? "" : `+${digitos}`;
}

/** Id único para mensajes/eventos (mismo generador que `pedidos.store`). */
const generarId = () => crypto.randomUUID();

/**
 * Forma serializada del estado en `localStorage`. Los `Map` de mensajes/eventos
 * se guardan como objetos indexados por `conversacionId` (JSON no serializa
 * `Map`) y se rehidratan a `Map` al arrancar (Req 9.1, 9.3).
 */
interface EstadoPersistido {
  conversaciones: Conversacion[];
  mensajesPorConv: Record<string, Mensaje[]>;
  eventosPorConv: Record<string, EventoSistema[]>;
}

/**
 * Lee y valida el estado persistido. Devuelve `null` si no hay estado, si el
 * `localStorage` no está disponible, si el JSON es inválido o si la forma no es
 * la esperada (Req 9.2): en cualquiera de esos casos el store cargará el seed.
 */
function loadEstado(): EstadoPersistido | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstadoPersistido>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.conversaciones)) return null;
    if (
      typeof parsed.mensajesPorConv !== "object" ||
      parsed.mensajesPorConv === null ||
      typeof parsed.eventosPorConv !== "object" ||
      parsed.eventosPorConv === null
    ) {
      return null;
    }
    return {
      conversaciones: parsed.conversaciones,
      mensajesPorConv: parsed.mensajesPorConv as Record<string, Mensaje[]>,
      eventosPorConv: parsed.eventosPorConv as Record<string, EventoSistema[]>,
    };
  } catch {
    // Entorno sin localStorage o JSON inválido: se opera con seed/memoria.
    return null;
  }
}

/** Convierte un `Map` a objeto plano serializable para `localStorage`. */
function mapToRecord<T>(map: Map<string, T[]>): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const [key, value] of map) out[key] = value;
  return out;
}

/** Rehidrata un objeto plano (o los grupos del seed) a un `Map`. */
function recordToMap<T>(record: Record<string, T[]>): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const key of Object.keys(record)) map.set(key, record[key]);
  return map;
}

/** Agrupa una colección plana del seed por `conversacionId` en un `Map`. */
function agruparPorConversacion<T extends { conversacionId: string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const grupo = map.get(item.conversacionId);
    if (grupo) grupo.push(item);
    else map.set(item.conversacionId, [item]);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock — muta solo estado local, persiste en localStorage con fallback)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ConversacionesStore — dueño único del estado de conversaciones, mensajes y
 * eventos de sistema del canal (Capa 2 del diseño). Singleton MobX al estilo
 * del resto de stores del proyecto (`pedidos.store`).
 *
 * Esta clase es el ESQUELETO (tarea 3.2): estado observable + persistencia +
 * hidratación. Las acciones (mensajería, handoff, bandeja, línea de tiempo y
 * atención automática) las añaden tareas posteriores en ESTE MISMO archivo, por
 * lo que la clase se estructura para extenderse sin reescribirse.
 */
export class ConversacionesStore {
  // ── Estado observable ───────────────────────────────────────────────────────
  /** Cabeceras de conversación (fuente de la bandeja). */
  conversaciones: Conversacion[] = [];
  /** Mensajes indexados por conversacionId. */
  private mensajesPorConv: Map<string, Mensaje[]> = new Map();
  /** Eventos de sistema indexados por conversacionId. */
  private eventosPorConv: Map<string, EventoSistema[]> = new Map();
  /** Conversación seleccionada en la consola (UI). */
  seleccionadaId: string | null = null;
  /** Filtro activo de la bandeja. */
  filtro: FiltroBandeja = "todas";
  /** Texto del buscador de la bandeja. */
  busqueda = "";

  constructor() {
    // Hidratación (Req 9.3, 9.4): estado válido → restaurar sin seed; en caso
    // contrario (ausente/corrupto/JSON inválido) → cargar el seed.
    const persistido = loadEstado();
    if (persistido) {
      this.conversaciones = persistido.conversaciones;
      this.mensajesPorConv = recordToMap(persistido.mensajesPorConv);
      this.eventosPorConv = recordToMap(persistido.eventosPorConv);
    } else {
      this.cargarSeed(CONVERSACIONES_SEED);
    }
    makeAutoObservable(this);
  }

  /**
   * Carga el seed inicial en el estado, agrupando mensajes y eventos por
   * `conversacionId` en sus índices internos (Req 9.4).
   */
  private cargarSeed(seed: ConversacionesSeed): void {
    this.conversaciones = seed.conversaciones;
    this.mensajesPorConv = agruparPorConversacion(seed.mensajes);
    this.eventosPorConv = agruparPorConversacion(seed.eventos);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS REALES (Supabase) — convive con el seed, no lo sustituye a ciegas
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * De dónde salieron los datos que se están mostrando.
   *
   * Existe para que la UI pueda decir la verdad. Antes, «la bandeja está
   * poblada» podía significar dos cosas indistinguibles: datos reales o el seed
   * de ejemplo. Un operador mirando la bandeja no tenía forma de saber si
   * estaba viendo a sus clientes o una maqueta, y eso es exactamente el tipo de
   * superficie que miente que no se debe entregar.
   *
   *   `cargando`  hay una lectura en curso
   *   `real`      son filas de `necto`, y puede haber cero
   *   `seed`      no se pudo leer y se muestra el ejemplo (con motivo)
   */
  origenDatos: "seed" | "real" | "cargando" = "seed";

  /** Por qué se está en `seed`, en lenguaje llano. Vacío si `origen` es `real`. */
  motivoSeed = "";

  /**
   * Último fallo al empujar `modo_atencion` a la base, en lenguaje llano.
   *
   * Existe porque «Tomar chat» y «Devolver al bot» cambian de aspecto al
   * pulsarlos y, si la escritura no llega, la bandeja mostraría un modo que la
   * base no tiene — y quien atiende creería que el bot está apagado cuando sigue
   * hablando, o al revés. Este campo es lo que convierte ese engaño en un aviso.
   */
  ultimoErrorModo: string | null = null;

  /**
   * Último fallo al enviar un mensaje del asesor, en lenguaje llano.
   *
   * `enviarComoNegocio` pinta la burbuja SOLO cuando WhatsApp aceptó el envío.
   * Pero hay un caso peor que el fallo limpio: el mensaje salió y no se pudo
   * guardar en la bandeja. Ahí el cliente lo tiene en el teléfono y el hilo no
   * lo muestra hasta que se recargue. Ese caso se dice, no se espera a que el
   * operador lo note al refrescar.
   */
  ultimoErrorEnvio: string | null = null;

  /**
   * Hay un envío en vuelo. Se expone para que el composer pueda deshabilitar el
   * botón: sin esto, dos Enters seguidos mandan el mensaje dos veces y le
   * cuestan al cliente dos notificaciones.
   */
  enviandoMensaje = false;

  /**
   * Carga el estado desde Supabase.
   *
   * NO bloquea el render y NO lanza: si no hay configuración o no hay sesión,
   * deja el seed puesto y anota el motivo. La app arranca siempre; lo que cambia
   * es lo que dice de sí misma.
   *
   * Idempotente. Se llama UNA vez tras configurar el cliente, nunca desde el
   * constructor: los stores son singletons de import, y hacer I/O en un
   * constructor convierte un `import` en un efecto de red.
   */
  async cargarDesdeBase(): Promise<void> {
    this.origenDatos = "cargando";
    const res = await cargarTodo();

    switch (res.estado) {
      case "ok":
        this.conversaciones = res.datos.conversaciones;
        this.mensajesPorConv = res.datos.mensajesPorConv;
        // Los eventos de sistema no existen en la base todavía: se vacían para
        // que no queden mezclados los del seed con datos reales. Mezclar los dos
        // orígenes sería peor que no tener eventos: una línea de tiempo con
        // anotaciones inventadas sobre conversaciones reales.
        this.eventosPorConv = new Map();
        this.origenDatos = "real";
        this.motivoSeed = "";
        break;

      case "sin_configuracion":
        this.origenDatos = "seed";
        this.motivoSeed = "Sin configuración de Supabase: mostrando datos de ejemplo.";
        break;

      case "sin_sesion":
        this.origenDatos = "seed";
        this.motivoSeed =
          "Sin sesión autenticada: las políticas RLS filtran a cero y la bandeja no puede leer. Mostrando datos de ejemplo.";
        break;

      case "sin_permiso":
        this.origenDatos = "seed";
        this.motivoSeed = `Sin permiso para leer conversaciones. ${res.detalle}`;
        break;

      case "error":
        this.origenDatos = "seed";
        this.motivoSeed = `Error al leer de la base: ${res.detalle}`;
        break;
    }

    // Se persiste igual que tras cualquier otra mutación, para que el estado que
    // ve la UI y el que se guarda no diverjan.
    this.persistir();
  }

  /**
   * Lee de la base los mensajes de la conversación seleccionada.
   *
   * Se pide por conversación y no todo de golpe porque `cargarDesdeBase` ya trae
   * los mensajes de todas: esto existe para refrescar un hilo abierto sin
   * recargar la bandeja entera.
   */
  async refrescarMensajes(convId: string): Promise<void> {
    const res = await cargarMensajes(convId);
    if (res.estado !== "ok") return;
    const actuales = this.mensajesPorConv.get(convId) ?? [];
    const porId = new Map(actuales.map((m) => [m.id, m]));
    for (const m of res.datos) porId.set(m.id, m);
    // Se reemplaza por la lista fresca conservando solo lo que no vino de la
    // base (mensajes locales aún sin persistir). Ordenar por timestamp mantiene
    // la línea de tiempo coherente cuando se mezclan.
    this.mensajesPorConv.set(
      convId,
      [...porId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    );
  }

  /**
   * Recibe una fila de mensaje cruda desde Supabase Realtime y la incorpora
   * instantáneamente a la memoria y a la UI en tiempo real (0 ms delay).
   */
  procesarMensajeRealtime(fila: any): void {
    const m = convertirFilaMensaje(fila);
    if (!m) return;

    const convId = m.conversacionId;
    const actuales = this.mensajesPorConv.get(convId) ?? [];

    if (actuales.some((item) => item.id === m.id)) return;

    const nuevos = [...actuales, m].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    this.mensajesPorConv.set(convId, nuevos);

    // Actualizar previsualización de última actividad
    const conv = this.conversaciones.find((c) => c.id === convId);
    if (conv) {
      conv.ultimaActividad = m.timestamp;
      if (m.autor === "cliente" && this.seleccionadaId !== convId) {
        conv.noLeidos = (conv.noLeidos || 0) + 1;
      }
    }

    this.persistir();
  }

  /**
   * Persiste el estado completo en `localStorage` bajo `STORAGE_KEY`, con
   * `try/catch` silencioso y fallback a memoria si no hay `localStorage`
   * (Req 9.1, 9.2). Las acciones futuras (mensajería/handoff/…) llamarán a este
   * método tras mutar el estado.
   */
  private persistir(): void {
    try {
      const estado: EstadoPersistido = {
        conversaciones: this.conversaciones,
        mensajesPorConv: mapToRecord(this.mensajesPorConv),
        eventosPorConv: mapToRecord(this.eventosPorConv),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
      // Sin localStorage: no-op (se sigue operando en memoria).
    }
  }

  // ── Lookups ─────────────────────────────────────────────────────────────────

  /** Cabecera de conversación por id. */
  getConversacion(id: string): Conversacion | undefined {
    return this.conversaciones.find((c) => c.id === id);
  }

  /**
   * Conversación de un teléfono, o `undefined` si no existe hilo para ese
   * número. Compara en forma normalizada (`normalizarTelefono`), de modo que
   * `"+57 300 555 1122"` y `"+573001112233"` son el mismo contacto.
   *
   * Derivación canónica ÚNICA para "buscar el hilo de un cliente": cualquier
   * superficie que necesite el hilo de un pedido lee este selector en lugar de
   * recorrer `conversaciones` por su cuenta. Dos barridos distintos con la misma
   * intención son una contradicción latente, no una implementación válida.
   *
   * Si por un dato inconsistente hubiera más de una conversación con el mismo
   * teléfono, gana la de `ultimaActividad` más reciente (el hilo vivo).
   *
   * ATENCIÓN (invariante D2 / Req 10.5): este selector NO importa ni consulta
   * `pedidos.store`; solo lee el estado propio del módulo. El cruce con Pedidos
   * sigue ocurriendo desde la capa de UI.
   *
   * NO CREA CONVERSACIONES. Un pedido no es dueño de un hilo: el hilo nace del
   * dispositivo del cliente. La ausencia se representa como ausencia.
   */
  porTelefono(telefono: string): Conversacion | undefined {
    const buscado = normalizarTelefono(telefono);
    if (buscado === "") return undefined;

    return this.conversaciones
      .filter((c) => normalizarTelefono(c.contacto.telefono) === buscado)
      .slice()
      .sort((a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad))[0];
  }

  /**
   * ¿Existe un hilo para este teléfono? Atajo booleano de `porTelefono`, para
   * los consumidores que solo necesitan decidir entre estado poblado y vacío.
   */
  tieneConversacion(telefono: string): boolean {
    return this.porTelefono(telefono) !== undefined;
  }

  // ── Selectores de "requiere atención" (eje de ATENCIÓN, no de pedido) ───────

  /**
   * ¿El cliente está esperando a un asesor humano AHORA?
   *
   * Es la ÚNICA definición de "requiere atención" en el eje de conversación, y
   * significa exactamente una cosa: el cliente pidió un humano y aún nadie ha
   * tomado el hilo. Se corresponde con `estado === "en_espera"`, que es lo que
   * fija `solicitarHumano()` al registrar el evento `handoff_solicitado`.
   *
   * NO se deriva de `noLeidos` ni de la antigüedad del último mensaje: son
   * señales de actividad, no de petición. Un hilo con mensajes sin leer que
   * lleva el bot NO requiere un humano, y tratarlo como tal produciría una
   * bandeja de urgencias falsa.
   *
   * Y NO es lo mismo que `estaPendiente()`: aquel abarca también `abierta`. Ver
   * `ESTADOS_CON_ATENCION` para por qué las dos preguntas son distintas.
   */
  requiereAtencionHumana(conv: Conversacion): boolean {
    return ESTADOS_CON_ATENCION.includes(conv.estado);
  }

  /**
   * ¿La lleva el bot en este momento? Atajo de lectura sobre el eje de atención,
   * para los consumidores que solo necesitan esa decisión booleana.
   */
  laLlevaElBot(conv: Conversacion): boolean {
    return conv.atencion === "bot";
  }

  /**
   * Conversaciones que requieren atención humana, las más urgentes primero.
   *
   * Ordena por `ultimaActividad` ASCENDENTE: quien lleva MÁS tiempo esperando va
   * primero. Es el orden correcto para una cola de atención —al revés dejaría
   * al cliente más desatendido al final de la lista— y es deliberadamente
   * distinto del orden de la bandeja, que es descendente por ser un feed de
   * actividad reciente.
   *
   * No muta el array observable: ordena sobre una copia.
   */
  get requierenAtencion(): Conversacion[] {
    return this.conversaciones
      .filter((c) => this.requiereAtencionHumana(c))
      .slice()
      .sort((a, b) => a.ultimaActividad.localeCompare(b.ultimaActividad));
  }

  /** Cuántas conversaciones están esperando a un asesor humano ahora mismo. */
  get totalRequierenAtencion(): number {
    return this.requierenAtencion.length;
  }

  /**
   * Minutos que lleva la conversación esperando desde su última actividad.
   *
   * Para un hilo `en_espera`, `ultimaActividad` es el instante en que el cliente
   * pidió el humano (lo fija `solicitarHumano()`), así que esto mide la espera
   * real. El cálculo vive AQUÍ y no en la vista para que las dos superficies que
   * muestran la espera —la tarjeta de Inicio y la bandeja— no puedan discrepar.
   */
  minutosEsperando(conv: Conversacion): number {
    const ms = Date.now() - new Date(conv.ultimaActividad).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 0;
    return Math.floor(ms / 60000);
  }

  // ── Bandeja / filtros / no leídos (tarea 3.8) ────────────────────────────────

  /**
   * Bandeja: conversaciones tras aplicar el `filtro` y la `busqueda` activos,
   * ordenadas por `ultimaActividad` descendente con desempate estable por `id`
   * ascendente (Req 1.1). Filtro y búsqueda se combinan en AND.
   *
   * Filtros (Req 1.3–1.6): `todas` (sin restricción), `no_leidas`
   * (`noLeidos > 0`), `requieren_atencion` (`estado === "en_espera"`),
   * `cerradas` (`estado === "cerrada"`).
   *
   * Búsqueda (Req 1.7): si el texto (tras `trim`) no está vacío, restringe a las
   * conversaciones cuyo `contacto.nombre` o `contacto.telefono` contiene el
   * texto, sin distinguir mayúsculas/minúsculas.
   *
   * No muta el array observable: ordena sobre una copia (`[...].sort()`).
   */
  get bandeja(): Conversacion[] {
    const termino = this.busqueda.trim().toLowerCase();

    const coincideFiltro = (c: Conversacion): boolean => {
      switch (this.filtro) {
        case "todas":
          return true;
        case "no_leidas":
          return c.noLeidos > 0;
        case "requieren_atencion":
          // Delega en el predicado canónico. Escribir aquí `c.estado ===
          // "en_espera"` era una SEGUNDA implementación del mismo conjunto: con
          // el predicado cambiado, el filtro y el contador divergían en silencio.
          return this.requiereAtencionHumana(c);
        case "cerradas":
          return c.estado === "cerrada";
        default:
          return true;
      }
    };

    const coincideBusqueda = (c: Conversacion): boolean => {
      if (termino === "") return true;
      const nombre = c.contacto.nombre.toLowerCase();
      const telefono = c.contacto.telefono.toLowerCase();
      return nombre.includes(termino) || telefono.includes(termino);
    };

    return this.conversaciones
      .filter((c) => coincideFiltro(c) && coincideBusqueda(c))
      .slice()
      .sort((a, b) => {
        const porActividad = b.ultimaActividad.localeCompare(a.ultimaActividad);
        if (porActividad !== 0) return porActividad; // desc
        return a.id.localeCompare(b.id); // desempate estable, id asc (Req 1.1)
      });
  }

  /** Nº total de no leídos, sumando `noLeidos` de todas las conversaciones. */
  get totalNoLeidos(): number {
    return this.conversaciones.reduce((total, c) => total + c.noLeidos, 0);
  }

  // ── Historial de atención: métricas y lectura de tickets ─────────────────────

  /**
   * Nº total de tickets del historial: todas las conversaciones, sin filtro ni
   * búsqueda. Derivación canónica ÚNICA de la tarjeta "Total Tickets" — ninguna
   * superficie cuenta `conversaciones.length` por su cuenta (dos barridos con la
   * misma intención son una contradicción latente, no una implementación válida).
   */
  get totalTickets(): number {
    return this.conversaciones.length;
  }

  /**
   * ¿Está esta conversación resuelta? Predicado canónico del estado terminal.
   *
   * Existe como método y no como `estado === "cerrada"` repetido para que el
   * vocabulario del estado terminal viva en un único sitio. Si el dominio
   * añadiera otro estado terminal, se cambia aquí y no en cada consumidor.
   */
  estaResuelta(conv: Conversacion): boolean {
    return conv.estado === "cerrada";
  }

  /**
   * ¿Está esta conversación pendiente de resolución? Predicado canónico de
   * "pendiente" para el historial: `abierta` (la atiende el bot, nadie la ha
   * resuelto) o `en_espera` (el cliente pidió un asesor y sigue esperando).
   *
   * `atendida` NO es pendiente: hay un operador trabajándola. Y `cerrada` es el
   * único estado resuelto.
   *
   * LOS TRES PREDICADOS SON LA PARTICIÓN CANÓNICA de `EstadoConversacion`:
   * `estaResuelta`, `estaPendiente` y `estaEnProgreso` son exhaustivos y
   * mutuamente excluyentes — cada hilo cae en exactamente uno, y
   * `pendientes + enProgreso + resueltas === totalTickets`.
   *
   * `requiereAtencionHumana` NO forma parte de esta partición: pregunta otra
   * cosa y su conjunto (`en_espera`) es un SUBCONJUNTO de `estaPendiente`. Un
   * selector nuevo que necesite preguntar por urgencia debe restringir estos
   * tres, no añadir una cuarta partición que los contradiga.
   */
  estaPendiente(conv: Conversacion): boolean {
    return conv.estado === "abierta" || conv.estado === "en_espera";
  }

  /**
   * ¿Está esta conversación en curso con un operador? `atendida` es el único
   * estado no terminal con un humano asignado (`atendida ⟹ humano ∧ operador≠null`,
   * Property 2 / Req 4.9).
   */
  estaEnProgreso(conv: Conversacion): boolean {
    return conv.estado === "atendida";
  }

  /** Nº de tickets resueltos (estado terminal `cerrada`). */
  get ticketsResueltos(): number {
    return this.conversaciones.filter((c) => this.estaResuelta(c)).length;
  }

  /**
   * Nº de tickets pendientes: ni resueltos ni en curso. Tarjeta "Pendientes".
   *
   * Es el complemento exacto de `ticketsResueltos`: `pendientes + resueltos +
   * enProgreso === totalTickets`. La tabla del historial muestra las tres
   * categorías, por lo que las tres se derivan de los mismos predicados y no de
   * conteos independientes.
   *
   * NO se confunde con `totalRequierenAtencion`, que cuenta solo `en_espera`.
   * Son dos cifras legítimamente distintas: «pendiente» incluye lo que lleva el
   * bot; «requiere atención» no.
   */
  get ticketsPendientes(): number {
    return this.conversaciones.filter((c) => this.estaPendiente(c)).length;
  }

  /** Nº de tickets en curso con un operador (`atendida`). Tarjeta "En curso". */
  get ticketsEnProgreso(): number {
    return this.conversaciones.filter((c) => this.estaEnProgreso(c)).length;
  }

  /**
   * Asunto de un ticket: el texto del PRIMER mensaje del CLIENTE del hilo, con
   * los saltos de línea colapsados a un espacio para que quepa en una celda.
   *
   * El dominio NO tiene un campo `asunto` (ver `conversaciones.types.ts`): el
   * "asunto" de un ticket es una derivación de presentación, y por eso se deriva
   * aquí, en el dueño del estado, y no en la celda de la tabla. Devuelve `""`
   * cuando el hilo no tiene ningún mensaje del cliente — la ausencia se
   * representa como ausencia, nunca con un texto de relleno.
   *
   * Se busca el primer mensaje del cliente y no el primero del hilo porque el bot
   * suele abrir la conversación: el primer mensaje del hilo no es lo que el
   * cliente pidió, y usarlo como asunto describiría mal el ticket.
   */
  asuntoDe(convId: string): string {
    const mensajes = this.mensajesPorConv.get(convId) ?? [];
    const primeroCliente = mensajes.find((m) => m.autor === "cliente");
    if (!primeroCliente) return "";
    return primeroCliente.contenido.texto.replace(/\s+/g, " ").trim();
  }


  // ── Módulos tocados por una conversación (filtro transversal) ────────────────

  /**
   * Módulos de dominio que aparecen en una conversación, derivados del
   * `moduloContexto` de sus mensajes. Una conversación es transversal: puede
   * tocar varios módulos (p. ej. Pedidos e Inventario en el mismo hilo). Los
   * mensajes sin `moduloContexto` (o marcados "general") no cuentan como módulo.
   * Devuelve los módulos únicos, sin orden garantizado.
   */
  modulosDe(convId: string): ModuloDestino[] {
    const mensajes = this.mensajesPorConv.get(convId) ?? [];
    const set = new Set<ModuloDestino>();
    for (const m of mensajes) {
      if (m.moduloContexto && m.moduloContexto !== "general") {
        set.add(m.moduloContexto);
      }
    }
    return [...set];
  }

  /**
   * Dominio PRINCIPAL de una conversación: el del ÚLTIMO mensaje etiquetado.
   *
   * Es la simétrica "de un solo valor" de `modulosDe`: aquella responde "¿qué
   * módulos tocó el hilo?" (lista, para el filtro transversal) y esta responde
   * "¿de qué se está hablando AHORA?" (uno, para el badge de la fila). Se
   * necesita porque un hilo es transversal —puede tocar Pedidos e Inventario—
   * y la fila de la bandeja no puede apilar un badge por cada módulo tocado.
   *
   * Criterio: el último, no el primero. Un hilo que empieza preguntando por
   * existencias y termina en un pedido debe leerse como `pedidos`, y eso solo lo
   * da el orden temporal. Al derivarse en cada lectura (MobX re-evalúa), el
   * dominio principal cambia solo cuando el hilo avanza: no hay campo que
   * sincronizar ni máquina de estados que mantener.
   *
   * Fallback `"general"`: un hilo sin ningún mensaje etiquetado no tiene
   * dominio, y `"general"` es el valor del tipo que lo expresa. NO se devuelve
   * `undefined` para que el consumidor no tenga que distinguir "sin dominio" de
   * "no existe la conversación" — el llamador decide si oculta el badge
   * comparando contra `"general"`.
   */
  moduloPrincipalDe(convId: string): ModuloDestino {
    const mensajes = this.mensajesPorConv.get(convId) ?? [];
    for (let i = mensajes.length - 1; i >= 0; i -= 1) {
      const modulo = mensajes[i]?.moduloContexto;
      if (modulo && modulo !== "general") return modulo;
    }
    return "general";
  }


  // ── Línea de tiempo unificada derivada (tarea 3.10) ──────────────────────────

  /**
   * Línea de tiempo unificada de una conversación (Req 2.1): intercala los
   * mensajes y los eventos de sistema de la conversación como `ItemLineaTiempo[]`
   * ordenados por `timestamp` ascendente. Es una preocupación de PRESENTACIÓN
   * derivada del estado (decisión de diseño "mensajes/eventos separados, línea de
   * tiempo derivada"): no persiste ni duplica la verdad, se recomputa al leer.
   *
   * Al ser un método que lee las colecciones observables (`mensajesPorConv` /
   * `eventosPorConv`) dentro de sí, sigue siendo reactivo bajo `makeAutoObservable`
   * (los consumidores `observer` re-renderizan al cambiar mensajes o eventos).
   *
   * No muta las colecciones observables: envuelve sobre COPIAS. Toma
   * `mensajesPorConv.get(convId) ?? []` y `eventosPorConv.get(convId) ?? []`, los
   * mapea a `{clase:"mensaje"|"evento", data}` en arrays nuevos y ordena una
   * concatenación nueva (`[...mensajes, ...eventos]`), sin tocar los arrays fuente.
   *
   * Estabilidad ante timestamps IDÉNTICOS (Req 2.1): se garantiza por diseño y
   * no solo por el detalle de implementación de `Array.prototype.sort`.
   *  1. ORDEN DE INSERCIÓN DETERMINISTA: se construye el array combinado
   *     concatenando SIEMPRE primero los mensajes (en su orden de inserción) y
   *     luego los eventos (en su orden de inserción). Ese es el orden que debe
   *     preservarse ante empates.
   *  2. COMPARADOR QUE SOLO DISTINGUE POR TIMESTAMP: `localeCompare` sobre el
   *     `timestamp` ISO 8601 retorna 0 EXACTAMENTE cuando los timestamps son
   *     iguales; ante empate el comparador no reordena.
   *  3. SORT ESTABLE: `Array.prototype.sort` es estable por especificación
   *     (ECMAScript 2019+), por lo que los elementos con comparación 0 conservan
   *     su posición relativa del array combinado (el orden de inserción del paso 1).
   * La combinación de (1) un orden de inserción determinista y (2) un comparador
   * que retorna 0 solo ante timestamps iguales, sobre (3) un sort estable, hace
   * que el resultado ante empates sea el orden de inserción: mensajes antes que
   * eventos, y dentro de cada grupo su orden original.
   *
   * Caso vacío (Req 2.1 / analogía Req 2.5): si no hay ni mensajes ni eventos,
   * la concatenación es `[]` y se retorna `[]`.
   */
  lineaDeTiempo(convId: string): ItemLineaTiempo[] {
    const mensajes: ItemLineaTiempo[] = (
      this.mensajesPorConv.get(convId) ?? []
    ).map((data) => ({ clase: "mensaje", data }));
    const eventos: ItemLineaTiempo[] = (
      this.eventosPorConv.get(convId) ?? []
    ).map((data) => ({ clase: "evento", data }));

    // Orden de inserción determinista: mensajes primero, eventos después. El
    // spread crea un array NUEVO, por lo que `sort` no muta las colecciones
    // observables ni los arrays intermedios `mensajes`/`eventos`.
    return [...mensajes, ...eventos].sort((a, b) =>
      // Retorna 0 SOLO ante timestamps iguales; el sort estable preserva
      // entonces el orden de inserción (estabilidad ante empates, Req 2.1).
      a.data.timestamp.localeCompare(b.data.timestamp),
    );
  }

  // ── Lectura / selección (tarea 3.8) ──────────────────────────────────────────

  /**
   * Marca la conversación como leída fijando `noLeidos = 0` (Req 1.11) y
   * persiste. No-op si la conversación no existe.
   */
  marcarLeido(convId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    conv.noLeidos = 0;
    this.persistir();
  }

  /**
   * Selecciona una conversación en la consola: fija `seleccionadaId` y la marca
   * como leída (Req 1.10/1.11). `marcarLeido` ya persiste el estado.
   */
  seleccionar(convId: string): void {
    this.seleccionadaId = convId;
    this.marcarLeido(convId);
  }

  /** Fija el filtro activo de la bandeja (Req 1.3–1.6). */
  setFiltro(f: FiltroBandeja): void {
    this.filtro = f;
  }

  /** Fija el texto del buscador de la bandeja (Req 1.7). */
  setBusqueda(q: string): void {
    this.busqueda = q;
  }

  // ── Acciones de mensajería (tarea 3.4) ───────────────────────────────────────

  /**
   * El cliente escribe (desde `/wa`). Autor `"cliente"` (Req 3.3): agrega el
   * mensaje, incrementa `noLeidos` y actualiza `ultimaActividad`. Rechaza sin
   * mutar estado si la conversación no existe, si el texto es vacío/solo
   * espacios o si excede el límite del cliente (Req 6.2/6.3). Si la atención es
   * del bot y la conversación no está cerrada, dispara la respuesta automática
   * (Req 5.1); la lógica real la implementa la tarea 3.12.
   */
  enviarComoCliente(convId: string, texto: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (texto.trim() === "") return; // vacío / solo espacios: no-op (Req 6.3)
    if (texto.length > LIMITE_TEXTO_CLIENTE) return; // excede límite (Req 6.2)

    this.agregarMensaje(convId, "cliente", texto);
    conv.noLeidos += 1;
    conv.ultimaActividad = nowIso();
    this.persistir();

    if (conv.atencion === "bot" && conv.estado !== "cerrada") {
      // async fire-and-forget: la respuesta del bot es un efecto posterior.
      void this.simularRespuestaBot(convId);
    }
  }

  /**
   * El operador responde (desde `/conversaciones`). Autor `"negocio"` (Req 3.3):
   * agrega el mensaje como el más reciente y actualiza `ultimaActividad`, SIN
   * incrementar `noLeidos` (Req 3.6).
   *
   * ── Lo que cambió el 22/09 ────────────────────────────────────────────────
   *
   * Antes esto insertaba el mensaje en `mensajesPorConv` y llamaba a
   * `persistir()` (localStorage). Es decir: la burbuja aparecía en el hilo y
   * **el cliente no recibía nada**. El operador veía su mensaje en pantalla y
   * creía haber respondido. Un control que miente, que es justo lo que este
   * proyecto no acepta entregar.
   *
   * Ahora envía de verdad, por tres razones:
   *
   *  1. Se pide el envío a la API (`enviarMensajeOperador`), que es la única que
   *     puede hablar con Zernio porque es la única que tiene la clave.
   *  2. La burbuja se pinta DESPUÉS de que WhatsApp aceptó. Al revés —pintar
   *     primero y corregir después— es lo que hacía que un fallo dejara el hilo
   *     diciendo algo que el cliente nunca leyó.
   *  3. Si el envío falla, NO se pinta y se avisa por `ultimoErrorEnvio`. El
   *     fallo se ve; el silencio no.
   *
   * Rechaza sin mutar estado si la conversación no existe, si el texto es
   * vacío/solo espacios (Req 3.4) o si excede los 4096 caracteres (Req 3.5). El
   * gating de capacidad vive en la UI y, además, lo re-verifica el servicio con
   * la identidad del operador: aquí no se duplica esa decisión.
   *
   * Guarda de MODO DE ATENCIÓN: no-op si la conversación la lleva el bot. Es la
   * simétrica de la guarda `atencion !== "bot"` de `simularRespuestaBot`, y
   * existe por la misma razón: el autor del mensaje debe corresponder con quién
   * atiende el hilo. La UI ya bloquea el campo; esta guarda es la defensa en
   * profundidad para cualquier otro llamador.
   */
  async enviarComoNegocio(
    convId: string,
    texto: string,
    moduloContexto?: ModuloDestino,
  ): Promise<void> {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.atencion !== "humano") return; // el bot lleva el hilo: no hay emisor humano
    if (texto.trim() === "") return; // vacío / solo espacios: no-op (Req 3.4)
    if (texto.length > LIMITE_TEXTO_NEGOCIO) return; // excede límite (Req 3.5)
    if (this.enviandoMensaje) return; // ya hay un envío en vuelo

    this.enviandoMensaje = true;
    this.ultimoErrorEnvio = null;
    try {
      const res = await enviarMensajeOperador(convId, texto);

      if (!res.ok) {
        // NO se pinta la burbuja: el mensaje no salió, así que mostrarlo sería
        // afirmar algo falso. Se avisa y se deja el texto donde estaba.
        this.ultimoErrorEnvio = res.detalle;
        return;
      }

      // Salido y guardado: ahora sí, la burbuja es verdad.
      this.agregarMensaje(convId, "negocio", texto, moduloContexto);
      conv.ultimaActividad = res.enviadoEn;
      this.persistir();
      void this.refrescarMensajes(convId);
    } finally {
      this.enviandoMensaje = false;
    }
  }

  /**
   * Helper interno: construye un `Mensaje` de tipo `texto` y lo inserta como el
   * más reciente en `mensajesPorConv` (creando el array si aún no existe).
   *
   * Guarda defensiva de alcance (Req 10.2/10.4): el contenido siempre se
   * construye como `tipo:"texto"`, pero solo se persiste el mensaje si el canal
   * de la conversación es `"whatsapp"` y el contenido es de tipo `"texto"`; en
   * caso contrario no muta estado. En el MVP ambas condiciones se cumplen
   * siempre, por lo que la guarda es coherente y no altera el comportamiento.
   */
  private agregarMensaje(
    convId: string,
    autor: Mensaje["autor"],
    texto: string,
    moduloContexto?: ModuloDestino,
  ): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.canal !== "whatsapp") return; // canal no soportado (Req 10.4)

    const contenido: Mensaje["contenido"] = { tipo: "texto", texto };
    if (contenido.tipo !== "texto") return; // tipo no soportado (Req 10.2)

    const mensaje: Mensaje = {
      id: generarId(),
      conversacionId: convId,
      autor,
      contenido,
      timestamp: nowIso(),
      // La clave se OMITE cuando no hay módulo —en vez de escribir `undefined`—
      // para no alterar la forma serializada de los mensajes existentes.
      ...(moduloContexto !== undefined ? { moduloContexto } : {}),
    };

    const grupo = this.mensajesPorConv.get(convId);
    if (grupo) grupo.push(mensaje);
    else this.mensajesPorConv.set(convId, [mensaje]);
  }

  // ── Handoff: máquina de estados (tarea 3.6) ──────────────────────────────────

  /**
   * El cliente pide hablar con un asesor. Transición `abierta → en_espera`
   * (Req 4.1): fija Estado_Conversacion en `en_espera`, Modo_De_Atencion en
   * `humano`, actualiza `ultimaActividad` y registra el Evento_De_Sistema
   * `handoff_solicitado` (Req 4.7).
   *
   * Fail-safe (Property 1 / Req 4.8): no-op sin evento si la conversación no
   * existe o si su estado es `cerrada` (no se reactiva desde aquí). Cualquier
   * otro estado distinto de `abierta` no cae en `abierta → en_espera`, pero el
   * pseudocódigo solo bloquea explícitamente `cerrada`; los demás estados
   * (`en_espera`, `atendida`) reafirman el modo humano sin daño.
   */
  solicitarHumano(convId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.estado === "cerrada") return; // no reactivar aquí (Req 4.8)

    conv.estado = "en_espera";
    conv.atencion = "humano";
    conv.ultimaActividad = nowIso();
    this.registrarEvento(
      convId,
      "handoff_solicitado",
      "El cliente pidió hablar con un asesor",
    );
    this.persistir();
  }

  /**
   * Empuja a la BASE el modo de atención que se acaba de cambiar en memoria.
   *
   * ── Por qué esto no es opcional ───────────────────────────────────────────
   *
   * `modo_atencion` es la puerta del bot: si está en `humano`, el paso 3 de
   * `procesarEntrante` devuelve `silencio` y el bot no contesta. Escribirlo solo
   * en `localStorage` —lo que hacía este store— significaba que pulsar «Tomar
   * chat» o «Devolver al bot» **no cambiaba nada real**: la bandeja se veía
   * distinta y el bot seguía mudo o seguía hablando. Un control que miente.
   *
   * Se llama DESPUÉS de mutar el estado local para que la UI responda al
   * instante, y el resultado se propaga por `ultimoErrorModo` en vez de
   * tragarse: si la escritura no llegó, la pantalla lo dice y el operador se
   * entera. Lo peor que puede pasar aquí es un cambio que solo existe en el
   * navegador, y para eso está el aviso.
   */
  private async empujarModo(convId: string, modo: ModoAtencion): Promise<void> {
    this.ultimoErrorModo = null;
    const res = await cambiarModoAtencion(convId, modo);
    if (!res.ok) {
      // No se revierte el estado local: la UI debe mostrar lo que el operador
      // pidió, junto al motivo de que no se aplicó. Revertirlo en silencio
      // dejaría al operador creyendo que pulsó y no pasó nada.
      this.ultimoErrorModo = `No se pudo cambiar el modo en la base: ${res.detalle}`;
      return;
    }
    // El tiempo real ya recarga la fila; este refresco es por si el canal está
    // caído y para que la marca de `/conversaciones` no dependa de él.
    void this.refrescarMensajes(convId);
  }

  /**
   * El operador toma la conversación. Transición `en_espera|abierta → atendida`
   * (Req 4.2): fija Estado_Conversacion en `atendida`, Modo_De_Atencion en
   * `humano`, asigna `operadorAsignadoId`, actualiza `ultimaActividad` y
   * registra el Evento_De_Sistema `tomada` con `actorId = operadorId` (Req 4.7).
   *
   * El gating por capacidad `channels.respond` vive en la UI (Req 4.3): el store
   * asume que quien llama ya fue autorizado y NO comprueba capacidades aquí.
   *
   * Fail-safe (Property 1 / Req 4.8): no-op sin evento si la conversación no
   * existe o si su estado no es `en_espera` ni `abierta`. La transición deja el
   * estado coherente (Property 2 / Req 4.9): `atendida ⟹ humano ∧ operador!=null`.
   */
  tomar(convId: string, operadorId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.estado !== "en_espera" && conv.estado !== "abierta") return;

    conv.estado = "atendida";
    conv.atencion = "humano";
    conv.operadorAsignadoId = operadorId;
    conv.ultimaActividad = nowIso();
    this.registrarEvento(
      convId,
      "tomada",
      "Conversación tomada por el operador",
      operadorId,
    );
    this.persistir();
    void this.empujarModo(convId, "humano");
  }

  /**
   * El operador devuelve la conversación al bot. Transición `atendida → abierta`
   * (Req 4.4): fija Estado_Conversacion en `abierta`, Modo_De_Atencion en `bot`,
   * libera el operador (`operadorAsignadoId = null`), actualiza `ultimaActividad`
   * y registra el Evento_De_Sistema `devuelta` (Req 4.7).
   *
   * El gating por capacidad `channels.respond` vive en la UI (Req 4.3).
   *
   * Fail-safe (Property 1 / Req 4.8): no-op sin evento si la conversación no
   * existe o si su estado no es `atendida`. La transición deja el estado
   * coherente (Property 2 / Req 4.10): `atencion "bot" ⟹ operadorAsignadoId=null`.
   */
  devolver(convId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.estado !== "atendida") return;

    conv.estado = "abierta";
    conv.atencion = "bot";
    conv.operadorAsignadoId = null;
    conv.ultimaActividad = nowIso();
    this.registrarEvento(convId, "devuelta", "Conversación devuelta al bot");
    this.persistir();
    void this.empujarModo(convId, "bot");
  }

  /**
   * Devuelve al bot un hilo que está en `humano` **sin** haber sido tomado.
   *
   * Es el estado en el que deja el hilo un handoff del bot: `modo_atencion` en
   * `humano`, pero `estado` en `abierta` y sin operador asignado — porque nadie
   * lo tomó, lo transfirió el bot.
   *
   * ── Por qué no basta con `devolver` ───────────────────────────────────────
   *
   * `devolver` exige `estado === "atendida"`. En este caso el estado es
   * `abierta`, así que la guarda lo rechaza y no pasa nada: desde la bandeja no
   * había manera de encender el bot sin antes «tomar» el chat, que asigna un
   * operador que nunca lo atendió. Dos pasos para deshacer uno, y con un estado
   * intermedio que miente.
   *
   * Aquí no hay transición de estado que hacer —el hilo ya está `abierta`—,
   * solo devolver la atención al bot. Es la operación que faltaba.
   */
  devolverAlBot(convId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.estado === "cerrada") return;
    if (conv.atencion !== "humano") return; // ya lo lleva el bot

    conv.atencion = "bot";
    conv.operadorAsignadoId = null;
    conv.ultimaActividad = nowIso();
    this.registrarEvento(convId, "devuelta", "Conversación devuelta al bot");
    this.persistir();
    void this.empujarModo(convId, "bot");
  }

  /**
   * Cierra la conversación. Transición `* → cerrada` (Req 4.5): fija
   * Estado_Conversacion en `cerrada`, actualiza `ultimaActividad` y registra el
   * Evento_De_Sistema `cerrada` (Req 4.7).
   *
   * Fail-safe (Req 4.6/4.8): no-op sin evento si la conversación no existe o si
   * su estado ya es `cerrada` (no se registra evento duplicado).
   */
  cerrar(convId: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.estado === "cerrada") return; // ya cerrada: sin cambios ni evento (Req 4.6)

    conv.estado = "cerrada";
    conv.ultimaActividad = nowIso();
    this.registrarEvento(convId, "cerrada", "Conversación resuelta");
    this.persistir();
  }

  /**
   * Helper interno: construye un `Evento_De_Sistema` (id único + timestamp ISO
   * del momento actual) y lo inserta en `eventosPorConv` para la conversación,
   * creando el array si aún no existe. Base común de las transiciones de handoff
   * (Req 4.7); no persiste por sí mismo (cada transición válida llama a
   * `this.persistir()` tras registrar su evento).
   */
  private registrarEvento(
    convId: string,
    tipo: EventoSistema["tipo"],
    texto: string,
    actorId?: string,
  ): void {
    const evento: EventoSistema = {
      id: generarId(),
      conversacionId: convId,
      tipo,
      texto,
      timestamp: nowIso(),
      ...(actorId !== undefined ? { actorId } : {}),
    };

    const grupo = this.eventosPorConv.get(convId);
    if (grupo) grupo.push(evento);
    else this.eventosPorConv.set(convId, [evento]);
  }

  // ── Atención automática (delegada en el adaptador → AssistantEngine) ─────────

  /**
   * Pide al bot que responda al último mensaje del cliente (Req 5.1). NO
   * contiene lógica de intención (invariante D3 / Req 5.2): toda la resolución
   * pasa por `conversacionesBotAdapter.responder(...)` → `AssistantEngine` /
   * `ToolRegistry`, y el resultado se agrega vía `agregarMensajeBot`.
   *
   * Guardas (Req 5.1): no-op si la conversación no existe, si el
   * Modo_De_Atencion no es `"bot"` (solo el bot responde en modo bot) o si el
   * estado es `"cerrada"`. También no-op si no hay ningún mensaje del cliente
   * del cual partir.
   *
   * `async` porque `AssistantEngine.ask` es asíncrono; el adaptador ya maneja
   * internamente timeout/fallback/errores (Req 5.6), por lo que aquí no se
   * envuelve en `try/catch`.
   */
  async simularRespuestaBot(convId: string): Promise<void> {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.atencion !== "bot") return; // solo el bot responde en modo bot (Req 5.1)
    if (conv.estado === "cerrada") return; // no responder en conversación cerrada

    const mensajes = this.mensajesPorConv.get(convId) ?? [];

    // Último mensaje del cliente: recorre desde el final buscando autor "cliente".
    const ultimoCliente = [...mensajes]
      .reverse()
      .find((m) => m.autor === "cliente");
    if (!ultimoCliente) return; // sin mensaje del cliente: nada que responder

    const textoCliente = ultimoCliente.contenido.texto;

    // Historial opcional para el engine (el MVP puede ignorarlo). Se mapea la
    // conversación a `AssistantMessage[]`: cliente → "user"; negocio/bot →
    // "assistant". El adaptador/engine decide si lo usa (Req 5.2).
    const history: AssistantMessage[] = mensajes.map((m) => ({
      id: m.id,
      role: m.autor === "cliente" ? "user" : "assistant",
      text: m.contenido.texto,
      createdAt: m.timestamp,
    }));

    const resultado = await conversacionesBotAdapter.responder({
      textoCliente,
      history,
    });

    this.agregarMensajeBot(
      convId,
      resultado.texto,
      resultado.payload,
      resultado.modulo,
    );
  }

  /**
   * Uso interno del adaptador: agrega un mensaje del bot ya resuelto (Req 5.3).
   *
   * Si `texto` está vacío o es solo espacios en blanco, NO agrega mensaje
   * (Req 5.7): el bot no responde con contenido vacío. Con contenido, inserta un
   * ÚNICO `Mensaje` autor `"bot"` (contenido `tipo:"texto"`, timestamp ISO del
   * momento, id único, y `payload` si viene) como el más reciente, SIN
   * incrementar `noLeidos` (analogía con `enviarComoNegocio`, Req 3.6). Actualiza
   * `ultimaActividad` y persiste.
   *
   * Guarda de alcance (Req 10.4): no-op si la conversación no existe o si su
   * canal no es `"whatsapp"`.
   *
   * `moduloContexto` es OPCIONAL y aditivo (retrocompatible con las llamadas de
   * 3 argumentos): etiqueta el mensaje con el dominio que lo originó, que es lo
   * que `modulosDe` lee para el filtro transversal. Sin él, un aviso automático
   * de Pedidos no marcaría el hilo como tocado por Pedidos. La clave se OMITE
   * cuando no se pasa —en vez de escribir `undefined`— para no alterar la forma
   * serializada de los mensajes ya existentes.
   */
  agregarMensajeBot(
    convId: string,
    texto: string,
    payload?: Mensaje["payload"],
    moduloContexto?: ModuloDestino,
  ): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (texto.trim() === "") return; // sin contenido: no se agrega (Req 5.7)
    if (conv.canal !== "whatsapp") return; // canal no soportado (Req 10.4)

    const mensaje: Mensaje = {
      id: generarId(),
      conversacionId: convId,
      autor: "bot",
      contenido: { tipo: "texto", texto },
      timestamp: nowIso(),
      ...(moduloContexto !== undefined ? { moduloContexto } : {}),
      ...(payload !== undefined ? { payload } : {}),
    };

    const grupo = this.mensajesPorConv.get(convId);
    if (grupo) grupo.push(mensaje);
    else this.mensajesPorConv.set(convId, [mensaje]);

    conv.ultimaActividad = nowIso();
    this.persistir();
  }
}

/** Singleton del store, consumido por la consola `/conversaciones` y `/wa`. */
export const conversacionesStore = new ConversacionesStore();
