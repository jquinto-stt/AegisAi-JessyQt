import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { filtrarArticulos } from "./inventario.utils";
import { inventarioSeed, type Articulo } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// EL CENTINELA DE LA SUPERFICIE NO LLEGA A LA FUNCIÓN PURA
// ═══════════════════════════════════════════════════════════════════════════
//
// `ExistenciasPage` usa `TODAS = "__todas__"` como valor de «sin filtro» en sus
// tres selectores. Esa cadena es **truthy**, y `filtrarArticulos` interpreta
// «hay categoría» como «filtra por ella»:
//
//     filtro.categoria && a.categoria !== filtro.categoria   →   false
//
// Con `categoria === "__todas__"` TODOS los artículos se descartan. La pantalla
// mostraba «0 de 8 artículos» (el seed tenía ocho entonces) y «Ningún artículo
// coincide» con los filtros vacíos, en el camino por defecto de la página.
//
// Nadie lo vio durante la implementación porque `inventario.utils.test.ts` prueba
// la función con `categoria: null` y con categorías reales — nunca con el
// centinela de la superficie. El defecto vivía en la COSTURA entre las dos capas,
// que es justo donde no mira un test unitario. Lo cazó el arnés de navegador
// (`outputs/inventario-verify/verificar.mjs`, que pasó de `filas=0` a `filas=8`).
//
// Este archivo cierra las dos mitades: documenta la trampa en la función pura y
// exige que la página traduzca su centinela antes de llamarla.

const ARTICULOS: Articulo[] = inventarioSeed().articulos;

const RUTA_PAGINA = join(
  process.cwd(),
  "src",
  "pages",
  "inventario",
  "ExistenciasPage.tsx",
);

/** Quita los comentarios antes de afirmar una ausencia. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ── Mitad 1: la trampa, documentada sobre la función pura ──────────────────

describe("`filtrarArticulos` · el centinela de UI NO es una categoría", () => {
  it("con `null` no filtra: devuelve el catálogo entero", () => {
    expect(filtrarArticulos(ARTICULOS, { categoria: null })).toHaveLength(ARTICULOS.length);
  });

  it("con `undefined` tampoco filtra", () => {
    expect(filtrarArticulos(ARTICULOS, {})).toHaveLength(ARTICULOS.length);
  });

  it("con una categoría real sí filtra", () => {
    const proteinas = filtrarArticulos(ARTICULOS, { categoria: "Proteínas" });
    expect(proteinas.length).toBeGreaterThan(0);
    expect(proteinas.every((a) => a.categoria === "Proteínas")).toBe(true);
  });

  it("⚠️ con el centinela de la superficie descarta TODO: es la trampa", () => {
    // No se corrige aquí a propósito. `filtrarArticulos` es pura y no debe
    // conocer el vocabulario de un `<select>`; quien lo conoce es la página, y
    // por eso traduce antes de llamar. Este test deja la trampa escrita para que
    // el siguiente que la pise sepa por qué hay un `categoriaSel`.
    expect(filtrarArticulos(ARTICULOS, { categoria: "__todas__" })).toEqual([]);
  });
});

// ── Mitad 2: la página traduce su centinela antes de llamar ────────────────

describe("ExistenciasPage · traduce el centinela antes de filtrar", () => {
  const fuente = readFileSync(RUTA_PAGINA, "utf8");
  const codigo = sinComentarios(fuente);

  it("la fuente se leyó de verdad", () => {
    expect(fuente.length).toBeGreaterThan(5000);
    expect(fuente).toContain("const TODAS =");
  });

  it("declara UN solo centinela, no uno por filtro", () => {
    // Dos centinelas que debieran coincidir acaban divergiendo: alguien cambia
    // uno y el otro filtro deja de reconocer el suyo en silencio.
    const declaraciones = [...codigo.matchAll(/const (\w+) = "__/g)].map((m) => m[1]);
    expect(declaraciones).toEqual(["TODAS"]);
  });

  it("la categoría se traduce a `null` antes de entrar en `filtrarArticulos`", () => {
    // La aserción es sobre la LLAMADA, no sobre la declaración: una variable
    // `categoriaSel` que no se usara no arreglaría nada.
    expect(codigo).toMatch(/categoria:\s*categoriaSel/);
    expect(codigo).toMatch(/const categoriaSel = categoria === TODAS \? null : categoria;/);
    // Y no queda el paso crudo del centinela a la función pura.
    expect(codigo).not.toMatch(/filtrarArticulos\([^)]*\{\s*texto,\s*categoria\s*\}/);
  });

  it("`categoriaSel` está en las dependencias del memo", () => {
    // Sin esto el filtro se recalcularía con la categoría anterior y la tabla
    // mostraría una lista que ya no corresponde al selector.
    //
    // ── La aserción se quedó mirando un nombre que ya no existe (21/09) ──────
    // Decía `[texto, categoriaSel, estado,` y la tercera dependencia pasó a
    // llamarse `nivel` cuando el filtro dejó de ser por estado fino y pasó a ser
    // por nivel. **Nadie la vio ponerse roja: la suite no se ejecutó.** Lo que
    // este test tiene que fijar es que `categoriaSel` esté en las dependencias
    // —de eso va el centinela—, no cómo se llama el filtro que va detrás, así
    // que la aserción se corta antes del nombre que cambia.
    expect(codigo).toMatch(/\[texto, categoriaSel,/);
  });
});

// ── Control negativo: la marca tiene que poder ponerse roja ────────────────

describe("el detector del centinela funciona (control negativo)", () => {
  /** ¿La llamada pasa la categoría sin traducir? */
  const pasaCrudo = (codigo: string) =>
    /filtrarArticulos\([^)]*\{\s*texto,\s*categoria\s*\}/.test(codigo);

  it("MARCA el paso crudo del centinela", () => {
    expect(pasaCrudo('filtrarArticulos(arts, { texto, categoria })')).toBe(true);
  });

  it("ACEPTA la categoría traducida", () => {
    expect(pasaCrudo('filtrarArticulos(arts, { texto, categoria: categoriaSel })')).toBe(false);
  });

  it("MARCA dos centinelas distintos declarados en la misma página", () => {
    const dos = 'const TODAS = "__todas__";\nconst SIN_FILTRO = "__todas__";';
    const declaraciones = [...sinComentarios(dos).matchAll(/const (\w+) = "__/g)].map((m) => m[1]);
    expect(declaraciones).toHaveLength(2);
    expect(declaraciones).not.toEqual(["TODAS"]);
  });
});
