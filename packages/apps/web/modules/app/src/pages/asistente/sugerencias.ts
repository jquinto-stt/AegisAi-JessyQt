/**
 * SUGERENCIAS — tarjetas del estado vacío de NECTO AI.
 *
 * Sin JSX a propósito: igual que `configuracion.secciones.ts`, este módulo es
 * importable desde tests, que es lo único que permite blindar la propiedad que
 * importa aquí (ver más abajo).
 *
 * ── Por qué este módulo existe ─────────────────────────────────────────────
 *
 * Antes las tarjetas estaban escritas a mano dentro de `AsistentePage.tsx` y la
 * primera de ellas —la más visible, la que ve todo el mundo al abrir el
 * asistente— decía:
 *
 *     titulo: "Top 10 Productos"
 *     descripcion: "Generar una hoja de cálculo con los productos de mayor rotación"
 *     pregunta: "Genera una hoja de cálculo con el top 10 de productos"
 *
 * Esa tarjeta no estaba muerta: al pulsarla el motor SÍ respondía. Pero
 * respondía a otra cosa. `REGLAS_INTENCION` no tiene ninguna regla que apunte a
 * un ranking de productos; las keywords "hoja de calculo", "excel", "tabla",
 * "spreadsheet" y "top" se enrutan a `pedidos.getVentasPeriodo`, que devuelve el
 * total de ventas del periodo. El usuario pedía "los productos de mayor
 * rotación" y recibía una cifra de ventas.
 *
 * (De paso: `pedidos.getTopProductos` sí existe como declaración en el provider,
 * pero no figura en `QUERY_TOOLS` ni en `ANALYZE_TOOLS`, así que el registry no
 * la resuelve y la tabla de reglas —correctamente— no la referencia. Es
 * inalcanzable por diseño; el defecto no era esa tool, era lo que la tarjeta
 * prometía. `sugerencias.test.ts` fija ambos hechos por separado.)
 *
 * La causa raíz no fue el descuido sino la AUSENCIA DE DATO: una tarjeta
 * declaraba un título y una frase, pero no a qué herramienta debía llegar. Sin
 * ese campo, ni un test ni un revisor pueden distinguir una tarjeta que cumple
 * su promesa de una que no. Por eso cada tarjeta declara ahora su `toolId`, y
 * `sugerencias.test.ts` comprueba el par completo: que la pregunta de verdad
 * llega a la herramienta que la tarjeta anuncia.
 *
 * Las tres preguntas son las de `EJEMPLOS_PREGUNTA`, ya cubiertas por su test
 * de resolución: así las tarjetas no estrenan frases sin validar.
 */

/**
 * Tarjeta de sugerencia del estado vacío.
 *
 * `toolId` no se usa para renderizar: es la promesa que la tarjeta hace y el
 * asidero que permite verificarla.
 */
export interface SugerenciaCard {
  /** Título corto de la tarjeta. */
  titulo: string;
  /** Una línea explicando qué obtiene el usuario. */
  descripcion: string;
  /** Pregunta exacta que se envía al motor al pulsar. */
  pregunta: string;
  /** Tool del catálogo de Pedidos a la que `pregunta` debe resolver. */
  toolId: string;
}

export const SUGERENCIAS: SugerenciaCard[] = [
  {
    titulo: "Resumen de hoy",
    descripcion: "Cuántos pedidos entraron hoy y cómo va el día.",
    pregunta: "¿Cuántos pedidos tuve hoy?",
    toolId: "pedidos.getResumenHoy",
  },
  {
    titulo: "Pedidos pendientes",
    descripcion: "Qué pedidos siguen sin resolverse.",
    pregunta: "¿Cuáles son los pedidos pendientes?",
    toolId: "pedidos.getPendientes",
  },
  {
    titulo: "Diagnóstico",
    descripcion: "Cómo estuvo el desempeño y qué observaciones hay.",
    pregunta: "Dame un diagnóstico de desempeño",
    toolId: "pedidos.diagnosticoDesempeno",
  },
];
