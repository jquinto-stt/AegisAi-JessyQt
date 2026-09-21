import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MODULOS_INTEGRABLES, ORDEN_MODULOS_INTEGRABLES } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// La tarjeta de módulo del canal es una VISTA del catálogo, no una copia
// ═══════════════════════════════════════════════════════════════════════════
//
// `ConfigPage.tsx` (Conversaciones) pinta una tarjeta por módulo integrable, con
// su estado y su interruptor. Antes eran DOS bloques escritos a mano, uno por
// módulo, y el de Inventario se quedó afirmando «En desarrollo · Próximamente»
// con el interruptor deshabilitado cuando el módulo ya tenía proveedor, cuatro
// rutas y su `disponible: true` — con el estado real ya calculado tres líneas
// más arriba.
//
// Un control que miente. El copy era el síntoma; la causa era que la tarjeta
// pudiera afirmar del módulo algo distinto de lo que el asistente tiene
// registrado. Este test cierra la causa, no el síntoma: exige que la tarjeta
// DERIVE del catálogo.
//
// Lee la FUENTE con `fs`, no importa el componente: la suite corre en
// `environment: 'node'` y ningún test del repo importa un `.tsx`. Mismo patrón
// que `app/AppSidebar.secciones.test.ts`.

const RUTA = join(process.cwd(), "src", "pages", "conversaciones", "ConfigPage.tsx");

/**
 * Quita los comentarios antes de afirmar una AUSENCIA.
 *
 * Sin esto, `not.toMatch(/En desarrollo/)` casa con la PROSA que explica que esa
 * chapa se retiró. Un test que lee prosa mide cómo está escrito el comentario, no
 * el contrato.
 *
 * Se duplica a propósito el `sinComentarios` de `AppSidebar.secciones.test.ts`:
 * importarlo de allí registraría también los `describe` de ese archivo.
 */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ── Lo que se mide, como función pura, para poder mutar la fuente ──────────

/** ¿La tarjeta se genera recorriendo el catálogo? */
export function derivaDelCatalogo(codigo: string): boolean {
  return codigo.includes("integracionesStore.entradas.map");
}

/** ¿El interruptor está deshabilitado por el catálogo y no por un literal? */
export function switchDeshabilitadoPorCatalogo(codigo: string): boolean {
  return /disabled=\{soloLectura \|\| !entrada\.disponible\}/.test(codigo);
}

/** ¿El estado se deriva de `disponible` en vez de escribirse? */
export function estadoDerivado(codigo: string): boolean {
  return /const estado: EstadoIntegracionCanal = !entrada\.disponible/.test(codigo);
}

/**
 * ¿El rótulo de capacidades es un TERNARIO sobre `disponible`?
 *
 * `"Capacidades planificadas"` no es una cadena prohibida: es la rama negativa
 * legítima del mismo ternario. Prohibirla sería prohibir la mitad correcta. Lo
 * que se exige es que el rótulo DEPENDA del catálogo, así que se mide el ternario
 * entero y no una de sus partes.
 */
export function rotuloCapacidadesDeriva(codigo: string): boolean {
  return /entrada\.disponible\s*\?\s*"Capacidades habilitadas en el chat"\s*:\s*"Capacidades planificadas"/.test(
    codigo,
  );
}

/** Las cadenas que delataban una tarjeta escrita a mano. */
const CADENAS_PROHIBIDAS: [string, RegExp][] = [
  ["una chapa de módulo «en desarrollo»", /En desarrollo/],
  ["un permiso «previsto»", /\(previsto\)/],
  ["un interruptor apagado a mano", /checked=\{false\}/],
  ["un título de módulo literal", /Módulo de Pedidos|Módulo de Inventario/],
  ["un bloque autoejecutado por módulo", /Plugin [12]: Módulo de/],
];

/** Las cadenas prohibidas presentes en el código. Vacío = ninguna. */
export function cadenasEscritasAMano(codigo: string): string[] {
  return CADENAS_PROHIBIDAS.filter(([, re]) => re.test(codigo)).map(([nombre]) => nombre);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL NEGATIVO — la marca tiene que poder ponerse roja
// ═══════════════════════════════════════════════════════════════════════════

describe("el detector de tarjeta escrita a mano funciona (control negativo)", () => {
  const A_MANO = [
    "{/* Plugin 2: Módulo de Inventario */}",
    "{(() => {",
    '  const id = "inventario";',
    "  const conectado = false;",
    "  return <span>En desarrollo · Próximamente</span>;",
    "  return <Switch checked={false} disabled={true} />;",
    "  return <span>Permiso: inventory.read (previsto)</span>;",
    "})()}",
  ].join("\n");

  it("MARCA las cinco cadenas de la tarjeta escrita a mano", () => {
    expect(cadenasEscritasAMano(A_MANO)).toHaveLength(5);
  });

  it("MARCA la tarjeta que no recorre el catálogo", () => {
    expect(derivaDelCatalogo(A_MANO)).toBe(false);
  });

  it("MARCA un rótulo de capacidades escrito a mano", () => {
    expect(rotuloCapacidadesDeriva(A_MANO)).toBe(false);
    expect(rotuloCapacidadesDeriva('const h = "Capacidades planificadas";')).toBe(false);
  });

  it("NO marca una tarjeta derivada (no todo es una violación)", () => {
    const derivada = [
      "{integracionesStore.entradas.map(({ id, entrada }) => {",
      "  const estado = !entrada.disponible ? 'no_disponible' : 'conectado';",
      "  return <Switch disabled={soloLectura || !entrada.disponible} />;",
      "})}",
    ].join("\n");
    expect(cadenasEscritasAMano(derivada)).toEqual([]);
    expect(derivaDelCatalogo(derivada)).toBe(true);
    expect(switchDeshabilitadoPorCatalogo(derivada)).toBe(true);
  });

  it("ACEPTA el rótulo como rama negativa de un ternario sobre `disponible`", () => {
    // La cadena es la misma que en la tarjeta escrita a mano. Lo que cambia es de
    // qué depende: aquí del catálogo, allí de nada. Por eso se mide el ternario.
    const derivado = [
      "{entrada.disponible",
      '  ? "Capacidades habilitadas en el chat"',
      '  : "Capacidades planificadas"}',
    ].join("\n");
    expect(rotuloCapacidadesDeriva(derivado)).toBe(true);
  });

  it("MARCA el ternario invertido (la rama positiva no puede ser la planificada)", () => {
    const invertido = [
      "{entrada.disponible",
      '  ? "Capacidades planificadas"',
      '  : "Capacidades habilitadas en el chat"}',
    ].join("\n");
    expect(rotuloCapacidadesDeriva(invertido)).toBe(false);
  });

  it("no se deja engañar por una cadena prohibida escrita en un COMENTARIO", () => {
    const enProsa = "// aquí decía «En desarrollo · Próximamente» y ya no\nconst x = 1;";
    expect(cadenasEscritasAMano(enProsa)).toHaveLength(1); // sin limpiar, casa…
    expect(cadenasEscritasAMano(sinComentarios(enProsa))).toEqual([]); // …limpiando, no
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LA PÁGINA REAL
// ═══════════════════════════════════════════════════════════════════════════

describe("ConfigPage (Conversaciones) · tarjeta de módulos integrables", () => {
  const fuente = readFileSync(RUTA, "utf8");
  const codigo = sinComentarios(fuente);

  it("la fuente se leyó de verdad (el archivo existe y tiene el bloque)", () => {
    // Sin esto, un `readFileSync` que devolviera otra cosa dejaría los tests de
    // abajo pasando por vacío.
    expect(fuente.length).toBeGreaterThan(5000);
    expect(fuente).toContain("PRESENTACION_INTEGRABLE");
  });

  it("la tarjeta se genera recorriendo el catálogo, una por módulo", () => {
    expect(derivaDelCatalogo(codigo)).toBe(true);
    // Y no queda ningún bloque autoejecutado por módulo.
    expect(codigo).not.toMatch(/Plugin [12]: Módulo de/);
  });

  it("el estado se deriva de `disponible` + conexión, no se escribe", () => {
    expect(estadoDerivado(codigo)).toBe(true);
    expect(codigo).toContain("ESTADO_INTEGRACION_LABEL[estado]");
  });

  it("el interruptor se deshabilita por el catálogo, no por un literal", () => {
    expect(switchDeshabilitadoPorCatalogo(codigo)).toBe(true);
  });

  it("el rótulo de capacidades depende del catálogo", () => {
    expect(rotuloCapacidadesDeriva(codigo)).toBe(true);
  });

  it("no queda ninguna de las cadenas de la tarjeta escrita a mano", () => {
    expect(cadenasEscritasAMano(codigo)).toEqual([]);
  });

  it("la descripción y las capacidades salen del catálogo", () => {
    // Es la de-duplicación: la config del asistente ya pintaba estos dos campos
    // del mismo catálogo, así que el mismo módulo tenía dos descripciones
    // distintas según por dónde entraras.
    expect(codigo).toContain("{entrada.descripcion}");
    expect(codigo).toContain("entrada.ejemplos.map");
  });

  it("la presentación por módulo es exhaustiva por construcción", () => {
    // `Record<ModuloIntegrable, …>`: añadir un módulo integrable sin darle icono
    // es un error de compilación, no una tarjeta en blanco. El compilador lo
    // exige; esto lo deja escrito para que nadie lo degrade a un objeto suelto.
    expect(codigo).toMatch(/PRESENTACION_INTEGRABLE: Record<ModuloIntegrable,/);
  });

  it("el catálogo y la tarjeta coinciden en qué módulos hay", () => {
    // Un control cruzado: la tarjeta recorre `entradas`, que es
    // `ORDEN_MODULOS_INTEGRABLES`. Si esa lista y el catálogo divergieran, la
    // pantalla pintaría un conjunto distinto del que el asistente conoce.
    const ids = ORDEN_MODULOS_INTEGRABLES;
    expect([...ids].sort()).toEqual(Object.keys(MODULOS_INTEGRABLES).sort());
    for (const id of ids) {
      expect(codigo, `sin presentación para «${id}»`).toMatch(
        new RegExp(`^\\s{2}${id}: \\{`, "m"),
      );
    }
  });
});
