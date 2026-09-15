import { makeAutoObservable, runInAction } from "mobx";
import { queuesApi } from "@/services/queues.api";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TicketState = "waiting" | "serving" | "done";
export type AttentionMode = "auto" | "manual";
export type Saturation = "ok" | "busy" | "full";
export type FieldType = "text" | "textarea" | "number" | "select";

/** A custom field the operator/bot must fill when creating a ticket in this queue. */
export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // only for type 'select'
}

export interface Ticket {
  numero: string;
  cliente: string;
  espera: string;   // display, e.g. "12 min"
  waitedMin: number; // numeric minutes for urgency calc
  telefono?: string;
  datos?: Record<string, string>; // values for the queue's custom fields
}

export interface Queue {
  id: string;
  nombre: string;
  color: string;              // tailwind bg class for the dot
  servicio: string;
  mode: AttentionMode;
  tiempoProm: number;         // minutes
  activa: boolean;
  campos: CustomField[];      // per-queue custom fields for ticket creation
  waiting: Ticket[];
  serving: Ticket[];
  done: Ticket[];
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface Survey {
  id: string;
  cliente: string;
  queueId: string;
  queueName: string;
  rating: number;       // 1-5
  comentario: string;
  fecha: string;        // display date
  daysAgo: number;      // for trend ordering
}

/** Branding/copy for the public survey view (the link the client opens). */
export interface SurveyConfig {
  businessName: string;
  logoUrl: string;        // optional; empty = show a default star mark
  title: string;          // e.g. "¿Cómo estuvo tu experiencia?"
  subtitle: string;       // supporting line under the title
  thankYouTitle: string;  // success state heading
  thankYouMessage: string;
}

const URGENT_THRESHOLD = 10; // minutes

// ═══════════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════════

const seed = (): Queue[] => [
  {
    id: "1", nombre: "Consulta general", color: "bg-brand-500", servicio: "general", mode: "auto", tiempoProm: 14, activa: true,
    campos: [
      { id: "motivo", label: "Motivo de consulta", type: "textarea", required: true },
      { id: "documento", label: "Documento", type: "text", required: false },
    ],
    waiting: [
      { numero: "A-043", cliente: "Ana Silva", espera: "15 min", waitedMin: 15 },
      { numero: "A-044", cliente: "Pedro Ramirez", espera: "6 min", waitedMin: 6 },
      { numero: "A-045", cliente: "Marta Ruiz", espera: "3 min", waitedMin: 3 },
    ],
    serving: [{ numero: "A-042", cliente: "Maria Gonzalez", espera: "0 min", waitedMin: 0 }],
    done: [{ numero: "A-041", cliente: "Sofia Diaz", espera: "", waitedMin: 0 }],
  },
  {
    id: "2", nombre: "Laboratorio", color: "bg-secondary-500", servicio: "general", mode: "manual", tiempoProm: 25, activa: true,
    campos: [],
    waiting: [
      { numero: "L-018", cliente: "Carlos Mendoza", espera: "22 min", waitedMin: 22 },
      { numero: "L-019", cliente: "Lucia Torres", espera: "12 min", waitedMin: 12 },
    ],
    serving: [{ numero: "L-017", cliente: "Diego Rojas", espera: "0 min", waitedMin: 0 }],
    done: [],
  },
  {
    id: "3", nombre: "Mesa / Pedidos", color: "bg-accent-500", servicio: "restaurante", mode: "manual", tiempoProm: 20, activa: true,
    campos: [
      { id: "pedido", label: "Pedido", type: "textarea", required: true },
      { id: "personas", label: "N° de personas", type: "number", required: false },
      { id: "modalidad", label: "Modalidad", type: "select", required: true, options: ["En mesa", "Para llevar", "Domicilio"] },
    ],
    waiting: [
      { numero: "M-012", cliente: "Juan Carlos", espera: "8 min", waitedMin: 8, datos: { pedido: "2 bandeja paisa", modalidad: "En mesa" } },
    ],
    serving: [],
    done: [{ numero: "M-011", cliente: "Laura Peña", espera: "", waitedMin: 0, datos: { pedido: "1 mojarra frita", modalidad: "Para llevar" } }],
  },
];

const COLOR_OPTIONS = ["bg-brand-500", "bg-secondary-500", "bg-accent-500", "bg-warning-500", "bg-success-500"];

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

class QueuesStore {
  queues: Queue[] = seed();

  /** True once the backend has answered at least once; falls back to seed data otherwise. */
  apiConnected = false;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  // ── Backend sync ──
  /** Load all queues from the API. Falls back silently to seed data on failure. */
  async loadQueues(): Promise<void> {
    this.loading = true;
    try {
      const queues = await queuesApi.list();
      runInAction(() => {
        this.queues = queues;
        this.apiConnected = true;
      });
    } catch (err) {
      // Backend not reachable — keep working with local (seed) data.
      console.warn("[queuesStore] API no disponible, usando datos locales:", err);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  /** Re-fetch a single queue and merge it into local state. */
  private async refreshQueue(id: string): Promise<void> {
    if (!this.apiConnected) return;
    try {
      const fresh = await queuesApi.get(id);
      if (!fresh) return;
      runInAction(() => {
        const idx = this.queues.findIndex((q) => q.id === id);
        if (idx !== -1) this.queues[idx] = fresh;
      });
    } catch (err) {
      console.warn("[queuesStore] refreshQueue fallo:", err);
    }
  }

  /** Fire an API call in the background; on success reconcile the affected queue. */
  private sync(queueId: string | null, call: Promise<unknown>): void {
    if (!this.apiConnected) return;
    call
      .then(() => (queueId ? this.refreshQueue(queueId) : this.loadQueues()))
      .catch((err) => console.warn("[queuesStore] sync fallo:", err));
  }

  // ── Lookups ──
  getQueue(id: string): Queue | undefined {
    return this.queues.find((q) => q.id === id);
  }

  getQueueByName(nombre: string): Queue | undefined {
    return this.queues.find((q) => q.nombre === nombre);
  }

  // ── Derived / stats ──
  saturationOf(q: Queue): Saturation {
    if (!q.activa) return "ok";
    if (q.waiting.length >= 8) return "full";
    if (q.waiting.length >= 4) return "busy";
    return "ok";
  }

  isUrgent(t: Ticket): boolean {
    return t.waitedMin >= URGENT_THRESHOLD;
  }

  get activeCount(): number {
    return this.queues.filter((q) => q.activa).length;
  }

  get totalWaiting(): number {
    return this.queues.reduce((s, q) => s + (q.activa ? q.waiting.length : 0), 0);
  }

  get totalServing(): number {
    return this.queues.reduce((s, q) => s + q.serving.length, 0);
  }

  get totalDoneToday(): number {
    return this.queues.reduce((s, q) => s + q.done.length, 0);
  }

  get totalEmittedToday(): number {
    return this.queues.reduce((s, q) => s + q.waiting.length + q.serving.length + q.done.length, 0);
  }

  get avgWaitMin(): number {
    const active = this.queues.filter((q) => q.activa && q.waiting.length > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((s, q) => s + q.tiempoProm, 0) / active.length);
  }

  /** The most-recently-called serving ticket across all queues (for dashboard hero). */
  get currentTicket(): { ticket: Ticket; queue: Queue } | null {
    for (const q of this.queues) {
      if (q.serving.length > 0) return { ticket: q.serving[0], queue: q };
    }
    return null;
  }

  // ── Queue CRUD ──
  createQueue(data: { nombre: string; servicio: string; mode: AttentionMode; tiempoProm: number; campos?: CustomField[] }): void {
    const color = COLOR_OPTIONS[this.queues.length % COLOR_OPTIONS.length];
    this.queues.push({
      id: crypto.randomUUID(),
      nombre: data.nombre,
      color,
      servicio: data.servicio,
      mode: data.mode,
      tiempoProm: data.tiempoProm,
      activa: true,
      campos: data.campos ?? [],
      waiting: [],
      serving: [],
      done: [],
    });
    // API assigns the real id → reload the full list to reconcile.
    this.sync(null, queuesApi.create(data));
  }

  updateQueue(id: string, data: { nombre?: string; servicio?: string; mode?: AttentionMode; tiempoProm?: number; campos?: CustomField[] }): void {
    const q = this.getQueue(id);
    if (!q) return;
    if (data.nombre !== undefined) q.nombre = data.nombre;
    if (data.servicio !== undefined) q.servicio = data.servicio;
    if (data.mode !== undefined) q.mode = data.mode;
    if (data.tiempoProm !== undefined) q.tiempoProm = data.tiempoProm;
    if (data.campos !== undefined) q.campos = data.campos;
    this.sync(id, queuesApi.update(id, data));
  }

  deleteQueue(id: string): void {
    this.queues = this.queues.filter((q) => q.id !== id);
    this.sync(null, queuesApi.remove(id));
  }

  toggleQueue(id: string, active: boolean): void {
    const q = this.getQueue(id);
    if (q) q.activa = active;
    this.sync(id, queuesApi.update(id, { activa: active }));
  }

  setMode(id: string, mode: AttentionMode): void {
    const q = this.getQueue(id);
    if (q) q.mode = mode;
    this.sync(id, queuesApi.update(id, { mode }));
  }

  // ── Ticket operations (within a queue) ──
  private col(q: Queue, key: TicketState): Ticket[] {
    return key === "waiting" ? q.waiting : key === "serving" ? q.serving : q.done;
  }

  moveTicket(queueId: string, from: TicketState, numero: string, to: TicketState): void {
    const q = this.getQueue(queueId);
    if (!q) return;
    // Enforce single serving ticket
    if (to === "serving" && q.serving.length >= 1) return;
    const fromList = this.col(q, from);
    const idx = fromList.findIndex((t) => t.numero === numero);
    if (idx === -1) return;
    const [moved] = fromList.splice(idx, 1);
    this.col(q, to).push(to === "done" ? { ...moved } : moved);
    this.sync(queueId, queuesApi.moveTicket(queueId, numero, to));
  }

  removeTicket(queueId: string, numero: string): void {
    const q = this.getQueue(queueId);
    if (!q) return;
    q.waiting = q.waiting.filter((t) => t.numero !== numero);
    q.serving = q.serving.filter((t) => t.numero !== numero);
    this.sync(queueId, queuesApi.removeTicket(queueId, numero));
  }

  /** Auto: complete current serving and pull next waiting into serving. */
  finishAndAdvance(queueId: string): void {
    const q = this.getQueue(queueId);
    if (!q) return;
    if (q.serving.length > 0) {
      const [current] = q.serving.splice(0, 1);
      q.done.push(current);
    }
    if (q.waiting.length > 0) {
      const [next] = q.waiting.splice(0, 1);
      q.serving.push({ ...next, espera: "0 min", waitedMin: 0 });
    }
    this.sync(queueId, queuesApi.finish(queueId, true));
  }

  /** Create a new ticket in a queue (operator view). The bot uses the same API. */
  createTicket(queueId: string, data: { cliente: string; telefono: string; datos?: Record<string, string> }): void {
    const q = this.getQueue(queueId);
    if (!q) return;
    // Optimistic local insert with a provisional number; refreshed from API.
    const provisional = `${q.nombre.charAt(0).toUpperCase()}-${String(
      q.waiting.length + q.serving.length + q.done.length + 1,
    ).padStart(3, "0")}`;
    q.waiting.push({
      numero: provisional,
      cliente: data.cliente,
      espera: "0 min",
      waitedMin: 0,
      telefono: data.telefono,
      datos: data.datos,
    });
    this.sync(queueId, queuesApi.createTicket(queueId, data));
  }

  /** Start serving the first waiting ticket if none is being served. */
  callNext(queueId: string): void {
    const q = this.getQueue(queueId);
    if (!q || q.serving.length > 0 || q.waiting.length === 0) return;
    const [next] = q.waiting.splice(0, 1);
    q.serving.push({ ...next, espera: "0 min", waitedMin: 0 });
    this.sync(queueId, queuesApi.callNext(queueId));
  }

  /** Complete current serving without auto-calling next (manual). */
  finishCurrent(queueId: string): void {
    const q = this.getQueue(queueId);
    if (!q || q.serving.length === 0) return;
    const [current] = q.serving.splice(0, 1);
    q.done.push(current);
    this.sync(queueId, queuesApi.finish(queueId, false));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SURVEYS
  // ═══════════════════════════════════════════════════════════════════════════

  surveys: Survey[] = seedSurveys();

  /** Config for the public survey view (editable from the Encuestas dashboard). */
  surveyConfig: SurveyConfig = {
    businessName: "Mi Negocio",
    logoUrl: "",
    title: "¿Cómo estuvo tu experiencia?",
    subtitle: "Tómate un momento para calificar tu visita.",
    thankYouTitle: "¡Gracias por tu opinión!",
    thankYouMessage: "Tu respuesta nos ayuda a mejorar el servicio para ti y para todos.",
  };

  updateSurveyConfig(data: Partial<SurveyConfig>): void {
    this.surveyConfig = { ...this.surveyConfig, ...data };
  }

  sentimentOf(rating: number): Sentiment {
    if (rating >= 4) return "positive";
    if (rating === 3) return "neutral";
    return "negative";
  }

  get avgRating(): number {
    if (this.surveys.length === 0) return 0;
    return this.surveys.reduce((s, x) => s + x.rating, 0) / this.surveys.length;
  }

  get totalResponses(): number {
    return this.surveys.length;
  }

  /** Response rate: surveys / total tickets that were completed. */
  get responseRate(): number {
    const completed = this.totalDoneToday + this.surveys.length;
    if (completed === 0) return 0;
    return Math.round((this.surveys.length / completed) * 100);
  }

  /** Rating distribution [count5, count4, count3, count2, count1]. */
  get ratingDistribution(): number[] {
    const dist = [0, 0, 0, 0, 0]; // index 0 = 5 stars
    for (const s of this.surveys) dist[5 - s.rating]++;
    return dist;
  }

  /** Average rating per queue name. */
  get avgByQueue(): { name: string; avg: number }[] {
    const map = new Map<string, { sum: number; n: number }>();
    for (const s of this.surveys) {
      const e = map.get(s.queueName) ?? { sum: 0, n: 0 };
      e.sum += s.rating; e.n += 1;
      map.set(s.queueName, e);
    }
    return [...map.entries()].map(([name, e]) => ({ name, avg: e.n ? e.sum / e.n : 0 }));
  }

  /** Rating trend over recent days (oldest first). */
  get ratingTrend(): { day: string; avg: number }[] {
    const buckets = new Map<number, { sum: number; n: number }>();
    for (const s of this.surveys) {
      const e = buckets.get(s.daysAgo) ?? { sum: 0, n: 0 };
      e.sum += s.rating; e.n += 1;
      buckets.set(s.daysAgo, e);
    }
    const days = [6, 5, 4, 3, 2, 1, 0];
    return days.map((d) => {
      const e = buckets.get(d);
      const labels = ["Hoy", "Ayer", "-2d", "-3d", "-4d", "-5d", "-6d"];
      return { day: labels[d], avg: e && e.n ? Number((e.sum / e.n).toFixed(1)) : 0 };
    }).reverse();
  }

  get lowRatingSurveys(): Survey[] {
    return this.surveys.filter((s) => s.rating <= 2);
  }

  /** Frequent topics from comments (naive word frequency + sentiment). */
  get topics(): { word: string; count: number; sentiment: "positive" | "negative" }[] {
    const positive = new Set(["rapido", "amable", "excelente", "bueno", "atento", "eficiente"]);
    const negative = new Set(["lento", "espera", "demora", "malo", "grosero", "desorganizado"]);
    const counts = new Map<string, number>();
    for (const s of this.surveys) {
      for (const raw of s.comentario.toLowerCase().split(/[^a-zñáéíóú]+/)) {
        if (raw.length < 4) continue;
        if (positive.has(raw) || negative.has(raw)) counts.set(raw, (counts.get(raw) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([word, count]) => ({
        word,
        count,
        sentiment: positive.has(word) ? "positive" as const : "negative" as const,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
}

const seedSurveys = (): Survey[] => [
  { id: "s1", cliente: "Maria Gonzalez", queueId: "1", queueName: "Consulta general", rating: 5, comentario: "Atencion muy rapida y amable, excelente servicio", fecha: "Hoy 10:24", daysAgo: 0 },
  { id: "s2", cliente: "Carlos Mendoza", queueId: "2", queueName: "Laboratorio", rating: 2, comentario: "La espera fue muy lenta, demora demasiado", fecha: "Hoy 09:50", daysAgo: 0 },
  { id: "s3", cliente: "Ana Silva", queueId: "1", queueName: "Consulta general", rating: 4, comentario: "Todo bien, personal amable", fecha: "Ayer 16:10", daysAgo: 1 },
  { id: "s4", cliente: "Pedro Ramirez", queueId: "3", queueName: "Farmacia", rating: 5, comentario: "Rapido y eficiente, muy bueno", fecha: "Ayer 14:30", daysAgo: 1 },
  { id: "s5", cliente: "Lucia Torres", queueId: "2", queueName: "Laboratorio", rating: 1, comentario: "Muy lento, la espera fue horrible", fecha: "-2d 11:05", daysAgo: 2 },
  { id: "s6", cliente: "Diego Rojas", queueId: "1", queueName: "Consulta general", rating: 4, comentario: "Buen servicio, atento", fecha: "-2d 10:00", daysAgo: 2 },
  { id: "s7", cliente: "Sofia Diaz", queueId: "3", queueName: "Farmacia", rating: 5, comentario: "Excelente, muy amable", fecha: "-3d 15:20", daysAgo: 3 },
  { id: "s8", cliente: "Marta Ruiz", queueId: "1", queueName: "Consulta general", rating: 3, comentario: "Normal, nada especial", fecha: "-4d 12:00", daysAgo: 4 },
  { id: "s9", cliente: "Jorge Nieto", queueId: "2", queueName: "Laboratorio", rating: 2, comentario: "Espera larga, mejorar la demora", fecha: "-5d 09:15", daysAgo: 5 },
  { id: "s10", cliente: "Elena Vargas", queueId: "3", queueName: "Farmacia", rating: 5, comentario: "Rapido, excelente atencion", fecha: "-6d 17:40", daysAgo: 6 },
];

export const queuesStore = new QueuesStore();
export { QueuesStore };
