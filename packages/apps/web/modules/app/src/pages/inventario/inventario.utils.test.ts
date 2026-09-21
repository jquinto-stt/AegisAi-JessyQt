import { describe, expect, it } from "vitest";

import type { Articulo, EstadoStock } from "@/stores";
import type { TipoMovimiento } from "@/domain/inventario/inventario.domain";
import {
  cantidad,
  cantidadConSigno,
  conExistencia,
  etiquetaFecha,
  etiquetaVencimiento,
  extremosDe,
  filtrarArticulos,
  interpretarConteo,
  money,
  ordenarPorUrgencia,
  retiraDeBodega,
} from "./inventario.utils";

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES MÍNIMOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Se construyen aquí y no se importa el seed del store: estas funciones son puras
// y probarlas contra datos de negocio acoplaría el test a que el seed cambie de
// cifras — que es exactamente lo que `inventario.store.test.ts` fija por su lado.

const articulo = (over: Partial<Articulo> & { id: string }): Articulo => ({
  sku: `SKU-${over.id}`,
  nombre: `Artículo ${over.id}`,
  categoria: "General",
  unidad: "unidad",
  minimo: 1,
  costoUnitario: 1000,
  ...over,
});

const SALMON = articulo({ id: "a1", sku: "SKU-1003", nombre: "Salmón", categoria: "Proteínas", unidad: "kg" });
const HARINA = articulo({ id: "a2", sku: "SKU-3002", nombre: "Harina de trigo", categoria: "Insumos", unidad: "kg" });
const JUGO = articulo({ id: "a3", sku: "SKU-4001", nombre: "Jugo de naranja", categoria: "Bebidas", unidad: "l" });
const TODOS = [SALMON, HARINA, JUGO];

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO
// ═══════════════════════════════════════════════════════════════════════════

describe("formato de importes y cantidades", () => {
  it("redondea y separa miles con el locale del proyecto", () => {
    // `es-CO` separa miles con punto. Se comprueba con `toLocaleString` en vez de
    // con el literal "32.000" para no afirmar algo que el locale decide: si el
    // entorno resuelve el locale a otra cosa, el test seguiría midiendo `money`.
    expect(money(32000)).toBe(`$${(32000).toLocaleString("es-CO")}`);
    expect(money(0)).toBe("$0");
  });

  it("no arrastra decimales a la tabla", () => {
    expect(money(1234.6)).toBe(`$${(1235).toLocaleString("es-CO")}`);
  });

  it("usa la abreviatura de la unidad, no la etiqueta larga del select", () => {
    expect(cantidad(12, "unidad")).toContain("und");
    expect(cantidad(5, "kg")).toContain("kg");
    expect(cantidad(3, "porcion")).toContain("porc");
    // El control que evita la regresión: la etiqueta del `<select>` no debe
    // colarse en una celda de tabla.
    expect(cantidad(5, "kg")).not.toContain("Kilogramo");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════════════

describe("etiquetaFecha", () => {
  const ahora = new Date(2026, 8, 21, 14, 30); // 21 sep 2026, 14:30

  it("llama «Hoy» al mismo día, con hora", () => {
    expect(etiquetaFecha(new Date(2026, 8, 21, 9, 5).toISOString(), ahora)).toBe("Hoy 09:05");
  });

  it("llama «Ayer» al día anterior, y cruza bien el cambio de mes", () => {
    expect(etiquetaFecha(new Date(2026, 8, 20, 22, 0).toISOString(), ahora)).toBe("Ayer 22:00");
    // 1 de septiembre visto desde el 1 de septiembre: ayer es el 31 de agosto.
    const primero = new Date(2026, 8, 1, 12, 0);
    expect(etiquetaFecha(new Date(2026, 7, 31, 12, 0).toISOString(), primero)).toBe("Ayer 12:00");
  });

  it("a partir de anteayer usa día y mes, sin hora", () => {
    expect(etiquetaFecha(new Date(2026, 8, 12, 8, 0).toISOString(), ahora)).toBe("12 sep");
  });

  it("una fecha inválida no revienta la tabla", () => {
    expect(etiquetaFecha("no-es-una-fecha", ahora)).toBe("—");
  });
});

describe("etiquetaVencimiento", () => {
  const hoy = new Date(2026, 8, 21, 14, 30); // 21 sep 2026, 14:30
  const enDias = (n: number) => {
    const d = new Date(2026, 8, 21);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  it("cuenta hacia adelante y hacia atrás en palabras", () => {
    expect(etiquetaVencimiento(enDias(3), hoy)).toBe("vence en 3 días");
    expect(etiquetaVencimiento(enDias(30), hoy)).toBe("vence en 30 días");
    expect(etiquetaVencimiento(enDias(-2), hoy)).toBe("venció hace 2 días");
  });

  it("los tres días que no llevan número", () => {
    // «vence en 1 días» es lo que saldría de concatenar sin mirar: se afirman
    // los tres casos que tienen forma propia.
    expect(etiquetaVencimiento(enDias(0), hoy)).toBe("vence hoy");
    expect(etiquetaVencimiento(enDias(1), hoy)).toBe("vence mañana");
    expect(etiquetaVencimiento(enDias(-1), hoy)).toBe("venció ayer");
  });

  it("una fecha ilegible se pinta como raya, no como «vence hoy»", () => {
    // Es la misma decisión que en `etiquetaFecha`: «—» es «no se sabe», y
    // colapsarla a un número afirmaría algo que la función no puede saber.
    expect(etiquetaVencimiento("", hoy)).toBe("—");
    expect(etiquetaVencimiento("2026-13-45", hoy)).toBe("—");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════

describe("filtrarArticulos", () => {
  it("sin filtro devuelve todo", () => {
    expect(filtrarArticulos(TODOS, {})).toHaveLength(3);
  });

  it("busca por nombre sin distinguir mayúsculas NI ACENTOS", () => {
    // Las dos formas de la misma búsqueda: quien escribe rápido teclea «salmon»
    // sin tilde, y el artículo se llama «Salmón». El plegado es el mismo que usa
    // el asistente (`normalizarTexto`), así que la tabla y el chat coinciden.
    expect(filtrarArticulos(TODOS, { texto: "salmon" }).map((a) => a.id)).toEqual(["a1"]);
    expect(filtrarArticulos(TODOS, { texto: "SALMÓN" }).map((a) => a.id)).toEqual(["a1"]);
  });

  it("busca también por SKU, que es como busca quien conoce el código", () => {
    expect(filtrarArticulos(TODOS, { texto: "3002" }).map((a) => a.id)).toEqual(["a2"]);
    expect(filtrarArticulos(TODOS, { texto: "sku-4001" }).map((a) => a.id)).toEqual(["a3"]);
  });

  it("combina texto y categoría (las dos condiciones, no una)", () => {
    expect(filtrarArticulos(TODOS, { texto: "harina", categoria: "Insumos" }).map((a) => a.id)).toEqual(["a2"]);
    // El texto casa, pero la categoría no: se exigen las DOS.
    expect(filtrarArticulos(TODOS, { texto: "harina", categoria: "Bebidas" })).toEqual([]);
  });

  it("un texto en blanco no filtra nada", () => {
    expect(filtrarArticulos(TODOS, { texto: "   " })).toHaveLength(3);
  });
});

describe("conExistencia", () => {
  it("deja fuera los ceros: agotado en una bodega no es estar en esa bodega", () => {
    const existencias: Record<string, number> = { a1: 0, a2: 4, a3: 0 };
    expect(conExistencia(TODOS, (id) => existencias[id] ?? 0).map((a) => a.id)).toEqual(["a2"]);
  });

  it("conserva el orden de entrada", () => {
    expect(conExistencia(TODOS, () => 1).map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("ordenarPorUrgencia", () => {
  const estadoDe = (mapa: Record<string, EstadoStock>) => (id: string) => mapa[id] ?? "ok";

  it("pone primero los agotados y después los que están bajo mínimo", () => {
    const orden = ordenarPorUrgencia(
      TODOS,
      estadoDe({ a1: "ok", a2: "agotado", a3: "bajo_minimo" }),
    );
    expect(orden.map((a) => a.id)).toEqual(["a2", "a3", "a1"]);
  });

  it("desempata por nombre para que la lista no se reordene sola", () => {
    const zeta = articulo({ id: "z", nombre: "Zanahoria" });
    const alfa = articulo({ id: "y", nombre: "Aceite" });
    const orden = ordenarPorUrgencia([zeta, alfa], () => "agotado");
    expect(orden.map((a) => a.nombre)).toEqual(["Aceite", "Zanahoria"]);
  });

  it("no muta el array de entrada", () => {
    const original = [...TODOS];
    ordenarPorUrgencia(TODOS, estadoDe({ a2: "agotado" }));
    expect(TODOS).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO DE MOVIMIENTOS — la dirección del traslado
// ═══════════════════════════════════════════════════════════════════════════
//
// Estas dos funciones vivían dentro de `MovimientosPage.tsx`, donde **ningún
// test podía alcanzarlas**: la suite corre en `environment: 'node'` y ningún
// test del repo importa un `.tsx`. El docblock decía que se probaban solas; no
// era cierto. Aquí sí.
//
// Lo que se fija es la única cosa del formulario que puede estar mal sin que
// nadie se entere: **de qué bodega sale y a cuál entra**. Un traslado con los
// extremos invertidos mueve la mercancía en sentido contrario y el dominio no lo
// detecta —los dos extremos siguen siendo bodegas distintas y válidas—, así que
// el error no aparece hasta que alguien cuenta cajas en el sitio equivocado.

const CENTRAL = "bod-central";
const FRIA = "bod-fria";

describe("extremosDe — el formulario traducido al par origen/destino", () => {
  it("una entrada viene del exterior y llega a la bodega elegida", () => {
    expect(extremosDe("entrada", CENTRAL, FRIA, "alta")).toEqual({
      origenId: null,
      destinoId: CENTRAL,
    });
  });

  it("una salida parte de la bodega elegida y termina en el exterior", () => {
    expect(extremosDe("salida", CENTRAL, FRIA, "alta")).toEqual({
      origenId: CENTRAL,
      destinoId: null,
    });
  });

  it("un traslado SALE de la bodega elegida y ENTRA en la segunda", () => {
    // El caso que importa. La bodega del primer `<select>` es el ORIGEN: quien
    // elige «de Cocina principal a Bodega fría» espera que Cocina pierda. Si
    // esta igualdad se invirtiera, la mercancía se movería al revés.
    expect(extremosDe("transferencia", CENTRAL, FRIA, "alta")).toEqual({
      origenId: CENTRAL,
      destinoId: FRIA,
    });
  });

  it("CONTROL NEGATIVO: los dos extremos del traslado NO son intercambiables", () => {
    // Sin esto, un test que solo afirmara «hay un origen y un destino» pasaría
    // igual con la función devolviendo el par invertido. Se comprueba que la
    // aserción de arriba distingue las dos orientaciones.
    const ida = extremosDe("transferencia", CENTRAL, FRIA, "alta");
    const vuelta = extremosDe("transferencia", FRIA, CENTRAL, "alta");
    expect(ida).not.toEqual(vuelta);
    expect(ida.origenId).toBe(vuelta.destinoId);
    expect(ida.destinoId).toBe(vuelta.origenId);
  });

  it("un ajuste tiene UN solo extremo, y el sentido decide cuál", () => {
    // Al alza: aparece mercancía que el sistema no tenía → entra.
    expect(extremosDe("ajuste", CENTRAL, FRIA, "alta")).toEqual({
      origenId: null,
      destinoId: CENTRAL,
    });
    // A la baja: desaparece mercancía que el sistema sí tenía → sale.
    expect(extremosDe("ajuste", CENTRAL, FRIA, "baja")).toEqual({
      origenId: CENTRAL,
      destinoId: null,
    });
  });

  it("el destino de un traslado no se usa en ningún otro tipo", () => {
    // Un `bodegaDestinoId` que se colara en una entrada o una salida crearía un
    // movimiento de dos extremos que el dominio rechazaría — un formulario que
    // produce un rechazo garantizado.
    const otros: TipoMovimiento[] = ["entrada", "salida", "ajuste"];
    for (const tipo of otros) {
      for (const sentido of ["alta", "baja"] as const) {
        expect(extremosDe(tipo, CENTRAL, FRIA, sentido).destinoId).not.toBe(FRIA);
      }
    }
  });

  it("todo tipo declarado tiene su rama: exactamente uno o dos extremos", () => {
    // El `switch` de `extremosDe` no tiene `default`, así que un quinto tipo sin
    // rama devolvería `undefined` y el movimiento se registraría sin extremos.
    // Este test recorre la unión entera para que eso no pueda pasar en silencio.
    const tipos: TipoMovimiento[] = ["entrada", "salida", "transferencia", "ajuste"];
    for (const tipo of tipos) {
      for (const sentido of ["alta", "baja"] as const) {
        const { origenId, destinoId } = extremosDe(tipo, CENTRAL, FRIA, sentido);
        const extremos = [origenId, destinoId].filter((x) => x !== null).length;
        expect(extremos).toBe(tipo === "transferencia" ? 2 : 1);
      }
    }
  });
});

describe("retiraDeBodega — si el formulario debe enseñar el disponible", () => {
  it("restan: la salida, el traslado y el ajuste a la baja", () => {
    expect(retiraDeBodega("salida", CENTRAL, FRIA, "alta")).toBe(true);
    expect(retiraDeBodega("transferencia", CENTRAL, FRIA, "alta")).toBe(true);
    expect(retiraDeBodega("ajuste", CENTRAL, FRIA, "baja")).toBe(true);
  });

  it("no restan: la entrada ni el ajuste al alza", () => {
    // En estos la bodega elegida RECIBE. Enseñar ahí un «disponible» sugeriría un
    // límite que no existe: nada impide que lleguen 999 unidades a una bodega
    // vacía.
    expect(retiraDeBodega("entrada", CENTRAL, FRIA, "alta")).toBe(false);
    expect(retiraDeBodega("ajuste", CENTRAL, FRIA, "alta")).toBe(false);
  });

  it("se deriva de `extremosDe` y no de una segunda lista de tipos", () => {
    // El pin que evita la regresión de verdad: si alguien reescribe
    // `retiraDeBodega` con su propia lista de «qué tipos restan», las dos tablas
    // pueden separarse y la pantalla enseñaría un disponible para un movimiento
    // que no retira nada —o no lo enseñaría para uno que sí—. Con esto, la
    // única forma de que discrepen es que este test se ponga rojo.
    const tipos: TipoMovimiento[] = ["entrada", "salida", "transferencia", "ajuste"];
    for (const tipo of tipos) {
      for (const sentido of ["alta", "baja"] as const) {
        const { origenId } = extremosDe(tipo, CENTRAL, FRIA, sentido);
        expect(retiraDeBodega(tipo, CENTRAL, FRIA, sentido)).toBe(origenId !== null);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTEO FÍSICO — lo tecleado en la casilla
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la costura entre lo que el operador escribe y lo que el dominio guarda, y
// es la clase de sitio donde un defecto no se ve: la casilla se ve bien, el
// número que queda guardado es otro, y el ajuste sale mal seis meses después.
//
// La decisión de diseño que estos tests fijan es que **ante una cifra ambigua se
// pregunta, no se elige**: `1.000` es mil en `es-CO` y `Number("1.000")` es uno.

describe("interpretarConteo — la casilla del conteo", () => {
  it("vacío es `null`, que es «sin contar» y NO es cero", () => {
    // La aserción que impide conciliar dando por contadas las líneas que nadie
    // miró.
    expect(interpretarConteo("")).toEqual({ valido: true, conteoFisico: null });
    expect(interpretarConteo("   ")).toEqual({ valido: true, conteoFisico: null });
    expect(interpretarConteo("")).not.toEqual({ valido: true, conteoFisico: 0 });
  });

  it("lee un entero y un decimal con punto o con coma", () => {
    expect(interpretarConteo("12")).toEqual({ valido: true, conteoFisico: 12 });
    expect(interpretarConteo("12.5")).toEqual({ valido: true, conteoFisico: 12.5 });
    expect(interpretarConteo("0,75")).toEqual({ valido: true, conteoFisico: 0.75 });
    expect(interpretarConteo("  8  ")).toEqual({ valido: true, conteoFisico: 8 });
  });

  it("cero es un conteo válido: el estante vacío es un hecho, no un vacío", () => {
    expect(interpretarConteo("0")).toEqual({ valido: true, conteoFisico: 0 });
  });

  it("RECHAZA la cifra ambigua en vez de adivinar", () => {
    // `1.000` es mil para el operador y 1 para `Number`. Las dos lecturas son
    // plausibles: registrar 1 kg donde había 1000 es un error que el kárdex ya
    // no deshace, así que se pide que se teclee sin separador de millares.
    for (const texto of ["1.000", "12.500", "1,000", "250,000"]) {
      const r = interpretarConteo(texto);
      expect(r.valido, `«${texto}» debía rechazarse`).toBe(false);
      if (r.valido) throw new Error("debía rechazar");
      expect(r.motivo).toMatch(/ambigua/i);
    }
  });

  it("CONTROL NEGATIVO: `12.5` NO es ambiguo, aunque tenga separador", () => {
    // Sin esta mitad, un rechazo por «tiene separador» pasaría los cuatro casos
    // de arriba y rompería el conteo normal de medios kilos.
    expect(interpretarConteo("12.5").valido).toBe(true);
    expect(interpretarConteo("1.5").valido).toBe(true);
    // Y la frontera exacta: tres dígitos después del separador es ambiguo, dos
    // no.
    expect(interpretarConteo("1.50").valido).toBe(true);
    expect(interpretarConteo("1.500").valido).toBe(false);
  });

  it("rechaza lo que no es un número, y no lo convierte en `NaN`", () => {
    for (const texto of ["abc", "5 kg", "1/2", "-3", "1.2.3", "½"]) {
      const r = interpretarConteo(texto);
      expect(r.valido, `«${texto}» debía rechazarse`).toBe(false);
      if (r.valido) throw new Error("debía rechazar");
      expect(r.motivo.trim()).not.toBe("");
    }
  });

  it("CONTROL NEGATIVO: `NaN` no se cuela como conteo válido", () => {
    // La trampa clásica: `Number("")` es 0 y `Number("x")` es `NaN`, y un `NaN`
    // guardado en el kárdex envenena toda suma de existencias de ese artículo.
    // El tipo `ConteoDigitado` hace imposible leer un `NaN` como válido —cuando
    // `valido` es `true`, `conteoFisico` está tipado como `number | null`— así
    // que lo que se fija aquí es que **ningún texto raro devuelve `valido`**.
    for (const texto of ["x", "NaN", "Infinity", "1e3"]) {
      const r = interpretarConteo(texto);
      expect(r.valido, `«${texto}»`).toBe(false);
    }
    // Y el camino válido nunca produce `NaN`.
    const ok = interpretarConteo("12.5");
    if (!ok.valido) throw new Error("debía aceptar");
    expect(Number.isNaN(ok.conteoFisico as number)).toBe(false);
  });
});

describe("cantidadConSigno — la columna de diferencias", () => {
  it("escribe el signo siempre, también el `+`", () => {
    // Una columna donde unas cifras llevan signo y otras no obliga a leer el
    // número entero para saber de qué lado está.
    expect(cantidadConSigno(2, "kg")).toMatch(/^\+/);
    expect(cantidadConSigno(-2, "kg")).toMatch(/^−/);
    expect(cantidadConSigno(2, "kg")).toContain("2");
  });

  it("usa el signo menos tipográfico, no el guion", () => {
    // En una columna de cifras el guion se lee como un separador.
    expect(cantidadConSigno(-2, "kg")).not.toMatch(/^-/);
    expect(cantidadConSigno(-2, "kg").charAt(0)).toBe("−");
  });

  it("cero no lleva signo: no está de ningún lado", () => {
    expect(cantidadConSigno(0, "kg")).toBe(cantidad(0, "kg"));
  });

  it("la unidad acompaña a la cifra", () => {
    expect(cantidadConSigno(-3, "kg")).toBe(`−${cantidad(3, "kg")}`);
    expect(cantidadConSigno(3, "unidad")).toBe(`+${cantidad(3, "unidad")}`);
  });
});
