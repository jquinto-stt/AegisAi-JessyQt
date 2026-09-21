import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CATALOGO_MODULOS, SECCIONES, type Seccion } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// El sidebar no inventa secciones
// ═══════════════════════════════════════════════════════════════════════════
//
// `AppSidebar.tsx` declara `ITEMS_MODULO` —qué secciones pinta cada módulo, en
// qué orden y con qué icono— y lee la ETIQUETA y la RUTA de `SECCIONES`. Esa
// lectura es un `find` que devuelve `null` si el id no existe, y ante un `null`
// el ítem se omite en silencio: un enlace desaparecido sin error, que es la peor
// forma de romperse.
//
// Este archivo cierra esa puerta. Es un test que LEE LA FUENTE (con `fs`), no
// que importe el componente: la suite corre en `environment: 'node'` y ningún
// test del repo importa un `.tsx`. Mismo patrón y misma razón que
// `stores/inventario.independencia.test.ts`.
//
// ── Por qué la lista es un subconjunto y no `SECCIONES` entero ────────────
//
// `SECCIONES.pedidos` incluye `asistente` y `conversaciones`: secciones
// TRANSVERSALES que el sidebar pinta en los bloques «Inteligencia» y «Canales»,
// que preguntan por el conector de la organización y no por el módulo. Si el
// sidebar recorriera el catálogo completo, Conversaciones se pintaría dos veces.
// Por eso el test exige: todo id del sidebar EXISTE en el catálogo, y ninguna
// sección transversal se cuela en la lista del módulo.

const SRC = join(process.cwd(), "src");
const RUTA_SIDEBAR = join(SRC, "app", "AppSidebar.tsx");

/** Las secciones que NO son del módulo sino de la capa transversal. */
const TRANSVERSALES = new Set(["asistente", "conversaciones"]);

/**
 * Extrae los `seccionId` declarados para un módulo dentro de `ITEMS_MODULO`.
 *
 * Trabaja sobre el texto del archivo. Un `import` del `.tsx` sería lo natural y
 * está descartado por la regla de la suite; leer la fuente es además lo único
 * que permite comprobar que el id escrito es el que `SECCIONES` conoce.
 */
export function seccionesDelSidebar(fuente: string, modulo: string): string[] {
  const inicio = fuente.indexOf("const ITEMS_MODULO");
  if (inicio === -1) return [];
  // El bloque del módulo: `modulo: [` … `],`. Se corta en el primer `]` porque
  // dentro solo hay objetos de una línea con `seccionId` e `Icono`.
  const bloque = new RegExp(`\\b${modulo}:\\s*\\[([\\s\\S]*?)\\]`).exec(
    fuente.slice(inicio),
  );
  if (!bloque) return [];
  return [...bloque[1].matchAll(/seccionId:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Los módulos que `ITEMS_MODULO` declara, leídos de la fuente. */
export function modulosDelSidebar(fuente: string): string[] {
  const inicio = fuente.indexOf("const ITEMS_MODULO");
  if (inicio === -1) return [];
  const cuerpo = fuente.slice(inicio, fuente.indexOf("\n};", inicio));
  return [...cuerpo.matchAll(/^\s{2}([a-z_]+):\s*\[/gm)].map((m) => m[1]);
}

/**
 * Quita los comentarios de la fuente antes de afirmar una AUSENCIA.
 *
 * Sin esto, `not.toMatch(/esAdmin/)` casa con la PROSA que explica que no se usa
 * `esAdmin` — incluida la de este mismo archivo. Un test que lee prosa mide cómo
 * está escrito el comentario, no el contrato: es el defecto que ya apareció en
 * `inventario.domain.test.ts` y se corrige igual.
 */
export function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL NEGATIVO DEL PARSER — antes de usarlo para afirmar una ausencia
// ═══════════════════════════════════════════════════════════════════════════

describe("el lector de `ITEMS_MODULO` funciona (control negativo)", () => {
  const FIXTURE = [
    "const ITEMS_MODULO: Record<Modulo, { seccionId: string }[]> = {",
    "  pedidos: [",
    '    { seccionId: "inicio", Icono: GridIcon },',
    '    { seccionId: "tablero", Icono: ListIcon },',
    "  ],",
    "  inventario: [",
    '    { seccionId: "existencias", Icono: BoxIconLine },',
    "  ],",
    "};",
  ].join("\n");

  it("lee los ids de un módulo, en orden", () => {
    expect(seccionesDelSidebar(FIXTURE, "pedidos")).toEqual(["inicio", "tablero"]);
    expect(seccionesDelSidebar(FIXTURE, "inventario")).toEqual(["existencias"]);
  });

  it("MARCA un id inventado: es el defecto que este test existe para atrapar", () => {
    // Un id que no está en `SECCIONES` haría que `seccionDe()` devolviera `null`
    // y el ítem desapareciera del sidebar sin ningún error. Aquí se ve.
    const conIdInventado = FIXTURE.replace('"tablero"', '"tablero-que-no-existe"');
    const ids = seccionesDelSidebar(conIdInventado, "pedidos");
    const conocidos = SECCIONES.pedidos.map((s: Seccion) => s.id);
    expect(ids.filter((id) => !conocidos.includes(id))).toEqual(["tablero-que-no-existe"]);
  });

  it("NO marca una fuente limpia (no todo es una violación)", () => {
    const ids = seccionesDelSidebar(FIXTURE, "pedidos");
    const conocidos = SECCIONES.pedidos.map((s: Seccion) => s.id);
    expect(ids.filter((id) => !conocidos.includes(id))).toEqual([]);
  });

  it("un módulo ausente devuelve vacío, no basura", () => {
    expect(seccionesDelSidebar(FIXTURE, "turnos")).toEqual([]);
  });

  it("`sinComentarios` NO marca lo que está comentado, y sí lo que es código", () => {
    // Las dos mitades importan: si el limpiador se comiera el código, las
    // ausencias se afirmarían sobre un texto vacío y pasarían siempre.
    const fuente = ["// no usar esAdmin aquí", "/* ni esAdmin tampoco */", "const x = 1;", "const esAdmin = true;"].join("\n");
    expect(sinComentarios(fuente)).not.toMatch(/no usar esAdmin/);
    expect(sinComentarios(fuente)).not.toMatch(/ni esAdmin tampoco/);
    expect(sinComentarios(fuente)).toMatch(/const esAdmin = true;/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EL SIDEBAR REAL
// ═══════════════════════════════════════════════════════════════════════════

describe("AppSidebar · ITEMS_MODULO", () => {
  const fuente = readFileSync(RUTA_SIDEBAR, "utf8");
  const modulosCatalogo = Object.keys(CATALOGO_MODULOS);

  it("la fuente se leyó de verdad (el archivo existe y tiene el bloque)", () => {
    // Sin esto, un `readFileSync` que devolviera otra cosa dejaría todos los
    // tests de abajo pasando por vacío.
    expect(fuente.length).toBeGreaterThan(1000);
    expect(fuente).toContain("const ITEMS_MODULO");
  });

  it("declara una rama por cada módulo del catálogo, y ninguna de más", () => {
    // El control que sustituye al compilador: `ITEMS_MODULO` es un
    // `Record<Modulo, …>`, pero el `Modulo` vive en un store y el mapa en un
    // `.tsx` que ningún test puede importar. Si mañana se amplía el vocabulario
    // y se olvida la rama, esto se pone rojo.
    expect(modulosDelSidebar(fuente).sort()).toEqual([...modulosCatalogo].sort());
  });

  it("cada módulo tiene al menos una sección (una rama vacía no es una rama)", () => {
    for (const m of modulosCatalogo) {
      expect(seccionesDelSidebar(fuente, m).length, `«${m}» sin secciones`).toBeGreaterThan(0);
    }
  });

  it("todo `seccionId` del sidebar existe en `SECCIONES`", () => {
    for (const m of modulosCatalogo) {
      const ids = seccionesDelSidebar(fuente, m);
      const conocidos = SECCIONES[m as keyof typeof SECCIONES].map((s) => s.id);
      expect(ids.filter((id) => !conocidos.includes(id)), `módulo «${m}»`).toEqual([]);
    }
  });

  it("ninguna sección transversal se cuela en la lista de un módulo", () => {
    // `asistente` y `conversaciones` viven en los bloques «Inteligencia» y
    // «Canales». Aquí se pintarían por segunda vez.
    for (const m of modulosCatalogo) {
      const ids = seccionesDelSidebar(fuente, m);
      expect(ids.filter((id) => TRANSVERSALES.has(id)), `módulo «${m}»`).toEqual([]);
    }
  });

  it("no hay ids repetidos dentro de un módulo", () => {
    for (const m of modulosCatalogo) {
      const ids = seccionesDelSidebar(fuente, m);
      expect(new Set(ids).size, `módulo «${m}»`).toBe(ids.length);
    }
  });

  it("el sidebar ya no titula los módulos con un literal", () => {
    // El título sale de `CATALOGO_MODULOS[modulo].nombreCorto`. Con un módulo,
    // `title="Pedidos"` escrito a mano era invisible; con dos, habría titulado
    // «Pedidos» una sección de Inventario.
    const codigo = sinComentarios(fuente);
    expect(codigo).toContain("CATALOGO_MODULOS[modulo].nombreCorto");
    expect(codigo).not.toMatch(/<MenuSectionHeader\s+title="Pedidos"/);
    expect(codigo).not.toMatch(/<MenuSectionHeader\s+title="Inventario"/);
  });

  it("la compuerta de cada ítem es `puedeVerSeccion`, no un rol ni `esAdmin`", () => {
    // Invariante C9: la sección se gobierna por capacidad, nunca por nombre de
    // rol. Se comprueba que la función está cableada y que no apareció un atajo.
    const codigo = sinComentarios(fuente);
    expect(codigo).toContain("sessionStore.puedeVerSeccion(modulo, seccionId)");
    expect(codigo).not.toMatch(/esAdmin/);
    expect(codigo).not.toMatch(/rolId\s*===/);
  });

  it("la sección de un módulo se omite entera si no queda ningún ítem visible", () => {
    // El defecto que esto previene es una sección que promete un destino y no
    // lleva a ninguno: con los ítems filtrados por capacidad pero el
    // `<MenuSectionHeader>` fuera del filtro, el rol «Operador» —sin
    // `inventory.read` ni `settings.read`— veía un encabezado «Inventario»
    // plegable y vacío.
    //
    // Se mide el ORDEN en la fuente (guarda antes del encabezado) y no la
    // presencia del texto: una guarda escrita DESPUÉS del encabezado no sirve de
    // nada y aun así contendría la misma cadena.
    expect(guardaAntesDelEncabezado(fuente)).toBe(true);
  });
});

/**
 * ¿La guarda de «sin ítems visibles» aparece ANTES del encabezado del módulo?
 *
 * Devuelve `false` si falta cualquiera de las dos piezas o si están al revés.
 * Se exporta para poder darle una fuente mutada y comprobar que la marca.
 */
export function guardaAntesDelEncabezado(fuente: string): boolean {
  const codigo = sinComentarios(fuente);
  // Se acota a la rama de módulos: el `.map` sobre los módulos activos.
  const arranque = codigo.indexOf("modulosOperablesDeSesion(organizacionStore.modulosActivos)");
  if (arranque === -1) return false;
  const rama = codigo.slice(arranque);

  const guarda = rama.indexOf("visibles.length === 0");
  const encabezado = rama.indexOf("title={CATALOGO_MODULOS[modulo].nombreCorto}");
  return guarda !== -1 && encabezado !== -1 && guarda < encabezado;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL NEGATIVO DE LA GUARDA — la marca tiene que poder ponerse roja
// ═══════════════════════════════════════════════════════════════════════════

describe("la guarda de sección vacía se mide de verdad (control negativo)", () => {
  const SANA = [
    "{modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {",
    "  const visibles = [];",
    "  if (visibles.length === 0) return null;",
    "  return <MenuSectionHeader title={CATALOGO_MODULOS[modulo].nombreCorto} />;",
    "})}",
  ].join("\n");

  it("una rama con la guarda delante se acepta", () => {
    expect(guardaAntesDelEncabezado(SANA)).toBe(true);
  });

  it("MARCA la rama sin guarda: es el defecto que este test existe para atrapar", () => {
    const sinGuarda = SANA.replace("  if (visibles.length === 0) return null;\n", "");
    expect(guardaAntesDelEncabezado(sinGuarda)).toBe(false);
  });

  it("MARCA la guarda escrita DESPUÉS del encabezado (no sirve de nada)", () => {
    const invertida = [
      "{modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {",
      "  const visibles = [];",
      "  return <MenuSectionHeader title={CATALOGO_MODULOS[modulo].nombreCorto} />;",
      "  if (visibles.length === 0) return null;",
      "})}",
    ].join("\n");
    expect(guardaAntesDelEncabezado(invertida)).toBe(false);
  });

  it("MARCA una fuente que ni siquiera tiene la rama de módulos", () => {
    expect(guardaAntesDelEncabezado("const x = 1;")).toBe(false);
  });

  it("no se deja engañar por una guarda escrita en un COMENTARIO", () => {
    const enProsa = [
      "{modulosOperablesDeSesion(organizacionStore.modulosActivos).map((modulo) => {",
      "  // aquí iría un `if (visibles.length === 0) return null;`",
      "  return <MenuSectionHeader title={CATALOGO_MODULOS[modulo].nombreCorto} />;",
      "})}",
    ].join("\n");
    expect(guardaAntesDelEncabezado(enProsa)).toBe(false);
  });
});
