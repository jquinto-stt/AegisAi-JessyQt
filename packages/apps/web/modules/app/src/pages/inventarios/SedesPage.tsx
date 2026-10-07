import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import {
  BuildingStorefrontIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import type { Sede } from "@/domain/inventarios/productos.domain";

export const SedesPage = observer(function SedesPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [sedeEditando, setSedeEditando] = useState<Sede | null>(null);

  // Formulario Sede
  const [nombre, setNombre] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Formulario Traslado entre Sedes
  const [modalTraslado, setModalTraslado] = useState(false);
  const [productoIdTraslado, setProductoIdTraslado] = useState(
    productosStore.productosActivos[0]?.id || "",
  );
  const [origenSedeId, setOrigenSedeId] = useState(
    productosStore.sedesActivas[0]?.id || "",
  );
  const [destinoSedeId, setDestinoSedeId] = useState(
    productosStore.sedesActivas[1]?.id || productosStore.sedesActivas[0]?.id || "",
  );
  const [cantidadTraslado, setCantidadTraslado] = useState("5");
  const [motivoTraslado, setMotivoTraslado] = useState("Rebalanceo de inventario");
  const [errorTraslado, setErrorTraslado] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const sedes = productosStore.sedesActivas;
  const traslados = productosStore.traslados;

  // Stock disponible en sede origen para el producto seleccionado
  const existenciaEnOrigen =
    productosStore.existencias.find(
      (e) => e.productoId === productoIdTraslado && e.sedeId === origenSedeId,
    )?.cantidad ?? 0;

  const abrirModalCrear = () => {
    setSedeEditando(null);
    setNombre("");
    setNombreComercial("");
    setDireccion("");
    setCiudad("Bogotá");
    setTelefono("");
    setError(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (sede: Sede) => {
    setSedeEditando(sede);
    setNombre(sede.nombre);
    setNombreComercial(sede.nombreComercial || sede.nombre);
    setDireccion(sede.direccion);
    setCiudad(sede.ciudad);
    setTelefono(sede.telefono);
    setError(null);
    setModalAbierto(true);
  };

  const abrirModalTraslado = () => {
    setProductoIdTraslado(productosStore.productosActivos[0]?.id || "");
    setOrigenSedeId(sedes[0]?.id || "");
    setDestinoSedeId(sedes[1]?.id || sedes[0]?.id || "");
    setCantidadTraslado("5");
    setMotivoTraslado("Rebalanceo de inventario");
    setErrorTraslado(null);
    setModalTraslado(true);
  };

  const handleGuardarSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (sedeEditando) {
      const res = productosStore.actualizarSede(sedeEditando.id, {
        nombre,
        nombreComercial,
        direccion,
        ciudad,
        telefono,
      });
      if (!res.ok) {
        setError(res.motivo || "Error al actualizar sede");
        return;
      }
    } else {
      const res = productosStore.crearSede({
        nombre,
        nombreComercial,
        direccion,
        ciudad,
        telefono,
      });
      if (!res.ok) {
        setError(res.motivo || "Error al crear sede");
        return;
      }
    }
    setModalAbierto(false);
  };

  const handleEjecutarTraslado = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTraslado(null);
    const cant = parseInt(cantidadTraslado, 10);
    if (isNaN(cant) || cant <= 0) {
      setErrorTraslado("Ingresa una cantidad válida mayor a 0");
      return;
    }

    const res = productosStore.trasladarStock({
      productoId: productoIdTraslado,
      sedeOrigenId: origenSedeId,
      sedeDestinoId: destinoSedeId,
      cantidad: cant,
      motivo: motivoTraslado,
    });

    if (!res.ok) {
      setErrorTraslado(res.motivo || "No se pudo realizar el traslado");
      return;
    }

    setMensajeExito(
      `Traslado completado: se movieron ${cant} unidades hacia ${productosStore.nombreDeSede(destinoSedeId)}.`,
    );
    setTimeout(() => setMensajeExito(null), 5000);
    setModalTraslado(false);
  };

  return (
    <>
      <PageMeta
        title="Gestión de Sedes y Traslados — NECTO"
        description="Administración de sucursales, existencias por sede y transferencias internas."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Gestión de Sedes y Distribución"
          descripcion="Puntos de venta, tiendas físicas y transferencias de mercancía entre bodegas."
          acciones={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={abrirModalTraslado}
                className="cursor-pointer"
              >
                <ArrowsRightLeftIcon className="size-4 mr-1.5" />
                Traslado entre Sedes
              </Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                onClick={abrirModalCrear}
              >
                <PlusIcon className="size-4 mr-1.5" />
                Añadir Sede
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
              type="button"
              onClick={() => setMensajeExito(null)}
              className="text-xs text-emerald-700 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tarjetas de Sedes con Valorización y Existencias */}
        <div className="space-y-4 mb-8">
          {sedes.map((sede) => {
            const resumen = productosStore.resumenSede(sede.id);

            return (
              <Card
                key={sede.id}
                className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 overflow-hidden hover:border-gray-200 dark:hover:border-white/10 transition-colors"
              >
                <CardBody className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                    {/* Identificación de Sede */}
                    <div className="lg:col-span-4 p-6 bg-gray-50/70 dark:bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-white/5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                        <BuildingStorefrontIcon className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                            {sede.nombre}
                          </h3>
                          <Badge color="success" size="sm">Activa</Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {sede.nombreComercial || sede.nombre}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {sede.direccion} · {sede.ciudad}
                        </p>
                      </div>
                    </div>

                    {/* Métricas Operativas y Financieras de la Sede */}
                    <div className="lg:col-span-6 p-6 grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[11px] font-semibold uppercase text-gray-400">
                          Catálogo
                        </span>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                          {resumen.totalProductos} SKUs
                        </p>
                        <p className="text-xs text-gray-500">
                          {resumen.totalUnidades} unidades
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold uppercase text-gray-400">
                          Valor en Bodega
                        </span>
                        <p className="text-lg font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                          {formatearMoneda(resumen.valorizacion)}
                        </p>
                        <p className="text-xs text-gray-500">Al costo de compra</p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold uppercase text-gray-400">
                          Salud de Stock
                        </span>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {resumen.agotados > 0 && (
                            <Badge variant="light" color="error" size="sm">
                              {resumen.agotados} agotados
                            </Badge>
                          )}
                          {resumen.porAgotar > 0 && (
                            <Badge variant="light" color="warning" size="sm">
                              {resumen.porAgotar} por agotar
                            </Badge>
                          )}
                          {resumen.agotados === 0 && resumen.porAgotar === 0 && (
                            <Badge variant="light" color="success" size="sm">
                              Abastecida
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="lg:col-span-2 p-6 flex justify-end lg:justify-center border-t lg:border-t-0 border-gray-100 dark:border-white/5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalEditar(sede)}
                        className="cursor-pointer"
                      >
                        Editar Sede
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Historial de Traslados de Mercancía */}
        <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
          <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Historial de Traslados entre Sedes
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Trazabilidad y rebalanceos de existencias entre sucursales y bodegas físicas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={abrirModalTraslado}
              className="cursor-pointer"
            >
              Nuevo Traslado
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            {traslados.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowsRightLeftIcon className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No hay traslados registrados todavía
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Transfiere unidades de un producto entre tus diferentes sedes para rebalancear inventario.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Código
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Producto
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Sede Origen
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Sede Destino
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                      Cantidad
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Motivo
                    </TableCell>
                    <TableCell header className="px-5 py-3 text-xs text-gray-500">
                      Fecha
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {traslados.map((trs) => (
                    <TableRow key={trs.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                      <TableCell className="px-5 py-3 font-semibold text-xs text-gray-900 dark:text-white">
                        {trs.numero}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                        {trs.productoNombre}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {trs.sedeOrigenNombre}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {trs.sedeDestinoNombre}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-end font-bold text-sm text-brand-600 dark:text-brand-400">
                        {trs.cantidad} u
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-gray-500">
                        {trs.motivo || "Rebalanceo"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-gray-400">
                        {new Date(trs.createdAt).toLocaleDateString("es-CO")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Modal Crear / Editar Sede */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {sedeEditando ? "Editar Sede" : "Nueva Sede / Sucursal"}
            </h3>

            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleGuardarSede} className="space-y-4">
              <div>
                <Label htmlFor="sedeNombre">Nombre interno de la sede *</Label>
                <Input
                  id="sedeNombre"
                  required
                  placeholder="Ej. Sede Norte, Bodega Envigado"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sedeComercial">Nombre comercial (Rótulo)</Label>
                <Input
                  id="sedeComercial"
                  placeholder="Ej. Necto Store Chapinero"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sedeDireccion">Dirección física *</Label>
                <Input
                  id="sedeDireccion"
                  required
                  placeholder="Ej. Carrera 15 # 82-14"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sedeCiudad">Ciudad *</Label>
                  <Input
                    id="sedeCiudad"
                    required
                    placeholder="Ej. Bogotá"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sedeTelefono">Teléfono de contacto</Label>
                  <Input
                    id="sedeTelefono"
                    placeholder="Ej. 601 555 0182"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
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
                  className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                >
                  {sedeEditando ? "Guardar Cambios" : "Crear Sede"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Modal Traslado de Mercancía */}
        <Modal
          isOpen={modalTraslado}
          onClose={() => setModalTraslado(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Traslado de Stock entre Sedes
            </h3>
            <p className="text-xs text-gray-500">
              Mueve existencias reales de una sede a otra con validación de disponibilidad y trazabilidad en kárdex.
            </p>

            {errorTraslado && (
              <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 rounded-xl">
                {errorTraslado}
              </div>
            )}

            <form onSubmit={handleEjecutarTraslado} className="space-y-4">
              <div>
                <Label htmlFor="trasProducto">Producto a transferir *</Label>
                <Select
                  options={productosStore.productosActivos.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} (SKU: ${p.codigo})`,
                  }))}
                  defaultValue={productoIdTraslado}
                  onChange={(val) => setProductoIdTraslado(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="trasOrigen">Sede Origen *</Label>
                  <Select
                    options={sedes.map((s) => ({
                      value: s.id,
                      label: s.nombre,
                    }))}
                    defaultValue={origenSedeId}
                    onChange={(val) => setOrigenSedeId(val)}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Disponible: <strong className="text-brand-600">{existenciaEnOrigen} u</strong>
                  </p>
                </div>

                <div>
                  <Label htmlFor="trasDestino">Sede Destino *</Label>
                  <Select
                    options={sedes.map((s) => ({
                      value: s.id,
                      label: s.nombre,
                    }))}
                    defaultValue={destinoSedeId}
                    onChange={(val) => setDestinoSedeId(val)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="trasCantidad">Cantidad a mover *</Label>
                <Input
                  id="trasCantidad"
                  type="number"
                  min="1"
                  max={existenciaEnOrigen > 0 ? String(existenciaEnOrigen) : undefined}
                  required
                  value={cantidadTraslado}
                  onChange={(e) => setCantidadTraslado(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="trasMotivo">Motivo o justificación</Label>
                <Input
                  id="trasMotivo"
                  placeholder="Ej. Rebalanceo de inventario, Pedido urgente"
                  value={motivoTraslado}
                  onChange={(e) => setMotivoTraslado(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalTraslado(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                >
                  Efectuar Traslado
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </ContenedorPagina>
    </>
  );
});
