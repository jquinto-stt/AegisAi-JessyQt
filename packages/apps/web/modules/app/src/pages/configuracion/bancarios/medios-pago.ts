/**
 * Medios donde un negocio colombiano recibe dinero: billeteras y bancos.
 *
 * Mapeo exacto a los logos disponibles en `public/images/bancos/`.
 */
export interface MedioPago {
  id: string;
  nombre: string;
  /** Nequi, Daviplata y Bre-B se identifican con celular/llave; no tienen tipo de cuenta tradicional. */
  billetera?: boolean;
  /** Iniciales de la ficha cuando no hay logo. */
  sigla: string;
  fondo: string;
  texto: string;
  logo?: string;
}

export const MEDIOS_PAGO: MedioPago[] = [
  {
    id: "nequi",
    nombre: "Nequi",
    billetera: true,
    sigla: "N",
    fondo: "#231C46",
    texto: "#E73B7B",
    logo: "/images/bancos/nequi-2.svg",
  },
  {
    id: "daviplata",
    nombre: "Daviplata",
    billetera: true,
    sigla: "D",
    fondo: "#E01A19",
    texto: "#FFFFFF",
    logo: "/images/bancos/daviplata.svg",
  },
  {
    id: "bre-b",
    nombre: "Bre-B",
    billetera: true,
    sigla: "BB",
    fondo: "#FFFFFF",
    texto: "#00B6ED",
    logo: "/images/bancos/logo-bre-b.svg",
  },
  {
    id: "bancolombia",
    nombre: "Bancolombia",
    sigla: "B",
    fondo: "#FFFFFF",
    texto: "#23307D",
    logo: "/images/bancos/bancolombia.svg",
  },
  {
    id: "nu",
    nombre: "Nu",
    sigla: "Nu",
    fondo: "#820AD1",
    texto: "#FFFFFF",
    logo: "/images/bancos/nubank-logo.svg",
  },
  {
    id: "mastercard",
    nombre: "Mastercard",
    sigla: "MC",
    fondo: "#000000",
    texto: "#FF5F01",
    logo: "/images/bancos/mastercard-modern-design-.svg",
  },
];

export const BILLETERAS = MEDIOS_PAGO.filter((m) => m.billetera);
export const BANCOS = MEDIOS_PAGO.filter((m) => !m.billetera);

/** Busca por nombre o id: las cuentas guardadas conservan el nombre del banco o el id. */
export const medioPorNombre = (nombre: string) =>
  MEDIOS_PAGO.find(
    (m) =>
      m.nombre.toLowerCase() === nombre.toLowerCase() ||
      m.id.toLowerCase() === nombre.toLowerCase() ||
      (nombre.toLowerCase().includes("nu") && m.id === "nu") ||
      (nombre.toLowerCase().includes("nequi") && m.id === "nequi") ||
      (nombre.toLowerCase().includes("daviplata") && m.id === "daviplata") ||
      (nombre.toLowerCase().includes("bancolombia") && m.id === "bancolombia") ||
      (nombre.toLowerCase().includes("bre-b") && m.id === "bre-b") ||
      (nombre.toLowerCase().includes("mastercard") && m.id === "mastercard"),
  );
