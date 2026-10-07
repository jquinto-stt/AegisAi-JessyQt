import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MODULOS_INTEGRABLES, ORDEN_MODULOS_INTEGRABLES } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// La tarjeta de módulo es una VISTA del catálogo, no una copia
// ═══════════════════════════════════════════════════════════════════════════
//
// ── POR QUÉ ESTE GUARDA CAMBIÓ DE PANTALLA (07/10) ────────────────────────
//
// Nació vigilando la tarjeta de módulo de `/conversaciones/config`. Esa sección
// («Módulos conectados») se retiró: era la MISMA línea de código que la tarjeta
// de `/asistente/config` —las dos llaman a `integracionesStore.alternar(id)`—
// y el asistente es el dueño del ajuste, porque lo que gobierna es su registro
// de herramientas.
//
// El guarda sigue existiendo porque el defecto que persigue sigue siendo real:
// la primera versión de la tarjeta estaba escrita a mano, afirmaba «En
// desarrollo · Próximamente» con el interruptor deshabilitado cuando el módulo
// ya tenía proveedor, y el estado real estaba calculado tres líneas más arriba.
// Un control que miente. Lo que cambió es DÓNDE vive la tarjeta, así que el
// guarda se re-apunta a la pantalla que la pinta ahora.
//
// Dos aserciones NO se pudieron trasladar tal cual, porque describían la
// superficie concreta que se retiró, no el defecto:
//
//   · `disabled={soloLectura || !entrada.disponible}` — el modo solo lectura es
//     de la página del canal. La del asistente usa `disabled={!entrada.disponible}`.
//     Lo que importa —que el motivo salga del CATÁLOGO y no de un literal— se
//     conserva.
//   · `PRESENTACION_INTEGRABLE` — el mapa de presentación por módulo (icono,
//     tono, versión, proveedor) solo existía en la tarjeta del canal. La del
//     asistente no pinta el vocabulario interno, que es justo lo que el store
//     pide por escrito («Conector» no se pinta en ninguna superficie).
//
// Lee la FUENTE con `fs`, no importa el componente: la suite corre en
// `environment: 'node'` y ningún test del repo importa un `.tsx`. Mismo patrón
// que `app/AppSidebar.secciones.test.ts`.

const RUTA = join(process.cwd(), "src", "pages", "asistente", "ConfigPage.tsx");

/** Marca textual de la tarjeta, presente solo si el bloque sigue montado. */
const MARCA_TARJETA = "Módulos conectados al asistente";

/**
 * Quita los comentarios antes de afirmar una AUSENCIA.
 *
 * Sin esto, `not.toMatch(/En desarrollo/)` casa con la PROSA que explica que esa
 * chapa se retiró. Un test que lee prosa mide cómo está escrito el comentario, no
 * el contrato.
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
  return /disabled=\{!entrada\.disponible\}/.test(codigo);
}

/** ¿El estado se deriva de `disponible` en vez de escribirse? */
export function estadoDerivado(codigo: string): boolean {
  return /const estado: EstadoIntegracion = !entrada\.disponible/.test(codigo);
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

  it("MARCA un interruptor deshabilitado por un literal", () => {
    expect(switchDeshabilitadoPorCatalogo("disabled={true}")).toBe(false);
    expect(switchDeshabilitadoPorCatalogo("disabled={soloLectura}")).toBe(false);
  });

  it("NO marca una tarjeta derivada (no todo es una violación)", () => {
    const derivada = [
      "{integracionesStore.entradas.map(({ id, entrada }) => {",
      "  const estado: EstadoIntegracion = !entrada.disponible ? 'no_disponible' : 'conectado';",
      "  return <Switch disabled={!entrada.disponible} />;",
      "})}",
    ].join("\n");
    expect(cadenasEscritasAMano(derivada)).toEqual([]);
    expect(derivaDelCatalogo(derivada)).toBe(true);
    expect(switchDeshabilitadoPorCatalogo(derivada)).toBe(true);
    expect(estadoDerivado(derivada)).toBe(true);
  });

  it("MARCA el estado escrito a mano (sin derivar de `disponible`)", () => {
    expect(estadoDerivado("const estado: EstadoIntegracion = 'conectado';")).toBe(false);
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

describe("ConfigPage (Asistente) · tarjeta de módulos integrados", () => {
  const fuente = readFileSync(RUTA, "utf8");
  const codigo = sinComentarios(fuente);

  it("la fuente se leyó de verdad (el archivo existe y tiene el bloque)", () => {
    // Sin esto, un `readFileSync` que devolviera otra cosa dejaría los tests de
    // abajo pasando por vacío.
    expect(fuente.length).toBeGreaterThan(5000);
    expect(fuente).toContain(MARCA_TARJETA);
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

  it("no queda ninguna de las cadenas de la tarjeta escrita a mano", () => {
    expect(cadenasEscritasAMano(codigo)).toEqual([]);
  });

  it("la descripción y los ejemplos salen del catálogo", () => {
    // Es la de-duplicación: la config del canal pintaba estos dos campos del
    // mismo catálogo, así que el mismo módulo tenía dos descripciones distintas
    // según por dónde entraras. Ahora hay una sola superficie.
    expect(codigo).toContain("{entrada.descripcion}");
    expect(codigo).toContain("entrada.ejemplos.map");
  });

  it("la tarjeta NO pinta el vocabulario interno del store", () => {
    // `integraciones.store.ts` dice por escrito que «Conector» es el concepto
    // técnico interno y que NO se pinta en ninguna superficie. La tarjeta del
    // canal pintaba «Permiso: orders.read», «Proveedor» y «Sincronización: En
    // tiempo real»; la del asistente no. Se fija para que no vuelva.
    expect(codigo).not.toContain("Sincronización:");
    expect(codigo).not.toContain("Proveedor:");
  });

  it("el catálogo y la lista de orden coinciden en qué módulos hay", () => {
    // Un control cruzado: la tarjeta recorre `entradas`, que es
    // `ORDEN_MODULOS_INTEGRABLES`. Si esa lista y el catálogo divergieran, la
    // pantalla pintaría un conjunto distinto del que el asistente conoce.
    const ids = ORDEN_MODULOS_INTEGRABLES;
    expect([...ids].sort()).toEqual(Object.keys(MODULOS_INTEGRABLES).sort());
  });
});
