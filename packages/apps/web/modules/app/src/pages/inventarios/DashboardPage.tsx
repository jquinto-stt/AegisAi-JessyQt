import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import {
  ArrowsRightLeftIcon,
  ChartPieIcon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import { ModalReponerStock } from "./ModalReponerStock";
import type { Producto } from "@/domain/inventarios/productos.domain";

export const DashboardPage = observer(function DashboardPage() {
  const navigate = useNavigate();
  const [modalReponerAbierto, setModalReponerAbierto] = useState(false);
  const [productoAReponer, setProductoAReponer] = useState<Producto | null>(null);
  const [cantidadProductoAReponer, setCantidadProductoAReponer] = useState(0);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const resumen = productosStore.resumen;
  const productos = productosStore.productosActivos;
  const ordenes = productosStore.ordenes;
  const sedes = productosStore.sedesActivas;

  // Stock en mano total
  const stockEnMano = productos.reduce(
    (acc, p) => acc + productosStore.cantidadDe(p.id),
    0,
  );

  // Valor potencial de venta del stock actual
  const potencialVenta = productos.reduce((acc, p) => {
    const cant = productosStore.cantidadDe(p.id);
    const pv = p.precioVenta ?? p.precioCompra * 1.35;
    return acc + pv * cant;
  }, 0);

  const gananciaPotencial = Math.max(0, potencialVenta - resumen.valorizacion);
  const margenPromedio =
    potencialVenta > 0 ? (gananciaPotencial / potencialVenta) * 100 : 0;

  // Mercancía en camino por órdenes activas
  const ordenesPendientes = ordenes.filter(
    (o) => o.estado === "en_camino" || o.estado === "confirmada",
  );
  const unidadesEnCamino = ordenesPendientes.reduce((acc, o) => acc + o.cantidad, 0);

  // Alertas de stock bajo / agotado
  const productosAlerta = productos
    .map((p) => ({
      producto: p,
      cantidad: productosStore.cantidadDe(p.id),
      semaforo: productosStore.semaforoDe(p),
    }))
    .filter((item) => item.semaforo !== "disponible")
    .slice(0, 5);

  const handleRecibirOrdenDirecto = (ordenId: string) => {
    productosStore.recibirOrden(ordenId);
    setMensajeExito("¡Mercancía ingresada al stock físico con éxito!");
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleAbrirReponer = (producto: Producto, cantidad: number) => {
    setProductoAReponer(producto);
    setCantidadProductoAReponer(cantidad);
    setModalReponerAbierto(true);
  };

  return (
    <>
      <PageMeta
        title="Dashboard de Inventario — NECTO"
        description="Centro de control operativo, valorización y logística multi-sede."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Centro de Control de Inventario (WMS)"
          descripcion="Visión consolidada de valorización, existencias por sede, compras y reposición."
          acciones={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/sedes")}
                className="cursor-pointer"
              >
                <ArrowsRightLeftIcon className="size-4 mr-1.5" />
                Traslado Sedes
              </Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                onClick={() => navigate("/inventarios/ordenes")}
              >
                <PlusIcon className="size-4 mr-1.5" />
                Nueva Orden
              </Button>
            </div>
          }
        />

        {mensajeExito && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button
              onClick={() => setMensajeExito(null)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Fila 1: KPIs Ejecutivos Financieros y Operativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Valorización de Inventario al Costo */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Valor en Bodega (Costo)
              </span>
              <span className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <CubeIcon className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatearMoneda(resumen.valorizacion)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Inversión acumulada en existencias
              </p>
            </div>
          </Card>

          {/* Card 2: Potencial Comercial y Margen */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Potencial de Venta
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ChartPieIcon className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatearMoneda(potencialVenta)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Margen proyectado: <strong className="text-emerald-600">{margenPromedio.toFixed(1)}%</strong>
              </p>
            </div>
          </Card>

          {/* Card 3: Stock Físico en Mano */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Existencias Físicas
              </span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <CubeIcon className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stockEnMano} <span className="text-sm font-normal text-gray-500">unidades</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Repartidas en {sedes.length} sedes operativas
              </p>
            </div>
          </Card>

          {/* Card 4: Abastecimiento y Compras en Tránsito */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Mercancía en Tránsito
              </span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <TruckIcon className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                +{unidadesEnCamino} <span className="text-sm font-normal text-gray-500">por recibir</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                En {ordenesPendientes.length} órdenes de compra activas
              </p>
            </div>
          </Card>
        </div>

        {/* Fila 2: Distribución por Sedes Operativas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Distribución y Estado por Sede
              </h3>
              <p className="text-xs text-gray-500">
                Existencias y salud de abastecimiento en cada bodega y sucursal.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/inventarios/sedes")}
              className="cursor-pointer"
            >
              Administrar Sedes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((sede) => {
              const res = productosStore.resumenSede(sede.id);

              return (
                <Card
                  key={sede.id}
                  className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {sede.nombre}
                    </span>
                    <Badge color="light" size="sm">
                      {res.totalProductos} SKUs
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {sede.direccion}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400">Unidades</span>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {res.totalUnidades} u
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400">Valorización</span>
                      <p className="text-base font-bold text-brand-600 dark:text-brand-400">
                        {formatearMoneda(res.valorizacion)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Estado de stock:</span>
                    {res.agotados > 0 ? (
                      <Badge variant="light" color="error" size="sm">
                        {res.agotados} agotados
                      </Badge>
                    ) : res.porAgotar > 0 ? (
                      <Badge variant="light" color="warning" size="sm">
                        {res.porAgotar} por agotar
                      </Badge>
                    ) : (
                      <Badge variant="light" color="success" size="sm">
                        Abastecida
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Órdenes Pendientes de Recepción & Alertas Críticas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card: Próximas Entregas / Recepción Rápida */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TruckIcon className="size-5 text-purple-600" />
                  Órdenes en Camino ({ordenesPendientes.length})
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mercancía pendiente de recepción física en almacén
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/ordenes")}
                className="cursor-pointer"
              >
                Ver Todas
              </Button>
            </CardHeader>
            <CardBody className="p-5">
              {ordenesPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No hay órdenes pendientes de recepción en este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {ordenesPendientes.slice(0, 4).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {ord.numero}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                            · {ord.productoNombre}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Destino: <strong className="text-gray-700 dark:text-gray-300">{ord.sedeNombre || "Sede Centro"}</strong> · {ord.cantidad} {ord.unidad}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                          onClick={() => handleRecibirOrdenDirecto(ord.id)}
                        >
                          <CheckCircleIcon className="size-3.5 mr-1" />
                          Recibir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Card: Alertas de Stock Bajo con Acción de Reabastecimiento */}
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="size-5 text-amber-500" />
                  Alertas de Desabastecimiento ({productosAlerta.length})
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Artículos por debajo del umbral mínimo de seguridad
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/inventarios/productos")}
                className="cursor-pointer"
              >
                Catálogo
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
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                          <CubeIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {producto.nombre}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Stock: <strong className={semaforo === "agotado" ? "text-red-600" : "text-amber-600"}>{cantidad}</strong> / Mínimo: {producto.minimo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="light"
                          color={semaforo === "agotado" ? "error" : "warning"}
                          size="sm"
                        >
                          {semaforo === "agotado" ? "Agotado" : "Bajo"}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-brand-500 hover:bg-brand-600 text-white text-xs px-2.5 py-1 cursor-pointer"
                          onClick={() => handleAbrirReponer(producto, cantidad)}
                        >
                          Reponer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Modal Reposición Rápida Inteligente */}
        <ModalReponerStock
          abierto={modalReponerAbierto}
          onCerrar={() => {
            setModalReponerAbierto(false);
            setProductoAReponer(null);
          }}
          producto={productoAReponer}
          cantidadActual={cantidadProductoAReponer}
          onOrdenCreada={(num) => {
            setMensajeExito(`¡Pedido de reposición ${num} enviado con éxito al proveedor!`);
            setTimeout(() => setMensajeExito(null), 5000);
          }}
        />
      </ContenedorPagina>
    </>
  );
});
