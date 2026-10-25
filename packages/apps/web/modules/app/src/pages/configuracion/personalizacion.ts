import type { HorarioAtencion, RedesNegocio } from "@/stores/organizacion.store";

// ═══════════════════════════════════════════════════════════════════════════
// PERSONALIZACIÓN DEL NEGOCIO — reglas sin JSX
// ═══════════════════════════════════════════════════════════════════════════
//
// Color de marca, redes y horario: lo que la pantalla edita y la vista previa
// interpreta. Vive en un `.ts` para que los tests de Node lo recorran sin React,
// como el resto de catálogos de esta carpeta.

// ── Color de marca ─────────────────────────────────────────────────────────

export const COLOR_MARCA_DEFECTO = "#FF3F1A";

/** Muestras rápidas. Las tres primeras son la paleta NECTO. */
export const COLORES_MARCA: { hex: string; nombre: string }[] = [
  { hex: "#FF3F1A", nombre: "Naranja" },
  { hex: "#190088", nombre: "Azul profundo" },
  { hex: "#97D6DF", nombre: "Cyan" },
  { hex: "#212121", nombre: "Negro" },
  { hex: "#16A34A", nombre: "Verde" },
  { hex: "#0F766E", nombre: "Verde azulado" },
  { hex: "#2563EB", nombre: "Azul" },
  { hex: "#7C3AED", nombre: "Morado" },
  { hex: "#DB2777", nombre: "Rosa" },
  { hex: "#CA8A04", nombre: "Mostaza" },
];

export function esHexValido(valor: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(valor.trim());
}

/**
 * Color de texto legible sobre un fondo de marca: blanco o el Dark NECTO.
 * Usa la luminancia relativa de WCAG; el umbral 0.45 deja el cyan y el mostaza
 * con texto oscuro y el naranja con texto blanco.
 */
export function textoSobre(hex: string): "#FFFFFF" | "#212121" {
  if (!esHexValido(hex)) return "#FFFFFF";
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  return luminancia > 0.45 ? "#212121" : "#FFFFFF";
}

// ── Redes ──────────────────────────────────────────────────────────────────

export type RedNegocio = keyof RedesNegocio;

/**
 * Deja solo el usuario: la gente pega «@tienda», «tienda» o la URL entera
 * del perfil, y las tres formas tienen que funcionar.
 */
export function usuarioDeRed(valor: string): string {
  const limpio = valor.trim().replace(/\/+$/, "");
  const ultimo = limpio.includes("/") ? limpio.split("/").pop() ?? "" : limpio;
  return ultimo.replace(/^@/, "").split("?")[0];
}

export function enlaceDeRed(red: RedNegocio, valor: string): string | null {
  if (red === "whatsapp") {
    const digitos = valor.replace(/\D/g, "");
    return digitos.length >= 7 ? `https://wa.me/${digitos}` : null;
  }
  const usuario = usuarioDeRed(valor);
  if (!usuario) return null;
  switch (red) {
    case "instagram":
      return `https://instagram.com/${usuario}`;
    case "facebook":
      return `https://facebook.com/${usuario}`;
    case "tiktok":
      return `https://tiktok.com/@${usuario}`;
  }
}

// ── Horario ────────────────────────────────────────────────────────────────

/** Días en el orden de la semana colombiana (lunes primero), con su `getDay()`. */
export const DIAS_SEMANA: { dia: number; corto: string; largo: string }[] = [
  { dia: 1, corto: "Lun", largo: "lunes" },
  { dia: 2, corto: "Mar", largo: "martes" },
  { dia: 3, corto: "Mié", largo: "miércoles" },
  { dia: 4, corto: "Jue", largo: "jueves" },
  { dia: 5, corto: "Vie", largo: "viernes" },
  { dia: 6, corto: "Sáb", largo: "sábado" },
  { dia: 0, corto: "Dom", largo: "domingo" },
];

export const HORARIO_DEFECTO: HorarioAtencion = { dias: [1, 2, 3, 4, 5, 6], abre: "08:00", cierra: "18:00" };

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** «08:00» → «8:00». */
export const horaLegible = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");

/** «Lun a Sáb», «Todos los días», «Lun, Mié, Vie». */
export function resumenDias(dias: number[]): string {
  const orden = DIAS_SEMANA.filter((d) => dias.includes(d.dia));
  if (orden.length === 0) return "Sin días de atención";
  if (orden.length === 7) return "Todos los días";
  if (orden.length === 1) return orden[0].corto;

  const posiciones = orden.map((d) => DIAS_SEMANA.indexOf(d));
  const seguidos = posiciones.every((p, i) => i === 0 || p === posiciones[i - 1] + 1);
  return seguidos
    ? `${orden[0].corto} a ${orden[orden.length - 1].corto}`
    : orden.map((d) => d.corto).join(", ");
}

export interface EstadoHorario {
  abierto: boolean;
  texto: string;
}

/**
 * Si el negocio está abierto en `ahora` y qué decirle al cliente.
 *
 * Un cierre igual o anterior a la apertura (p. ej. 18:00–02:00) se lee como
 * horario que cruza la medianoche: la madrugada pertenece al día anterior.
 */
export function estadoHorario(horario: HorarioAtencion | undefined, ahora: Date): EstadoHorario | null {
  if (!horario || horario.dias.length === 0) return null;

  const abre = aMinutos(horario.abre);
  const cierra = aMinutos(horario.cierra);
  const cruzaMedianoche = cierra <= abre;
  const hoy = ahora.getDay();
  const ayer = (hoy + 6) % 7;
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();

  const abiertoHoy = horario.dias.includes(hoy) && minuto >= abre && (cruzaMedianoche || minuto < cierra);
  const abiertoDesdeAyer = cruzaMedianoche && horario.dias.includes(ayer) && minuto < cierra;

  if (abiertoHoy || abiertoDesdeAyer) {
    return { abierto: true, texto: `Abierto ahora · cierra a las ${horaLegible(horario.cierra)}` };
  }

  if (horario.dias.includes(hoy) && minuto < abre) {
    return { abierto: false, texto: `Cerrado · abre hoy a las ${horaLegible(horario.abre)}` };
  }

  for (let salto = 1; salto <= 7; salto++) {
    const dia = (hoy + salto) % 7;
    if (!horario.dias.includes(dia)) continue;
    const cuando = salto === 1 ? "mañana" : `el ${DIAS_SEMANA.find((d) => d.dia === dia)?.largo}`;
    return { abierto: false, texto: `Cerrado · abre ${cuando} a las ${horaLegible(horario.abre)}` };
  }
  return null;
}
