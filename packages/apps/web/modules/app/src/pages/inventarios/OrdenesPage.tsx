import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader, CardTitle } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { SearchInput } from "@/elements";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { PlusIcon, CheckLineIcon, DownloadIcon } from "@/icons";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import type { EstadoOrdenCompra } from "@/domain/inventarios/productos.domain";

export const OrdenesPage = observer(function OrdenesPage() {
  const [consulta, setConsulta] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario nueva orden
  const [productoId, setProductoId] = useState(productosStore.productos[0]?.id || "");
  const [proveedorId, setProveedorId] = useState(productosStore.proveedores[0]?.id || "");
  const [cantidad, setCantidad] = useState("20");
  const [valorTotal, setValorTotal] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [notificar, setNotificar] = useState(true);

  const ordenes = productosStore.ordenes;

  // KPIs
  const totalOrdenes = ordenes.length;
  const enCamino = ordenes.filter((o) => o.estado === "en_camino" || o.estado === "confirmada");
  const valorEnCamino = enCamino.reduce((acc, o) => acc + o.valorTotal, 0);
  const retrasadas = ordenes.filter((o) => o.estado === "retrasada");
  const devueltas = ordenes.filter((o) => o.estado === "devuelta");

  const ordenesFiltradas = ordenes.filter((o) => {
    if (!consulta) return true;
    const q = consulta.toLowerCase();
    return (
      o.productoNombre.toLowerCase().includes(q) ||
      o.numero.toLowerCase().includes(q) ||
      (o.proveedorNombre && o.proveedorNombre.toLowerCase().includes(q))
    );
  });

  const handleCrearOrden = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = productosStore.productoPorId(productoId);
    if (!prod) return;

    const cant = parseInt(cantidad, 10);
    const val = valorTotal ? parseFloat(valorTotal) : prod.precioCompra * cant;

    productosStore.crearOrden({
      productoId: prod.id,
      proveedorId,
      cantidad: cant,
      valorTotal: val,
      unidad: prod.unidad,
      fechaEntregaEstimada: fechaEntrega || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      notificar,
    });

    setModalAbierto(false);
  };

  const getEstadoBadge = (estado: EstadoOrdenCompra) => {
    switch (estado) {
      case "confirmada":
        return <Badge variant="light" color="primary">Confirmada</Badge>;
      case "en_camino":
        return <Badge variant="light" color="success">En camino</Badge>;
      case "retrasada":
        return <Badge variant="light" color="warning">Retrasada</Badge>;
      case "devuelta":
        return <Badge variant="light" color="error">Devuelta</Badge>;
      default:
        return <Badge variant="light" color="light">{estado}</Badge>;
    }
  };

  return (
    <>
      <PageMeta
        title="Órdenes de Compra — NECTO"
        description="Gestión de pedidos a proveedores y recepción de mercancía."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Órdenes de Compra a Proveedores"
          descripcion="Reabastecimiento de existencias, seguimiento de envíos y fechas de entrega."
          acciones={
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={() => setModalAbierto(true)}
            >
              <PlusIcon className="size-4 mr-1.5" />
              Nueva Orden
            </Button>
          }
        />

        {/* Tarjeta Resumen Superior ("Overall Orders") */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-gray-500">Total Órdenes</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalOrdenes}</p>
            <p className="text-xs text-gray-400 mt-1">Registradas en el sistema</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">En Camino</span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{enCamino.length}</p>
            <p className="text-xs text-gray-400 mt-1">Valor: {formatearMoneda(valorEnCamino)}</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Retrasadas</span>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{retrasadas.length}</p>
            <p className="text-xs text-gray-400 mt-1">Excedieron fecha estimada</p>
          </Card>

          <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 p-5">
            <span className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">Devueltas</span>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{devueltas.length}</p>
            <p className="text-xs text-gray-400 mt-1">Por no conformidad o daño</p>
          </Card>
        </div>

        {/* Tabla de Órdenes */}
        <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
          <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Buscar por producto, orden o proveedor..."
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500">
              {ordenesFiltradas.length} órdenes encontradas
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/5">
                <TableRow>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Número
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Producto Solicitado
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
                    Fecha Entrega
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Estado
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {ordenesFiltradas.map((ord) => (
                  <TableRow key={ord.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                      {ord.numero}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {ord.productoNombre}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs text-gray-500">
                      {ord.proveedorNombre}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-end font-medium text-sm">
                      {ord.cantidad} {ord.unidad}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-end font-semibold text-sm">
                      {formatearMoneda(ord.valorTotal)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs text-gray-500">
                      {ord.fechaEntregaEstimada}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      {getEstadoBadge(ord.estado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Modal Nueva Orden */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Nueva Orden de Compra
            </h3>

            <form onSubmit={handleCrearOrden} className="space-y-4">
              <div>
                <Label htmlFor="ordProducto">Producto a abastecer *</Label>
                <Select
                  options={productosStore.productos.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} (SKU: ${p.codigo})`,
                  }))}
                  defaultValue={productoId}
                  onChange={(val) => {
                    setProductoId(val);
                    const prod = productosStore.productoPorId(val);
                    if (prod && cantidad) {
                      setValorTotal((prod.precioCompra * parseInt(cantidad, 10)).toString());
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="ordProveedor">Proveedor *</Label>
                <Select
                  options={productosStore.proveedores.map((p) => ({
                    value: p.id,
                    label: p.nombre,
                  }))}
                  defaultValue={proveedorId}
                  onChange={(val) => setProveedorId(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ordCantidad">Cantidad *</Label>
                  <Input
                    id="ordCantidad"
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => {
                      setCantidad(e.target.value);
                      const prod = productosStore.productoPorId(productoId);
                      if (prod && e.target.value) {
                        setValorTotal((prod.precioCompra * parseInt(e.target.value, 10)).toString());
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="ordValor">Valor Total ($COP)</Label>
                  <Input
                    id="ordValor"
                    type="number"
                    placeholder="Auto o manual"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ordFecha">Fecha Estimada de Entrega</Label>
                <Input
                  id="ordFecha"
                  type="date"
                  required
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ordNotif"
                  checked={notificar}
                  onChange={(e) => setNotificar(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="ordNotif" className="text-xs text-gray-700 dark:text-gray-300">
                  Notificar en la fecha estimada de entrega
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Generar Orden
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </ContenedorPagina>
    </>
  );
});
