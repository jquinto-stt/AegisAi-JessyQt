import { describe, expect, it } from "vitest";

import {
  CONFIANZA_BADGE,
  CONFIANZA_LABEL,
  EJEMPLOS_PREGUNTA,
  GRUPO_DE_SECCION,
  GRUPO_SECCION_LABEL,
  INFERENCIA_TIPO_LABEL,
  LIMITES_ASISTENTE,
  META_SECCION,
  MODULOS_CONOCIDOS,
  MOTOR_BADGE,
  MOTOR_DESCRIPCION,
  MOTOR_LABEL,
  NIVEL_BADGE,
  NIVEL_DESCRIPCION,
  NIVELES_OPERATIVOS,
  NIVEL_LABEL,
  OPCIONES_DENSIDAD,
  OPCIONES_RESPUESTA,
  ORDEN_GRUPOS,
  ORDEN_SECCIONES,
  TERMINOS_CAUSALES_PROHIBIDOS,
  nivelOperativo,
  seccionesPorGrupo,
  type NivelTool,
  type SeccionAsistente,
} from "./configuracion.secciones";

// ═══════════════════════════════════════════════════════════════════════════
// configuracion.secciones.test.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// Guardas del CATÁLOGO de presentación de la página de configuración de NECTO
// AI. El catálogo es la única fuente del vocabulario de la página, así que
// estas pruebas son lo que impide que el vocabulario se degrade: una sección sin
// grupo, un nivel sin etiqueta o un ejemplo que ya no dispara ninguna regla del
// motor pasan aquí antes de llegar a la pantalla.
//
// ═══════════════════════════════════════════════════════════════════════════

describe("catálogo de secciones — exhaustividad", () => {
  it("todas las secciones declaradas tienen entrada en META_SECCION", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(META_SECCION[s]).toBeDefined();
    }
  });

  it("META_SECCION no declara secciones que no estén en ORDEN_SECCIONES", () => {
    const declaradas = Object.keys(META_SECCION) as SeccionAsistente[];
    for (const s of declaradas) {
      expect(ORDEN_SECCIONES).toContain(s);
    }
  });

  it("ORDEN_SECCIONES no tiene duplicados", () => {
    expect(new Set(ORDEN_SECCIONES).size).toBe(ORDEN_SECCIONES.length);
  });

  it("toda sección pertenece a un grupo declarado", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(ORDEN_GRUPOS).toContain(GRUPO_DE_SECCION[s]);
    }
  });

  it("todo grupo declarado tiene etiqueta", () => {
    for (const g of ORDEN_GRUPOS) {
      expect(GRUPO_SECCION_LABEL[g]).toBeTruthy();
    }
  });

  it("cada sección tiene etiqueta, ayuda e icono no vacíos", () => {
    for (const s of ORDEN_SECCIONES) {
      const meta = META_SECCION[s];
      expect(meta.label.trim().length).toBeGreaterThan(0);
      expect(meta.hint.trim().length).toBeGreaterThan(0);
      expect(meta.icono.trim().length).toBeGreaterThan(0);
    }
  });

  it("las etiquetas de sección son únicas (no hay dos secciones con el mismo nombre)", () => {
    const labels = ORDEN_SECCIONES.map((s) => META_SECCION[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("catálogo de secciones — agrupación", () => {
  it("seccionesPorGrupo() conserva el total de secciones", () => {
    const total = seccionesPorGrupo().reduce((n, g) => n + g.secciones.length, 0);
    expect(total).toBe(ORDEN_SECCIONES.length);
  });

  it("seccionesPorGrupo() devuelve los grupos en el orden canónico", () => {
    const grupos = seccionesPorGrupo().map((g) => g.grupo);
    expect(grupos).toEqual(ORDEN_GRUPOS.filter((g) => grupos.includes(g)));
  });

  it("seccionesPorGrupo() no devuelve grupos vacíos", () => {
    for (const g of seccionesPorGrupo()) {
      expect(g.secciones.length).toBeGreaterThan(0);
    }
  });

  it("dentro de cada grupo, las secciones respetan ORDEN_SECCIONES", () => {
    for (const { secciones } of seccionesPorGrupo()) {
      const esperado = ORDEN_SECCIONES.filter((s) => secciones.includes(s));
      expect(secciones).toEqual(esperado);
    }
  });

  it("la página tiene exactamente las 6 secciones del diseño", () => {
    expect(ORDEN_SECCIONES).toEqual([
      "perfil",
      "motor",
      "herramientas",
      "historial",
      "alcance",
      "apariencia",
    ]);
  });

  it("los 3 grupos se llaman ASISTENTE / CAPACIDADES / PREFERENCIAS", () => {
    expect(ORDEN_GRUPOS.map((g) => GRUPO_SECCION_LABEL[g])).toEqual([
      "ASISTENTE",
      "CAPACIDADES",
      "PREFERENCIAS",
    ]);
  });
});

describe("catálogo del motor — espejo del contrato del núcleo", () => {
  it("cubre los dos motores del contrato (local-rule y remote-llm)", () => {
    expect(Object.keys(MOTOR_LABEL).sort()).toEqual(["local-rule", "remote-llm"]);
  });

  it("todo motor tiene etiqueta, descripción y badge", () => {
    for (const m of ["local-rule", "remote-llm"] as const) {
      expect(MOTOR_LABEL[m]).toBeTruthy();
      expect(MOTOR_DESCRIPCION[m]).toBeTruthy();
      expect(MOTOR_BADGE[m]).toBeTruthy();
    }
  });

  it("el motor activo del MVP (local-rule) está marcado como operativo", () => {
    expect(MOTOR_BADGE["local-rule"]).toBe("success");
  });

  it("el motor remoto NO está marcado como operativo (sería una mentira)", () => {
    expect(MOTOR_BADGE["remote-llm"]).not.toBe("success");
  });
});

describe("catálogo de niveles de herramienta", () => {
  it("cubre los cuatro niveles del contrato ToolCapabilityLevel", () => {
    expect(Object.keys(NIVEL_LABEL).sort()).toEqual([
      "analyze",
      "execute",
      "query",
      "recommend",
    ]);
  });

  it("todo nivel tiene etiqueta, descripción y badge", () => {
    for (const n of Object.keys(NIVEL_LABEL) as NivelTool[]) {
      expect(NIVEL_LABEL[n]).toBeTruthy();
      expect(NIVEL_DESCRIPCION[n]).toBeTruthy();
      expect(NIVEL_BADGE[n]).toBeTruthy();
    }
  });

  it("solo query y analyze están operativos, igual que NIVELES_MVP del motor", () => {
    expect([...NIVELES_OPERATIVOS].sort()).toEqual(["analyze", "query"]);
  });

  it("nivelOperativo() coincide con la lista de niveles operativos", () => {
    for (const n of Object.keys(NIVEL_LABEL) as NivelTool[]) {
      expect(nivelOperativo(n)).toBe(NIVELES_OPERATIVOS.includes(n));
    }
  });

  it("los niveles reservados NO están operativos (son el punto de crecimiento)", () => {
    expect(nivelOperativo("recommend")).toBe(false);
    expect(nivelOperativo("execute")).toBe(false);
  });
});

describe("catálogo hecho/inferencia — la garantía de no-causalidad", () => {
  it("los tres tipos de inferencia del contrato están etiquetados", () => {
    expect(Object.keys(INFERENCIA_TIPO_LABEL).sort()).toEqual([
      "correlation",
      "hypothesis",
      "pattern",
    ]);
  });

  it("NO existe un tipo de inferencia llamado 'causa' (invariante del contrato)", () => {
    const tipos = Object.keys(INFERENCIA_TIPO_LABEL).map((t) => t.toLowerCase());
    expect(tipos).not.toContain("causa");
    expect(tipos).not.toContain("cause");
    expect(tipos).not.toContain("causality");
  });

  it("los tres niveles de confianza están etiquetados y con badge distinto", () => {
    const niveles = Object.keys(CONFIANZA_LABEL);
    expect(niveles.sort()).toEqual(["alta", "baja", "media"]);
    const colores = niveles.map((n) => CONFIANZA_BADGE[n as "baja"]);
    // Los tres deben ser distinguibles entre sí.
    expect(new Set(colores).size).toBe(colores.length);
  });

  it("la lista de términos causales prohibidos incluye los cuatro del motor", () => {
    const terminos = TERMINOS_CAUSALES_PROHIBIDOS.map((t) => t.toLowerCase());
    for (const esperado of ["causa", "provoca", "porque", "debido a"]) {
      expect(terminos).toContain(esperado);
    }
  });
});

describe("catálogo de preguntas de ejemplo", () => {
  it("cada ejemplo apunta a una tool del espacio de nombres de pedidos", () => {
    for (const ej of EJEMPLOS_PREGUNTA) {
      expect(ej.toolId.startsWith("pedidos.")).toBe(true);
    }
  });

  it("cada ejemplo tiene una pregunta no vacía y distinta de las demás", () => {
    const preguntas = EJEMPLOS_PREGUNTA.map((e) => e.pregunta);
    for (const p of preguntas) expect(p.trim().length).toBeGreaterThan(0);
    expect(new Set(preguntas).size).toBe(preguntas.length);
  });

  it("los ejemplos cubren tanto herramientas de consulta como de análisis", () => {
    // diagnosticoDesempeno y compararSemanas son las de nivel `analyze`.
    const ids = EJEMPLOS_PREGUNTA.map((e) => e.toolId);
    expect(ids.some((id) => id.includes("diagnostico"))).toBe(true);
    expect(ids.some((id) => id.includes("getResumen") || id.includes("getPendientes"))).toBe(
      true,
    );
  });

  // Regresión: un ejemplo apuntaba a `pedidos.getTopProductos`, una tool
  // DECLARADA en el provider pero ausente de `QUERY_TOOLS`/`ANALYZE_TOOLS`, así
  // que el registry jamás la resolvía. El namespace correcto no basta: hay que
  // exigir que la tool exista de verdad y que `resolve` la encuentre.
  it("cada ejemplo apunta a una tool que el registry resuelve de verdad", async () => {
    const { toolRegistry } = await import("@/assistant/registry/tool-registry");
    const { PedidosToolProvider } = await import(
      "@/modules-tools/pedidos/pedidos.tool-provider"
    );

    toolRegistry.register(new PedidosToolProvider());

    const registradas = new Set(
      toolRegistry
        .getAvailableTools({
          access: { enabledModules: ["pedidos"], hasCapability: () => true },
        })
        .map((t) => t.id),
    );
    expect(registradas.size).toBeGreaterThan(0);

    for (const { pregunta, toolId } of EJEMPLOS_PREGUNTA) {
      expect(
        registradas.has(toolId),
        `el ejemplo "${pregunta}" apunta a "${toolId}", que no está registrada`,
      ).toBe(true);
      expect(
        toolRegistry.resolve(toolId, {
          access: { enabledModules: ["pedidos"], hasCapability: () => true },
        }),
        `"${toolId}" no resuelve en el registry`,
      ).not.toBeNull();
    }
  });
});

describe("catálogo de límites del asistente", () => {
  it("declara al menos los cinco límites reales del sistema", () => {
    expect(LIMITES_ASISTENTE.length).toBeGreaterThanOrEqual(5);
  });

  it("todo límite tiene título y detalle no vacíos", () => {
    for (const l of LIMITES_ASISTENTE) {
      expect(l.titulo.trim().length).toBeGreaterThan(0);
      expect(l.detalle.trim().length).toBeGreaterThan(0);
    }
  });

  it("los títulos de los límites son únicos", () => {
    const titulos = LIMITES_ASISTENTE.map((l) => l.titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("declara explícitamente que el asistente es de solo lectura", () => {
    const texto = LIMITES_ASISTENTE.map((l) => `${l.titulo} ${l.detalle}`).join(" ");
    expect(texto.toLowerCase()).toContain("solo lectura");
  });

  it("declara explícitamente que no afirma causas", () => {
    const titulos = LIMITES_ASISTENTE.map((l) => l.titulo.toLowerCase()).join(" ");
    expect(titulos).toContain("causa");
  });

  it("declara explícitamente que no hay servidor externo", () => {
    const texto = LIMITES_ASISTENTE.map((l) => l.detalle).join(" ").toLowerCase();
    expect(texto.includes("servidor") || texto.includes("navegador")).toBe(true);
  });
});

describe("catálogo de preferencias de apariencia", () => {
  // Nota: la intención es comparar CONJUNTOS de valores, no órdenes.
  // Un `.sort()` sin comparador ordena lexicográficamente ("compacta" < "comoda"),
  // lo que haría fallar la aserción por el orden del catálogo y no por su contenido.
  // Se compara como conjunto ordenado con criterio explícito.
  const comoConjunto = (valores: string[]) => [...valores].sort((a, b) => a.localeCompare(b));

  it("las opciones de densidad son exactamente comoda y compacta", () => {
    expect(comoConjunto(OPCIONES_DENSIDAD.map((o) => o.value))).toEqual(
      comoConjunto(["comoda", "compacta"]),
    );
  });

  it("las opciones de longitud son exactamente completa y resumida", () => {
    expect(comoConjunto(OPCIONES_RESPUESTA.map((o) => o.value))).toEqual(
      comoConjunto(["completa", "resumida"]),
    );
  });

  it("ninguna lista de opciones repite un valor", () => {
    for (const lista of [OPCIONES_DENSIDAD, OPCIONES_RESPUESTA]) {
      const valores = lista.map((o) => o.value);
      expect(new Set(valores).size).toBe(valores.length);
    }
  });

  it("toda opción de densidad tiene etiqueta y detalle", () => {
    for (const o of OPCIONES_DENSIDAD) {
      expect(o.label).toBeTruthy();
      expect(o.detalle).toBeTruthy();
    }
  });

  it("toda opción de longitud tiene etiqueta y detalle", () => {
    for (const o of OPCIONES_RESPUESTA) {
      expect(o.label).toBeTruthy();
      expect(o.detalle).toBeTruthy();
    }
  });
});

describe("alcance declarado — el asistente no conoce módulos que no existen", () => {
  it("MODULOS_CONOCIDOS contiene solo módulos con provider de tools registrado", () => {
    // El bootstrap registra únicamente PedidosToolProvider (módulo "pedidos").
    expect([...MODULOS_CONOCIDOS]).toEqual(["pedidos"]);
  });
});
