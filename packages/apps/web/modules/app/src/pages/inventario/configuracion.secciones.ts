// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRESENTACIÓN — Configuración de Inventario
// ═══════════════════════════════════════════════════════════════════════════
//
// Única fuente de verdad del VOCABULARIO de `/inventario/config`: qué secciones
// existen, cómo se llaman, en qué grupo van, en qué orden y con qué icono. La
// página importa estas tablas; ninguna superficie escribe una etiqueta de
// sección como literal. Mismo patrón que `pages/conversaciones/configuracion.secciones.ts`
// y `pages/asistente/configuracion.secciones.ts`.
//
// POR QUÉ EXISTE: una etiqueta escrita a mano dentro de un JSX es invisible para
// los tests y para cualquier otra superficie. En una tabla tipada el compilador
// comprueba que el catálogo es EXHAUSTIVO sobre la unión de claves
// (`SeccionInventario`) y un test puede recorrerlo entero.
//
// ALCANCE: la app es un mock 100 % frontend sin backend. NO existen —y por tanto
// NO se muestran— facturación, plan, integraciones contables, claves de API ni
// proveedores. Cada sección de abajo se apoya en un campo REAL de
// `InventarioConfig` o en el catálogo real de bodegas del store. Inventar un
// valor de negocio para llenar una tarjeta sería un defecto, no una
// funcionalidad.

// ═══════════════════════════════════════════════════════════════════════════
// SECCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Claves de las secciones. La unión es la fuente de exhaustividad: `META_SECCION`
 * y `seccionesPorGrupo()` son `Record`/`Record`-derivados sobre ella, así que
 * añadir una sección sin metadatos o sin grupo es un error de compilación.
 */
export type SeccionInventario = "general" | "bodegas" | "alertas";

/** Grupos de la navegación vertical, en orden de aparición. */
export type GrupoSeccionInventario = "almacen" | "avisos";

export const GRUPO_SECCION_LABEL: Record<GrupoSeccionInventario, string> = {
  almacen: "Almacén",
  avisos: "Avisos",
};

export const ORDEN_GRUPOS: GrupoSeccionInventario[] = ["almacen", "avisos"];

export interface MetaSeccion {
  label: string;
  hint: string;
  icono: IconoSeccion;
}

/**
 * Nombre del icono, no el componente.
 *
 * El catálogo es un `.ts` sin JSX; la página resuelve el nombre contra un mapa
 * explícito `Record<IconoSeccion, …>`. Así, añadir un icono aquí sin registrarlo
 * allí es un error de compilación en vez de un icono en blanco.
 */
export type IconoSeccion = "BoxCubeIcon" | "BoxIconLine" | "AlertIcon";

export const META_SECCION: Record<SeccionInventario, MetaSeccion> = {
  general: {
    label: "General",
    hint: "Unidad de medida con la que se dan de alta los artículos nuevos.",
    icono: "BoxCubeIcon",
  },
  bodegas: {
    label: "Bodegas",
    hint: "Los sitios físicos donde puede haber mercancía, y cuál se propone por defecto.",
    icono: "BoxIconLine",
  },
  alertas: {
    label: "Alertas",
    hint: "Cuándo avisa el módulo de que un artículo está por debajo de su punto de reorden.",
    icono: "AlertIcon",
  },
};

/**
 * Orden de la navegación. Explícito y separado de `META_SECCION` para que
 * reordenar la navegación sea una edición deliberada y no un efecto colateral de
 * mover líneas del objeto de metadatos.
 */
export const ORDEN_SECCIONES: SeccionInventario[] = ["general", "bodegas", "alertas"];

/** Grupo al que pertenece cada sección. */
const GRUPO_DE: Record<SeccionInventario, GrupoSeccionInventario> = {
  general: "almacen",
  bodegas: "almacen",
  alertas: "avisos",
};

/** Las secciones agrupadas, en el orden de `ORDEN_GRUPOS` / `ORDEN_SECCIONES`. */
export function seccionesPorGrupo(): {
  grupo: GrupoSeccionInventario;
  secciones: SeccionInventario[];
}[] {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    secciones: ORDEN_SECCIONES.filter((s) => GRUPO_DE[s] === grupo),
  })).filter((g) => g.secciones.length > 0);
}
