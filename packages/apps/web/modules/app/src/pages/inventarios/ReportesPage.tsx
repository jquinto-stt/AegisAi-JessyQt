import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { SearchInput } from "@/elements";
import { Select } from "@/elements/form/select";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import { SEMAFORO_META } from "./productos.constants";
import { BOM_UTF8, construirCsv, descargarCsv, nombreArchivoCsv } from "@/lib/csv";

export const ReportesPage = observer(function ReportesPage() {
  const [tabActiva, setTabActiva] = useState<"resumen" | "movimientos">("resumen");
  const [busquedaMov, setBusquedaMov] = useState("");
  const [filtroSedeMov, setFiltroSedeMov] = useState("todas");
  const [filtroTipoMov, setFiltroTipoMov] = useState<"todos" | "entradas" | "salidas">("todos");

  const productos = productosStore.productosActivos;
  const resumen = productosStore.resumen;
  const sedes = productosStore.sedesActivas;
  const ajustes = productosStore.ajustes;

  // Cifras financieras agregadas
  const valorizacion = resumen.valorizacion;
  const estimadoVenta = productos.reduce((acc, p) => {
    const stock = productosStore.cantidadDe(p.id);
    const pVenta = p.precioVenta ?? Math.round(p.precioCompra * 1.35);
    return acc + pVenta * stock;
  }, 0);
  const beneficioEstimado = Math.max(0, estimadoVenta - valorizacion);

  // Categorías con volumen
  const categoriasMap = new Map<string, { totalItems: number; valor: number }>();
  for (const prod of productos) {
    const prev = categoriasMap.get(prod.categoria) || { totalItems: 0, valor: 0 };
    const stock = productosStore.cantidadDe(prod.id);
    categoriasMap.set(prod.categoria, {
      totalItems: prev.totalItems + stock,
      valor: prev.valor + prod.precioCompra * stock,
    });
  }

  const categoriasRanking = Array.from(categoriasMap.entries())
    .map(([cat, datos]) => ({
      categoria: cat,
      ...datos,
      crecimiento: "+3.2%",
    }))
    .sort((a, b) => b.valor - a.valor);

  // Top productos por volumen de capital
  const productosTop = [...productos]
    .map((p) => ({
      producto: p,
      stock: productosStore.cantidadDe(p.id),
      valorizacion: p.precioCompra * productosStore.cantidadDe(p.id),
      rotacion: "+1.8%",
    }))
    .sort((a, b) => b.valorizacion - a.valorizacion);

  // Historial de movimientos enriquecido
  const movimientos = ajustes.map((aj) => {
    const prod = productosStore.productoPorId(aj.productoId);
    const sede = productosStore.sedePorId(aj.sedeId);
    const delta = aj.cantidadNueva - aj.cantidadAnterior;
    const esEntrada = delta > 0;

    let motivoEtiqueta = "Ajuste de inventario";
    if (aj.motivo === "ingreso_manual") motivoEtiqueta = "Recepción de compra / Ingreso";
    else if (aj.motivo === "traslado") motivoEtiqueta = "Traslado entre sedes";
    else if (aj.motivo === "conteo") motivoEtiqueta = "Conteo físico / Cuadre";
    else if (aj.motivo === "merma") motivoEtiqueta = "Pérdida o merma";
    else if (aj.motivo === "vencimiento") motivoEtiqueta = "Producto vencido";

    return {
      ...aj,
      productoNombre: prod?.nombre || "Producto no encontrado",
      codigo: prod?.codigo || "—",
      unidad: prod?.unidad || "und",
      sedeNombre: sede?.nombre || "Bodega",
      delta,
      esEntrada,
      motivoEtiqueta,
    };
  });

  const movimientosFiltrados = movimientos.filter((m) => {
    if (filtroSedeMov !== "todas" && m.sedeId !== filtroSedeMov) return false;
    if (filtroTipoMov === "entradas" && !m.esEntrada) return false;
    if (filtroTipoMov === "salidas" && m.esEntrada) return false;
    if (busquedaMov.trim()) {
      const q = busquedaMov.toLowerCase();
      const match =
        m.productoNombre.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        (m.notas && m.notas.toLowerCase().includes(q)) ||
        m.motivoEtiqueta.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Exportar balance general en CSV
  const descargarBalanceCsv = () => {
    const contenido = construirCsv(
      [
        "Producto",
        "Código SKU",
        "Categoría",
        "Unidades Disponibles",
        "Unidad",
        "Costo de Compra ($COP)",
        "Precio de Venta ($COP)",
        "Valor Total en Almacén ($COP)",
        "Margen Bruto Estimado ($COP)",
        "Estado de Existencias",
      ],
      productos.map((prod) => {
        const stock = productosStore.cantidadDe(prod.id);
        const val = prod.precioCompra * stock;
        const pVenta = prod.precioVenta ?? Math.round(prod.precioCompra * 1.35);
        const margen = (pVenta - prod.precioCompra) * stock;
        const semaforo = productosStore.semaforoDe(prod);
        return [
          prod.nombre,
          prod.codigo,
          prod.categoria,
          stock,
          prod.unidad,
          prod.precioCompra,
          pVenta,
          val,
          margen,
          SEMAFORO_META[semaforo].label,
        ];
      }),
    );
    descargarCsv(BOM_UTF8 + contenido, nombreArchivoCsv("balance-inventario-valorizado"));
  };

  // Exportar historial de entradas y salidas en CSV
  const descargarMovimientosCsv = () => {
    const contenido = construirCsv(
      [
        "Fecha",
        "Producto",
        "Código SKU",
        "Sede",
        "Tipo Movimiento",
        "Variación (Unidades)",
        "Stock Anterior",
        "Stock Resultante",
        "Motivo",
        "Notas / Observaciones",
      ],
      movimientosFiltrados.map((m) => [
        new Date(m.fecha).toLocaleString("es-CO"),
        m.productoNombre,
        m.codigo,
        m.sedeNombre,
        m.esEntrada ? "Entrada (+)" : "Salida (-)",
        m.delta,
        m.cantidadAnterior,
        m.cantidadNueva,
        m.motivoEtiqueta,
        m.notas || "",
      ]),
    );
    descargarCsv(BOM_UTF8 + contenido, nombreArchivoCsv("historial-movimientos-stock"));
  };

  return (
    <>
      <PageMeta
        title="Reportes y Movimientos — NECTO"
        description="Informes financieros, valorización de existencias y registro de entradas y salidas."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Reportes y Movimientos de Inventario"
          descripcion="Consulta el valor de tu negocio y revisa el historial completo de entradas y salidas de mercancía."
          acciones={
            <div className="flex items-center gap-2">
              {tabActiva === "resumen" ? (
                <Button
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                  onClick={descargarBalanceCsv}
                >
                  <ArrowDownTrayIcon className="size-4 mr-1.5" />
                  Descargar Balance (CSV)
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                  onClick={descargarMovimientosCsv}
                >
                  <ArrowDownTrayIcon className="size-4 mr-1.5" />
                  Descargar Movimientos (CSV)
                </Button>
              )}
            </div>
          }
        />

        {/* Selector de pestañas accesible y claro */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setTabActiva("resumen")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              tabActiva === "resumen"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Balance Financiero
          </button>
          <button
            onClick={() => setTabActiva("movimientos")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              tabActiva === "movimientos"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span>Entradas y Salidas</span>
            <Badge color="light" size="sm">
              {ajustes.length}
            </Badge>
          </button>
        </div>

        {tabActiva === "resumen" ? (
          <>
            {/* Resumen Financiero Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
                <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                  Ganancia Bruta Estimada
                </span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatearMoneda(beneficioEstimado)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Si vendes todo tu stock actual</p>
              </Card>

              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
                <span className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-400">
                  Costo de lo que Tienes
                </span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatearMoneda(valorizacion)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Dinero invertido en compras</p>
              </Card>

              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
                <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
                  Valor Total de Venta
                </span>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatearMoneda(estimadoVenta)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Ingreso esperado al precio fijado</p>
              </Card>

              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
                <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">
                  Productos Activos
                </span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {productos.length} SKUs
                </p>
                <p className="text-xs text-gray-400 mt-1">Distribuidos en {sedes.length} sedes</p>
              </Card>
            </div>

            {/* Categorías y Top Productos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card className="lg:col-span-1 rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
                <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                    Valor por Categoría
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-5 space-y-4">
                  {categoriasRanking.map((c) => (
                    <div
                      key={c.categoria}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {c.categoria}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.totalItems} unidades totales
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatearMoneda(c.valor)}
                        </p>
                        <span className="text-xs text-emerald-600 font-medium">
                          {c.crecimiento}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
                <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                    Productos con Mayor Inversión
                  </CardTitle>
                  <span className="text-xs text-gray-400">Ordenado por valor en bodega</span>
                </CardHeader>
                <CardBody className="p-0">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Producto
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Categoría
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Stock
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Inversión Total
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Estado
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                      {productosTop.slice(0, 8).map(({ producto, stock, valorizacion }) => (
                        <TableRow key={producto.id}>
                          <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                            {producto.nombre}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-gray-500">
                            {producto.categoria}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end font-medium text-sm">
                            {stock} {producto.unidad}s
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end font-bold text-sm text-brand-600 dark:text-brand-400">
                            {formatearMoneda(valorizacion)}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end">
                            <Badge
                              size="sm"
                              color={
                                stock === 0 ? "error" : stock <= producto.minimo ? "warning" : "success"
                              }
                            >
                              {stock === 0 ? "Agotado" : stock <= producto.minimo ? "Queda poco" : "Disponible"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          </>
        ) : (
          /* Pestaña: Historial de Entradas y Salidas (Kárdex Global) */
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Historial de Entradas y Salidas
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rastrea cualquier movimiento físico: compras recibidas, traslados, ajustes o mermas.
                </p>
              </div>

              {/* Filtros simples e intuitivos */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-60">
                  <SearchInput
                    placeholder="Buscar producto o nota..."
                    value={busquedaMov}
                    onChange={(e) => setBusquedaMov(e.target.value)}
                  />
                </div>
                {sedes.length > 1 && (
                  <div className="w-36">
                    <Select
                      options={[
                        { value: "todas", label: "Todas las sedes" },
                        ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                      ]}
                      defaultValue={filtroSedeMov}
                      onChange={(v) => setFiltroSedeMov(v)}
                    />
                  </div>
                )}
                <div className="w-36">
                  <Select
                    options={[
                      { value: "todos", label: "Todos los tipos" },
                      { value: "entradas", label: "Solo Entradas (+)" },
                      { value: "salidas", label: "Solo Salidas (-)" },
                    ]}
                    defaultValue={filtroTipoMov}
                    onChange={(v) => setFiltroTipoMov(v as any)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {movimientosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No hay movimientos registrados que coincidan con los filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Fecha
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Producto
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Sede
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Movimiento
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Variación
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Stock
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Detalle / Observación
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                      {movimientosFiltrados.map((m) => (
                        <TableRow key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                          <TableCell className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(m.fecha).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                            <span className="block truncate max-w-xs">{m.productoNombre}</span>
                            <span className="block text-xs font-normal text-gray-400">SKU: {m.codigo}</span>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                            {m.sedeNombre}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs">
                            <Badge
                              variant="light"
                              color={
                                m.motivo === "ingreso_manual"
                                  ? "success"
                                  : m.motivo === "traslado"
                                  ? "primary"
                                  : m.motivo === "merma" || m.motivo === "vencimiento"
                                  ? "error"
                                  : "light"
                              }
                            >
                              {m.motivoEtiqueta}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end font-semibold text-sm whitespace-nowrap">
                            {m.esEntrada ? (
                              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                                <ArrowUpIcon className="size-3.5 inline" />
                                +{m.delta} {m.unidad}
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                                <ArrowDownIcon className="size-3.5 inline" />
                                {m.delta} {m.unidad}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end text-xs text-gray-500 whitespace-nowrap">
                            De {m.cantidadAnterior} a <strong className="text-gray-800 dark:text-gray-200">{m.cantidadNueva}</strong>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">
                            {m.notas || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </ContenedorPagina>
    </>
  );
});
