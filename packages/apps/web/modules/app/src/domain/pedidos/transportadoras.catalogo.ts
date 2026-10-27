/**
 * Catálogo de transportadoras con logo.
 *
 * Vive en el dominio y no en una página porque lo consumen tres superficies que
 * antes tenían su propia copia (o su propio criterio): la tabla de pedidos, el
 * formulario de creación y la página de recolecciones. Una lista duplicada es
 * una lista que se desactualiza en dos de los tres sitios.
 *
 * `id` es el identificador estable; `nombre` es lo que se guarda en
 * `Pedido.repartidor` y en `Recoleccion.transportadora`, así que **no se
 * renombra**: cambiar «Envía» por «Envía Mensajería» dejaría huérfanos los
 * pedidos ya escritos.
 */
export interface Transportadora {
  id: string;
  nombre: string;
  logo?: string;
  /** Algunos logos son claros y desaparecen sobre fondo blanco. */
  fondoLogo?: "oscuro";
}

export const TRANSPORTADORAS: Transportadora[] = [
  { id: "propio", nombre: "Envío propio" },
  {
    id: "envia",
    nombre: "Envía",
    logo: "/images/logo_transportadoras/envia-mensajeria-vector-logo-seeklogo/envia-mensajeria-seeklogo.png",
  },
  {
    id: "coordinadora",
    nombre: "Coordinadora",
    logo: "/images/logo_transportadoras/coordinadora-vector-logo-seeklogo/coordinadora-seeklogo.png",
  },
  {
    id: "servientrega",
    nombre: "Servientrega",
    logo: "/images/logo_transportadoras/servientrega-vector-logo-seeklogo/servientrega-seeklogo.png",
  },
  {
    id: "tcc",
    nombre: "TCC",
    logo: "/images/logo_transportadoras/tcc-vector-logo-seeklogo/tcc-seeklogo.png",
  },
  {
    id: "interrapidisimo",
    nombre: "InterRapidísimo",
    logo: "/images/logo_transportadoras/interrapidisimo/interrapidisimo-logo.webp",
    fondoLogo: "oscuro",
  },
];

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/**
 * La transportadora del catálogo que corresponde a un nombre escrito a mano.
 *
 * La comparación ignora acentos y mayúsculas —«envia» y «Envía» son la misma
 * transportadora— porque el nombre se captura a mano en dos sitios distintos.
 * Devuelve `undefined` si no está en el catálogo: quien pinta decide qué hacer
 * (la tabla de pedidos muestra el nombre sin logo, no inventa una marca).
 */
export function transportadoraPorNombre(nombre: string): Transportadora | undefined {
  const buscado = normalizar(nombre ?? "");
  if (!buscado) return undefined;
  return TRANSPORTADORAS.find((t) => normalizar(t.nombre) === buscado);
}
