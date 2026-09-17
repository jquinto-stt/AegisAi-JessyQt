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
 * Etiqueta legible de un estado de conversación, para el badge del historial.
 *
 * Es el vocabulario de presentación del estado y vive AQUÍ, junto al tipo que lo
 * define, para que ninguna superficie escriba la etiqueta como literal. Dos
 * pantallas que rotulan el mismo estado con cadenas distintas escritas a mano es
 * un defecto de vocabulario, no una variación estilística.
 *
 * Por qué "In progress" y no "Open" para `atendida`: el diseño canónico muestra
 * tres categorías —resuelto, pendiente y en curso—, y `atendida` es el único
 * estado en el que hay un operador trabajándolo (`atendida ⟹ humano ∧ operador≠null`).
 * `abierta` es el ticket que lleva el bot y nadie ha reclamado: eso es "Open".
 */
export const ESTADO_CONVERSACION_LABEL: Record<EstadoConversacion, string> = {
  abierta: "Open",
  en_espera: "Pending",
  atendida: "In progress",
  cerrada: "Solved",
};

/**
 * Color de badge (vocabulario de `Badge`) para cada estado de conversación.
 *
 * `success` = resuelto, `warning` = esperando a un humano, `info` = en curso con
 * un operador, `primary` = el bot lo lleva. El tipo se ancla a `BadgeColor` vía
 * el `Record`, de modo que añadir un color inexistente es un error de compilación
 * y no una clase que Tailwind descarta en silencio.
 */
export const ESTADO_CONVERSACION_BADGE: Record<EstadoConversacion, BadgeColor> = {
  abierta: "primary",
  en_espera: "warning",
  atendida: "info",
  cerrada: "success",
};

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
   */
  requiereAtencionHumana(conv: Conversacion): boolean {
    return conv.estado === "en_espera";
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
          return c.estado === "en_espera";
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
   * `atendida` NO es pendiente: hay un operador trabajándola. Esos tickets no se
   * cuentan en "Pending" ni en "Solved" — aparecen en la tabla como "In Progress".
   * Y `cerrada` es el único estado resuelto.
   *
   * Los tres predicados (`estaResuelta`, `estaPendiente`, `estaEnProgreso`) son
   * exhaustivos y mutuamente excluyentes sobre `EstadoConversacion`: cada
   * conversación cae en exactamente uno.
   */
  estaPendiente(conv: Conversacion): boolean {
    return conv.estado === "abierta" || conv.estado === "en_espera";
  }

  /**
   * ¿Está esta conversación en curso con un operador? `atendida` es el único
   * estado no terminal con un humano asignado (`atendida ⟹ humano ∧ operador≠null`,
   * Property 2 / Req 4.9). Es el eje que el diseño canónico llama "In Progress".
   */
  estaEnProgreso(conv: Conversacion): boolean {
    return conv.estado === "atendida";
  }

  /** Nº de tickets resueltos (estado terminal `cerrada`). Tarjeta "Solved". */
  get ticketsResueltos(): number {
    return this.conversaciones.filter((c) => this.estaResuelta(c)).length;
  }

  /**
   * Nº de tickets pendientes (ni resueltos ni en curso). Tarjeta "Pending".
   *
   * Es el complemento exacto de `ticketsResueltos`: `pendientes + resueltos +
   * enProgreso === totalTickets`. La tabla del historial muestra las tres
   * categorías, por lo que mostrar solo dos tarjetas haría que sus números no
   * cuadraran con el total — de ahí que las tres se deriven de los mismos
   * predicados y no de conteos independientes.
   */
  get ticketsPendientes(): number {
    return this.conversaciones.filter((c) => this.estaPendiente(c)).length;
  }

  /** Nº de tickets en curso con un operador (`atendida`). Tarjeta "In Progress". */
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
   * incrementar `noLeidos` (Req 3.6). Rechaza sin mutar estado si la
   * conversación no existe, si el texto es vacío/solo espacios (Req 3.4) o si
   * excede los 4096 caracteres (Req 3.5). El gating de capacidad vive en la UI.
   *
   * Guarda de MODO DE ATENCIÓN: no-op si la conversación la lleva el bot. Es la
   * simétrica de la guarda `atencion !== "bot"` de `simularRespuestaBot`, y
   * existe por la misma razón: el autor del mensaje debe corresponder con quién
   * atiende el hilo. Sin ella, escribir estando el hilo devuelto al bot persiste
   * un `autor:"negocio"` que el hilo rotula como "Asesor Humano" — dos fuentes
   * de verdad sobre quién habla. La UI ya bloquea el campo; esta guarda es la
   * defensa en profundidad para cualquier otro llamador.
   */
  enviarComoNegocio(convId: string, texto: string): void {
    const conv = this.getConversacion(convId);
    if (!conv) return;
    if (conv.atencion !== "humano") return; // el bot lleva el hilo: no hay emisor humano
    if (texto.trim() === "") return; // vacío / solo espacios: no-op (Req 3.4)
    if (texto.length > LIMITE_TEXTO_NEGOCIO) return; // excede límite (Req 3.5)

    this.agregarMensaje(convId, "negocio", texto);
    conv.ultimaActividad = nowIso();
    this.persistir();
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
    this.registrarEvento(convId, "cerrada", "Conversación cerrada");
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

    this.agregarMensajeBot(convId, resultado.texto, resultado.payload);
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
