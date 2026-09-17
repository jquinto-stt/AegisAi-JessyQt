import { conversacionesStore } from "@/stores/conversaciones.store";

// ═══════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN AL HILO DE UN CLIENTE (puente Pedidos → Conversaciones)
// ═══════════════════════════════════════════════════════════════════════════
//
// Este módulo es el ÚNICO sitio donde se decide qué pasa cuando el operador
// pulsa "escribir al cliente" desde el módulo de Pedidos.
//
// ANTES: cada página tenía su propia copia de `abrirWhatsApp`, que hacía
// `window.open("https://wa.me/<telefono>")`. Es decir: la app expulsaba al
// usuario del producto para hablar con un cliente cuya conversación YA vive
// dentro del producto. Tres copias del mismo helper, tres oportunidades de
// divergir, y ninguna forma de arreglarlo en un solo sitio.
//
// AHORA: se resuelve el hilo del cliente por su teléfono y se navega a la
// consola de conversaciones con ese hilo ya seleccionado. Un solo helper, un
// solo comportamiento.
//
// ── Por qué vive aquí y no en un store ──────────────────────────────────────
// `conversaciones.store.ts` NO puede importar `pedidos.store` (invariante D2):
// el cruce entre ambos dominios es responsabilidad de la capa de UI. Este
// módulo es exactamente esa capa. No es un store, no tiene estado propio y no
// conoce la forma interna de ninguna de las dos entidades — solo usa sus
// puertas públicas (`conversacionesStore.porTelefono`).
//
// ── Por qué es una función y no un hook ────────────────────────────────────
// No necesita estado ni suscripción: recibe un `navigate` de react-router y
// devuelve si pudo o no. Así puede llamarse desde un `onClick` sin obligar al
// llamante a envolver el componente en nada, y sigue siendo testeable de forma
// aislada (no requiere renderizar React).

/** Resultado de intentar abrir la conversación de un contacto. */
export type ResultadoAbrirChat =
  /** Se encontró el hilo: se seleccionó y se navegó a él. */
  | "abierto"
  /** El contacto no tiene ningún hilo abierto (no se crea uno implícitamente). */
  | "sin_conversacion";

/** Firma mínima de `navigate` de react-router que este módulo necesita. */
type Navegar = (to: string) => void;

/** Ruta de la consola de conversaciones (única superficie de chat del sistema). */
export const RUTA_CONVERSACIONES = "/conversaciones";

/**
 * Abre el hilo de WhatsApp de un contacto DENTRO del sistema.
 *
 * Busca la conversación por teléfono con `conversacionesStore.porTelefono`
 * (búsqueda exacta: el teléfono es una clave de identidad, no un término de
 * búsqueda), la marca como seleccionada y navega a `/conversaciones`. Allí la
 * página lee `conversacionesStore.seleccionadaId` y muestra ese hilo, así que
 * el operador aterriza directamente en la conversación correcta.
 *
 * Si el contacto NO tiene hilo, devuelve `"sin_conversacion"` sin navegar: no
 * se crea una conversación vacía como efecto colateral de pulsar un botón.
 * Crear un hilo es una decisión de negocio; el llamante decide qué mostrar.
 *
 * NO comprueba capacidades: el gating (`channels.read` / `puedeEscribirCliente`)
 * vive en la UI, junto al botón que dispara la acción. Duplicarlo aquí crearía
 * dos fuentes de verdad para la autorización.
 *
 * @param telefono Teléfono del contacto en E.164 (el mismo valor que guarda
 *                 `Pedido.telefono` y `Contacto.telefono`).
 * @param navigate `navigate` de react-router (se inyecta para no acoplar este
 *                 módulo al router y poder probarlo sin montar la app).
 */
export function abrirConversacionDe(
  telefono: string,
  navigate: Navegar,
): ResultadoAbrirChat {
  const conv = conversacionesStore.porTelefono(telefono);
  if (!conv) return "sin_conversacion";

  // `seleccionar` fija `seleccionadaId` y marca el hilo como leído, así que al
  // llegar a /conversaciones ya aparece el hilo correcto y sin contador de no
  // leídos. Se hace ANTES de navegar para que la página lo encuentre listo.
  conversacionesStore.seleccionar(conv.id);
  navigate(RUTA_CONVERSACIONES);
  return "abierto";
}
