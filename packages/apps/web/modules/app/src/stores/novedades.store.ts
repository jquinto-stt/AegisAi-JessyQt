/**
 * NovedadesStore — la cola de entregas fallidas que devuelve la transportadora.
 *
 * Orquesta, no decide: qué soluciones existen, qué exige cada una y cuándo una
 * novedad se puede gestionar vive en `novedades.domain.ts`. Aquí solo se valida
 * con esas reglas y se escribe el resultado.
 *
 * **Los datos viven en memoria, con semilla.** A diferencia de las
 * recolecciones —donde sembrar citas inventadas sería afirmar compromisos con
 * una transportadora— aquí la semilla es el caso normal: una novedad la crea la
 * transportadora, no el negocio, y sin ninguna la pantalla no se puede probar.
 * La semilla se ancla a pedidos que existen en `pedidosStore` (P-003…P-010), así
 * que el botón «Gestionar» siempre encuentra su orden.
 */
import { makeAutoObservable } from "mobx";

import {
  CAUSALES_NOVEDAD,
  validarSolucion,
  type DatosSolucion,
  type EstadoNovedad,
  type Novedad,
  type SolucionNovedad,
} from "@/domain/pedidos/novedades.domain";

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; error: string };

/** Horas hacia atrás desde ahora, para que la columna «Días en novedad» sea creíble. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3600_000).toISOString();

/**
 * Semilla.
 *
 * Ocho novedades, una por cada caso que la pantalla tiene que saber pintar:
 * pendiente sin gestionar, ya abierta, en espera de la transportadora, rechazada
 * y una resuelta (para que la columna «Solución» no salga siempre vacía).
 */
function semilla(): Novedad[] {
  return [
    {
      id: "15050058",
      guia: "50000112926",
      transportadora: "Envía",
      ordenNumero: "P-010",
      cliente: "Alejandro Vélez",
      telefono: "+57 302 333 4455",
      direccion: "Calle 45 #12-30, Apto 502",
      ciudad: "Bogotá",
      causal: CAUSALES_NOVEDAD[0],
      estado: "pendiente",
      creadaEn: hace(0.5),
    },
    {
      id: "14990137",
      guia: "50000113753",
      transportadora: "Coordinadora",
      ordenNumero: "P-009",
      cliente: "David Restrepo",
      telefono: "+57 302 111 2233",
      direccion: "Carrera 68 #24-15",
      ciudad: "Medellín",
      causal: CAUSALES_NOVEDAD[1],
      estado: "por_gestionar",
      creadaEn: hace(1.5),
    },
    {
      id: "15050061",
      guia: "50000112918",
      transportadora: "Servientrega",
      ordenNumero: "P-008",
      cliente: "Carolina Herrera",
      telefono: "+57 301 999 8877",
      direccion: "Calle 100 #15-20, Torre B",
      ciudad: "Bogotá",
      causal: CAUSALES_NOVEDAD[2],
      estado: "pendiente",
      creadaEn: hace(2.4),
    },
    {
      id: "14988240",
      guia: "50000112113",
      transportadora: "TCC",
      ordenNumero: "P-007",
      cliente: "Valentina Ríos",
      telefono: "+57 301 888 9900",
      direccion: "Avenida 6N #23-45",
      ciudad: "Cali",
      causal: CAUSALES_NOVEDAD[0],
      estado: "en_espera",
      creadaEn: hace(9),
    },
    {
      id: "15034412",
      guia: "50000112924",
      transportadora: "Envía",
      ordenNumero: "P-006",
      cliente: "Sofía Díaz",
      telefono: "+57 301 777 3344",
      direccion: "Calle 19 #4-60",
      ciudad: "Bogotá",
      causal: CAUSALES_NOVEDAD[3],
      estado: "rechazada",
      creadaEn: hace(28),
    },
    {
      id: "14977503",
      guia: "50000112877",
      transportadora: "InterRapidísimo",
      ordenNumero: "P-005",
      cliente: "Andrés Gil",
      telefono: "+57 300 555 6677",
      direccion: "Transversal 29 #48-12",
      ciudad: "Bucaramanga",
      causal: CAUSALES_NOVEDAD[4],
      estado: "pendiente",
      creadaEn: hace(31),
    },
    {
      id: "14950881",
      guia: "50000112640",
      transportadora: "Coordinadora",
      ordenNumero: "P-004",
      cliente: "Lucía Torres",
      telefono: "+57 300 444 5566",
      direccion: "Carrera 43A #18-95",
      ciudad: "Medellín",
      causal: CAUSALES_NOVEDAD[1],
      estado: "solucionada",
      creadaEn: hace(52),
      solucion: "nueva_direccion",
      observaciones:
        "El cliente se mudó al barrio Laureles. Entregar en Carrera 76 #33-10, portería, preguntar por Lucía.",
      direccionNueva: "Carrera 76 #33-10, barrio Laureles",
      resueltaEn: hace(50),
    },
    {
      id: "14899012",
      guia: "50000112455",
      transportadora: "Servientrega",
      ordenNumero: "P-003",
      cliente: "Pedro Ramírez",
      telefono: "+57 300 333 4455",
      direccion: "Calle 72 #10-34",
      ciudad: "Bogotá",
      causal: CAUSALES_NOVEDAD[5],
      estado: "solucionada",
      creadaEn: hace(75),
      solucion: "manana",
      observaciones:
        "El cliente está en la oficina hasta las 6 p.m. Reintentar mañana en la mañana, llamar antes de subir.",
      resueltaEn: hace(73),
    },
  ];
}

export class NovedadesStore {
  novedades: Novedad[] = semilla();

  constructor() {
    makeAutoObservable(this);
  }

  /** Cuántas están esperando una decisión del negocio. */
  get pendientes(): number {
    return this.novedades.filter(
      (n) => n.estado === "pendiente" || n.estado === "por_gestionar" || n.estado === "rechazada",
    ).length;
  }

  porId(id: string): Novedad | undefined {
    return this.novedades.find((n) => n.id === id);
  }

  /** Novedades de un pedido, por número. Alimenta el detalle del pedido. */
  porOrden(ordenNumero: string): Novedad[] {
    const buscado = ordenNumero.trim().toLowerCase();
    return this.novedades.filter((n) => n.ordenNumero.trim().toLowerCase() === buscado);
  }

  /**
   * Marca la novedad como abierta por el operador.
   *
   * `pendiente → por_gestionar` no es decorativo: distingue «nadie la ha mirado»
   * de «alguien la está resolviendo», y es lo que permite que dos operadores no
   * trabajen la misma novedad sin saberlo.
   */
  abrir(id: string): void {
    const n = this.porId(id);
    if (n?.estado === "pendiente") n.estado = "por_gestionar";
  }

  /**
   * Aplica la solución.
   *
   * La novedad pasa a `solucionada` y guarda la solución, la observación y el
   * dato extra que esa solución exige. No toca `pedidosStore`: en el mock la
   * transportadora es quien reprograma la guía, y fingir que el pedido cambia
   * de estado aquí sería escribir un hecho que no ocurrió.
   */
  gestionar(id: string, datos: DatosSolucion): Resultado<Novedad> {
    const novedad = this.porId(id);
    if (!novedad) return { ok: false, error: "La novedad ya no existe." };
    if (novedad.estado === "solucionada") {
      return { ok: false, error: "Esta novedad ya está solucionada." };
    }
    if (novedad.estado === "en_espera") {
      return { ok: false, error: "Está en manos de la transportadora. Espera su respuesta." };
    }

    const errores = validarSolucion(datos);
    if (errores.length > 0) return { ok: false, error: errores.join(" ") };

    const solucion = datos.solucion as SolucionNovedad;
    novedad.solucion = solucion;
    novedad.observaciones = datos.observaciones.trim();
    novedad.recibeNombre = datos.recibeNombre?.trim();
    novedad.recibeTelefono = datos.recibeTelefono?.trim() || undefined;
    novedad.estado = "solucionada";
    novedad.resueltaEn = new Date().toISOString();

    // Se guarda solo el campo que la solución pide: dejar los otros tres
    // escritos de una gestión anterior haría que la fila contara dos historias.
    novedad.fechaReintento = solucion === "fecha" ? datos.fechaReintento?.trim() : undefined;
    novedad.direccionNueva =
      solucion === "nueva_direccion" ? datos.direccionNueva?.trim() : undefined;
    novedad.ciudadNueva = solucion === "cambiar_ciudad" ? datos.ciudadNueva?.trim() : undefined;

    return { ok: true, valor: novedad };
  }

  /** Repone la semilla. Lo usa la verificación visual, no la interfaz. */
  reiniciar(): void {
    this.novedades = semilla();
  }
}

export const novedadesStore = new NovedadesStore();

/** Los estados que se pueden filtrar, reexportados para no importar el dominio en la página. */
export type { EstadoNovedad };
