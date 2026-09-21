// ═══════════════════════════════════════════════════════════════════════════
// modules-tools/inventario/inventario.tool-provider.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// Proveedor de tools del módulo **Inventario** para el asistente ("Necto
// Intelligence"). Este archivo es el ÚNICO del código fuente de Inventario que
// importa `inventarioStore` (invariante A2): el núcleo `src/assistant/**` es
// agnóstico de dominio y jamás conoce stores de negocio.
//
// ── Cinco tools, todas de LECTURA ─────────────────────────────────────────
//
// `query` y nada más. El asistente no registra movimientos: un movimiento
// reescribe el kárdex, y el kárdex es la única fuente de las existencias (I1).
// Una tool que escribiera convertiría una frase en un cambio de inventario sin
// que nadie vea el formulario — y el formulario es donde vive la validación de
// origen (I2). Cuando exista una tool de escritura tendrá que pasar por
// `registrarMovimiento`, no por un `push` al array.
//
// ── Autorización ──────────────────────────────────────────────────────────
//
// Todas exigen `inventory.read`. El `ToolRegistry` aplica el filtro
// módulos ∩ capacidades antes de exponerlas y al resolverlas, así que los `run`
// asumen permiso y NO duplican la verificación. Eso significa que estas tools
// solo son visibles con el módulo Inventario conectado al asistente — el mismo
// interruptor que gobierna Pedidos.
//
// ── Nada de `@/pages/pedidos/**` ──────────────────────────────────────────
//
// El proveedor de Pedidos tiene helpers con el mismo nombre (`formatMoneda`,
// `source`). Importarlos sería una violación de D1/D2; se repiten aquí, que es
// formatear, no compartir una regla de negocio.
//
// ═══════════════════════════════════════════════════════════════════════════

import { inventarioStore, UNIDAD_MEDIDA_LABEL, TIPO_MOVIMIENTO_LABEL } from "@/stores";
import type { Articulo, Movimiento, TipoMovimiento } from "@/stores";
import type {
  AssistantTool,
  AssistantToolProvider,
  Fact,
  ListBlock,
  MetricsBlock,
  TableBlock,
  ToolResult,
  ToolSource,
} from "@/assistant";

// ─────────────────────────────────────────────────────────────────────────
// Helpers locales
// ─────────────────────────────────────────────────────────────────────────

/** Módulo dueño de estas tools. */
const MODULO = "inventario" as const;

/** Capacidad requerida por todas las tools de Inventario (solo lectura). */
const CAP_LECTURA = "inventory.read" as const;

/** Fuente consultada, para trazabilidad en el FactsPanel. */
const source = (toolId: string, detail: string): ToolSource => ({
  toolId,
  module: MODULO,
  detail,
});

/** Importe en pesos como string legible. Los `facts` conservan el número crudo. */
const formatMoneda = (monto: number): string => `$${Math.round(monto).toLocaleString("es-CO")}`;

/** Cantidad con su unidad larga, para los bloques de presentación. */
const formatCantidad = (n: number, unidad: Articulo["unidad"]): string =>
  `${n.toLocaleString("es-CO")} ${UNIDAD_MEDIDA_LABEL[unidad].toLowerCase()}`;

/**
 * Normaliza texto para comparar: minúsculas y sin acentos.
 *
 * Sin esto, «cafe» no encuentra «Café» y «analitica» no encuentra «Analítica» —
 * y quien escribe una pregunta al asistente no pone tildes.
 */
const normalizar = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Busca artículos por nombre, SKU o categoría.
 *
 * Las tres, porque son las tres formas en que se pregunta: «¿cuánto café
 * queda?» (nombre), «¿qué hay del SKU-2001?» (código) y «¿qué tengo de
 * Insumos?» (categoría). Devolver `[]` sin decir por qué sería peor que no
 * encontrar nada.
 */
function buscarArticulos(consulta: string): Articulo[] {
  const q = normalizar(consulta.trim());
  if (!q) return [];
  return inventarioStore.articulos.filter(
    (a) =>
      normalizar(a.nombre).includes(q) ||
      normalizar(a.sku).includes(q) ||
      normalizar(a.categoria).includes(q),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — nivel `query` (solo lectura)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `inventario.getExistencias` — Existencia de un artículo o de una categoría,
 * desglosada por bodega.
 *
 * Sin argumentos devuelve el total del almacén por bodega: es la pregunta
 * «¿qué hay?», que no siempre nombra un artículo.
 */
export const getExistencias: AssistantTool = {
  id: "inventario.getExistencias",
  module: MODULO,
  name: "Existencias",
  description: "Cuánto hay de un artículo o de una categoría, y en qué bodega.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [
    {
      name: "articulo",
      type: "string",
      required: false,
      description: "Nombre, SKU o categoría del artículo. Sin valor: todo el almacén.",
    },
  ],
  async run(input): Promise<ToolResult> {
    const consulta = typeof input.articulo === "string" ? input.articulo : "";
    const articulos = consulta ? buscarArticulos(consulta) : inventarioStore.articulos;
    const bodegas = inventarioStore.bodegas;

    if (articulos.length === 0) {
      return {
        facts: [
          {
            label: "Artículos encontrados",
            value: 0,
            unit: "artículos",
            period: consulta || "todo el almacén",
          },
        ],
        sources: [source(this.id, `Búsqueda «${consulta}» sobre el catálogo de artículos`)],
        blocks: [
          {
            kind: "list",
            title: "Sin resultados",
            items: [
              {
                primary: `No hay ningún artículo que coincida con «${consulta}».`,
                secondary: "Se busca por nombre, SKU y categoría.",
              },
            ],
          },
        ],
      };
    }

    const totalArticulos = articulos.length;
    const valor = articulos.reduce(
      (acc, a) => acc + inventarioStore.existenciaTotal(a.id) * a.costoUnitario,
      0,
    );

    const facts: Fact[] = [
      {
        label: "Artículos",
        value: totalArticulos,
        unit: "artículos",
        period: consulta || "todo el almacén",
      },
      {
        label: "Bodegas",
        value: bodegas.length,
        unit: "bodegas",
        period: consulta || "todo el almacén",
      },
      {
        label: "Valor a costo",
        value: Math.round(valor),
        unit: "COP",
        period: consulta || "todo el almacén",
      },
    ];

    // Una fila por artículo × bodega, saltando los ceros: el desglose completo
    // de un catálogo grande en una tabla con la mitad de celdas a cero no se lee.
    const filas: (string | number)[][] = [];
    for (const a of articulos) {
      for (const b of bodegas) {
        const n = inventarioStore.existenciaDe(a.id, b.id);
        if (n <= 0) continue;
        filas.push([a.nombre, a.sku, b.nombre, formatCantidad(n, a.unidad)]);
      }
    }

    const bloques: (TableBlock | ListBlock)[] = [
      {
        kind: "table",
        title: consulta ? `Existencia de «${consulta}» por bodega` : "Existencia por bodega",
        columns: ["Artículo", "SKU", "Bodega", "Cantidad"],
        rows: filas,
        exportable: true,
      },
    ];

    // Solo cuando NO hay desglose que enseñar se dice por qué la tabla va vacía.
    // Un cero sin explicación se lee como un error de carga.
    if (filas.length === 0) {
      bloques.push({
        kind: "list",
        title: "Sin existencia en ninguna bodega",
        items: articulos.map((a) => ({
          primary: a.nombre,
          secondary: `${a.sku} · ${a.categoria}`,
          trailing: "Agotado",
        })),
      });
    }

    return {
      facts,
      sources: [
        source(
          this.id,
          consulta
            ? `Existencia por bodega de «${consulta}» (${totalArticulos} artículos)`
            : `Existencia por bodega de los ${totalArticulos} artículos del catálogo`,
        ),
      ],
      blocks: bloques,
    };
  },
};

/**
 * `inventario.getBajoMinimo` — Artículos por debajo de su punto de reorden.
 */
export const getBajoMinimo: AssistantTool = {
  id: "inventario.getBajoMinimo",
  module: MODULO,
  name: "Bajo mínimo",
  description: "Artículos cuya existencia no alcanza su punto de reorden.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const articulos = inventarioStore.bajoMinimo;

    const facts: Fact[] = [
      {
        label: "Bajo mínimo",
        value: articulos.length,
        unit: "artículos",
        period: "ahora",
      },
      {
        label: "Alerta activada",
        value: inventarioStore.config.alertaBajoMinimo ? "Sí" : "No",
        period: "configuración del módulo",
      },
    ];

    return {
      facts,
      sources: [
        source(this.id, "Artículos con existencia total por debajo de su punto de reorden"),
      ],
      blocks: [
        {
          kind: "list",
          title: articulos.length ? "Por debajo del punto de reorden" : "Nada bajo mínimo",
          items: articulos.length
            ? articulos.map((a) => ({
                primary: a.nombre,
                secondary: `${a.sku} · mínimo ${formatCantidad(a.minimo, a.unidad)}`,
                trailing: formatCantidad(inventarioStore.existenciaTotal(a.id), a.unidad),
              }))
            : [
                {
                  primary: "Todos los artículos están por encima de su mínimo.",
                  secondary: "La lista se recalcula con cada movimiento del kárdex.",
                },
              ],
        },
      ],
    };
  },
};

/**
 * `inventario.getAgotados` — Artículos sin ninguna existencia.
 */
export const getAgotados: AssistantTool = {
  id: "inventario.getAgotados",
  module: MODULO,
  name: "Agotados",
  description: "Artículos que no tienen existencia en ninguna bodega.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const articulos = inventarioStore.agotados;

    return {
      facts: [
        { label: "Agotados", value: articulos.length, unit: "artículos", period: "ahora" },
        {
          label: "Artículos en catálogo",
          value: inventarioStore.totalArticulos,
          unit: "artículos",
          period: "ahora",
        },
      ],
      sources: [source(this.id, "Artículos con existencia total igual a cero")],
      blocks: [
        {
          kind: "list",
          title: articulos.length ? "Sin existencia" : "No hay agotados",
          items: articulos.length
            ? articulos.map((a) => ({
                primary: a.nombre,
                secondary: `${a.sku} · ${a.categoria}`,
                trailing: "0",
              }))
            : [
                {
                  primary: "Todos los artículos tienen existencia.",
                  secondary: "Un artículo sin movimientos de entrada también cuenta como agotado.",
                },
              ],
        },
      ],
    };
  },
};

/**
 * `inventario.getValorInventario` — Valor total a costo, y su reparto por bodega.
 *
 * Se valora a **costo unitario**, nunca a precio de venta: el precio de venta no
 * vive en este módulo (D1/D2) y leerlo de Pedidos sería exactamente el import
 * cruzado que la independencia prohíbe.
 */
export const getValorInventario: AssistantTool = {
  id: "inventario.getValorInventario",
  module: MODULO,
  name: "Valor del inventario",
  description: "Valor total a costo de lo que hay, y cuánto hay en cada bodega.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [],
  async run(): Promise<ToolResult> {
    const total = inventarioStore.valorTotal;
    const porBodega = inventarioStore.bodegas.map((b) => ({
      bodega: b,
      valor: inventarioStore.articulos.reduce(
        (acc, a) => acc + inventarioStore.existenciaDe(a.id, b.id) * a.costoUnitario,
        0,
      ),
    }));

    const metrics: MetricsBlock = {
      kind: "metrics",
      title: "Valor del inventario a costo",
      items: [
        { label: "Total", value: formatMoneda(total), unit: "COP" },
        { label: "Artículos", value: inventarioStore.totalArticulos, unit: "artículos" },
        { label: "Bodegas", value: inventarioStore.bodegas.length, unit: "bodegas" },
      ],
    };

    const table: TableBlock = {
      kind: "table",
      title: "Valor por bodega",
      columns: ["Bodega", "Valor a costo"],
      rows: porBodega.map(({ bodega, valor }) => [bodega.nombre, formatMoneda(valor)]),
      exportable: true,
    };

    return {
      facts: [
        {
          label: "Valor total a costo",
          value: Math.round(total),
          unit: "COP",
          period: "ahora",
        },
      ],
      sources: [
        source(this.id, "Existencia total por artículo × costo unitario, sumado por bodega"),
      ],
      blocks: [metrics, table],
    };
  },
};

/**
 * `inventario.getMovimientosRecientes` — Los últimos movimientos del kárdex.
 */
export const getMovimientosRecientes: AssistantTool = {
  id: "inventario.getMovimientosRecientes",
  module: MODULO,
  name: "Movimientos recientes",
  description: "Últimos movimientos del kárdex: entradas, salidas, transferencias y ajustes.",
  level: "query",
  requiredCapabilities: [CAP_LECTURA],
  params: [
    {
      name: "limite",
      type: "number",
      required: false,
      description: "Cuántos movimientos devolver. Por defecto 8.",
    },
  ],
  async run(input): Promise<ToolResult> {
    // Se acota el límite en vez de confiar en el parámetro: un `limite` de 0, de
    // 10000 o negativo no es un error del usuario, es una entrada que hay que
    // normalizar. Sin el techo, una pregunta podía volcar el kárdex entero en el
    // chat.
    const crudo = typeof input.limite === "number" ? input.limite : Number(input.limite);
    const limite = Number.isFinite(crudo) ? Math.min(Math.max(Math.trunc(crudo), 1), 50) : 8;
    const movimientos = inventarioStore.movimientosRecientes(limite);

    const conteoPorTipo = movimientos.reduce<Partial<Record<TipoMovimiento, number>>>((acc, m) => {
      acc[m.tipo] = (acc[m.tipo] ?? 0) + 1;
      return acc;
    }, {});

    const facts: Fact[] = [
      {
        label: "Movimientos devueltos",
        value: movimientos.length,
        unit: "movimientos",
        period: "los más recientes",
      },
      ...(Object.keys(conteoPorTipo) as TipoMovimiento[]).map((t) => ({
        label: TIPO_MOVIMIENTO_LABEL[t],
        value: conteoPorTipo[t] ?? 0,
        unit: "movimientos",
        period: "los más recientes",
      })),
    ];

    const filas: (string | number)[][] = movimientos.map((m: Movimiento) => {
      const art = inventarioStore.articuloPorId(m.articuloId);
      return [
        m.fecha.slice(0, 10),
        art?.nombre ?? "Artículo eliminado",
        TIPO_MOVIMIENTO_LABEL[m.tipo],
        inventarioStore.trayecto(m),
        art ? formatCantidad(m.cantidad, art.unidad) : String(m.cantidad),
      ];
    });

    return {
      facts,
      sources: [source(this.id, `Los ${movimientos.length} movimientos más recientes del kárdex`)],
      blocks: [
        {
          kind: "table",
          title: "Movimientos recientes",
          columns: ["Fecha", "Artículo", "Tipo", "Trayecto", "Cantidad"],
          rows: filas,
          exportable: true,
        },
      ],
    };
  },
};

/** Tools de Inventario, en orden determinista de registro. */
const QUERY_TOOLS: AssistantTool[] = [
  getExistencias,
  getBajoMinimo,
  getAgotados,
  getValorInventario,
  getMovimientosRecientes,
];

/**
 * `InventarioToolProvider` — proveedor de tools del módulo Inventario.
 *
 * Único punto de Inventario que importa `inventarioStore` (invariante A2).
 * Declara el catálogo de tools que el módulo aporta al asistente; el
 * `ToolRegistry` las filtra por módulos habilitados y por capacidades del
 * contexto de acceso.
 */
export class InventarioToolProvider implements AssistantToolProvider {
  /** Módulo al que pertenece este proveedor. */
  readonly module = MODULO;

  /**
   * Devuelve las 5 tools de Inventario, todas de nivel `query`, en orden
   * determinista.
   */
  getTools(): AssistantTool[] {
    return [...QUERY_TOOLS];
  }
}
