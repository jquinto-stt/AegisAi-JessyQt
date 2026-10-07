import { describe, expect, it } from "vitest";

import {
  DIAS_ATENCION,
  ESTADO_CANAL_BADGE,
  ESTADO_CANAL_LABEL,
  FILAS_PLANTILLA,
  GRUPO_SECCION_LABEL,
  META_SECCION,
  OPCIONES_DENSIDAD,
  ORDEN_GRUPOS,
  ORDEN_SECCIONES,
  seccionesPorGrupo,
  type SeccionCanal,
} from "@/pages/conversaciones/configuracion.secciones";
import type { PlantillasWhatsApp } from "@/stores/pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// Configuración del canal — catálogo de presentación
// ═══════════════════════════════════════════════════════════════════════════
//
// Estos tests protegen la coherencia del VOCABULARIO de la página, no su
// maquetación. El defecto que previenen es el silencioso: una plantilla nueva en
// `PedidosConfig` que nadie añade a la página, una sección que queda fuera de la
// navegación, un grupo sin etiqueta. Ninguno rompe el build, y todos dejan una
// parte de la configuración inalcanzable o mal rotulada.

describe("Catálogo de secciones del canal", () => {
  it("cada sección del orden tiene metadatos", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(META_SECCION[s], `falta META_SECCION["${s}"]`).toBeDefined();
    }
  });

  it("ORDEN_SECCIONES cubre exactamente las claves de META_SECCION (sin duplicados ni olvidos)", () => {
    const enOrden = [...ORDEN_SECCIONES].sort();
    const enMeta = (Object.keys(META_SECCION) as SeccionCanal[]).sort();
    expect(enOrden).toEqual(enMeta);
  });

  it("no hay secciones repetidas en la navegación", () => {
    expect(new Set(ORDEN_SECCIONES).size).toBe(ORDEN_SECCIONES.length);
  });

  it("toda sección pertenece a un grupo declarado en el orden de grupos", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(ORDEN_GRUPOS).toContain(META_SECCION[s].grupo);
    }
  });

  it("todos los grupos tienen etiqueta", () => {
    for (const g of ORDEN_GRUPOS) {
      expect(GRUPO_SECCION_LABEL[g], `falta etiqueta del grupo "${g}"`).toBeTruthy();
    }
  });

  it("ninguna sección queda vacía al agrupar, y el total se conserva", () => {
    const grupos = seccionesPorGrupo();
    expect(grupos.map((g) => g.grupo)).toEqual(ORDEN_GRUPOS);
    for (const { grupo, secciones } of grupos) {
      expect(secciones.length, `el grupo "${grupo}" no tiene secciones`).toBeGreaterThan(0);
    }
    const total = grupos.reduce((n, g) => n + g.secciones.length, 0);
    expect(total).toBe(ORDEN_SECCIONES.length);
  });

  it("la página tiene exactamente las 6 secciones que ajustan algo", () => {
    expect(ORDEN_SECCIONES).toEqual([
      "plantillas",
      "horario",
      "atencion",
      "aviso",
      "alertas",
      "apariencia",
    ]);
  });

  it("las tres secciones retiradas por no ajustar nada siguen fuera (07/10)", () => {
    // · «Perfil del canal» — tres datos de solo lectura.
    // · «Automatización y escalado» — dos conteos y una leyenda.
    // · «Módulos conectados» — la MISMA línea de código que «Módulos
    //   integrados» del asistente: `integracionesStore.alternar(id)`.
    //
    // Se afirma la AUSENCIA a propósito: sin esta comprobación, volver a
    // añadirlas pasaría desapercibido mientras el resto de la suite sigue verde.
    const claves: string[] = ORDEN_SECCIONES;
    expect(claves).not.toContain("perfil");
    expect(claves).not.toContain("automatizacion");
    expect(claves).not.toContain("modulos");
  });

  it("la sección nueva de atención existe y está en el grupo de mensajería", () => {
    expect(ORDEN_SECCIONES).toContain("atencion");
    expect(META_SECCION.atencion.grupo).toBe("mensajeria");
  });

  it("la sección de preferencias habla de la bandeja, no del tema", () => {
    // El tema es una preferencia de TODA la aplicación: su dueño único es el
    // control de la cabecera (`ThemeToggleButton`). Si alguien vuelve a ofrecer
    // aquí un control de tema, habrá otra vez dos superficies para un ajuste.
    expect(META_SECCION.apariencia.label).toBe("Bandeja");
    expect(META_SECCION.apariencia.grupo).toBe("preferencias");
  });

  it("toda sección tiene etiqueta y descripción no vacías", () => {
    for (const s of ORDEN_SECCIONES) {
      expect(META_SECCION[s].label.trim(), `"${s}" sin etiqueta`).not.toBe("");
      expect(META_SECCION[s].hint.trim(), `"${s}" sin descripción`).not.toBe("");
    }
  });
});

describe("Plantillas de mensaje — exhaustividad sobre lo que se ENVÍA", () => {
  it("FILAS_PLANTILLA es exactamente el conjunto de plantillas que el puente envía", async () => {
    // La fuente que decide qué se envía es `PLANTILLA_POR_ESTADO`
    // (`pedidos.notificaciones.ts`). Se compara contra ella y NO contra una
    // lista escrita aquí: una lista escrita en el test sería una tercera copia
    // de la misma decisión y podría quedarse corta sin que nadie lo note — que
    // es exactamente el defecto que este test cierra.
    //
    // El `import` es dinámico porque arrastra los stores, que son singletons y
    // leen `localStorage` al construirse. El tercer argumento es el TIMEOUT: ese
    // import tarda ~2,8 s en frío, y con la suite corriendo en paralelo rozaba
    // los 5 s por defecto y el test fallaba de forma intermitente. Un test que
    // falla según la carga de la máquina no es un test.
    const { PLANTILLA_POR_ESTADO } = await import("@/pages/pedidos/pedidos.notificaciones");
    const envia = Object.values(PLANTILLA_POR_ESTADO).sort();
    expect(FILAS_PLANTILLA.map((f) => f.key).sort()).toEqual(envia);
  }, 20000);

  it("la fila «Recibido» ya no se ofrece: su texto no lo envía nadie (07/10)", () => {
    // `recibido` corresponde al estado de ENTRADA (`nuevo`), y el puente no
    // avisa en los estados de entrada. Ofrecer el campo era un control muerto:
    // se editaba, se guardaba y su texto no llegaba nunca a un hilo.
    expect(FILAS_PLANTILLA.map((f) => f.key)).not.toContain("recibido");
  });

  it("no hay plantilla repetida (cada transición se edita en una sola fila)", () => {
    const claves = FILAS_PLANTILLA.map((f) => f.key);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("cada fila tiene etiqueta visible", () => {
    for (const f of FILAS_PLANTILLA) {
      expect(f.label.trim(), `la plantilla "${f.key}" no tiene etiqueta`).not.toBe("");
    }
  });

  it("el orden de las filas sigue el pipeline del dominio", () => {
    // Del primer aviso tras confirmar hasta el desenlace: `confirmado` abre y
    // `cancelado` (terminal alternativo) cierra. Si alguien reordena la tabla,
    // el orden deja de contar la historia del pedido.
    expect(FILAS_PLANTILLA[0].key).toBe("confirmado");
    expect(FILAS_PLANTILLA[FILAS_PLANTILLA.length - 1].key).toBe("cancelado");
  });

  it("toda clave de la tabla existe de verdad en el modelo de plantillas", () => {
    // El tipo `keyof PlantillasWhatsApp` lo garantiza en compilación; esto deja
    // escrito que la tabla no puede inventarse una clave.
    const claves: (keyof PlantillasWhatsApp)[] = FILAS_PLANTILLA.map((f) => f.key);
    expect(claves.length).toBeGreaterThan(0);
  });
});

describe("Días de atención", () => {
  it("cubre los 7 días de Date.getDay() (0..6) sin repetir", () => {
    const dias = DIAS_ATENCION.map((d) => d.d);
    expect([...dias].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("cada día tiene etiqueta corta y larga", () => {
    for (const d of DIAS_ATENCION) {
      expect(d.label.trim(), `día ${d.d} sin etiqueta`).not.toBe("");
      expect(d.largo.trim(), `día ${d.d} sin nombre largo`).not.toBe("");
    }
  });

  it("la semana laboral se presenta de lunes a domingo", () => {
    expect(DIAS_ATENCION[0].d).toBe(1); // lunes primero
    expect(DIAS_ATENCION[DIAS_ATENCION.length - 1].d).toBe(0); // domingo al final
  });
});

describe("Preferencias locales de UI", () => {
  it("la densidad ofrece exactamente compacta y cómoda", () => {
    expect(OPCIONES_DENSIDAD.map((o) => o.value)).toEqual(["compacta", "comoda"]);
  });

  it("ninguna opción de densidad está sin etiqueta", () => {
    for (const o of OPCIONES_DENSIDAD) {
      expect(o.label.trim(), `la opción "${o.value}" no tiene etiqueta`).not.toBe("");
    }
  });

  it("el vocabulario del TEMA ya no vive aquí: es del shell (07/10)", async () => {
    // El tema es una preferencia de toda la aplicación. Su vocabulario vive en
    // `shell/header/theme-toggle-button/opciones-tema.ts`, junto al control que
    // lo aplica. Si alguien vuelve a declararlo en este catálogo, habrá otra vez
    // dos vocabularios para la misma preferencia.
    const catalogo = (await import(
      "@/pages/conversaciones/configuracion.secciones"
    )) as Record<string, unknown>;
    expect(catalogo.OPCIONES_TEMA).toBeUndefined();
    expect(catalogo.PreferenciaTema).toBeUndefined();
  });
});

describe("Estado del canal", () => {
  it("cada estado tiene etiqueta y color de badge", () => {
    for (const e of ["atendiendo", "fuera_horario"] as const) {
      expect(ESTADO_CANAL_LABEL[e].trim()).not.toBe("");
      expect(ESTADO_CANAL_BADGE[e]).toBeTruthy();
    }
  });

  it("los dos estados se distinguen visualmente (no comparten color)", () => {
    expect(ESTADO_CANAL_BADGE.atendiendo).not.toBe(ESTADO_CANAL_BADGE.fuera_horario);
  });

  it("«fuera de horario» NO se pinta como alarma (07/10)", () => {
    // Estar cerrado a las tres de la mañana es el funcionamiento normal del
    // negocio. El rótulo anterior —«Atención en pausa»— además describía lo
    // contrario de lo que pasaba: se derivaba de `horario.activo === false`, y
    // con el horario DESACTIVADO el canal atiende a cualquier hora.
    expect(ESTADO_CANAL_LABEL.fuera_horario).toBe("Fuera de horario");
    expect(ESTADO_CANAL_LABEL.atendiendo).toBe("Atendiendo ahora");
    expect(ESTADO_CANAL_BADGE.fuera_horario).not.toBe("warning");
  });
});

describe("El estado de integración de módulos ya no vive en este catálogo", () => {
  it("lo declara el asistente, que es el dueño de los módulos (07/10)", async () => {
    // «conectado / desconectado / no disponible» se declaraba DOS veces: aquí y
    // en `pages/asistente/configuracion.secciones.ts`. Con la sección «Módulos
    // conectados» retirada, la copia de este catálogo sobraba. Se comprueba que
    // no vuelve, y que la del asistente sigue en pie.
    const catalogo = (await import(
      "@/pages/conversaciones/configuracion.secciones"
    )) as Record<string, unknown>;
    expect(catalogo.ESTADO_INTEGRACION_LABEL).toBeUndefined();
    expect(catalogo.ESTADO_INTEGRACION_BADGE).toBeUndefined();

    const asistente = await import("@/pages/asistente/configuracion.secciones");
    expect(asistente.ESTADO_INTEGRACION_LABEL).toBeDefined();
    expect(asistente.ESTADO_INTEGRACION_BADGE).toBeDefined();
  });
});

