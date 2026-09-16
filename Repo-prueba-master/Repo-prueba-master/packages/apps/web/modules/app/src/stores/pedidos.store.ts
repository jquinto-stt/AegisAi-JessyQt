import { makeAutoObservable } from "mobx";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estados del pipeline de un pedido:
 *   nuevo → confirmado → en_preparacion → listo → en_camino → entregado
 * más `cancelado` (terminal, alcanzable desde cualquier estado no terminal).
 *
 * `programado` es un estado PREVIO al pipeline: el pedido aún no está activo,
 * espera a su hora programada (activación automática por tiempo o manual). No
 * cuenta como "en curso" ni entra al historial hasta activarse (pasa a `nuevo`).
 *
 * `confirmado` y `en_camino` son OPCIONALES: se pueden desactivar desde la
 * configuración del módulo. `en_camino` además solo aplica a pedidos con
 * modalidad `domicilio`.
 */
export type PedidoEstado =
  | "programado"
  | "nuevo"
  | "confirmado"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "cancelado";

/** Modalidad de entrega del pedido (genérica, sin identidad de negocio). */
export type Modalidad = "retiro" | "domicilio" | "en_sitio";

/** Una línea del pedido: qué se pidió y cuánto. */
export interface PedidoItem {
  nombre: string;
  cantidad: number;
  /** Precio unitario opcional (viene del catálogo simple, si existe). */
  precio?: number;
}

/** Un pedido que recorre el pipeline. Llega por WhatsApp (bot) o lo crea un operador. */
export interface Pedido {
  id: string;
  numero: string;            // legible, ej. "P-014"
  cliente: string;
  telefono: string;          // usado para abrir WhatsApp (wa.me)
  modalidad: Modalidad;
  items: PedidoItem[];
  notas?: string;
  estado: PedidoEstado;
  origen: "whatsapp" | "operador";
  /** ¿El pedido ya fue pagado? (mock, para el segmento "Pago pendiente"). */
  pagado?: boolean;
  createdAt: string;         // ISO
  /** Momento en que entró al estado actual (para "tiempo en estado"). */
  estadoDesde: string;       // ISO
  finishedAt?: string;       // ISO — al entregar/cancelar
  /**
   * Fecha/hora ISO para la que se programó el pedido. Solo relevante mientras
   * el estado es `programado`; al activarse (manual o por tiempo) el pedido
   * pasa a `nuevo` y este campo queda como referencia histórica opcional.
   */
  programadoPara?: string;   // ISO
}

/** Un item del catálogo simple opcional (para autocompletar en Crear pedido). */
export interface CatalogoItem {
  id: string;
  nombre: string;
  precio: number;
}

/** Plantillas de WhatsApp que el bot "enviaría" en cada transición (solo texto). */
export interface PlantillasWhatsApp {
  recibido: string;
  confirmado: string;
  enPreparacion: string;
  listo: string;
  enCamino: string;
  entregado: string;
  cancelado: string;
}

/** Estados a los que aplica un alias / tiempo objetivo (los activos del pipeline). */
export type EstadoConfigurable = "nuevo" | "confirmado" | "en_preparacion" | "listo" | "en_camino";

/** Horario de atención del negocio. */
export interface HorarioAtencion {
  /** ¿Se aplica el horario? Si es false, se atiende siempre. */
  activo: boolean;
  /** Días laborales (0=Dom … 6=Sáb), en formato JS getDay(). */
  dias: number[];
  /** Hora de apertura "HH:mm". */
  apertura: string;
  /** Hora de cierre "HH:mm". */
  cierre: string;
}

/** Configuración editable del módulo, persistida en localStorage. */
export interface PedidosConfig {
  /** ¿Se usa el estado `confirmado` en el pipeline? */
  usarConfirmado: boolean;
  /** ¿Se usa el estado `en_camino` (reparto) en el pipeline? */
  usarEnCamino: boolean;
  /** Modalidades habilitadas para nuevos pedidos. */
  modalidades: Modalidad[];
  /** Minutos en un estado a partir de los cuales una tarjeta se marca urgente. */
  umbralUrgencia: number;
  /** Plantillas de mensaje por transición (SOLO REFERENCIA — no se envía nada). */
  plantillas: PlantillasWhatsApp;
  /** Catálogo simple opcional (vacío = campos libres en Crear pedido). */
  catalogo: CatalogoItem[];
  /**
   * Alias de etiqueta por estado (C). Renombra lo que se muestra sin cambiar la
   * lógica del pipeline. Clave = estado; valor = etiqueta personalizada (vacío = default).
   */
  aliasEstados: Partial<Record<EstadoConfigurable, string>>;
  /** Alias de etiqueta por modalidad. Vacío = etiqueta por defecto. */
  aliasModalidades: Partial<Record<Modalidad, string>>;
  /** Horario de atención del negocio (A). */
  horario: HorarioAtencion;
  /**
   * Tiempos objetivo por estado en minutos (B). Si un pedido supera su objetivo
   * se marca urgente. Reemplaza al umbral global cuando hay un valor por estado;
   * si un estado no tiene objetivo, cae en `umbralUrgencia`.
   */
  tiemposObjetivo: Partial<Record<EstadoConfigurable, number>>;
  /**
   * Alerta sonora recurrente cuando hay clientes que requieren atención.
   * `activo` enciende/apaga el sonido; `cadaSegundos` calibra cada cuánto suena.
   */
  alertaAtencion: AlertaAtencion;
}

/** Configuración de la alerta sonora de "requieren atención". */
export interface AlertaAtencion {
  /** ¿Suena de forma recurrente cuando hay clientes que requieren atención? */
  activo: boolean;
  /** Cada cuántos segundos vuelve a sonar (por defecto 30). */
  cadaSegundos: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS / HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Estados no terminales, en orden del pipeline (incluye los opcionales). */
const PIPELINE_FULL: PedidoEstado[] = [
  "nuevo",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
];

/** Estados terminales (no admiten avance). */
const TERMINALES: PedidoEstado[] = ["entregado", "cancelado"];

const ESTADO_LABEL: Record<PedidoEstado, string> = {
  programado: "Programado",
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const MODALIDAD_LABEL: Record<Modalidad, string> = {
  retiro: "Retiro",
  domicilio: "Domicilio",
  en_sitio: "En sitio",
};

const DEFAULT_CONFIG: PedidosConfig = {
  usarConfirmado: true,
  usarEnCamino: true,
  modalidades: ["retiro", "domicilio", "en_sitio"],
  umbralUrgencia: 15,
  plantillas: {
    recibido: "¡Recibimos tu pedido! Lo estamos revisando.",
    confirmado: "Tu pedido fue confirmado y pronto entra en preparación.",
    enPreparacion: "¡Manos a la obra! Estamos preparando tu pedido.",
    listo: "Tu pedido está listo.",
    enCamino: "Tu pedido va en camino.",
    entregado: "¡Pedido entregado! Gracias por tu compra.",
    cancelado: "Tu pedido fue cancelado. Si tienes dudas, escríbenos.",
  },
  catalogo: [
    { id: "cat1", nombre: "Combo clásico", precio: 25000 },
    { id: "cat2", nombre: "Bebida 350ml", precio: 4000 },
    { id: "cat3", nombre: "Postre del día", precio: 8000 },
  ],
  aliasEstados: {},
  aliasModalidades: {},
  horario: {
    activo: false,
    dias: [1, 2, 3, 4, 5, 6], // Lun–Sáb por defecto
    apertura: "08:00",
    cierre: "20:00",
  },
  tiemposObjetivo: {},
  alertaAtencion: {
    activo: true,
    cadaSegundos: 30,
  },
};

const CONFIG_KEY = "necto.pedidosConfig";

/** Carga la config guardada (merge con defaults) desde localStorage. */
function loadConfig(): PedidosConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PedidosConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        plantillas: { ...DEFAULT_CONFIG.plantillas, ...(parsed.plantillas ?? {}) },
        modalidades: Array.isArray(parsed.modalidades) ? parsed.modalidades : DEFAULT_CONFIG.modalidades,
        catalogo: Array.isArray(parsed.catalogo) ? parsed.catalogo : DEFAULT_CONFIG.catalogo,
        aliasEstados: { ...(parsed.aliasEstados ?? {}) },
        aliasModalidades: { ...(parsed.aliasModalidades ?? {}) },
        horario: { ...DEFAULT_CONFIG.horario, ...(parsed.horario ?? {}) },
        tiemposObjetivo: { ...(parsed.tiemposObjetivo ?? {}) },
        alertaAtencion: { ...DEFAULT_CONFIG.alertaAtencion, ...(parsed.alertaAtencion ?? {}) },
      };
    }
  } catch {
    // Entorno sin localStorage o JSON inválido: usa defaults.
  }
  return {
    ...DEFAULT_CONFIG,
    plantillas: { ...DEFAULT_CONFIG.plantillas },
    horario: { ...DEFAULT_CONFIG.horario },
    alertaAtencion: { ...DEFAULT_CONFIG.alertaAtencion },
  };
}

/** Persiste la config en localStorage. */
function persistConfig(cfg: PedidosConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Sin localStorage: no-op (mock).
  }
}

const nowIso = () => new Date().toISOString();
const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const minutesAgoIso = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

// ═══════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════

const seed = (): Pedido[] => [
  {
    id: "pd1", numero: "P-001", cliente: "Juan Carlos", telefono: "+573001112233", modalidad: "domicilio",
    items: [{ nombre: "Combo clásico", cantidad: 2, precio: 25000 }, { nombre: "Bebida 350ml", cantidad: 2, precio: 4000 }],
    notas: "Sin cebolla en uno.", estado: "nuevo", origen: "whatsapp", pagado: false,
    createdAt: minutesAgoIso(4), estadoDesde: minutesAgoIso(4),
  },
  {
    id: "pd2", numero: "P-002", cliente: "María Fernanda", telefono: "+573002223344", modalidad: "retiro",
    items: [{ nombre: "Postre del día", cantidad: 1, precio: 8000 }],
    estado: "confirmado", origen: "whatsapp", pagado: true,
    createdAt: minutesAgoIso(12), estadoDesde: minutesAgoIso(6),
  },
  {
    id: "pd3", numero: "P-003", cliente: "Pedro Ramírez", telefono: "+573003334455", modalidad: "en_sitio",
    items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    notas: "Mesa 5.", estado: "en_preparacion", origen: "operador", pagado: false,
    createdAt: minutesAgoIso(20), estadoDesde: minutesAgoIso(18),
  },
  {
    id: "pd4", numero: "P-004", cliente: "Lucía Torres", telefono: "+573004445566", modalidad: "domicilio",
    items: [{ nombre: "Combo clásico", cantidad: 3, precio: 25000 }, { nombre: "Postre del día", cantidad: 2, precio: 8000 }],
    estado: "listo", origen: "whatsapp", pagado: true,
    createdAt: minutesAgoIso(30), estadoDesde: minutesAgoIso(3),
  },
  {
    id: "pd5", numero: "P-005", cliente: "Andrés Gil", telefono: "+573005556677", modalidad: "domicilio",
    items: [{ nombre: "Bebida 350ml", cantidad: 4, precio: 4000 }],
    estado: "en_camino", origen: "whatsapp", pagado: false,
    createdAt: minutesAgoIso(40), estadoDesde: minutesAgoIso(8),
  },
  {
    id: "pd6", numero: "P-006", cliente: "Sofía Díaz", telefono: "+573006667788", modalidad: "retiro",
    items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    estado: "entregado", origen: "whatsapp",
    createdAt: minutesAgoIso(90), estadoDesde: minutesAgoIso(50), finishedAt: minutesAgoIso(50),
  },
  {
    id: "pd7", numero: "P-007", cliente: "Valentina Ríos", telefono: "+573007778899", modalidad: "domicilio",
    items: [{ nombre: "Postre del día", cantidad: 2, precio: 8000 }],
    notas: "Cliente no respondió.", estado: "cancelado", origen: "whatsapp",
    createdAt: minutesAgoIso(120), estadoDesde: minutesAgoIso(70), finishedAt: minutesAgoIso(70),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE (mock — muta solo estado local)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PedidosStore — flujo de pedidos que llegan por WhatsApp y recorren el
 * pipeline hasta la entrega (mock, sin backend).
 *
 * El pipeline efectivo depende de la config: `confirmado` y `en_camino` pueden
 * estar desactivados, y `en_camino` solo aplica a pedidos con modalidad
 * `domicilio`. `avanzar` calcula el siguiente estado válido respetando estas
 * reglas; `moverEstado` valida que la transición sea coherente con el pipeline.
 */
export class PedidosStore {
  pedidos: Pedido[] = seed();

  /** Configuración del módulo (persistida en localStorage). */
  config: PedidosConfig = loadConfig();

  private seq = seed().length;

  /** Handle del intervalo de activación de programados (solo navegador). */
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ── Config ────────────────────────────────────────────────────────────────

  updateConfig(data: Partial<PedidosConfig>): void {
    this.config = {
      ...this.config,
      ...data,
      plantillas: { ...this.config.plantillas, ...(data.plantillas ?? {}) },
    };
    persistConfig(this.config);
    // Fix #1: al cambiar la config, migrar pedidos que quedaron fuera del
    // pipeline efectivo (estado desactivado) al siguiente estado activo, para
    // que no queden varados (sin poder avanzar y con su columna desaparecida).
    this.migrarPedidosVarados();
  }

  /**
   * Fix #1 — Empuja los pedidos activos cuyo estado actual dejó de pertenecer al
   * pipeline efectivo (por desactivar `confirmado`/`en_camino`) al siguiente
   * estado activo disponible. Evita que queden inaccesibles tras cambiar config.
   */
  private migrarPedidosVarados(): void {
    for (const p of this.pedidos) {
      if (this.esTerminal(p.estado) || p.estado === "programado") continue;
      const pipeline = this.pipelineDe(p);
      if (pipeline.includes(p.estado)) continue; // sigue siendo válido
      // Estado varado: buscar el primer estado activo posterior según el orden
      // canónico del pipeline completo. Si no hay ninguno, cae en entregado.
      const ordenFull = PIPELINE_FULL.indexOf(p.estado);
      const destino =
        pipeline.find((e) => PIPELINE_FULL.indexOf(e) > ordenFull) ?? "entregado";
      p.estado = destino;
      p.estadoDesde = nowIso();
      if (this.esTerminal(destino)) p.finishedAt = nowIso();
    }
  }

  // ── Pipeline helpers ────────────────────────────────────────────────────

  /**
   * Secuencia de estados activa según la config, sin considerar modalidad.
   * Filtra `confirmado`/`en_camino` cuando están desactivados.
   */
  get estadosActivos(): PedidoEstado[] {
    return PIPELINE_FULL.filter((e) => {
      if (e === "confirmado" && !this.config.usarConfirmado) return false;
      if (e === "en_camino" && !this.config.usarEnCamino) return false;
      return true;
    });
  }

  /**
   * Columnas del tablero: estados activos del pipeline (sin `entregado`, que
   * es terminal y vive en el historial). El tablero muestra el trabajo en curso.
   */
  get columnasTablero(): PedidoEstado[] {
    return this.estadosActivos.filter((e) => e !== "entregado");
  }

  /** Pipeline efectivo para un pedido concreto: descarta `en_camino` si no es domicilio. */
  private pipelineDe(p: Pedido): PedidoEstado[] {
    return this.estadosActivos.filter((e) => {
      if (e === "en_camino" && p.modalidad !== "domicilio") return false;
      return true;
    });
  }

  /** true si `estado` es terminal (entregado/cancelado). */
  esTerminal(estado: PedidoEstado): boolean {
    return TERMINALES.includes(estado);
  }

  /** Siguiente estado válido para un pedido, o null si ya está en un estado terminal/final. */
  siguienteEstado(p: Pedido): PedidoEstado | null {
    if (this.esTerminal(p.estado)) return null;
    const pipeline = this.pipelineDe(p);
    const idx = pipeline.indexOf(p.estado);
    if (idx === -1 || idx >= pipeline.length - 1) return null;
    return pipeline[idx + 1];
  }

  /**
   * ¿Es válida la transición estado→destino para este pedido?
   * Reglas: no partir de terminal; destino debe pertenecer al pipeline efectivo;
   * solo se avanza un paso hacia adelante. `cancelado` es válido desde cualquier
   * estado no terminal.
   */
  private transicionValida(p: Pedido, destino: PedidoEstado): boolean {
    if (this.esTerminal(p.estado)) return false;
    if (destino === "cancelado") return true;
    const pipeline = this.pipelineDe(p);
    const from = pipeline.indexOf(p.estado);
    const to = pipeline.indexOf(destino);
    if (from === -1 || to === -1) return false;
    return to === from + 1;
  }

  // ── Lookups / agrupación ──────────────────────────────────────────────────

  getPedido(id: string): Pedido | undefined {
    return this.pedidos.find((p) => p.id === id);
  }

  /** Pedidos en un estado dado (para las columnas del tablero). */
  porEstado(estado: PedidoEstado): Pedido[] {
    return this.pedidos
      .filter((p) => p.estado === estado)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Pedidos en curso (no terminales y ya activos), opcionalmente filtrados por
   * modalidad. Los `programado` NO cuentan como en curso: esperan su hora.
   */
  enCurso(modalidad?: Modalidad): Pedido[] {
    return this.pedidos.filter(
      (p) => !this.esTerminal(p.estado) && p.estado !== "programado" && (!modalidad || p.modalidad === modalidad),
    );
  }

  /**
   * Pedidos programados (aún no activos), ordenados por su hora programada
   * (más próximos primero). No entran en KPIs de "en curso" ni en el historial.
   */
  get programados(): Pedido[] {
    return this.pedidos
      .filter((p) => p.estado === "programado")
      .sort((a, b) => (a.programadoPara ?? a.createdAt).localeCompare(b.programadoPara ?? b.createdAt));
  }

  /**
   * Pedidos programados para un día concreto ("YYYY-MM-DD", hora local),
   * ordenados por hora. Útil para el calendario del modal de programación.
   */
  programadosDelDia(ymd: string): Pedido[] {
    return this.programados.filter((p) => {
      if (!p.programadoPara) return false;
      const d = new Date(p.programadoPara);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return local === ymd;
    });
  }

  /** Cuántos pedidos hay programados en un día ("YYYY-MM-DD" local). */
  countProgramadosDia(ymd: string): number {
    return this.programadosDelDia(ymd).length;
  }

  /** Pedidos terminales (entregado/cancelado) — para el historial. */
  get historial(): Pedido[] {
    return this.pedidos
      .filter((p) => this.esTerminal(p.estado))
      .sort((a, b) => (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt));
  }

  /**
   * Fix #1 (modalidades) — Modalidades a mostrar como filtro en el tablero: las
   * habilitadas en config MÁS las presentes en pedidos activos (para no ocultar
   * pedidos existentes cuya modalidad se desactivó). Solo se bloquean modalidades
   * nuevas al crear pedidos; los ya creados siguen siendo visibles y accionables.
   */
  get modalidadesTablero(): Modalidad[] {
    const enUso = new Set<Modalidad>(this.config.modalidades);
    for (const p of this.enCurso()) enUso.add(p.modalidad);
    // Mantener el orden canónico.
    return (["retiro", "domicilio", "en_sitio"] as Modalidad[]).filter((m) => enUso.has(m));
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  get totalNuevos(): number {
    return this.porEstado("nuevo").length;
  }

  get totalEnPreparacion(): number {
    return this.porEstado("en_preparacion").length;
  }

  get totalListos(): number {
    return this.porEstado("listo").length;
  }

  /** Pedidos entregados hoy (por finishedAt). */
  get entregadosHoy(): number {
    const hoy = new Date().toDateString();
    return this.pedidos.filter(
      (p) => p.estado === "entregado" && p.finishedAt && new Date(p.finishedAt).toDateString() === hoy,
    ).length;
  }

  /** Pedidos entregados en un día concreto ("YYYY-MM-DD" local, por finishedAt). */
  entregadosEnDia(ymd: string): number {
    return this.pedidos.filter(
      (p) => p.estado === "entregado" && p.finishedAt && p.finishedAt.slice(0, 10) === ymd,
    ).length;
  }

  /** Total de pedidos en curso (no terminales y ya activos). */
  get totalEnCurso(): number {
    return this.enCurso().length;
  }

  /** Total de pedidos programados (aún no activos). */
  get totalProgramados(): number {
    return this.programados.length;
  }

  /** Pedidos en curso que ya superaron su tiempo objetivo (urgentes ahora). */
  get urgentes(): Pedido[] {
    return this.enCurso()
      .filter((p) => this.esUrgente(p))
      .sort((a, b) => this.minutosEnEstado(b) - this.minutosEnEstado(a));
  }

  /** El próximo pedido programado por hora (o null). */
  get proximoProgramado(): Pedido | null {
    return this.programados[0] ?? null;
  }

  /**
   * Volumen de pedidos recibidos por día en los últimos `dias` días (incluye
   * hoy), del más antiguo al más reciente. Cuenta por `createdAt`. Para el
   * gráfico "volumen del día" de la Inicio.
   */
  volumenPorDia(dias = 7): { fecha: string; total: number }[] {
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const conteo = new Map<string, number>();
    for (const p of this.pedidos) {
      const dia = p.createdAt.slice(0, 10);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    const out: { fecha: string; total: number }[] = [];
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const fecha = ymd(d);
      out.push({ fecha, total: conteo.get(fecha) ?? 0 });
    }
    return out;
  }

  /**
   * Volumen de pedidos recibidos por hora de un día "YYYY-MM-DD" (00–23).
   * Para el gráfico cuando se elige un solo día (granularidad por hora).
   */
  volumenPorHora(ymd: string, desdeHora = 0, hastaHora = 23): { etiqueta: string; total: number }[] {
    const conteo = new Array(24).fill(0);
    for (const p of this.pedidos) {
      if (p.createdAt.slice(0, 10) !== ymd) continue;
      const h = new Date(p.createdAt).getHours();
      conteo[h] += 1;
    }
    const out: { etiqueta: string; total: number }[] = [];
    for (let h = desdeHora; h <= hastaHora; h++) {
      const am = h < 12;
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ etiqueta: `${h12}${am ? "am" : "pm"}`, total: conteo[h] });
    }
    return out;
  }

  /**
   * Volumen de pedidos recibidos por día entre dos fechas "YYYY-MM-DD" inclusive
   * (del más antiguo al más reciente). Cuenta por `createdAt`. Para el gráfico
   * de la Inicio con rango elegido en el calendario.
   */
  volumenEntre(desde: string, hasta: string): { fecha: string; total: number }[] {
    if (!desde || !hasta || desde > hasta) return [];
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const conteo = new Map<string, number>();
    for (const p of this.pedidos) {
      const dia = p.createdAt.slice(0, 10);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    const out: { fecha: string; total: number }[] = [];
    const cur = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    let guard = 0;
    while (cur.getTime() <= fin.getTime() && guard < 400) {
      const fecha = ymd(cur);
      out.push({ fecha, total: conteo.get(fecha) ?? 0 });
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  }

  /**
   * Tiempo promedio de ciclo (minutos) de los pedidos entregados: desde
   * createdAt hasta finishedAt. 0 si no hay entregados con datos.
   */
  get tiempoPromedioCicloMin(): number {
    const entregados = this.pedidos.filter((p) => p.estado === "entregado" && p.finishedAt);
    if (entregados.length === 0) return 0;
    const total = entregados.reduce(
      (s, p) => s + Math.max(0, Math.round((new Date(p.finishedAt!).getTime() - new Date(p.createdAt).getTime()) / 60000)),
      0,
    );
    return Math.round(total / entregados.length);
  }

  /** El pedido en curso más reciente (para el hero del dashboard). */
  get ultimoPedido(): Pedido | null {
    const enCurso = this.enCurso();
    if (enCurso.length === 0) return null;
    return [...enCurso].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  /** Actividad reciente: últimos pedidos por createdAt (en curso o no). */
  actividadReciente(limit = 6): Pedido[] {
    return [...this.pedidos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  // ── Derivados de tarjeta ──────────────────────────────────────────────────

  /** Minutos que lleva el pedido en su estado actual. */
  minutosEnEstado(p: Pedido): number {
    return minutesSince(p.estadoDesde);
  }

  /**
   * Minutos objetivo para el estado actual del pedido: usa el tiempo objetivo
   * por estado (config B) si existe; si no, cae en el umbral global.
   */
  objetivoDe(estado: PedidoEstado): number {
    const t = this.config.tiemposObjetivo[estado as EstadoConfigurable];
    return typeof t === "number" && t > 0 ? t : this.config.umbralUrgencia;
  }

  /** ¿La tarjeta es urgente? (supera su tiempo objetivo y no es terminal). */
  esUrgente(p: Pedido): boolean {
    if (this.esTerminal(p.estado) || p.estado === "programado") return false;
    return this.minutosEnEstado(p) >= this.objetivoDe(p.estado);
  }

  /** Total monetario del pedido (si los items tienen precio). */
  totalPedido(p: Pedido): number {
    return p.items.reduce((s, it) => s + (it.precio ?? 0) * it.cantidad, 0);
  }

  /** Resumen legible de items, ej. "2× Combo, 1× Postre". */
  resumenItems(p: Pedido): string {
    return p.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(", ");
  }

  // ── Acciones ────────────────────────────────────────────────────────────

  /**
   * Crea un pedido (bot de WhatsApp u operador). Nace en estado `nuevo`, salvo
   * que se indique `programadoPara` con una fecha futura: en ese caso nace
   * `programado` y espera su hora (activación automática o manual).
   */
  crearPedido(data: {
    cliente: string;
    telefono: string;
    modalidad: Modalidad;
    items: PedidoItem[];
    notas?: string;
    origen?: "whatsapp" | "operador";
    /** ISO opcional; si es futuro, el pedido nace `programado`. */
    programadoPara?: string;
  }): Pedido {
    this.seq += 1;
    const now = nowIso();
    const esFuturo = !!data.programadoPara && new Date(data.programadoPara).getTime() > Date.now();
    const pedido: Pedido = {
      id: crypto.randomUUID(),
      numero: `P-${String(this.seq).padStart(3, "0")}`,
      cliente: data.cliente,
      telefono: data.telefono,
      modalidad: data.modalidad,
      items: data.items,
      notas: data.notas,
      estado: esFuturo ? "programado" : "nuevo",
      origen: data.origen ?? "operador",
      createdAt: now,
      estadoDesde: now,
      programadoPara: esFuturo ? data.programadoPara : undefined,
    };
    this.pedidos.push(pedido);
    return pedido;
  }

  /**
   * Reprograma un pedido programado a una nueva fecha/hora (ISO). Solo válido
   * mientras el pedido siga en estado `programado`. Devuelve true si se aplicó.
   */
  reprogramar(id: string, programadoPara: string): boolean {
    const p = this.getPedido(id);
    if (!p || p.estado !== "programado") return false;
    p.programadoPara = programadoPara;
    return true;
  }

  /**
   * Activa un pedido programado: lo pasa a `nuevo` y arranca el pipeline normal.
   * Válido solo desde `programado`. Devuelve true si se aplicó.
   */
  activarAhora(id: string): boolean {
    const p = this.getPedido(id);
    if (!p || p.estado !== "programado") return false;
    p.estado = "nuevo";
    p.estadoDesde = nowIso();
    return true;
  }

  /**
   * Activa todos los programados cuya hora ya llegó. Lo llama el tick (y puede
   * invocarse manualmente en tests). Devuelve cuántos activó.
   */
  activarProgramadosVencidos(): number {
    const ahora = Date.now();
    let activados = 0;
    for (const p of this.pedidos) {
      if (p.estado !== "programado") continue;
      if (p.programadoPara && new Date(p.programadoPara).getTime() <= ahora) {
        p.estado = "nuevo";
        p.estadoDesde = nowIso();
        activados += 1;
      }
    }
    return activados;
  }

  /**
   * Arranca el tick que activa programados vencidos periódicamente. Solo tiene
   * efecto en el navegador (mock: mientras la pestaña esté abierta). Idempotente.
   */
  iniciarTick(intervaloMs = 30000): void {
    if (this.tickHandle !== null) return;
    if (typeof setInterval === "undefined") return;
    this.activarProgramadosVencidos(); // barrido inmediato al montar
    this.tickHandle = setInterval(() => this.activarProgramadosVencidos(), intervaloMs);
  }

  /** Detiene el tick de activación (limpieza al desmontar). */
  detenerTick(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  /**
   * Mueve un pedido a un estado destino si la transición es válida.
   * Devuelve true si se aplicó, false si se rechazó (transición inválida).
   */
  moverEstado(id: string, destino: PedidoEstado): boolean {
    const p = this.getPedido(id);
    if (!p) return false;
    if (!this.transicionValida(p, destino)) return false;
    p.estado = destino;
    p.estadoDesde = nowIso();
    if (this.esTerminal(destino)) p.finishedAt = nowIso();
    return true;
  }

  /**
   * Avanza el pedido al siguiente estado válido de su pipeline. Devuelve el
   * nuevo estado, o null si ya no puede avanzar.
   */
  avanzar(id: string): PedidoEstado | null {
    const p = this.getPedido(id);
    if (!p) return null;
    const siguiente = this.siguienteEstado(p);
    if (!siguiente) return null;
    return this.moverEstado(id, siguiente) ? siguiente : null;
  }

  /** Cancela un pedido (válido desde cualquier estado no terminal). */
  cancelar(id: string): boolean {
    return this.moverEstado(id, "cancelado");
  }

  /** Elimina un pedido de la lista (mock). */
  eliminar(id: string): void {
    this.pedidos = this.pedidos.filter((p) => p.id !== id);
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  /** Etiqueta de estado, honrando el alias de la config (C) si existe. */
  estadoLabel(e: PedidoEstado): string {
    const alias = this.config.aliasEstados[e as EstadoConfigurable];
    return alias && alias.trim() ? alias.trim() : ESTADO_LABEL[e];
  }

  /** Etiqueta de modalidad, honrando el alias de la config (C) si existe. */
  modalidadLabel(m: Modalidad): string {
    const alias = this.config.aliasModalidades[m];
    return alias && alias.trim() ? alias.trim() : MODALIDAD_LABEL[m];
  }

  /**
   * ¿El negocio está abierto en el momento `ref` según el horario (A)?
   * Si el horario no está activo, siempre true. Considera día laboral + franja
   * apertura–cierre (misma jornada; no cruza medianoche).
   */
  estaAbierto(ref: Date = new Date()): boolean {
    const h = this.config.horario;
    if (!h.activo) return true;
    if (!h.dias.includes(ref.getDay())) return false;
    const min = ref.getHours() * 60 + ref.getMinutes();
    const [ah, am] = h.apertura.split(":").map(Number);
    const [ch, cm] = h.cierre.split(":").map(Number);
    return min >= ah * 60 + am && min < ch * 60 + cm;
  }

  /** Color semántico del Badge (Elements) según el estado. */
  estadoBadgeColor(e: PedidoEstado): "info" | "primary" | "warning" | "success" | "light" | "error" {
    return (
      {
        programado: "light",
        nuevo: "info",
        confirmado: "primary",
        en_preparacion: "warning",
        listo: "success",
        // Fix #6: `en_camino` unificado a un solo color coherente con el dot.
        en_camino: "primary",
        entregado: "success",
        cancelado: "error",
      } as const
    )[e];
  }

  /** Color del punto/acento de columna del tablero según el estado. */
  estadoDotClass(e: PedidoEstado): string {
    return (
      {
        programado: "bg-gray-400",
        nuevo: "bg-blue-light-500",
        confirmado: "bg-brand-500",
        en_preparacion: "bg-warning-500",
        listo: "bg-success-500",
        // Fix #6: mismo color que el badge `primary` (marca) para `en_camino`.
        en_camino: "bg-brand-500",
        entregado: "bg-success-600",
        cancelado: "bg-error-500",
      } as const
    )[e];
  }
}

export const pedidosStore = new PedidosStore();
