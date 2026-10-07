import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import {
  BoxCubeIcon,
  CheckLineIcon,
  DownloadIcon,
  PlusIcon,
  TimeIcon,
  AlertHexaIcon,
  PieChartIcon,
} from "@/icons";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";

export const DashboardPage = observer(function DashboardPage() {
  const navigate = useNavigate();
  const resumen = productosStore.resumen;
  const productos = productosStore.productosActivos;
  const ordenes = productosStore.ordenes;
  const proveedores = productosStore.proveedores;
  const sedes = productosStore.sedesActivas;

  // Stock en mano total
  const stockEnMano = productos.reduce(
    (acc, p) => acc + productosStore.cantidadDe(p.id),
    0,
  );
  // Mercancía en camino
  const porRecibir = ordenes
    .filter((o) => o.estado === "en_camino" || o.estado === "confirmada")
    .reduce((acc, o) => acc + o.cantidad, 0);

  // Alertas de stock bajo / agotado
  const productosAlerta = productos
    .map((p) => ({
      producto: p,
      cantidad: productosStore.cantidadDe(p.id),
      semaforo: productosStore.semaforoDe(p),
    }))
    .filter((item) => item.semaforo !== "disponible")
    .slice(0, 5);

  // Top productos ordenados por valor de inventario
  const topStock = [...productos]
    .sort((a, b) => b.precioCompra - a.precioCompra)
    .slice(0, 4);

  return (
    <>
      <PageMeta
        title="Dashboard de Inventario — NECTO"
        description="Resumen operativo y comercial del inventario y compras."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Dashboard de Inventario"
          descripcion="Resumen de existencias, compras, proveedores y alertas de abastecimiento."
          acciones={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/productos")}
              >
                Ver Catálogo
              </Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white"
                onClick={() => navigate("/inventarios/ordenes")}
              >
                <PlusIcon className="size-4 mr-1.5" />
                Nueva Orden
              </Button>
            </div>
          }
        />

        {/* Fila 1 de Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Sales & Valuation Overview */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardBody className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Valorización de Stock
                </span>
                <span className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <BoxCubeIcon className="size-4" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatearMoneda(resumen.valorizacion)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Costo total de existencias en bodega
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Inventory Summary */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardBody className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Resumen Físico
                </span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <PieChartIcon className="size-4" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stockEnMano}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En mano</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {porRecibir}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Por recibir</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 3: Purchase Overview */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardBody className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Órdenes de Compra
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <CheckLineIcon className="size-4" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {ordenes.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total órdenes</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {ordenes.filter((o) => o.estado === "retrasada").length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Retrasadas</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 4: Product & Supplier Summary */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardBody className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Red Comercial
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <TimeIcon className="size-4" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {proveedores.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Proveedores</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {sedes.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sedes activas</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Fila 2: Alertas Críticas de Stock & Top Productos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card: Low Quantity Stock */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertHexaIcon className="size-5 text-amber-500" />
                  Alertas de Stock Bajo ({productosAlerta.length})
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Productos que requieren reposición inmediata
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/productos")}
              >
                Ver todos
              </Button>
            </CardHeader>
            <CardBody className="p-5">
              {productosAlerta.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  ¡Todo en orden! No hay productos con existencias críticas.
                </div>
              ) : (
                <div className="space-y-3">
                  {productosAlerta.map(({ producto, cantidad, semaforo }) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 flex-shrink-0">
                          <BoxCubeIcon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {producto.nombre}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Mínimo: {producto.minimo} · SKU: {producto.codigo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {cantidad} {producto.unidad}s
                        </span>
                        <Badge
                          variant="light"
                          color={semaforo === "agotado" ? "error" : "warning"}
                          size="sm"
                        >
                          {semaforo === "agotado" ? "Agotado" : "Queda poco"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Card: Top Stock / Catálogo Valorizado */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Top Productos en Catálogo
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Artículos con mayor costo unitario en almacén
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/productos")}
              >
                Catálogo
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Producto
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                      Precio Compra
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                      Existencia
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {topStock.map((prod) => (
                    <TableRow
                      key={prod.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => navigate(`/inventarios/productos/${prod.id}`)}
                    >
                      <TableCell className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-gray-500">{prod.categoria}</p>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-end font-medium text-gray-900 dark:text-white">
                        {formatearMoneda(prod.precioCompra)}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-end font-semibold text-brand-600 dark:text-brand-400">
                        {productosStore.cantidadDe(prod.id)} {prod.unidad}s
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
