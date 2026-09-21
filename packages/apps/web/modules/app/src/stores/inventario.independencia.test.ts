import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// INDEPENDENCIA ENTRE INVENTARIO Y PEDIDOS (D1/D2)
// ═══════════════════════════════════════════════════════════════════════════
//
// «Independiente» es una palabra que se puede afirmar sin probar nada. Aquí se
// convierte en un contrato verificable: **cero imports cruzados** entre los dos
// módulos, en los dos sentidos.
//
// Vitest corre en `environment: 'node'`, así que `fs` está disponible y el test
// puede LEER LOS FUENTES en vez de confiar en una revisión a ojo.
//
// ── El problema de un test que afirma una ausencia ────────────────────────
// Un test así pasa en verde POR DEFECTO — también cuando no está mirando nada.
// Por eso lleva tres guardas:
//
//   1. **Control positivo de la lectura**: los archivos existen y tienen
//      imports; si el glob se rompe, el test se pone rojo en vez de quedarse
//      verde y ciego.
//   2. **Control negativo del detector, dentro del propio test**: se le dan
//      fuentes sintéticas con un import cruzado y se comprueba que las MARCA,
//      y fuentes limpias y se comprueba que NO las marca.
//   3. **Mutación real, ejecutada a mano**: se introdujo un import cruzado de
//      verdad, se vio el test rojo, y se revirtió. Verde solo es evidencia si
//      se vio fallar.
//
// ── Qué queda FUERA del alcance, y por qué ────────────────────────────────
// `stores/index.ts` es el barril de agregación: es el único archivo del árbol
// que nombra los dos módulos, y tiene que poder hacerlo. La independencia se
// exige entre los dos DOMINIOS, no entre el barril y sus partes.
//
// ═══════════════════════════════════════════════════════════════════════════

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = join(AQUI, "..");

/**
 * Quita comentarios de bloque y de línea.
 *
 * Importa porque este repo DOCUMENTA las reglas en docblocks: `pedidos.store.ts`
 * menciona `domain/inventario/inventario.domain.ts` en un comentario (declarando
 * la deuda) y eso no es un import. Un detector que contara la prosa mediría la
 * redacción, no el acoplamiento — el mismo error que ya costó una falsa alarma
 * en la auditoría de marca.
 */
function sinComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/**
 * Especificadores de módulo de un fuente: todo `from "…"` más los imports de
 * efecto secundario `import "…"`.
 *
 * Se resuelven sobre el texto sin comentarios y **abarcando varias líneas**,
 * porque en este repo hay imports multilínea (`import {\n a,\n b,\n} from "x"`)
 * y el especificador vive en la última línea, que no empieza por `import`. Un
 * detector línea-a-línea se los perdería en silencio.
 */
function especificadoresDe(src: string): string[] {
  const sin = sinComentarios(src);
  const out: string[] = [];
  const desde = /\bfrom\s*["']([^"']+)["']/g;
  const efecto = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = desde.exec(sin))) out.push(m[1]);
  while ((m = efecto.exec(sin))) out.push(m[1]);
  return out;
}

/**
 * Sentencias de importación y de re-exportación COMPLETAS, de `import`/`export`
 * hasta el `;` que las cierra.
 *
 * ── Por qué la sentencia entera y no solo la ruta ─────────────────────────
 * La primera versión de este detector miraba el especificador, y el control
 * negativo la tumbó: `import { pedidosStore } from "@/stores"` tiene la ruta
 * limpia (`@/stores`) y el acoplamiento en el BINDING. Mirar solo la ruta
 * habría dado verde sobre un módulo que importa el store del otro.
 *
 * Se incluyen los `export … from` porque re-exportar el módulo ajeno es la
 * misma dependencia con otra palabra clave.
 */
function sentenciasDeModulo(src: string): string[] {
  const sin = sinComentarios(src);
  const out: string[] = [];
  const re =
    /(?:^|\n)[ \t]*(?:import\b[^;]*;|export\b[^;]*?\bfrom\b[^;]*;)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sin))) out.push(m[0].trim());
  return out;
}

/** Las sentencias de este fuente que nombran el módulo prohibido. */
function importa(src: string, prohibido: string): string[] {
  return sentenciasDeModulo(src).filter((s) => s.includes(prohibido));
}

/**
 * Todos los `.ts` y `.tsx` de un directorio, recursivo.
 *
 * Los `.tsx` entran porque la regla D1 vale para las superficies, no solo para
 * el dominio y los stores: una página que importa un helper de la otra es una
 * dependencia cruzada igual de real. Se leen como TEXTO — importar un componente
 * en la suite está descartado (corre en `environment: 'node'`).
 */
function fuentesDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return fuentesDe(ruta);
    return e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) ? [ruta] : [];
  });
}

/**
 * Los archivos que la regla D1 obliga a vigilar, en los dos sentidos.
 *
 * ── Por qué entran las PÁGINAS y los PROVEEDORES, no solo el store ─────────
 *
 * La primera versión de este test vigilaba `domain/**` y `stores/*.store.ts`, y
 * era una lectura demasiado estrecha de D1: la regla dice «cero imports cruzados
 * entre los dos módulos», no «entre los dos stores». Una página de Inventario
 * importando un helper de `@/pages/pedidos/**` —o al revés— es exactamente la
 * dependencia que la propuesta prohíbe, y con aquel alcance pasaba inadvertida
 * porque el archivo ni siquiera estaba en la lista.
 *
 * Los `.tsx` se leen como TEXTO con `fs`, nunca se importan: la suite corre en
 * `environment: 'node'` y ningún test del repo importa un componente.
 */
const ARCHIVOS_INVENTARIO = [
  ...fuentesDe(join(SRC, "domain", "inventario")),
  ...fuentesDe(join(SRC, "pages", "inventario")),
  ...fuentesDe(join(SRC, "modules-tools", "inventario")),
  join(SRC, "stores", "inventario.store.ts"),
];
const ARCHIVOS_PEDIDOS = [
  ...fuentesDe(join(SRC, "domain", "pedidos")),
  ...fuentesDe(join(SRC, "pages", "pedidos")),
  ...fuentesDe(join(SRC, "modules-tools", "pedidos")),
  join(SRC, "stores", "pedidos.store.ts"),
];

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL NEGATIVO DEL DETECTOR — antes de usarlo para afirmar una ausencia
// ═══════════════════════════════════════════════════════════════════════════

describe("el detector de imports cruzados funciona (control negativo)", () => {
  it("MARCA un import cruzado de una línea", () => {
    const fuente = `import { pedidosStore } from "@/stores";\nexport const x = 1;`;
    expect(importa(fuente, "pedidos")).toEqual([
      'import { pedidosStore } from "@/stores";',
    ]);
  });

  it("MARCA un import cruzado MULTILÍNEA", () => {
    // El caso que un detector línea-a-línea se perdería.
    const fuente = [
      "import {",
      "  pedidosStore,",
      '} from "@/stores/pedidos.store";',
    ].join("\n");
    expect(importa(fuente, "pedidos")).toHaveLength(1);
  });

  it("MARCA un import de efecto secundario y un re-export", () => {
    expect(importa('import "@/stores/pedidos.store";', "pedidos")).toHaveLength(1);
    expect(
      importa('export { pedidosStore } from "@/stores/pedidos.store";', "pedidos"),
    ).toHaveLength(1);
  });

  it("NO marca un import limpio (no todo es una violación)", () => {
    const fuente = `import { makeAutoObservable } from "mobx";\nimport { stockDe } from "@/domain/inventario/inventario.domain";`;
    expect(importa(fuente, "pedidos")).toEqual([]);
  });

  it("NO marca un import DENTRO de un comentario", () => {
    // Este repo documenta la regla en docblocks; contar la prosa sería medir
    // la redacción, no el acoplamiento.
    expect(importa('// import { pedidosStore } from "@/stores";', "pedidos")).toEqual([]);
    expect(importa('/* import { pedidosStore } from "@/stores"; */', "pedidos")).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LA REGLA
// ═══════════════════════════════════════════════════════════════════════════

describe("D1 — cero imports cruzados entre Inventario y Pedidos", () => {
  /** Formato de una violación, para que el fallo diga archivo y sentencia. */
  const comoViolacion = (archivo: string, sentencia: string) =>
    `${relative(SRC, archivo)} → ${sentencia.replace(/\s+/g, " ")}`;

  it("los archivos vigilados existen y el escaneo LEE algo (control positivo)", () => {
    // Una aserción de ausencia pasa por defecto también cuando no está mirando
    // nada. Estas tres comprobaciones obligan a que el escaneo esté vivo: los
    // archivos están, los dos stores importan cosas y el escaneo reconoce los
    // especificadores que sabemos que existen.
    expect(ARCHIVOS_INVENTARIO.length).toBeGreaterThanOrEqual(2);
    expect(ARCHIVOS_PEDIDOS.length).toBeGreaterThanOrEqual(2);

    const storeInventario = join(SRC, "stores", "inventario.store.ts");
    const storePedidos = join(SRC, "stores", "pedidos.store.ts");

    const espInventario = especificadoresDe(readFileSync(storeInventario, "utf8"));
    expect(espInventario).toContain("mobx");
    expect(espInventario).toContain("@/domain/inventario/inventario.domain");

    const espPedidos = especificadoresDe(readFileSync(storePedidos, "utf8"));
    expect(espPedidos).toContain("mobx");

    // Y todos los archivos vigilados se leen como texto no vacío.
    for (const archivo of [...ARCHIVOS_INVENTARIO, ...ARCHIVOS_PEDIDOS]) {
      expect(readFileSync(archivo, "utf8").length, `${relative(SRC, archivo)} vacío`).toBeGreaterThan(0);
    }
  });

  it("Inventario no importa nada de Pedidos", () => {
    const violaciones = ARCHIVOS_INVENTARIO.flatMap((archivo) =>
      importa(readFileSync(archivo, "utf8"), "pedidos").map((s) => comoViolacion(archivo, s)),
    );
    expect(violaciones, "Inventario no puede depender de Pedidos (D1)").toEqual([]);
  });

  it("Pedidos no importa nada de Inventario", () => {
    const violaciones = ARCHIVOS_PEDIDOS.flatMap((archivo) =>
      importa(readFileSync(archivo, "utf8"), "inventario").map((s) => comoViolacion(archivo, s)),
    );
    expect(violaciones, "Pedidos no puede depender de Inventario (D1)").toEqual([]);
  });

  it("el vocabulario compartido son ETIQUETAS, no datos (D3)", () => {
    // Los únicos puntos de contacto entre los dos módulos son catálogos de
    // nombres. Se comprueba en la dirección que importa: el vocabulario de
    // sesión nombra los dos módulos, y eso es correcto — no es un dato, es un
    // nombre. Si alguien metiera un dato compartido, tendría que ser un import,
    // y el bloque de arriba ya lo cazaría.
    const sesion = readFileSync(join(SRC, "stores", "session.store.ts"), "utf8");
    expect(sesion).toContain('"inventario"');
    expect(sesion).toContain('"pedidos"');
  });
});
