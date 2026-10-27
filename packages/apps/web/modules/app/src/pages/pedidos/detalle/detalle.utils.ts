import type { Pedido } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// HITOS Y EVENTOS DEL ENVÍO
// ═══════════════════════════════════════════════════════════════════════════

/** Cómo se pinta un hito: ya ocurrió, está ocurriendo, o falta. */
export type EstadoHito = "hecho" | "actual" | "pendiente";

export interface HitoEnvio {
  clave: string;
  titulo: string;
  /** Línea corta bajo el título: la fecha, o por qué todavía no aplica. */
  detalle: string;
  estado: EstadoHito;
}

/** Un punto de la línea de tiempo del envío. */
export interface EventoEnvio {
  titulo: string;
  fecha: string; // ISO
}

/** «23 oct 2026, 14:17» — el formato con el que se leen las fechas del detalle. */
export function fechaHora(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** «23 oct 2026» — para los pies de tarjeta, donde la hora no aporta. */
export function fechaCorta(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Los cuatro hitos del envío, en orden.
 *
 * Se DERIVAN del pedido —su estado y su número de guía—, no de una tabla
 * paralela que habría que mantener: si mañana se añade un estado al pipeline,
 * el hito que dependa de él cambia aquí y en ningún otro sitio.
 *
 * El hito alcanzado más lejano se marca «actual» (no «hecho») mientras el
 * pedido siga vivo: es el que dice en qué punto está, y pintarlo como cumplido
 * escondería justo la información que se viene a buscar.
 */
export function hitosDe(pedido: Pedido): HitoEnvio[] {
  const cancelado = pedido.estado === "cancelado";
  const confirmado = !cancelado && pedido.estado !== "nuevo" && pedido.estado !== "programado";
  // La guía es `numeroGuia`, NO `repartidor`. Hasta el 26/10 este hito se daba
  // por cumplido con solo tener repartidor, así que un domicilio con «Javier
  // Moto 04» anunciaba «Pedido con guía generada» sin que existiera guía
  // ninguna. El repartidor dice QUIÉN lleva el pedido; la guía, con qué número
  // lo rastrea la transportadora.
  const conGuia = Boolean(pedido.numeroGuia?.trim());
  const enTransito = pedido.estado === "en_camino" || pedido.estado === "entregado";
  const finalizado = pedido.estado === "entregado";

  const alcanzados = [confirmado, conGuia, enTransito, finalizado];
  const ultimo = alcanzados.lastIndexOf(true);

  const estadoDe = (i: number): EstadoHito => {
    // Sin ningún hito alcanzado el pedido está esperando el PRIMERO: se marca
    // «actual» para que la fila diga en qué paso está, en vez de dejar las
    // cuatro tarjetas grises sin decir dónde está parado.
    if (ultimo === -1) return i === 0 ? "actual" : "pendiente";
    if (!alcanzados[i]) return "pendiente";
    if (i === ultimo && !finalizado) return "actual";
    return "hecho";
  };

  return [
    {
      clave: "confirmado",
      titulo: "Pedido confirmado",
      detalle: confirmado ? fechaCorta(pedido.createdAt) : "Sin confirmar todavía",
      estado: estadoDe(0),
    },
    {
      clave: "guia",
      titulo: "Pedido con guía generada",
      detalle: conGuia ? pedido.numeroGuia!.trim() : "Sin guía todavía",
      estado: estadoDe(1),
    },
    {
      clave: "transito",
      titulo: "Pedido en tránsito",
      detalle: enTransito ? "En camino al destino" : "Aún no sale del negocio",
      estado: estadoDe(2),
    },
    {
      clave: "finalizado",
      titulo: "Pedido finalizado",
      detalle: finalizado ? fechaCorta(pedido.finishedAt) : "Pendiente de entrega",
      estado: estadoDe(3),
    },
  ];
}

/**
 * La línea de tiempo del envío.
 *
 * Sale de lo que el pedido YA registra: su creación, los eventos de auditoría
 * (que llevan hora y autor), el momento en que entró al estado actual y la
 * marca de finalización. No se inventan pasos intermedios: si el pedido no
 * dejó rastro de un paso, ese paso no se dibuja.
 */
export function eventosDeEnvio(pedido: Pedido, etiquetaEstado: string): EventoEnvio[] {
  const eventos: EventoEnvio[] = [
    { titulo: "Pedido generado", fecha: pedido.createdAt },
    ...(pedido.auditoria ?? []).map((a) => ({ titulo: a.accion, fecha: a.fecha })),
    { titulo: `Estado actual: ${etiquetaEstado}`, fecha: pedido.estadoDesde },
  ];

  if (pedido.finishedAt) {
    eventos.push({ titulo: "Pedido finalizado", fecha: pedido.finishedAt });
  }

  const vistos = new Set<string>();
  return eventos
    .filter((e) => Boolean(e.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .filter((e) => {
      const clave = `${e.titulo}|${e.fecha}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
}
