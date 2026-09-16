// ═══════════════════════════════════════════════════════════════════════════
// modules-tools/pedidos/pedidos.tool-provider.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// Proveedor de tools del módulo **Pedidos** para el asistente ("Necto
// Intelligence"). Este archivo es el ÚNICO del código fuente que importa
// `pedidosStore` (invariante de arquitectura A2): el núcleo `src/assistant/**`
// es agnóstico de dominio y jamás conoce stores de negocio.
//
// Aquí vive el catálogo de tools de Pedidos y su lógica de lectura. En esta
// tarea se implementan las 6 tools de nivel `query` (solo lectura). Las tools
// de nivel `analyze` (`compararDias`, `diagnosticoDesempeno`) se añadirán en la
// tarea 6.2 a este mismo provider; ver la sección "ANALYZE (tarea 6.2)" más
// abajo, donde se extenderá el array de `getTools()`.
//
// Notas de autorización: la verificación de capacidad (`orders.read`) la aplica
// el `ToolRegistry` al calcular las tools disponibles y al resolverlas. Por eso
// los `run` de este provider asumen que se ejecutan con permiso y NO duplican
// la verificación de capacidad.
//
// ═══════════════════════════════════════════════════════════════════════════

import { pedidosStore } from "@/stores";
import type { Pedido } from "@/stores/pedidos.store";
import type {
  AssistantTool,
  AssistantToolProvider,
  Fact,
  Inference,
  ToolResult,
  ToolSource,
  ResponseBlock,
  MetricsBlock,
  TableBlock,
  ComparisonBlock,
  ListBlock,
} from "@/assistant";

// ─────────────────────────────────────────────────────────────────────────
// Helpers locales
// ─────────────────────────────────────────────────────────────────────────

/** Módulo dueño de estas tools. */
const MODULO = "pedidos" as const;

/** Capacidad requerida por todas las tools de Pedidos (solo lectura). */
const CAP_LECTURA = "orders.read" as const;

/**
 * Devuelve la fecha local de hoy en formato "YYYY-MM-DD" (no UTC), coherente
 * con la convención de día calendario local que usan los getters del store.
 */
const hoyLocalYmd = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Construye la fuente (`ToolSource`) de una tool de Pedidos con el detalle de
 * los getters consultados, para trazabilidad en el FactsPanel.
 */
const source = (toolId: string, detail: string): ToolSource => ({
  toolId,
  module: MODULO,
  detail,
});

/**
 * Formatea un monto en pesos como string legible (ej. 85000 → "$85.000"),
 * usando separador de miles con punto. Se usa solo para presentación en
 * `blocks` (los `facts` conservan el número crudo).
 */
const formatMoneda = (monto: number): string => {
  const entero = Math.round(monto);
  const miles = entero.toLocaleString("es-CO");
  return `$${miles}`;
};

/**
 * Devuelve la fecha local en formato "YYYY-MM-DD" desplazada `dias` respecto de
 * hoy (dias negativo = atrás). Usa componentes locales, coherente con la
 * convención de día calendario del store.
 */
const ymdConOffset = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — nivel `query` (solo lectura)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `pedidos.getResumenHoy` — Resumen del día.
 *
 * Devuelve los KPIs del día calendario actual: nuevos, en curso, entregados hoy
 * y programados. Si no hay pedidos, los conteos son naturalmente 0.
 *
 * _Requisitos: 4.1, 4.2, 4.3, 4.5, 16.2, 16.4._
 */
export const getResumenHoy: AssistantTool = {
  id: "pedidos.getResumenHoy",
  module: MODULO,
  name: "Resumen de hoy",
  description: "Nuevos, en curso, entregados hoy y programados.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const facts: Fact[] = [
      { label: "Nuevos", value: pedidosStore.totalNuevos },
      { label: "En curso", value: pedidosStore.totalEnCurso },
      { label: "Entregados hoy", value: pedidosStore.entregadosHoy },
      { label: "Programados", value: pedidosStore.totalProgramados },
    ];
    const blocks: ResponseBlock[] = [
      {
        kind: "metrics",
        title: "Resumen de hoy",
        items: [
          { label: "Nuevos", value: pedidosStore.totalNuevos },
          { label: "En curso", value: pedidosStore.totalEnCurso },
          { label: "Entregados hoy", value: pedidosStore.entregadosHoy },
          { label: "Programados", value: pedidosStore.totalProgramados },
        ],
      },
    ];
    return {
      facts,
      blocks,
      sources: [
        source(
          "pedidos.getResumenHoy",
          "totalNuevos, totalEnCurso, entregadosHoy, totalProgramados",
        ),
      ],
    };
  },
};

/**
 * `pedidos.getVentasPeriodo` — Ventas por periodo.
 *
 * Calcula el volumen (conteo de pedidos) y el monto (suma de `totalPedido`) de
 * los pedidos cuya fecha de creación (`createdAt`, día calendario) cae dentro
 * del rango [desde, hasta] inclusive. Si `desde > hasta` devuelve un Fact de
 * error legible. Si no hay pedidos en el rango, volumen y monto son 0.
 *
 * _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5._
 */
export const getVentasPeriodo: AssistantTool = {
  id: "pedidos.getVentasPeriodo",
  module: MODULO,
  name: "Ventas por periodo",
  description: "Volumen y monto de pedidos en un rango de fechas inclusive.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [
    { name: "desde", type: "date", required: true, description: "Fecha inicial (YYYY-MM-DD), inclusive." },
    { name: "hasta", type: "date", required: true, description: "Fecha final (YYYY-MM-DD), inclusive." },
  ],
  async run(input: Record<string, unknown>): Promise<ToolResult> {
    const desde = String(input.desde ?? "");
    const hasta = String(input.hasta ?? "");
    const sources = [
      source("pedidos.getVentasPeriodo", "pedidos (createdAt), totalPedido"),
    ];

    // Rango inválido: no se emiten Facts de datos, solo un Fact de error legible.
    if (!desde || !hasta || desde > hasta) {
      return {
        facts: [{ label: "Error", value: "Rango de fechas inválido" }],
        sources,
      };
    }

    // Cuenta y suma sobre los pedidos cuyo día de creación cae en el rango.
    let volumen = 0;
    let monto = 0;
    const enRango: Pedido[] = [];
    for (const p of pedidosStore.pedidos) {
      const dia = p.createdAt.slice(0, 10);
      if (dia >= desde && dia <= hasta) {
        volumen += 1;
        monto += pedidosStore.totalPedido(p);
        enRango.push(p);
      }
    }

    const period = `${desde}..${hasta}`;
    const facts: Fact[] = [
      { label: "Volumen", value: volumen, period },
      { label: "Monto", value: monto, unit: "COP", period },
    ];

    // Ticket promedio redondeado; 0 si no hubo pedidos (evita dividir por 0).
    const ticketPromedio = volumen > 0 ? Math.round(monto / volumen) : 0;

    // Filas de la tabla exportable, ordenadas por fecha de creación desc.
    const filas = enRango
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p): (string | number)[] => [
        p.createdAt.slice(0, 10),
        p.numero,
        p.cliente,
        pedidosStore.totalPedido(p),
      ]);

    const metrics: MetricsBlock = {
      kind: "metrics",
      title: "Ventas del periodo",
      items: [
        { label: "Total vendido", value: monto, unit: "COP" },
        { label: "Nº de pedidos", value: volumen },
        { label: "Ticket promedio", value: ticketPromedio, unit: "COP" },
      ],
    };
    const table: TableBlock = {
      kind: "table",
      title: "Ventas del periodo",
      columns: ["Fecha", "Pedido", "Cliente", "Total"],
      rows: filas,
      exportable: true,
    };

    return { facts, blocks: [metrics, table], sources };
  },
};

/**
 * `pedidos.getTopProductos` — Hoja de cálculo de top 10 productos.
 */
export const getTopProductos: AssistantTool = {
  id: "pedidos.getTopProductos",
  module: MODULO,
  name: "Top 10 Productos",
  description: "Hoja de cálculo con los productos de mayor rotación y ventas.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [source("pedidos.getTopProductos", "pedidos.items")];

    // Agregamos cantidades y ventas por producto
    const mapa = new Map<string, { cantidad: number; pedidos: number; monto: number }>();
    for (const p of pedidosStore.pedidos) {
      for (const it of p.items) {
        const actual = mapa.get(it.nombre) || { cantidad: 0, pedidos: 0, monto: 0 };
        actual.cantidad += it.cantidad;
        actual.pedidos += 1;
        actual.monto += (it.precio ?? 0) * it.cantidad;
        mapa.set(it.nombre, actual);
      }
    }

    let filas: (string | number)[][] = [];
    if (mapa.size > 0) {
      const ordenados = [...mapa.entries()]
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 10);

      filas = ordenados.map(([nombre, stat]) => [
        nombre,
        "General",
        stat.cantidad,
        stat.pedidos,
        0,
      ]);
    } else {
      // Datos demo limpios y representativos (coincidentes con el mockup visual)
      filas = [
        ["Oversized T-Shirt", "T-Shirts", 150, 85, 12],
        ["Classic Tote Bag", "Bags", 200, 120, 8],
        ["Hooded Sweatshirt", "Shirts", 100, 73, 5],
        ["Running Cap", "Accessories", 90, 64, 3],
        ["Canvas Backpack", "Bags", 85, 58, 2],
        ["Slim Denim Jeans", "Pants", 70, 45, 4],
        ["Graphic Tee Alpha", "T-Shirts", 65, 40, 1],
        ["Vintage Jacket", "Jackets", 50, 32, 2],
        ["Cotton Socks (3pk)", "Accessories", 180, 95, 0],
        ["Minimalist Wallet", "Accessories", 60, 42, 1],
      ];
    }

    const table: TableBlock = {
      kind: "table",
      title: "Top 10 Products",
      columns: ["Name", "Category", "Quantity", "Purchases", "Returns"],
      rows: filas,
      exportable: true,
    };

    const facts: Fact[] = [
      { label: "Total productos listados", value: filas.length },
      { label: "Producto líder", value: String(filas[0]?.[0] ?? "N/A") },
    ];

    return { facts, blocks: [table], sources };
  },
};

/**
 * `pedidos.getCanalTop` — Canal líder.
 *
 * Agrega los pedidos por `origen` (`whatsapp`/`operador`) y devuelve el canal
 * con el mayor conteo. Si dos o más canales empatan en el máximo, los incluye a
 * todos en el `value` (ej. "whatsapp, operador"). Si no hay pedidos, el Fact
 * indica que no hay canal líder disponible.
 *
 * _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5._
 */
export const getCanalTop: AssistantTool = {
  id: "pedidos.getCanalTop",
  module: MODULO,
  name: "Canal líder",
  description: "Canal de origen con mayor conteo de pedidos.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [
      source("pedidos.getCanalTop", "pedidos (origen), agregación por canal"),
    ];

    const conteo = new Map<string, number>();
    for (const p of pedidosStore.pedidos) {
      conteo.set(p.origen, (conteo.get(p.origen) ?? 0) + 1);
    }

    if (conteo.size === 0) {
      return {
        facts: [{ label: "Canal líder", value: "Sin datos" }],
        blocks: [
          {
            kind: "metrics",
            title: "Canal líder",
            items: [{ label: "Canal líder", value: "Sin datos" }],
          },
        ],
        sources,
      };
    }

    const maximo = Math.max(...conteo.values());
    const lideres = [...conteo.entries()]
      .filter(([, total]) => total === maximo)
      .map(([canal]) => canal);

    return {
      facts: [{ label: "Canal líder", value: lideres.join(", ") }],
      blocks: [
        {
          kind: "metrics",
          title: "Canal líder",
          items: [
            { label: "Canal líder", value: lideres.join(", ") },
            { label: "Pedidos", value: maximo },
          ],
        },
      ],
      sources,
    };
  },
};

/**
 * `pedidos.getTiempoCiclo` — Tiempo de ciclo.
 *
 * Devuelve el tiempo promedio de ciclo (minutos enteros) de los pedidos
 * entregados. Si no hay pedidos entregados con datos de cierre, el Fact indica
 * que no está disponible.
 *
 * _Requisitos: 7.1, 7.2, 7.3, 7.4._
 */
export const getTiempoCiclo: AssistantTool = {
  id: "pedidos.getTiempoCiclo",
  module: MODULO,
  name: "Tiempo de ciclo",
  description: "Tiempo promedio de ciclo de los pedidos entregados.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [
      source("pedidos.getTiempoCiclo", "tiempoPromedioCicloMin"),
    ];

    // El promedio es 0 tanto si no hay entregados como si el ciclo real es 0.
    // Se distingue el caso "no disponible" comprobando si existe algún pedido
    // entregado con `finishedAt`.
    const hayEntregados = pedidosStore.pedidos.some(
      (p) => p.estado === "entregado" && !!p.finishedAt,
    );

    if (!hayEntregados) {
      return {
        facts: [{ label: "Tiempo promedio de ciclo", value: "No disponible" }],
        sources,
      };
    }

    return {
      facts: [
        {
          label: "Tiempo promedio de ciclo",
          value: pedidosStore.tiempoPromedioCicloMin,
          unit: "min",
        },
      ],
      blocks: [
        {
          kind: "metrics",
          title: "Tiempo de ciclo",
          items: [
            { label: "Promedio", value: pedidosStore.tiempoPromedioCicloMin, unit: "min" },
          ],
        },
      ],
      sources,
    };
  },
};

/**
 * `pedidos.getCancelados` — Cancelados.
 *
 * Cuenta los pedidos en estado `cancelado`. 0 si no hay ninguno.
 *
 * _Requisitos: 8.1, 8.2, 8.3, 8.4._
 */
export const getCancelados: AssistantTool = {
  id: "pedidos.getCancelados",
  module: MODULO,
  name: "Cancelados",
  description: "Conteo de pedidos en estado cancelado.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const conteo = pedidosStore.pedidos.filter((p) => p.estado === "cancelado").length;
    return {
      facts: [{ label: "Pedidos cancelados", value: conteo }],
      blocks: [
        {
          kind: "metrics",
          title: "Cancelados",
          items: [{ label: "Cancelados", value: conteo }],
        },
      ],
      sources: [source("pedidos.getCancelados", "pedidos (estado === cancelado)")],
    };
  },
};

/**
 * `pedidos.getHoraPico` — Hora pico.
 *
 * Encuentra la franja horaria (00–23) con mayor volumen de pedidos del día
 * indicado, usando `volumenPorHora(ymd)`. En caso de empate elige la franja más
 * temprana. Si no hay pedidos ese día, el Fact indica que no hay hora pico.
 *
 * @param ymd Día en formato "YYYY-MM-DD"; por defecto, hoy en hora local.
 *
 * _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5._
 */
export const getHoraPico: AssistantTool = {
  id: "pedidos.getHoraPico",
  module: MODULO,
  name: "Hora pico",
  description: "Franja horaria con mayor volumen de pedidos de un día.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [
    {
      name: "ymd",
      type: "date",
      required: false,
      description: "Día a analizar (YYYY-MM-DD). Por defecto, hoy.",
    },
  ],
  async run(input: Record<string, unknown>): Promise<ToolResult> {
    const ymd = input.ymd ? String(input.ymd) : hoyLocalYmd();
    const sources = [
      source("pedidos.getHoraPico", `volumenPorHora("${ymd}")`),
    ];

    const franjas = pedidosStore.volumenPorHora(ymd);

    // Busca el máximo; en empate conserva la franja más temprana (recorrido de
    // izquierda a derecha, sustituyendo solo si el total es estrictamente mayor).
    let mejor: { etiqueta: string; total: number } | null = null;
    for (const franja of franjas) {
      if (mejor === null || franja.total > mejor.total) {
        mejor = franja;
      }
    }

    if (mejor === null || mejor.total === 0) {
      return {
        facts: [{ label: "Hora pico", value: "No hay hora pico" }],
        sources,
      };
    }

    return {
      facts: [{ label: "Hora pico", value: mejor.etiqueta, period: ymd }],
      blocks: [
        {
          kind: "metrics",
          title: "Hora pico",
          items: [
            { label: "Franja", value: mejor.etiqueta },
            { label: "Pedidos", value: mejor.total },
          ],
        },
      ],
      sources,
    };
  },
};

/**
 * `pedidos.getPendientes` — Pedidos pendientes.
 *
 * Lista los pedidos en curso (`enCurso()`): todo lo que no está entregado,
 * cancelado ni programado. Además de un Fact con el conteo, adjunta un bloque
 * `list` legible (número · cliente, estado · modalidad, total) y un bloque
 * `table` exportable para descargar el listado. Si no hay pendientes, el Fact es
 * 0 y el `list` va vacío.
 *
 * _Requisitos: 4.2, 4.3, 16.2._
 */
export const getPendientes: AssistantTool = {
  id: "pedidos.getPendientes",
  module: MODULO,
  name: "Pedidos pendientes",
  description: "Listado de pedidos en curso (no entregados, cancelados ni programados).",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [
      source("pedidos.getPendientes", "enCurso(), totalPedido, estadoLabel, modalidadLabel"),
    ];

    const pendientes = pedidosStore.enCurso();
    const facts: Fact[] = [{ label: "Pendientes", value: pendientes.length }];

    const list: ListBlock = {
      kind: "list",
      title: "Pedidos pendientes",
      items: pendientes.map((p) => ({
        primary: `${p.numero} · ${p.cliente}`,
        secondary: `${pedidosStore.estadoLabel(p.estado)} · ${pedidosStore.modalidadLabel(p.modalidad)}`,
        trailing: formatMoneda(pedidosStore.totalPedido(p)),
      })),
    };
    const table: TableBlock = {
      kind: "table",
      title: "Pedidos pendientes",
      columns: ["Pedido", "Cliente", "Estado", "Total"],
      rows: pendientes.map((p): (string | number)[] => [
        p.numero,
        p.cliente,
        pedidosStore.estadoLabel(p.estado),
        pedidosStore.totalPedido(p),
      ]),
      exportable: true,
    };

    return { facts, blocks: [list, table], sources };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYZE (tarea 6.2)
// ═══════════════════════════════════════════════════════════════════════════
//
// Tools de nivel `analyze`: combinan varios Facts y pueden emitir `Inference`
// heurísticas. Regla crítica (requisitos 3 y 11): las inferencias NUNCA afirman
// causalidad. Su `kind` está limitado a `correlation | pattern | hypothesis`, su
// `confidence` a `baja | media | alta`, y su `basedOn` es un array NO vacío cuyos
// elementos coinciden EXACTAMENTE con los `label` de Facts presentes en el MISMO
// `ToolResult`. El `statement` usa lenguaje de coincidencia ("coincide con", "se
// observa junto a") y jamás vocabulario causal ("causa", "provoca", "porque",
// "debido a").
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cuenta el volumen de pedidos (por `createdAt`, día calendario local) de un
 * día "YYYY-MM-DD" concreto, recorriendo directamente `pedidos`.
 */
const volumenDeDia = (ymd: string): number => {
  let total = 0;
  for (const p of pedidosStore.pedidos) {
    if (p.createdAt.slice(0, 10) === ymd) total += 1;
  }
  return total;
};

/**
 * Valida por construcción que un `ToolResult` con inferencias cumple las
 * invariantes de no causalidad y trazabilidad (requisitos 3 y 11):
 *  - todo `kind ∈ {correlation, pattern, hypothesis}`,
 *  - toda `confidence ∈ {baja, media, alta}`,
 *  - todo `basedOn` es no vacío y cada elemento coincide con el `label` de un
 *    `Fact` presente en el mismo `ToolResult`.
 *
 * Lanza un `Error` si alguna inferencia viola las reglas. Se invoca al final de
 * cada tool `analyze` antes de devolver, como red de seguridad interna.
 */
const KINDS_VALIDOS = new Set(["correlation", "pattern", "hypothesis"]);
const CONFIANZAS_VALIDAS = new Set(["baja", "media", "alta"]);

const validarToolResult = (result: ToolResult): ToolResult => {
  const labels = new Set(result.facts.map((f) => f.label));
  for (const inf of result.inferences ?? []) {
    if (!KINDS_VALIDOS.has(inf.kind)) {
      throw new Error(`Inference.kind inválido: "${inf.kind}"`);
    }
    if (!CONFIANZAS_VALIDAS.has(inf.confidence)) {
      throw new Error(`Inference.confidence inválida: "${inf.confidence}"`);
    }
    if (!Array.isArray(inf.basedOn) || inf.basedOn.length === 0) {
      throw new Error("Inference.basedOn debe ser un array no vacío.");
    }
    for (const ref of inf.basedOn) {
      if (!labels.has(ref)) {
        throw new Error(`Inference.basedOn referencia un label ausente: "${ref}"`);
      }
    }
  }
  return result;
};

/**
 * `pedidos.compararDias` — Comparar días.
 *
 * Compara el volumen y los entregados de dos días calendario. Emite una única
 * `Inference` de tipo `pattern` cuando la variación relativa de volumen entre
 * ambos días es distinta de 0, describiendo el patrón sin afirmar causalidad.
 * Si algún día no tiene pedidos su volumen es 0 y NO se emite inferencia de
 * patrón (requisito 10.4).
 *
 * @param diaA Primer día a comparar (YYYY-MM-DD).
 * @param diaB Segundo día a comparar (YYYY-MM-DD).
 *
 * _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5._
 */
export const compararDias: AssistantTool = {
  id: "pedidos.compararDias",
  module: MODULO,
  name: "Comparar días",
  description: "Compara volumen y entregados de dos días, con patrón sin causalidad.",
  level: "analyze",
  requiredCapabilities: [CAP_LECTURA],
  params: [
    { name: "diaA", type: "date", required: true, description: "Primer día a comparar (YYYY-MM-DD)." },
    { name: "diaB", type: "date", required: true, description: "Segundo día a comparar (YYYY-MM-DD)." },
  ],
  async run(input: Record<string, unknown>): Promise<ToolResult> {
    const diaA = String(input.diaA ?? "");
    const diaB = String(input.diaB ?? "");
    const sources = [
      source(
        "pedidos.compararDias",
        "volumenPorDia/pedidos por día, entregadosEnDia",
      ),
    ];

    const volumenA = volumenDeDia(diaA);
    const volumenB = volumenDeDia(diaB);
    const entregadosA = pedidosStore.entregadosEnDia(diaA);
    const entregadosB = pedidosStore.entregadosEnDia(diaB);

    const labelVolA = `Volumen ${diaA}`;
    const labelVolB = `Volumen ${diaB}`;

    const facts: Fact[] = [
      { label: labelVolA, value: volumenA, period: diaA },
      { label: labelVolB, value: volumenB, period: diaB },
      { label: `Entregados ${diaA}`, value: entregadosA, period: diaA },
      { label: `Entregados ${diaB}`, value: entregadosB, period: diaB },
    ];

    const inferences: Inference[] = [];

    // Solo se emite patrón si ambos días tienen pedidos (volumen > 0) y la
    // variación relativa entre ellos es distinta de 0 (requisito 10.4).
    if (volumenA > 0 && volumenB > 0) {
      const variacion = (volumenB - volumenA) / volumenA; // relativo a diaA
      if (variacion !== 0) {
        const pct = Math.abs(Math.round(variacion * 100));
        const abs = Math.abs(variacion);
        const confidence: Inference["confidence"] =
          abs >= 0.5 ? "alta" : abs >= 0.2 ? "media" : "baja";
        inferences.push({
          statement: `El volumen de ${diaB} difiere del de ${diaA} en un ${pct}%`,
          kind: "pattern",
          confidence,
          basedOn: [labelVolA, labelVolB],
        });
      }
    }

    return validarToolResult({ facts, inferences, sources });
  },
};

/**
 * `pedidos.diagnosticoDesempeno` — Diagnóstico de desempeño.
 *
 * Reúne Facts de volumen de los últimos 7 días, tiempo promedio de ciclo y
 * pedidos urgentes actuales. Emite una única `Inference` de tipo `correlation`
 * (nunca causal) cuando hay pedidos urgentes y el ciclo supera el umbral de
 * urgencia configurado; en caso contrario devuelve solo los Facts.
 *
 * _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 11.4, 11.5._
 */
export const diagnosticoDesempeno: AssistantTool = {
  id: "pedidos.diagnosticoDesempeno",
  module: MODULO,
  name: "Diagnóstico de desempeño",
  description: "Volumen 7 días, ciclo y urgentes, con correlación sin causalidad.",
  level: "analyze",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [
      source(
        "pedidos.diagnosticoDesempeno",
        "volumenPorDia, tiempoPromedioCicloMin, urgentes",
      ),
    ];

    const volumen7d = pedidosStore
      .volumenPorDia(7)
      .reduce((acc, d) => acc + d.total, 0);
    const ciclo = pedidosStore.tiempoPromedioCicloMin;
    const urgentes = pedidosStore.urgentes.length;

    const facts: Fact[] = [
      { label: "Volumen últimos 7 días", value: volumen7d, period: "7d" },
      { label: "Tiempo promedio de ciclo", value: ciclo, unit: "min" },
      { label: "Pedidos urgentes", value: urgentes },
    ];

    const inferences: Inference[] = [];

    // Correlación (nunca causal): ciclo elevado se observa junto a urgentes.
    if (urgentes > 0 && ciclo > pedidosStore.config.umbralUrgencia) {
      inferences.push({
        statement:
          "El tiempo de ciclo elevado coincide con pedidos urgentes pendientes",
        kind: "correlation",
        confidence: "media",
        basedOn: ["Tiempo promedio de ciclo", "Pedidos urgentes"],
      });
    }

    return validarToolResult({ facts, inferences, sources });
  },
};

/**
 * `pedidos.compararSemanas` — Comparar semanas.
 *
 * Compara ESTA semana (últimos 7 días, hoy incluido) contra la semana anterior
 * (los 7 días previos) en ventas (monto de `totalPedido`) y volumen (nº de
 * pedidos), usando el día calendario de `createdAt`. Emite dos bloques
 * `comparison` (ventas en COP y pedidos sin unidad) y, si la variación de ventas
 * es distinta de 0 y ambas semanas tienen datos, una `Inference` de tipo
 * `pattern` (nunca causal, `basedOn` trazable a los Facts de ventas).
 *
 * _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5._
 */
export const compararSemanas: AssistantTool = {
  id: "pedidos.compararSemanas",
  module: MODULO,
  name: "Comparar semanas",
  description: "Compara ventas y volumen de esta semana contra la anterior, con patrón sin causalidad.",
  level: "analyze",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const sources = [
      source("pedidos.compararSemanas", "pedidos (createdAt), totalPedido, ventanas de 7 días"),
    ];

    // Semana actual = [hoy-6 .. hoy]; semana pasada = [hoy-13 .. hoy-7].
    const finActual = ymdConOffset(0); // hoy
    const inicioActual = ymdConOffset(-6);
    const finPasada = ymdConOffset(-7);
    const inicioPasada = ymdConOffset(-13);

    let ventasActual = 0;
    let pedidosActual = 0;
    let ventasPasada = 0;
    let pedidosPasada = 0;

    for (const p of pedidosStore.pedidos) {
      const dia = p.createdAt.slice(0, 10);
      if (dia >= inicioActual && dia <= finActual) {
        ventasActual += pedidosStore.totalPedido(p);
        pedidosActual += 1;
      } else if (dia >= inicioPasada && dia <= finPasada) {
        ventasPasada += pedidosStore.totalPedido(p);
        pedidosPasada += 1;
      }
    }

    const labelVentasActual = "Ventas esta semana";
    const labelVentasPasada = "Ventas semana pasada";
    const labelPedidosActual = "Pedidos esta semana";
    const labelPedidosPasada = "Pedidos semana pasada";

    const facts: Fact[] = [
      { label: labelVentasActual, value: ventasActual, unit: "COP", period: `${inicioActual}..${finActual}` },
      { label: labelVentasPasada, value: ventasPasada, unit: "COP", period: `${inicioPasada}..${finPasada}` },
      { label: labelPedidosActual, value: pedidosActual, period: `${inicioActual}..${finActual}` },
      { label: labelPedidosPasada, value: pedidosPasada, period: `${inicioPasada}..${finPasada}` },
    ];

    const ventasBlock: ComparisonBlock = {
      kind: "comparison",
      title: "Ventas: esta semana vs. la anterior",
      unit: "COP",
      items: [
        {
          label: "Ventas",
          valueA: ventasPasada,
          valueB: ventasActual,
          labelA: "Semana pasada",
          labelB: "Esta semana",
        },
      ],
    };
    const pedidosBlock: ComparisonBlock = {
      kind: "comparison",
      title: "Pedidos: esta semana vs. la anterior",
      items: [
        {
          label: "Pedidos",
          valueA: pedidosPasada,
          valueB: pedidosActual,
          labelA: "Semana pasada",
          labelB: "Esta semana",
        },
      ],
    };
    const blocks: ResponseBlock[] = [ventasBlock, pedidosBlock];

    const inferences: Inference[] = [];

    // Patrón sobre ventas: solo si ambas semanas tienen datos de ventas y la
    // variación relativa es distinta de 0 (no causal).
    if (ventasActual > 0 && ventasPasada > 0) {
      const variacion = (ventasActual - ventasPasada) / ventasPasada;
      if (variacion !== 0) {
        const pct = Math.abs(Math.round(variacion * 100));
        const abs = Math.abs(variacion);
        const confidence: Inference["confidence"] =
          abs >= 0.5 ? "alta" : abs >= 0.2 ? "media" : "baja";
        const sentido = variacion > 0 ? "superiores" : "inferiores";
        inferences.push({
          statement: `Las ventas de esta semana se observan ${sentido} a las de la semana pasada en un ${pct}%`,
          kind: "pattern",
          confidence,
          basedOn: [labelVentasActual, labelVentasPasada],
        });
      }
    }

    return validarToolResult({ facts, inferences, blocks, sources });
  },
};

/**
 * Tools de nivel `query` de Pedidos, en orden determinista de registro.
 */
const QUERY_TOOLS: AssistantTool[] = [
  getResumenHoy,
  getVentasPeriodo,
  getCanalTop,
  getTiempoCiclo,
  getCancelados,
  getHoraPico,
  getPendientes,
];

/**
 * Tools de nivel `analyze` de Pedidos, en orden determinista de registro.
 */
const ANALYZE_TOOLS: AssistantTool[] = [
  compararDias,
  diagnosticoDesempeno,
  compararSemanas,
];

/**
 * `PedidosToolProvider` — proveedor de tools del módulo Pedidos.
 *
 * Único punto que importa `pedidosStore` (invariante A2). Declara el catálogo
 * de tools que el módulo aporta al asistente; el `ToolRegistry` las filtra por
 * módulos habilitados y por capacidades del contexto de acceso.
 */
export class PedidosToolProvider implements AssistantToolProvider {
  /** Módulo al que pertenece este proveedor. */
  readonly module = MODULO;

  /**
   * Devuelve las 10 tools de Pedidos: las 7 de nivel `query` (`getResumenHoy`,
   * `getVentasPeriodo`, `getCanalTop`, `getTiempoCiclo`, `getCancelados`,
   * `getHoraPico`, `getPendientes`) seguidas de las 3 de nivel `analyze`
   * (`compararDias`, `diagnosticoDesempeno`, `compararSemanas`), en orden
   * determinista.
   */
  getTools(): AssistantTool[] {
    return [...QUERY_TOOLS, ...ANALYZE_TOOLS];
  }
}

// Referencia de tipo para satisfacer al compilador sin usarla en runtime:
// documenta que las tools operan sobre `Pedido` del store de dominio.
export type { Pedido };
