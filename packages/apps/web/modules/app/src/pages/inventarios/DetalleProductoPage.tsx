import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import { SEMAFORO_META } from "./productos.constants";
import { ModalProducto } from "./ModalProducto";
import { ModalReponerStock } from "./ModalReponerStock";

type TabTipo = "overview" | "purchases" | "adjustments" | "history";

export const DetalleProductoPage = observer(function DetalleProductoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tabActiva, setTabActiva] = useState<TabTipo>("overview");
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalReponerAbierto, setModalReponerAbierto] = useState(false);

  // Estado para modal/formulario de ajuste rápido
  const [ajusteSedeId, setAjusteSedeId] = useState("");
  const [ajusteNuevaCantidad, setAjusteNuevaCantidad] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState<any>("conteo");
  const [ajusteNotas, setAjusteNotas] = useState("");
  const [mostrarFormAjuste, setMostrarFormAjuste] = useState(false);

  const producto = productosStore.productoPorId(id);

  if (!producto) {
    return (
      <ContenedorPagina>
        <div className="py-12 text-center">
          <p className="text-gray-500 mb-4">El producto solicitado no existe o fue retirado.</p>
          <Button onClick={() => navigate("/inventarios/productos")}>
            Volver al catálogo
          </Button>
        </div>
      </ContenedorPagina>
    );
  }

  const stockTotal = productosStore.cantidadDe(producto.id);
  const semaforo = productosStore.semaforoDe(producto);
  const meta = SEMAFORO_META[semaforo];
  const existenciasPorSede = productosStore.existenciasDe(producto.id);
  const ordenesProducto = productosStore.ordenes.filter(
    (o) => o.productoId === producto.id,
  );
  const ajustesProducto = productosStore.ajustesDe(producto.id);
  const enCamino = ordenesProducto
    .filter((o) => o.estado === "en_camino" || o.estado === "confirmada")
    .reduce((acc, o) => acc + o.cantidad, 0);

  const proveedor = productosStore.proveedores.find(
    (p) => p.productoPrincipal.toLowerCase().includes(producto.nombre.toLowerCase()),
  ) || productosStore.proveedores[0];

  const handleGuardarAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    const sedeId = ajusteSedeId || existenciasPorSede[0]?.sede.id;
    const cant = parseInt(ajusteNuevaCantidad, 10);
    if (!sedeId || isNaN(cant) || cant < 0) return;

    productosStore.ajustarStock(
      producto.id,
      sedeId,
      cant,
      ajusteMotivo,
      ajusteNotas,
    );
    setMostrarFormAjuste(false);
    setAjusteNuevaCantidad("");
    setAjusteNotas("");
  };

  return (
    <>
      <PageMeta
        title={`${producto.nombre} — Ficha de Producto`}
        description={`Detalle, stock por sede y trazabilidad de ${producto.nombre}`}
      />

      <ContenedorPagina>
        <div className="mb-4">
          <EnlaceVolver onClick={() => navigate("/inventarios/productos")}>
            ← Volver al catálogo de productos
          </EnlaceVolver>
        </div>

        <CabeceraPagina
          titulo={producto.nombre}
          descripcion={`SKU: ${producto.codigo} · Categoría: ${producto.categoria} · Unidad: ${producto.unidad}`}
          acciones={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalEditarAbierto(true)}
              >
                <PencilSquareIcon className="size-4 mr-1.5" />
                Editar producto
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/40 cursor-pointer"
                onClick={() => setModalReponerAbierto(true)}
              >
                <ShoppingBagIcon className="size-4 mr-1.5" />
                Reponer Stock
              </Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                onClick={() => {
                  setTabActiva("adjustments");
                  setMostrarFormAjuste(true);
                }}
              >
                <PlusIcon className="size-4 mr-1.5" />
                Ajustar Stock
              </Button>
            </div>
          }
        />

        {/* Barra de Pestañas */}
        <div className="flex border-b border-gray-200 dark:border-white/10 mb-6 gap-6">
          <button
            onClick={() => setTabActiva("overview")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              tabActiva === "overview"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            General (Overview)
          </button>
          <button
            onClick={() => setTabActiva("purchases")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              tabActiva === "purchases"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Compras ({ordenesProducto.length})
          </button>
          <button
            onClick={() => setTabActiva("adjustments")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              tabActiva === "adjustments"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Ajustes de Stock ({ajustesProducto.length})
          </button>
          <button
            onClick={() => setTabActiva("history")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              tabActiva === "history"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Historial / Kardex
          </button>
        </div>

        {/* CONTENIDO DE PESTAÑAS */}

        {/* Tab 1: OVERVIEW */}
        {tabActiva === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 2 Columnas Izquierda: Datos Principales, Proveedor y Sedes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card Datos Principales */}
              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
                <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5">
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                    Datos del Producto
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.nombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Código / SKU</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.codigo}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Categoría</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.categoria}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Precio Compra</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {formatearMoneda(producto.precioCompra)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Precio Venta</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatearMoneda(producto.precioVenta ?? Math.round(producto.precioCompra * 1.3))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Impuesto</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5 uppercase">
                        {producto.impuesto ? producto.impuesto.replace("_", " ") : "IVA 19%"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Umbral Mínimo</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.minimo} {producto.unidad}s
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Catálogo Virtual</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.publicarEnCatalogo !== false ? "Visible (Online)" : "Oculto"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Vencimiento</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {producto.vencimiento || "No aplica"}
                      </p>
                    </div>
                  </div>

                  {producto.descripcion && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Descripción / Detalles</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                        {producto.descripcion}
                      </p>
                    </div>
                  )}

                  {/* Datos del Proveedor */}
                  {proveedor && (
                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Proveedor Asignado
                      </p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {proveedor.nombre}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Teléfono: {proveedor.telefono} · Email: {proveedor.email}
                          </p>
                        </div>
                        <Badge
                          variant="light"
                          color={proveedor.aceptaDevoluciones ? "success" : "light"}
                        >
                          {proveedor.aceptaDevoluciones ? "Acepta devoluciones" : "Venta en firme"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Card Stock por Sedes (Stock Locations) */}
              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
                <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                      Existencias por Sede (Stock Locations)
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Distribución física del producto en cada sucursal o bodega
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTabActiva("adjustments");
                      setMostrarFormAjuste(true);
                    }}
                  >
                    Ajustar
                  </Button>
                </CardHeader>
                <CardBody className="p-0">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Sede / Bodega
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Dirección
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Stock en Mano
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                      {existenciasPorSede.map(({ sede, cantidad }) => (
                        <TableRow key={sede.id}>
                          <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                            {sede.nombre}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-gray-500">
                            {sede.direccion}, {sede.ciudad}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end font-bold text-brand-600 dark:text-brand-400 text-sm">
                            {cantidad} {producto.unidad}s
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>

            {/* 1 Columna Derecha: Tarjeta de Métricas e Imagen */}
            <div className="space-y-6">
              <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
                <CardBody className="p-5 text-center">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4 overflow-hidden border border-gray-100 dark:border-white/5">
                    {producto.imagenDataUrl ? (
                      <img
                        src={producto.imagenDataUrl}
                        alt={producto.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="size-12" />
                    )}
                  </div>

                  <Badge
                    variant="light"
                    color={
                      semaforo === "disponible"
                        ? "success"
                        : semaforo === "bajo"
                          ? "warning"
                          : "error"
                    }
                    className="mb-4"
                  >
                    {meta.label}
                  </Badge>

                  <div className="grid grid-cols-2 gap-3 text-start pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Stock Actual</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                        {stockTotal}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                      <p className="text-xs text-gray-500 dark:text-gray-400">En Camino</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        {enCamino}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Umbral Alerta</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {producto.minimo}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                        {formatearMoneda(producto.precioCompra * stockTotal)}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: COMPRAS */}
        {tabActiva === "purchases" && (
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Órdenes de Compra Asociadas
              </CardTitle>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white"
                onClick={() => navigate("/inventarios/ordenes")}
              >
                Crear Orden
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              {ordenesProducto.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  No hay órdenes de compra registradas para este producto.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/5">
                    <TableRow>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500">
                        Número
                      </TableCell>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500">
                        Proveedor
                      </TableCell>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                        Cantidad
                      </TableCell>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                        Valor Total
                      </TableCell>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500">
                        Entrega Estimada
                      </TableCell>
                      <TableCell header className="px-5 py-3 text-xs text-gray-500">
                        Estado
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                    {ordenesProducto.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                          {o.numero}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {o.proveedorNombre}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-end font-medium text-sm">
                          {o.cantidad} {o.unidad}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-end font-semibold text-sm">
                          {formatearMoneda(o.valorTotal)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-xs text-gray-500">
                          {o.fechaEntregaEstimada}
                        </TableCell>
                        <TableCell className="px-5 py-3">
                          <Badge
                            variant="light"
                            color={
                              o.estado === "confirmada"
                                ? "primary"
                                : o.estado === "en_camino"
                                  ? "success"
                                  : o.estado === "retrasada"
                                    ? "warning"
                                    : "light"
                            }
                          >
                            {o.estado.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}

        {/* Tab 3: AJUSTES DE STOCK */}
        {tabActiva === "adjustments" && (
          <div className="space-y-6">
            {mostrarFormAjuste && (
              <Card className="rounded-2xl border border-brand-200 dark:border-brand-500/20 bg-brand-50/30 dark:bg-brand-500/5 p-5">
                <form onSubmit={handleGuardarAjuste} className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Registrar Ajuste Manual de Existencias
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ajusteSede">Sede</Label>
                      <Select
                        options={existenciasPorSede.map((e) => ({
                          value: e.sede.id,
                          label: `${e.sede.nombre} (actual: ${e.cantidad})`,
                        }))}
                        defaultValue={existenciasPorSede[0]?.sede.id}
                        onChange={(val) => setAjusteSedeId(val)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ajusteCant">Nueva Cantidad en Mano</Label>
                      <Input
                        id="ajusteCant"
                        type="number"
                        min="0"
                        required
                        placeholder="Ej. 25"
                        value={ajusteNuevaCantidad}
                        onChange={(e) => setAjusteNuevaCantidad(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ajusteMotivo">Motivo del Ajuste</Label>
                      <Select
                        options={[
                          { value: "conteo", label: "Conteo / Auditoría física" },
                          { value: "merma", label: "Merma / Daño de producto" },
                          { value: "vencimiento", label: "Caducidad / Vencimiento" },
                          { value: "ingreso_manual", label: "Ingreso manual / Donación" },
                        ]}
                        defaultValue="conteo"
                        onChange={(val) => setAjusteMotivo(val as any)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ajusteNotas">Notas o justificación</Label>
                    <Input
                      id="ajusteNotas"
                      placeholder="Ej. Ajuste tras inventario de cierre de semana"
                      value={ajusteNotas}
                      onChange={(e) => setAjusteNotas(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFormAjuste(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      Guardar Ajuste
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
              <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Histórico de Ajustes de Stock
                </CardTitle>
                {!mostrarFormAjuste && (
                  <Button
                    size="sm"
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                    onClick={() => setMostrarFormAjuste(true)}
                  >
                    + Nuevo Ajuste
                  </Button>
                )}
              </CardHeader>
              <CardBody className="p-0">
                {ajustesProducto.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    No se han registrado ajustes manuales de inventario para este producto.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Fecha
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Sede
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Cant. Anterior
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                          Nueva Cantidad
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Motivo
                        </TableCell>
                        <TableCell header className="px-5 py-3 text-xs text-gray-500">
                          Notas
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                      {ajustesProducto.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="px-5 py-3 text-xs text-gray-500">
                            {new Date(a.fecha).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell className="px-5 py-3 font-medium text-sm">
                            {productosStore.nombreDeSede(a.sedeId)}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end text-sm text-gray-500">
                            {a.cantidadAnterior}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-end font-bold text-sm text-brand-600">
                            {a.cantidadNueva}
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <Badge variant="light" color="light">
                              {a.motivo}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-gray-500">
                            {a.notas || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Tab 4: HISTORIAL / KARDEX */}
        {tabActiva === "history" && (
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
            <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Kárdex de Movimientos
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <ClockIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Alta inicial de producto
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Fecha: {new Date(producto.createdAt).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>

                {ajustesProducto.map((aj) => (
                  <div
                    key={aj.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5"
                  >
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <ExclamationTriangleIcon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Ajuste de existencias ({aj.motivo}) en {productosStore.nombreDeSede(aj.sedeId)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cambió de {aj.cantidadAnterior} a {aj.cantidadNueva} unidades · {aj.notas}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Modal de edición */}
        <ModalProducto
          abierto={modalEditarAbierto}
          onCerrar={() => setModalEditarAbierto(false)}
          producto={producto}
          categorias={productosStore.categorias}
          soloLectura={false}
          onGuardar={(datos) => productosStore.actualizarProducto(producto.id, datos)}
        />

        {/* Modal de reposición rápida */}
        <ModalReponerStock
          abierto={modalReponerAbierto}
          onCerrar={() => setModalReponerAbierto(false)}
          producto={producto}
          cantidadActual={stockTotal}
          onOrdenCreada={() => {
            setTabActiva("purchases");
          }}
        />
      </ContenedorPagina>
    </>
  );
});
