/**
 * Medios donde un negocio colombiano recibe dinero: billeteras, neobancos y bancos tradicionales.
 *
 * Mapeo exacto a los logos disponibles en `public/images/bancos/`.
 */
export type CategoriaMedio = "banco" | "digital" | "billetera" | "red";

export interface MedioPago {
  id: string;
  nombre: string;
  categoria?: CategoriaMedio;
  /** Nequi, Daviplata y Bre-B se identifican principalmente con celular o llave. */
  billetera?: boolean;
  /** Iniciales de la ficha cuando no hay logo. */
  sigla: string;
  fondo: string;
  texto: string;
  logo?: string;
  descripcion?: string;
}

export const MEDIOS_PAGO: MedioPago[] = [
  // ── Billeteras Digitales y Pagos Inmediatos ──────────────────────────────
  {
    id: "nequi",
    nombre: "Nequi",
    categoria: "billetera",
    billetera: true,
    sigla: "N",
    fondo: "#231C46",
    texto: "#E73B7B",
    logo: "/images/bancos/nequi-2.svg",
    descripcion: "Billetera digital",
  },
  {
    id: "daviplata",
    nombre: "Daviplata",
    categoria: "billetera",
    billetera: true,
    sigla: "D",
    fondo: "#E01A19",
    texto: "#FFFFFF",
    logo: "/images/bancos/daviplata.svg",
    descripcion: "Billetera digital",
  },
  {
    id: "bre-b",
    nombre: "Bre-B",
    categoria: "billetera",
    billetera: true,
    sigla: "BB",
    fondo: "#FFFFFF",
    texto: "#00B6ED",
    logo: "/images/bancos/logo-bre-b.svg",
    descripcion: "Sistema de pagos inmediatos",
  },

  // ── Neobancos / Bancos 100% Digitales ────────────────────────────────────
  {
    id: "nu",
    nombre: "Nu (Nubank)",
    categoria: "digital",
    billetera: false, // Cuenta de ahorros con número de cuenta formal
    sigla: "Nu",
    fondo: "#820AD1",
    texto: "#FFFFFF",
    logo: "/images/bancos/nubank-logo.svg",
    descripcion: "Banco 100% digital (Neobanco)",
  },

  // ── Bancos Tradicionales ────────────────────────────────────────────────
  {
    id: "bancolombia",
    nombre: "Bancolombia",
    categoria: "banco",
    sigla: "B",
    fondo: "#FFFFFF",
    texto: "#23307D",
    logo: "/images/bancos/bancolombia.svg",
    descripcion: "Banco comercial",
  },
  {
    id: "bogota",
    nombre: "Banco de Bogotá",
    categoria: "banco",
    sigla: "BB",
    fondo: "#002D72",
    texto: "#FFFFFF",
    logo: "/images/bancos/logo-banco-de-bogota.svg",
    descripcion: "Banco comercial",
  },
  {
    id: "davivienda",
    nombre: "Davivienda",
    categoria: "banco",
    sigla: "D",
    fondo: "#ED1C24",
    texto: "#FFFFFF",
    logo: "/images/bancos/logo-davivienda.svg",
    descripcion: "Banco comercial",
  },
  {
    id: "itau",
    nombre: "Itaú",
    categoria: "banco",
    sigla: "IT",
    fondo: "#1A5493",
    texto: "#FFF212",
    logo: "/images/bancos/itau-5.svg",
    descripcion: "Banco comercial",
  },
  {
    id: "occidente",
    nombre: "Banco de Occidente",
    categoria: "banco",
    sigla: "BO",
    fondo: "#0055A5",
    texto: "#FFFFFF",
    logo: "/images/bancos/logo-banco-de-occidente.svg",
    descripcion: "Banco comercial",
  },
  {
    id: "cajasocial",
    nombre: "Banco Caja Social",
    categoria: "banco",
    sigla: "BCS",
    fondo: "#0033A0",
    texto: "#FFFFFF",
    logo: "/images/bancos/logo-banco-caja-social.svg",
    descripcion: "Banco comercial",
  },

  // ── Redes de Pago y Tarjetas ─────────────────────────────────────────────
  {
    id: "mastercard",
    nombre: "Mastercard",
    categoria: "red",
    sigla: "MC",
    fondo: "#000000",
    texto: "#FF5F01",
    logo: "/images/bancos/mastercard-modern-design-.svg",
    descripcion: "Red de pagos / Tarjetas",
  },
];

export const BILLETERAS = MEDIOS_PAGO.filter((m) => m.categoria === "billetera");
export const DIGITALES = MEDIOS_PAGO.filter((m) => m.categoria === "digital");
export const TRADICIONALES = MEDIOS_PAGO.filter((m) => m.categoria === "banco");
export const REDES = MEDIOS_PAGO.filter((m) => m.categoria === "red");
export const BANCOS = MEDIOS_PAGO.filter((m) => !m.billetera);

/** Busca por nombre o id de forma tolerante. */
export const medioPorNombre = (nombre: string) => {
  if (!nombre) return undefined;
  const n = nombre.trim().toLowerCase();
  return MEDIOS_PAGO.find(
    (m) =>
      m.nombre.toLowerCase() === n ||
      m.id.toLowerCase() === n ||
      (n.includes("nu") && m.id === "nu") ||
      (n.includes("nequi") && m.id === "nequi") ||
      (n.includes("daviplata") && m.id === "daviplata") ||
      (n.includes("bancolombia") && m.id === "bancolombia") ||
      (n.includes("bogota") && m.id === "bogota") ||
      (n.includes("davivienda") && m.id === "davivienda") ||
      (n.includes("itau") && m.id === "itau") ||
      (n.includes("occidente") && m.id === "occidente") ||
      (n.includes("caja social") && m.id === "cajasocial") ||
      (n.includes("bre-b") && m.id === "bre-b") ||
      (n.includes("mastercard") && m.id === "mastercard"),
  );
};
