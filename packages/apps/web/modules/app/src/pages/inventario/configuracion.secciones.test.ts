import { describe, expect, it } from "vitest";

import {
  GRUPO_SECCION_LABEL,
  META_SECCION,
  ORDEN_GRUPOS,
  ORDEN_SECCIONES,
  seccionesPorGrupo,
  type SeccionInventario,
} from "@/pages/inventario/configuracion.secciones";
import { SECCIONES } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// Configuración de Inventario — catálogo de presentación
// ═══════════════════════════════════════════════════════════════════════════
//
// Estos tests protegen la coherencia del VOCABULARIO de la página, no su
// maquetación. El defecto que previenen es el silencioso: una sección que queda
// fuera de la navegación, un grupo sin etiqueta, un icono que nadie registró.
// Ninguno rompe el build, y todos dejan parte de la configuración inalcanzable
// o mal rotulada.

describe("catálogo de secciones de la configuración de inventario", () => {
  it("cada sección del orden tiene metadatos", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(META_SECCION[s], `falta META_SECCION["${s}"]`).toBeDefined();
    }
  });

  it("ORDEN_SECCIONES cubre exactamente las claves de META_SECCION", () => {
    const enOrden = [...ORDEN_SECCIONES].sort();
    const enMeta = (Object.keys(META_SECCION) as SeccionInventario[]).sort();
    expect(enOrden).toEqual(enMeta);
  });

  it("no hay secciones repetidas en la navegación", () => {
    expect(new Set(ORDEN_SECCIONES).size).toBe(ORDEN_SECCIONES.length);
  });

  it("todos los grupos tienen etiqueta", () => {
    for (const g of ORDEN_GRUPOS) {
      expect(GRUPO_SECCION_LABEL[g], `falta etiqueta del grupo "${g}"`).toBeTruthy();
    }
  });

  it("ninguna sección queda vacía al agrupar, y el total se conserva", () => {
    const grupos = seccionesPorGrupo();
    expect(grupos.every((g) => g.secciones.length > 0)).toBe(true);
    expect(grupos.flatMap((g) => g.secciones)).toEqual(ORDEN_SECCIONES);
  });

  it("toda sección trae etiqueta y consejo, y no están vacíos", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(META_SECCION[s].label.trim(), `"${s}" sin etiqueta`).not.toBe("");
      expect(META_SECCION[s].hint.trim(), `"${s}" sin consejo`).not.toBe("");
    }
  });

  it("las etiquetas de sección no se repiten (dos «General» serían dos destinos iguales)", () => {
    const labels = ORDEN_SECCIONES.map((s) => META_SECCION[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("la configuración no inventa secciones que el contrato no declare", () => {
  /**
   * Cada sección de la página de configuración tiene que corresponder a una
   * sección REAL de `SECCIONES.inventario` (el catálogo de destinos del módulo,
   * que es lo que el admin puede activar por operador).
   *
   * La página usa `general` / `bodegas` / `alertas` como pestañas INTERNAS de
   * una sola ruta (`/inventario/config`), así que no coinciden una a una con las
   * secciones del sidebar — y no deben: `SECCIONES` tiene `configuracion` como
   * un único destino. Lo que se fija aquí es que ese destino EXISTA, porque una
   * configuración que se pinta sin estar en el catálogo es una pantalla que
   * ningún operador puede recibir.
   */
  it("el destino `configuracion` existe en el catálogo del módulo", () => {
    const config = SECCIONES.inventario.find((s) => s.id === "configuracion");
    expect(config).toBeDefined();
    expect(config?.path).toBe("/inventario/config");
    // Entrar se entra con `settings.read`; guardar se gobierna dentro.
    expect(config?.capacidad).toBe("settings.read");
  });
});
