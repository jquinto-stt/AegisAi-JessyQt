import type {
  DensidadAsistente,
  DensidadBandeja,
  ThemePreference,
} from "@/shell/stores/ui.store";

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO DE APARIENCIA — dueño único: /configuracion → Apariencia
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué vive AQUÍ, y qué desorden corrige (07/10) ─────────────────────
//
// Estas tres preferencias se administraban desde CUATRO sitios distintos, con
// tres vocabularios, y dos de ellas no las leía nadie:
//
//   · el TEMA — en el botón de la cabecera, en la configuración del asistente y
//     en la del canal, con dos vocabularios (un interruptor binario allí, un
//     segmentado de tres aquí);
//   · la DENSIDAD de la lista de conversaciones — en la configuración del canal,
//     como un `useState` que nadie leía;
//   · la DENSIDAD del hilo del asistente — en la configuración del asistente,
//     igual: un `useState` sin lector.
//
// La apariencia es una preferencia de la APLICACIÓN, no de un módulo, así que su
// administración vive en la configuración de la organización. Los módulos
// dejaron de ofrecerla, y el botón de la cabecera queda como ATAJO —alterna
// claro/oscuro, que es lo único que necesita quien está fuera del shell, en el
// acceso o el onboarding—, no como la administración.
//
// El vocabulario se declara en un módulo `.ts` —y no dentro del componente— para
// que un test de Node pueda importarlo sin arrastrar React ni el plugin de SVG.

/** Una opción de una preferencia de apariencia. */
export interface OpcionApariencia<T extends string> {
  value: T;
  /** Rótulo del control. */
  label: string;
  /**
   * Qué cambia al elegirla. Se pinta como descripción de la fila de la opción
   * ACTIVA, así que tiene que explicar el efecto de esa elección y no repetir
   * el rótulo.
   */
  detalle: string;
}

/**
 * Tema de la aplicación.
 *
 * «Sistema» NO impone un tema: sigue al sistema operativo y se vuelve a resolver
 * si el SO cambia. Es una preferencia, no un tema, y por eso `uiStore` guarda
 * las dos cosas por separado.
 */
export const OPCIONES_TEMA: OpcionApariencia<ThemePreference>[] = [
  {
    value: "light",
    label: "Claro",
    detalle: "Fondo claro en toda la aplicación.",
  },
  {
    value: "dark",
    label: "Oscuro",
    detalle: "Fondo oscuro en toda la aplicación.",
  },
  {
    value: "system",
    label: "Sistema",
    detalle: "Sigue la preferencia de tu sistema operativo, también si cambia.",
  },
];

/** Densidad de la lista de conversaciones (la bandeja del canal). */
export const OPCIONES_DENSIDAD_BANDEJA: OpcionApariencia<DensidadBandeja>[] = [
  {
    value: "comoda",
    label: "Cómoda",
    detalle: "Más aire entre conversaciones. Mejor para leer las vistas previas.",
  },
  {
    value: "compacta",
    label: "Compacta",
    detalle: "Más conversaciones visibles sin desplazar la lista.",
  },
];

/** Densidad del hilo del asistente. */
export const OPCIONES_DENSIDAD_ASISTENTE: OpcionApariencia<DensidadAsistente>[] = [
  {
    value: "comoda",
    label: "Cómoda",
    detalle: "Más aire entre mensajes. Mejor para leer respuestas largas con tablas.",
  },
  {
    value: "compacta",
    label: "Compacta",
    detalle: "Más mensajes visibles sin desplazar. Mejor para repasar un hilo largo.",
  },
];

/**
 * Detalle de la opción elegida, o cadena vacía si no se encuentra.
 *
 * Existe para que las filas no repitan el `find(...)?.detalle ?? ""` tres veces
 * y, sobre todo, para que el respaldo sea el mismo en las tres.
 */
export function detalleDe<T extends string>(
  opciones: OpcionApariencia<T>[],
  valor: T,
): string {
  return opciones.find((o) => o.value === valor)?.detalle ?? "";
}
