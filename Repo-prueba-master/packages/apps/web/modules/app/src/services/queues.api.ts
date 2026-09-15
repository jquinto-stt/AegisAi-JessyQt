import type { Queue, Ticket, AttentionMode, TicketState, CustomField } from "@/stores/queues.store";

/**
 * queues.api — Fetch layer between the frontend store and the NECTO backend
 * (Express microservice). Maps the backend ticket shape (estado/createdAt) to
 * the frontend shape (espera/waitedMin) so the store and views stay unchanged.
 *
 * Base URL: VITE_API_URL (defaults to "/api", which vite proxies to :8080 in dev).
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

// ── Backend wire shapes ──
interface BackendTicket {
  numero: string;
  cliente: string;
  telefono?: string;
  estado: TicketState;
  createdAt: string;
  calledAt?: string;
  finishedAt?: string;
  datos?: Record<string, string>;
}

interface BackendQueue {
  id: string;
  nombre: string;
  color: string;
  servicio: string;
  mode: AttentionMode;
  tiempoProm: number;
  activa: boolean;
  campos?: CustomField[];
  waiting: BackendTicket[];
  serving: BackendTicket[];
  done: BackendTicket[];
}

// ── Mapping ──
function minutesSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function mapTicket(t: BackendTicket): Ticket {
  // Waiting time is measured from creation; serving/done show 0.
  const waitedMin = t.estado === "waiting" ? minutesSince(t.createdAt) : 0;
  return {
    numero: t.numero,
    cliente: t.cliente,
    espera: `${waitedMin} min`,
    waitedMin,
    telefono: t.telefono,
    datos: t.datos,
  };
}

function mapQueue(q: BackendQueue): Queue {
  return {
    id: q.id,
    nombre: q.nombre,
    color: q.color,
    servicio: q.servicio,
    mode: q.mode,
    tiempoProm: q.tiempoProm,
    activa: q.activa,
    campos: q.campos ?? [],
    waiting: (q.waiting ?? []).map(mapTicket),
    serving: (q.serving ?? []).map(mapTicket),
    done: (q.done ?? []).map(mapTicket),
  };
}

// ── HTTP helper ──
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status} ${path} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

export const queuesApi = {
  // ── Queues ──
  async list(): Promise<Queue[]> {
    const { queues } = await http<{ queues: BackendQueue[] }>("/queues");
    return queues.map(mapQueue);
  },

  async get(id: string): Promise<Queue | null> {
    const { queue } = await http<{ queue: BackendQueue | null }>(`/queues/${id}`);
    return queue ? mapQueue(queue) : null;
  },

  async create(data: {
    nombre: string;
    servicio: string;
    mode: AttentionMode;
    tiempoProm: number;
    campos?: CustomField[];
  }): Promise<Queue> {
    const { queue } = await http<{ queue: BackendQueue }>("/queues", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapQueue({ ...queue, waiting: [], serving: [], done: [] });
  },

  async update(
    id: string,
    data: { nombre?: string; servicio?: string; mode?: AttentionMode; tiempoProm?: number; activa?: boolean; campos?: CustomField[] },
  ): Promise<void> {
    await http(`/queues/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  async remove(id: string): Promise<void> {
    await http(`/queues/${id}`, { method: "DELETE" });
  },

  // ── Tickets (turnos) ──
  async createTicket(
    queueId: string,
    data: { cliente: string; telefono?: string; datos?: Record<string, string> },
  ): Promise<void> {
    await http(`/queues/${queueId}/turnos`, { method: "POST", body: JSON.stringify(data) });
  },

  async callNext(queueId: string): Promise<void> {
    await http(`/queues/${queueId}/call-next`, { method: "POST" });
  },

  async finish(queueId: string, advance: boolean): Promise<void> {
    await http(`/queues/${queueId}/finish`, { method: "POST", body: JSON.stringify({ advance }) });
  },

  async moveTicket(queueId: string, numero: string, to: TicketState): Promise<void> {
    await http(`/queues/${queueId}/turnos/${numero}`, { method: "PATCH", body: JSON.stringify({ to }) });
  },

  async removeTicket(queueId: string, numero: string): Promise<void> {
    await http(`/queues/${queueId}/turnos/${numero}`, { method: "DELETE" });
  },
};

export default queuesApi;
