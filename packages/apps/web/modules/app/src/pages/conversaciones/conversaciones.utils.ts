import { conversacionesStore } from "@/stores/conversaciones.store";

/**
 * Mapeo de fotos de perfil para la demo visual inspirada en TailAdmin / Webi.AI Elements.
 * Muestra avatares fotográficos de alta resolución, con fallback a iniciales.
 */
export const AVATAR_MAP: Record<string, string> = {
  "conv-1": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces",
  "conv-2": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=128&h=128&fit=crop&crop=faces",
  "conv-3": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces",
  "conv-4": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=faces",
  "conv-5": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
  "conv-6": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=faces",
  "conv-7": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces",
  "conv-8": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&crop=faces",
};

/** Extrae las iniciales del nombre de contacto */
export const inicialesDe = (nombre: string): string => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

/** Mapea el estado de conversación a la presencia del Avatar */
export const statusDe = (estado: string): "online" | "busy" | "offline" => {
  if (estado === "abierta") return "online";
  if (estado === "en_espera") return "busy";
  return "offline";
};

/** Formatea una fecha ISO a tiempo relativo legible tipo chat ("ahora", "15 min", "2 h", "1 d") */
export const tiempoRelativo = (iso: string): string => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
};

/** Formatea una fecha ISO a HH:MM */
export const horaDe = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/** Extrae el último texto del hilo para el preview en la lista (prioriza mensajes humanos sobre eventos técnicos) */
export const ultimoTexto = (convId: string): string => {
  const items = conversacionesStore.lineaDeTiempo(convId);
  // Buscar el último mensaje real del chat
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.clase === "mensaje" && it.data.contenido.texto) {
      return it.data.contenido.texto.replace(/\n/g, " ");
    }
  }
  const last = items[items.length - 1];
  if (!last) return "";
  const t = last.clase === "mensaje" ? last.data.contenido.texto : last.data.texto;
  return t.replace(/\n/g, " ");
};
