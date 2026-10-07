import type { ThemePreference } from "@/shell/stores/ui.store";

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO DEL TEMA — el dueño único es la cabecera
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué el vocabulario vive AQUÍ (07/10) ──────────────────────────────
//
// El tema de la aplicación se podía cambiar desde TRES sitios: el conmutador de
// la cabecera, la sección «Apariencia» de la configuración del asistente y la
// sección «Apariencia» de la configuración del canal. Los tres escribían el
// mismo `uiStore`, con DOS vocabularios distintos (allí un interruptor binario
// claro/oscuro, aquí un segmentado de tres), así que el mismo ajuste se veía de
// dos maneras según por dónde entraras — el defecto que el mueble de
// configuración existe para impedir.
//
// El tema es una preferencia de TODA la aplicación, así que su sitio es el
// control de la cabecera, que está en todas las pantallas. Las dos
// configuraciones de módulo dejaron de ofrecerlo: un módulo no es dueño de una
// preferencia global.
//
// El vocabulario se declara en un módulo `.ts` —y no dentro del componente— por
// la misma razón que el resto de catálogos del proyecto: un test de Node puede
// importarlo sin arrastrar el runtime de React ni el plugin de SVG.

/** Una opción del selector de tema. */
export interface OpcionTema {
  value: ThemePreference;
  /** Rótulo del ítem del menú. */
  label: string;
  /** Qué significa elegirla. Se pinta bajo el rótulo en el menú. */
  descripcion: string;
}

/**
 * Las tres opciones, en orden de aparición.
 *
 * «Sistema» NO impone un tema: sigue al sistema operativo y se vuelve a resolver
 * si el SO cambia. Es una preferencia, no un tema, y por eso `uiStore` guarda
 * las dos cosas por separado.
 */
export const OPCIONES_TEMA: OpcionTema[] = [
  { value: "light", label: "Claro", descripcion: "Fondo claro en toda la aplicación." },
  { value: "dark", label: "Oscuro", descripcion: "Fondo oscuro en toda la aplicación." },
  {
    value: "system",
    label: "Sistema",
    descripcion: "Sigue la preferencia de tu sistema operativo.",
  },
];

/** Rótulo corto de una preferencia. */
export const TEMA_LABEL: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

/**
 * Texto de `title` / `aria-label` del botón, según lo que hay elegido.
 *
 * Dice QUÉ está elegido y QUÉ hace el botón: un control que solo dice «cambiar
 * tema» obliga a pulsarlo para saber en qué estado está.
 *
 * Se DERIVA de `TEMA_LABEL` en vez de escribirse otra vez, para que el rótulo
 * del menú y el del botón no puedan decir cosas distintas del mismo estado.
 */
export function tituloDeTema(preferencia: ThemePreference): string {
  return `Tema: ${TEMA_LABEL[preferencia].toLowerCase()}. Elegir tema`;
}
