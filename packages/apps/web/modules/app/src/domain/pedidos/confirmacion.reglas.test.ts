import { describe, it, expect } from "vitest";

import {
  ETIQUETA_FORMA,
  FORMAS_CONFIRMACION,
  REGLAS_CONFIRMACION_INICIAL,
  aplicaARiesgosas,
  conForma,
  conPresupuesto,
  conRiesgosas,
  esForma,
  reglasVigentes,
  resumenReglas,
  superaPresupuesto,
  type ReglasConfirmacion,
} from "./confirmacion.reglas";

// ── Lo que se prueba, y por qué ────────────────────────────────────────────
//
// La regla que importa aquí es la EXCLUSIVIDAD de la jerarquía: si dos formas
// pudieran quedar encendidas a la vez, el modelo guardaría un estado imposible y
// alguien tendría que decidir en tiempo de lectura cuál manda. El resto son los
// bordes que ocurren de verdad: apagar la forma activa (deja «ninguna», no
// «manual») y apagar una que no lo está (no debe borrar la vigente).
//
// El tope de envío tiene su propio bloque porque es la única regla que PRODUCE
// datos (marca pedidos), no solo una preferencia: los bordes son el envío
// exactamente igual al tope y el tope sin valor.

/** Reglas mínimas para probar una regla sin arrastrar las otras dos. */
const base = (cambio: Partial<ReglasConfirmacion> = {}): ReglasConfirmacion => ({
  ...REGLAS_CONFIRMACION_INICIAL,
  presupuestoEnvio: { ...REGLAS_CONFIRMACION_INICIAL.presupuestoEnvio },
  ...cambio,
});

describe("reglasVigentes", () => {
  it("sin configuración devuelve las de fábrica", () => {
    expect(reglasVigentes(undefined)).toEqual(REGLAS_CONFIRMACION_INICIAL);
  });

  it("no comparte la referencia con la constante de fábrica", () => {
    const reglas = reglasVigentes(undefined);
    reglas.riesgosas = false;
    reglas.presupuestoEnvio.valorMaximo = 1;
    expect(REGLAS_CONFIRMACION_INICIAL.riesgosas).toBe(true);
    expect(REGLAS_CONFIRMACION_INICIAL.presupuestoEnvio.valorMaximo).toBe(22_000);
  });

  it("una forma desconocida se lee como «ninguna», no como la de fábrica", () => {
    // Una config escrita a mano o por una versión futura no puede encender por
    // accidente la confirmación automática.
    expect(reglasVigentes({ riesgosas: true, forma: "telepatia" } as never).forma).toBeNull();
  });

  it("rellena el tope de envío en una config guardada antes de que existiera", () => {
    // Sin esto, la pantalla abriría el tope apagado y en 0: una protección
    // perdida en silencio.
    const vieja = { riesgosas: true, forma: "manual" } as unknown as ReglasConfirmacion;
    expect(reglasVigentes(vieja).presupuestoEnvio).toEqual(
      REGLAS_CONFIRMACION_INICIAL.presupuestoEnvio,
    );
  });

  it("sanea un valor negativo o no numérico", () => {
    expect(reglasVigentes(base({ presupuestoEnvio: { activo: true, valorMaximo: -5 } })).presupuestoEnvio.valorMaximo).toBe(0);
    expect(
      reglasVigentes(base({ presupuestoEnvio: { activo: true, valorMaximo: Number.NaN } }))
        .presupuestoEnvio.valorMaximo,
    ).toBe(22_000);
  });
});

describe("conForma", () => {
  const sinForma = base({ forma: null });

  it("encender una forma apaga la anterior", () => {
    const manual = conForma(sinForma, "manual", true);
    expect(manual.forma).toBe("manual");
    expect(conForma(manual, "whatsapp", true).forma).toBe("whatsapp");
    expect(conForma(conForma(manual, "whatsapp", true), "automatica", true).forma).toBe(
      "automatica",
    );
  });

  it("apagar la forma activa deja el negocio sin forma elegida", () => {
    const manual = conForma(sinForma, "manual", true);
    expect(conForma(manual, "manual", false).forma).toBeNull();
  });

  it("apagar una forma inactiva no toca la vigente", () => {
    const manual = conForma(sinForma, "manual", true);
    expect(conForma(manual, "whatsapp", false).forma).toBe("manual");
  });

  it("nunca deja dos formas encendidas", () => {
    let reglas = sinForma;
    for (const forma of FORMAS_CONFIRMACION) reglas = conForma(reglas, forma, true);
    expect(reglas.forma).toBe("automatica");
    expect(esForma(reglas.forma)).toBe(true);
  });

  it("no toca el tope de envío", () => {
    const reglas = conForma(base({ presupuestoEnvio: { activo: false, valorMaximo: 5_000 } }), "whatsapp", true);
    expect(reglas.presupuestoEnvio).toEqual({ activo: false, valorMaximo: 5_000 });
  });
});

describe("conRiesgosas", () => {
  it("apagarla no toca la forma elegida", () => {
    const reglas = conRiesgosas(base({ forma: "automatica" }), false);
    expect(reglas.riesgosas).toBe(false);
    expect(reglas.forma).toBe("automatica");
  });
});

describe("conPresupuesto", () => {
  it("cambia solo el campo pedido", () => {
    const reglas = conPresupuesto(base(), { valorMaximo: 30_000 });
    expect(reglas.presupuestoEnvio).toEqual({ activo: true, valorMaximo: 30_000 });
    expect(reglas.forma).toBe(REGLAS_CONFIRMACION_INICIAL.forma);
    expect(reglas.riesgosas).toBe(REGLAS_CONFIRMACION_INICIAL.riesgosas);
  });

  it("no muta las reglas que recibe", () => {
    const original = base();
    conPresupuesto(original, { activo: false });
    expect(original.presupuestoEnvio.activo).toBe(true);
  });
});

describe("superaPresupuesto", () => {
  it("marca el envío por encima del tope", () => {
    const reglas = base({ presupuestoEnvio: { activo: true, valorMaximo: 22_000 } });
    expect(superaPresupuesto(reglas, 22_001)).toBe(true);
  });

  it("no marca el envío exactamente igual al tope", () => {
    // El texto dice «superior al definido»: igual no supera.
    const reglas = base({ presupuestoEnvio: { activo: true, valorMaximo: 22_000 } });
    expect(superaPresupuesto(reglas, 22_000)).toBe(false);
  });

  it("apagado no marca nada", () => {
    const reglas = base({ presupuestoEnvio: { activo: false, valorMaximo: 1 } });
    expect(superaPresupuesto(reglas, 999_999)).toBe(false);
  });

  it("sin valor definido no marca todo: no hay tope", () => {
    const reglas = base({ presupuestoEnvio: { activo: true, valorMaximo: 0 } });
    expect(superaPresupuesto(reglas, 999_999)).toBe(false);
  });
});

describe("aplicaARiesgosas", () => {
  it("solo aplica cuando la revisión manual está apagada", () => {
    expect(aplicaARiesgosas(base({ riesgosas: true, forma: "whatsapp" }))).toBe(false);
    expect(aplicaARiesgosas(base({ riesgosas: false, forma: "whatsapp" }))).toBe(true);
  });
});

describe("resumenReglas", () => {
  it("describe las cuatro situaciones con textos distintos", () => {
    const textos = [
      resumenReglas(base({ forma: "manual" })),
      resumenReglas(base({ forma: "whatsapp" })),
      resumenReglas(base({ forma: "automatica" })),
      resumenReglas(base({ forma: null })),
    ];
    expect(new Set(textos).size).toBe(4);
  });
});

describe("ETIQUETA_FORMA", () => {
  it("nombra las tres formas y ninguna se repite", () => {
    const etiquetas = FORMAS_CONFIRMACION.map((f) => ETIQUETA_FORMA[f]);
    expect(etiquetas.every(Boolean)).toBe(true);
    expect(new Set(etiquetas).size).toBe(FORMAS_CONFIRMACION.length);
  });
});
