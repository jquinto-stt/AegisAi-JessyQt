import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { PieChartIcon, DownloadIcon } from "@/icons";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";

export const ReportesPage = observer(function ReportesPage() {
  const productos = productosStore.productosActivos;
  const resumen = productosStore.resumen;

  // Cifras agregadas
  const valorizacion = resumen.valorizacion;
  const estimadoVenta = valorizacion * 1.35; // Margen comercial estándar 35%
  const beneficioEstimado = estimadoVenta - valorizacion;

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

  // Top productos por volumen
  const productosTop = [...productos]
    .map((p) => ({
      producto: p,
      stock: productosStore.cantidadDe(p.id),
      valorizacion: p.precioCompra * productosStore.cantidadDe(p.id),
      rotacion: "+1.8%",
    }))
    .sort((a, b) => b.valorizacion - a.valorizacion);

  return (
    <>
      <PageMeta
        title="Reportes de Inventario — NECTO"
        description="Informes financieros, valorización de existencias y rotación por categoría."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Reportes y Rendimiento de Inventario"
          descripcion="Consolidado financiero de compras, proyección de ventas y rotación de stock."
          acciones={
            <Button variant="outline" size="sm">
              <DownloadIcon className="size-4 mr-1.5" />
              Descargar Informe Completo
            </Button>
          }
        />

        {/* Resumen Financiero Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
              Margen Bruto Proyectado
            </span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatearMoneda(beneficioEstimado)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Retorno sobre inventario actual</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-400">
              Valor de Compra (Costo)
            </span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatearMoneda(valorizacion)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Costo neto de mercancía en mano</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
              Valor Comercial Esperado
            </span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {formatearMoneda(estimadoVenta)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ingreso bruto estimado por venta</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">
              Crecimiento de Catálogo (MoM)
            </span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              +14.8%
            </p>
            <p className="text-xs text-gray-400 mt-1">Variación respecto al ciclo anterior</p>
          </Card>
        </div>

        {/* Categorías más vendidas / valorizadas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-1 rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Categorías por Valor
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
                Rendimiento de Productos en Almacén
              </CardTitle>
              <span className="text-xs text-gray-400">Ordenado por capital invertido</span>
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
                      Valor Total
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                      Índice
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {productosTop.slice(0, 8).map(({ producto, stock, valorizacion, rotacion }) => (
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
                      <TableCell className="px-5 py-3 text-end text-xs text-emerald-600 font-semibold">
                        {rotacion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      </ContenedorPagina>
    </>
  );
});
