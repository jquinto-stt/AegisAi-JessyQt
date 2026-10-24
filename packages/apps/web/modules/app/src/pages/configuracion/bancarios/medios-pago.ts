/**
 * Medios donde un negocio colombiano recibe dinero: billeteras y bancos.
 *
 * Cada uno lleva el color de su marca para pintar su ficha (`LogoMedio`).
 * Para usar el logo oficial, deja el SVG en `public/images/bancos/` y pon su
 * ruta en `logo`: la ficha lo muestra en lugar de las iniciales.
 */
export interface MedioPago {
  id: string;
  nombre: string;
  /** Nequi y Daviplata se identifican con el celular; no tienen tipo de cuenta. */
  billetera?: boolean;
  /** Iniciales de la ficha cuando no hay logo. */
  sigla: string;
  fondo: string;
  texto: string;
  logo?: string;
}

export const MEDIOS_PAGO: MedioPago[] = [
  { id: "nequi", nombre: "Nequi", billetera: true, sigla: "N", fondo: "#200020", texto: "#DA0081", logo: "/images/bancos/nequi.svg" },
  { id: "daviplata", nombre: "Daviplata", billetera: true, sigla: "D", fondo: "#E30613", texto: "#FFFFFF", logo: "/images/bancos/daviplata.svg" },
  { id: "bancolombia", nombre: "Bancolombia", sigla: "B", fondo: "#FFFFFF", texto: "#2C2A29", logo: "/images/bancos/bancolombia.svg" },
  { id: "davivienda", nombre: "Davivienda", sigla: "D", fondo: "#ED1C24", texto: "#FFFFFF", logo: "/images/bancos/davivienda.svg" },
  { id: "bogota", nombre: "Banco de Bogotá", sigla: "BB", fondo: "#002D72", texto: "#FFFFFF", logo: "/images/bancos/bogota.svg" },
  { id: "bbva", nombre: "BBVA", sigla: "BBVA", fondo: "#004481", texto: "#FFFFFF", logo: "/images/bancos/bbva.svg" },
  { id: "nu", nombre: "Nu", sigla: "nu", fondo: "#820AD1", texto: "#FFFFFF", logo: "/images/bancos/nu.svg" },
  { id: "occidente", nombre: "Banco de Occidente", sigla: "O", fondo: "#0055A5", texto: "#FFFFFF", logo: "/images/bancos/occidente.svg" },
  { id: "popular", nombre: "Banco Popular", sigla: "P", fondo: "#00843D", texto: "#FFFFFF", logo: "/images/bancos/popular.svg" },
  { id: "cajasocial", nombre: "Banco Caja Social", sigla: "CS", fondo: "#0033A0", texto: "#FFFFFF", logo: "/images/bancos/cajasocial.svg" },
  { id: "colpatria", nombre: "Scotiabank Colpatria", sigla: "SC", fondo: "#EC111A", texto: "#FFFFFF", logo: "/images/bancos/colpatria.svg" },
];

export const BILLETERAS = MEDIOS_PAGO.filter((m) => m.billetera);
export const BANCOS = MEDIOS_PAGO.filter((m) => !m.billetera);

/** Busca por nombre: las cuentas guardadas solo conservan el nombre del banco. */
export const medioPorNombre = (nombre: string) => MEDIOS_PAGO.find((m) => m.nombre === nombre);
