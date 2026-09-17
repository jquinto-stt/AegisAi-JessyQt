// ═══════════════════════════════════════════════════════════════════════════
// conversaciones.clasificacion.ts — Eje de INTENCIÓN del hilo
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo responde UNA pregunta: **¿qué quiere el cliente?**
//
// Es el tercer eje de la bandeja, y es INDEPENDIENTE de los otros dos:
//
//   DOMINIO    ¿de qué negocio se habla?   pedidos | inventario | general
//              → `modulosDe` / `moduloPrincipalDe` (en el store)
//   INTENCIÓN  ¿qué quiere el cliente?     consultar | comprar | seguir_pedido | reclamar
//              → este archivo
//   ATENCIÓN   ¿quién y cómo se atiende?   estado + atención + operador
//              → ya existía; NO se toca
//
// ── POR QUÉ VIVE EN `pages/` Y NO EN EL STORE ───────────────────────────────
//
// Porque derivar la intención exige cruzar Pedidos con Conversaciones, y ese
// cruce pertenece a la CAPA DE UI (invariante D2): el `conversacionesStore` no
// importa `pedidosStore` y no debe empezar a hacerlo. El store expone hechos de
// su propio dominio (`modulosDe`, `lineaDeTiempo`); la interpretación que
// combina dos dominios se hace aquí, encima de los dos.
//
// El teléfono es la clave de cruce, y por eso este archivo importa los dos
// stores: es exactamente el puente sancionado.
//
// ── POR QUÉ ES DERIVACIÓN Y NO UN CAMPO ─────────────────────────────────────
//
// `intencionDe` es una función PURA sobre el estado: no persiste nada, no hay
// campo en `Conversacion` que mantener sincronizado, no hay máquina de estados.
// MobX la re-evalúa en cada lectura reactiva, así que un hilo que empieza
// consultando y termina con un pedido registrado CAMBIA DE INTENCIÓN SOLO, sin
// que nadie notifique nada.
//
// Ese es el argumento decisivo contra el triage manual: una etiqueta elegida a
// mano no se entera de la transición y se queda obsoleta en cuanto el hilo
// avanza. Y es el mismo motivo por el que `Conversacion.pedidoActivoId` está
// deprecado: guardar estado derivado es crear una segunda fuente de verdad.
//
// ── SIN IA ─────────────────────────────────────────────────────────────────
//
// La intención se deriva de EFECTOS OBSERVABLES, no de la semántica del texto:
// un pedido que nació en el hilo, un pedido anterior, un evento de escalamiento.
// El proyecto es un mock 100 % frontend sin backend: un clasificador no sería
// determinista, no sería testeable con la suite actual y añadiría un modo de
// fallo nuevo en el camino crítico del chat.
//
// ═══════════════════════════════════════════════════════════════════════════

import type { BadgeColor } from "@/elements/ui/badge";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore, type Pedido } from "@/stores/pedidos.store";
import type {
  IntencionConversacion,
  ItemLineaTiempo,
} from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRESENTACIÓN DE LA INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Etiqueta legible de cada intención, para el badge accionable de la bandeja.
 *
 * Se rotula en términos de LO QUE HAY QUE HACER, no de taxonomía: el operador
 * lee "Seguimiento" y sabe que hay que mirar un pedido en curso; lee "Reclamo" y
 * sabe que necesita criterio humano. Ninguna superficie debe escribir estas
 * cadenas como literal.
 */
export const INTENCION_LABEL: Record<IntencionConversacion, string> = {
  consultar: "Consulta",
  comprar: "Venta",
  seguir_pedido: "Seguimiento",
  reclamar: "Reclamo",
};

/**
 * Color de badge por intención. Anclado a `BadgeColor` vía `Record`, igual que
 * `ESTADO_CONVERSACION_BADGE`: añadir una intención sin darle color es un error
 * de compilación, no una clase que Tailwind descarta en silencio.
 *
 * La escala va de frío a cálido según lo que exige del operador: `consultar` es
 * informativo y no reclama acción (`light`), `comprar` es el desenlace deseado
 * (`success`), `seguir_pedido` es trabajo en curso (`info`) y `reclamar` es lo
 * único que puede escalar y por tanto el único que debe llamar la atención
 * (`warning`).
 */
export const INTENCION_BADGE: Record<IntencionConversacion, BadgeColor> = {
  consultar: "light",
  comprar: "success",
  seguir_pedido: "info",
  reclamar: "warning",
};

// ═══════════════════════════════════════════════════════════════════════════
// DERIVACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/** Ítems de la línea de tiempo que son mensajes (no eventos de sistema). */
type ItemMensaje = Extract<ItemLineaTiempo, { clase: "mensaje" }>;

/**
 * Primer mensaje del hilo (ISO 8601), o `undefined` si el hilo no tiene ninguno.
 *
 * `lineaDeTiempo` ya devuelve los ítems ordenados por timestamp ascendente, así
 * que el primer ítem de clase `mensaje` ES el más antiguo: no hace falta ordenar
 * aquí ni confiar en el orden de inserción del store.
 *
 * Esta marca temporal es el "inicio del hilo" contra el que se decide si un
 * pedido nació dentro de la conversación o ya existía antes de ella.
 */
function inicioDeHilo(items: ItemLineaTiempo[]): string | undefined {
  return items.find((it): it is ItemMensaje => it.clase === "mensaje")?.data
    .timestamp;
}

/**
 * Pedido al que se refiere el hilo, si hay alguno.
 *
 * Dos fuentes, en este orden:
 *
 *  1. **Referencia explícita**: el `payload.pedidoId` del último mensaje que
 *     apunte a un pedido. Es la señal fuerte — alguien la escribió a propósito.
 *  2. **Pedido activo del contacto**: `pedidosStore.pedidoActivoDe(telefono)`,
 *     el mismo cruce por teléfono que ya usa el panel de contexto. Es la señal
 *     débil, y solo se consulta si no hubo referencia explícita.
 *
 * El orden importa: `pedidoActivoDe` excluye los estados terminales, así que un
 * hilo sobre un pedido ya entregado (conv-4) NO lo encontraría por esa vía y sí
 * por la explícita. Invertir el orden perdería ese caso.
 */
function pedidoReferenciado(
  items: ItemLineaTiempo[],
  telefono: string,
): Pedido | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item?.clase !== "mensaje") continue;

    const pedidoId = item.data.payload?.pedidoId;
    if (!pedidoId) continue;

    const pedido = pedidosStore.getPedido(pedidoId);
    if (pedido) return pedido;
  }

  return pedidosStore.pedidoActivoDe(telefono);
}

/**
 * Intención derivada de una conversación, a partir de sus EFECTOS OBSERVABLES.
 *
 * Recibe `convId` (no la `Conversacion`) por coherencia con `modulosDe` y
 * `moduloPrincipalDe`: el llamador no tiene que resolver la entidad antes de
 * preguntar, y no puede pasar por accidente una copia obsoleta.
 *
 * **Precedencia** — el orden de las guardas es parte del contrato, no un
 * detalle de implementación:
 *
 *   1. `reclamar`      — escalamiento observable: el hilo está `en_espera` o
 *                        tiene un evento `handoff_solicitado`. Va PRIMERO porque
 *                        es lo único que exige criterio humano y no debe quedar
 *                        enmascarado por nada. Caso que lo fija: conv-5 tiene a
 *                        la vez un pedido anterior (pd4) y un escalamiento, y su
 *                        intención es `reclamar`, no `seguir_pedido`.
 *   2. `comprar`       — el hilo referencia un pedido cuyo `createdAt` es
 *                        POSTERIOR al primer mensaje: el pedido NACIÓ aquí.
 *   3. `seguir_pedido` — el hilo referencia un pedido ANTERIOR al inicio del
 *                        hilo (o el pedido activo del contacto sin nacimiento
 *                        en el hilo): postventa sobre algo que ya existía.
 *   4. `consultar`     — ninguna de las anteriores: información pura.
 *
 * Es `O(n)` sobre los ítems del hilo, que son decenas. No se memoiza: el coste
 * es despreciable y una caché sería estado que habría que invalidar — justo lo
 * que este diseño evita.
 */
export function intencionDe(convId: string): IntencionConversacion {
  const conv = conversacionesStore.getConversacion(convId);
  if (!conv) return "consultar";

  const items = conversacionesStore.lineaDeTiempo(convId);

  // 1. RECLAMAR — escalamiento observable.
  //    Se mira el EVENTO además del estado: un hilo ya resuelto conserva su
  //    evento, y saber que fue un reclamo sigue siendo información útil.
  if (conv.estado === "en_espera") return "reclamar";
  const hayHandoff = items.some(
    (it) => it.clase === "evento" && it.data.tipo === "handoff_solicitado",
  );
  if (hayHandoff) return "reclamar";

  // 2 y 3. COMPRAR vs SEGUIR_PEDIDO — el pedido contra el inicio del hilo.
  const pedido = pedidoReferenciado(items, conv.contacto.telefono);
  const inicio = inicioDeHilo(items);

  if (pedido && inicio) {
    // Los timestamps son ISO 8601 UTC de formato fijo, así que comparar como
    // cadenas equivale a comparar cronológicamente y no hace falta parsear.
    // `createdAt` posterior al inicio ⟹ el pedido nació DENTRO de este hilo.
    return pedido.createdAt > inicio ? "comprar" : "seguir_pedido";
  }

  // 4. CONSULTAR — información pura, sin pedido ni escalamiento.
  return "consultar";
}
