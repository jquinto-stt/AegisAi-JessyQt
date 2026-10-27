/**
 * Clases compartidas por los formularios de Transportadoras.
 *
 * Viven en su propio archivo y no en uno de los componentes porque las usan la
 * pantalla de configuración y el modal de recolección eventual: dos formularios
 * distintos que tienen que verse iguales. Duplicar la cadena garantiza que en la
 * próxima pasada uno de los dos se quede atrás.
 */
export const campo =
  "h-10 w-full rounded-xl border border-[#ECECEC] bg-white px-3 text-theme-sm text-[#212121] outline-hidden transition-colors focus:border-[#97D6DF] focus:ring-2 focus:ring-[#97D6DF]/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white";
