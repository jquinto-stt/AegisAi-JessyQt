import { describe, it, expect } from "vitest";

import {
  DIAS_SEMANA,
  ESTADOS_RECOLECCION,
  ETIQUETA_ESTADO_RECOLECCION,
  HORARIO_RANGO,
  RANGOS_RECOLECCION,
  filtrarRecolecciones,
  frecuenciaLegible,
  ordenarDias,
  siguienteCodigo,
  validarConfiguracionFija,
  validarRecoleccion,
  type DatosConfiguracionFija,
  type DatosRecoleccion,
  type Recoleccion,
} from "./recolecciones.domain";

/** Datos válidos por defecto; cada test rompe solo el campo que le interesa. */
const datos = (cambios: Partial<DatosRecoleccion> = {}): DatosRecoleccion => ({
  tipo: "eventual",
  transportadora: "Envía",
  bodega: "Bodega Principal",
  fecha: "2026-10-28",
  horario: "14:00 - 16:00",
  paquetes: 24,
  despacha: "María Restrepo",
  ...cambios,
});

const recoleccion = (cambios: Partial<Recoleccion> = {}): Recoleccion => ({
  id: "rec-1",
  codigo: "REC-0001",
  tipo: "eventual",
  transportadora: "Envía",
  bodega: "Bodega Principal",
  fecha: "2026-10-28",
  horario: "14:00 - 16:00",
  paquetes: 24,
  despacha: "María Restrepo",
  estado: "programada",
  creadaEn: "2026-10-27T10:00:00.000Z",
  ...cambios,
});

describe("recolecciones.domain — validarRecoleccion", () => {
  it("acepta un formulario completo", () => {
    expect(validarRecoleccion(datos())).toEqual([]);
  });

  it("devuelve TODOS los errores de un formulario vacío, no solo el primero", () => {
    const errores = validarRecoleccion(
      datos({
        transportadora: "",
        bodega: "  ",
        fecha: "",
        horario: "",
        paquetes: "",
        despacha: "",
      }),
    );
    // Seis campos obligatorios vacíos ⇒ seis mensajes. Quien llena el formulario
    // merece verlos juntos en vez de descubrirlos de uno en uno.
    expect(errores).toHaveLength(6);
    expect(errores[0]).toMatch(/transportadora/i);
    expect(errores[5]).toMatch(/despacha/i);
  });

  it("rechaza paquetes que no son un número mayor que cero", () => {
    for (const paquetes of ["", "0", "-3", "abc"]) {
      expect(validarRecoleccion(datos({ paquetes }))).toEqual([
        "El número de paquetes tiene que ser mayor que cero.",
      ]);
    }
  });

  it("acepta el número de paquetes como texto numérico", () => {
    expect(validarRecoleccion(datos({ paquetes: "24" }))).toEqual([]);
  });
});

describe("recolecciones.domain — siguienteCodigo", () => {
  it("arranca en REC-0001 con la lista vacía", () => {
    expect(siguienteCodigo([])).toBe("REC-0001");
  });

  it("usa el MAYOR existente, no la cantidad de elementos", () => {
    // Tres citas con códigos 1, 2 y 5: contar elementos daría REC-0004, que ya
    // está ocupado. Dos citas distintas no pueden compartir número en la
    // planilla que se dicta por teléfono.
    const lista = [
      recoleccion({ codigo: "REC-0001" }),
      recoleccion({ codigo: "REC-0002" }),
      recoleccion({ codigo: "REC-0005" }),
    ];
    expect(siguienteCodigo(lista)).toBe("REC-0006");
  });

  it("no se rompe si el código viene sin dígitos", () => {
    expect(siguienteCodigo([recoleccion({ codigo: "REC-" })])).toBe("REC-0001");
  });
});

describe("recolecciones.domain — filtrarRecolecciones", () => {
  const lista = [
    recoleccion({ id: "a", codigo: "REC-0001", fecha: "2026-10-30", horario: "09:00 - 11:00" }),
    recoleccion({ id: "b", codigo: "REC-0002", fecha: "2026-10-28", horario: "14:00 - 16:00" }),
    recoleccion({ id: "c", codigo: "REC-0003", fecha: "2026-10-28", horario: "08:00 - 10:00" }),
    recoleccion({ id: "d", codigo: "REC-0004", tipo: "fija", estado: "asignada" }),
    recoleccion({
      id: "e",
      codigo: "REC-0005",
      estado: "con_novedad",
      transportadora: "TCC",
    }),
  ];

  it("la pestaña de tipo se aplica siempre", () => {
    const eventuales = filtrarRecolecciones(lista, { tipo: "eventual", estados: [] });
    expect(eventuales.map((r) => r.id)).toEqual(["c", "b", "e", "a"]);

    const fijas = filtrarRecolecciones(lista, { tipo: "fija", estados: [] });
    expect(fijas.map((r) => r.id)).toEqual(["d"]);
  });

  it("sin estados marcados no filtra por estado", () => {
    // «Sin filtros» no es «ninguno»: si se interpretara así, la página abriría
    // vacía todas las veces.
    const sinEstados = filtrarRecolecciones(lista, { tipo: "eventual", estados: [] });
    expect(sinEstados).toHaveLength(4);
  });

  it("los estados se acumulan (unión)", () => {
    const unidos = filtrarRecolecciones(lista, {
      tipo: "eventual",
      estados: ["programada", "con_novedad"],
    });
    expect(unidos.map((r) => r.id)).toEqual(["c", "b", "e", "a"]);

    const soloNovedad = filtrarRecolecciones(lista, { tipo: "eventual", estados: ["con_novedad"] });
    expect(soloNovedad.map((r) => r.id)).toEqual(["e"]);
  });

  it("la transportadora filtra por nombre exacto, y `null` no filtra", () => {
    expect(
      filtrarRecolecciones(lista, { tipo: "eventual", estados: [], transportadora: "TCC" }).map(
        (r) => r.id,
      ),
    ).toEqual(["e"]);

    expect(
      filtrarRecolecciones(lista, { tipo: "eventual", estados: [], transportadora: null }),
    ).toHaveLength(4);

    expect(
      filtrarRecolecciones(lista, { tipo: "eventual", estados: [], transportadora: "Servientrega" }),
    ).toEqual([]);
  });

  it("ordena por fecha ascendente y desempata por horario", () => {
    // `b` y `e` comparten fecha y horario: el orden entre ellas es el de entrada,
    // porque el desempate se agota ahí y no hay criterio que inventar.
    const orden = filtrarRecolecciones(lista, { tipo: "eventual", estados: [] });
    expect(orden.map((r) => r.id)).toEqual(["c", "b", "e", "a"]);
  });

  it("no muta el arreglo original al ordenar", () => {
    const copia = [...lista];
    filtrarRecolecciones(lista, { tipo: "eventual", estados: [] });
    expect(lista).toEqual(copia);
  });
});

describe("recolecciones.domain — catálogo de estados", () => {
  it("los tres estados tienen etiqueta y están en el orden de los filtros", () => {
    expect(ESTADOS_RECOLECCION).toEqual(["programada", "asignada", "con_novedad"]);
    for (const estado of ESTADOS_RECOLECCION) {
      expect(ETIQUETA_ESTADO_RECOLECCION[estado]).toBeTruthy();
    }
    expect(ETIQUETA_ESTADO_RECOLECCION.con_novedad).toBe("Con novedad");
  });
});

describe("recolecciones.domain — recolección fija", () => {
  const config = (cambios: Partial<DatosConfiguracionFija> = {}): DatosConfiguracionFija => ({
    transportadora: "Envía",
    dias: ["martes", "jueves"],
    bodega: "Bodega Principal",
    direccion: "Calle 36 Sur #48B-85, Medellín",
    despachaNombre: "Fulanito",
    despachaApellidos: "De Tal",
    rango: "tarde",
    paquetes: 24,
    notas: "",
    ...cambios,
  });

  it("acepta una configuración completa", () => {
    expect(validarConfiguracionFija(config())).toEqual([]);
  });

  it("un formulario vacío devuelve todos los errores juntos", () => {
    const errores = validarConfiguracionFija(
      config({
        transportadora: "",
        dias: [],
        bodega: "",
        direccion: "",
        despachaNombre: "",
        despachaApellidos: "",
        paquetes: "",
      }),
    );
    expect(errores).toHaveLength(7);
    expect(errores[0]).toMatch(/transportadora/i);
    expect(errores[1]).toMatch(/al menos un día/i);
  });

  it("exige al menos un día de la semana", () => {
    expect(validarConfiguracionFija(config({ dias: [] }))).toEqual([
      "Elige al menos un día de la semana.",
    ]);
  });

  it("ordena los días de lunes a domingo sin repetidos", () => {
    expect(ordenarDias(["viernes", "lunes", "miercoles", "lunes"])).toEqual([
      "lunes",
      "miercoles",
      "viernes",
    ]);
  });

  it("nombra los tres casos frecuentes en vez de enumerarlos", () => {
    expect(frecuenciaLegible([...DIAS_SEMANA])).toBe("Todos los días");
    expect(frecuenciaLegible(["lunes", "martes", "miercoles", "jueves", "viernes"])).toBe(
      "Entre semana",
    );
    expect(frecuenciaLegible(["domingo", "sabado"])).toBe("Fines de semana");
  });

  it("enumera el resto y respeta el orden de la semana", () => {
    expect(frecuenciaLegible(["jueves", "martes"])).toBe("Martes y jueves");
    expect(frecuenciaLegible(["miercoles", "lunes", "viernes"])).toBe("Lunes, miércoles y viernes");
    expect(frecuenciaLegible(["lunes"])).toBe("Lunes");
    expect(frecuenciaLegible([])).toBe("Sin días");
  });

  it("cada rango tiene su ventana horaria", () => {
    expect(HORARIO_RANGO.manana).toBe("8:00 AM - 12:00 PM");
    expect(HORARIO_RANGO.tarde).toBe("12:00 PM - 5:00 PM");
    expect(RANGOS_RECOLECCION).toEqual(["manana", "tarde"]);
  });
});
