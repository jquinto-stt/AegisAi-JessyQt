import { useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody, CardHeader } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/elements/ui/table";
import { Badge } from "@/elements/ui/badge";
import { SearchInput } from "@/elements";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  ArrowUpTrayIcon,
  ShoppingBagIcon,
  InformationCircleIcon,
  PlusIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import type { Proveedor, OrdenCompra } from "@/domain/inventarios/productos.domain";

export const ProveedoresPage = observer(function ProveedoresPage() {
  const [consulta, setConsulta] = useState("");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal nuevo proveedor
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [productoPrincipal, setProductoPrincipal] = useState("");
  const [categoria, setCategoria] = useState("Despensa");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [aceptaDevoluciones, setAceptaDevoluciones] = useState(true);
  const [precioBase, setPrecioBase] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // Modal editar proveedor
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editProductoPrincipal, setEditProductoPrincipal] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAceptaDevoluciones, setEditAceptaDevoluciones] = useState(true);
  const [editLogoDataUrl, setEditLogoDataUrl] = useState<string | null>(null);
  const inputEditLogoRef = useRef<HTMLInputElement>(null);

  // Modal detalle de proveedor
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [proveedorDetalle, setProveedorDetalle] = useState<Proveedor | null>(null);

  // Modal crear orden rápida para proveedor
  const [modalOrdenAbierto, setModalOrdenAbierto] = useState(false);
  const [proveedorParaOrden, setProveedorParaOrden] = useState<Proveedor | null>(null);
  const [ordenProductoId, setOrdenProductoId] = useState(productosStore.productos[0]?.id || "");
  const [ordenSedeId, setOrdenSedeId] = useState(productosStore.sedesActivas[0]?.id || "");
  const [ordenCantidad, setOrdenCantidad] = useState("20");
  const [ordenValorTotal, setOrdenValorTotal] = useState("");
  const [ordenFecha, setOrdenFecha] = useState("");

  const proveedores = productosStore.proveedores;

  const proveedoresFiltrados = proveedores.filter((p) => {
    if (!consulta) return true;
    const q = consulta.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.productoPrincipal.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const handleCrearProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const res = productosStore.crearProveedor({
      nombre,
      logoDataUrl,
      productoPrincipal,
      categoria,
      telefono,
      email,
      aceptaDevoluciones,
      precioBase: precioBase ? parseFloat(precioBase) : undefined,
    });

    if (res.ok) {
      setMensajeExito(`Proveedor "${nombre}" registrado con éxito.`);
      setTimeout(() => setMensajeExito(null), 4000);
    }

    setModalAbierto(false);
    setNombre("");
    setProductoPrincipal("");
    setTelefono("");
    setEmail("");
    setPrecioBase("");
    setLogoDataUrl(null);
  };

  const handleAbrirEditar = (prov: Proveedor) => {
    setProveedorAEditar(prov);
    setEditNombre(prov.nombre);
    setEditProductoPrincipal(prov.productoPrincipal);
    setEditCategoria(prov.categoria);
    setEditTelefono(prov.telefono);
    setEditEmail(prov.email);
    setEditAceptaDevoluciones(prov.aceptaDevoluciones);
    setEditLogoDataUrl(prov.logoDataUrl || null);
    setModalEditarAbierto(true);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorAEditar || !editNombre.trim()) return;

    const res = productosStore.actualizarProveedor(proveedorAEditar.id, {
      nombre: editNombre,
      logoDataUrl: editLogoDataUrl,
      productoPrincipal: editProductoPrincipal,
      categoria: editCategoria,
      telefono: editTelefono,
      email: editEmail,
      aceptaDevoluciones: editAceptaDevoluciones,
    });

    if (res.ok) {
      setMensajeExito(`Proveedor "${editNombre}" actualizado correctamente.`);
      setTimeout(() => setMensajeExito(null), 4000);
      setModalEditarAbierto(false);
      setProveedorAEditar(null);
    }
  };

  const handleAbrirDetalle = (prov: Proveedor) => {
    setProveedorDetalle(prov);
    setModalDetalleAbierto(true);
  };

  const handleAbrirCrearOrden = (prov: Proveedor) => {
    setProveedorParaOrden(prov);
    const primerProd = productosStore.productos[0];
    setOrdenProductoId(primerProd?.id || "");
    setOrdenSedeId(productosStore.sedesActivas[0]?.id || "");
    setOrdenCantidad("25");
    if (primerProd) {
      setOrdenValorTotal((primerProd.precioCompra * 25).toString());
    }
    setOrdenFecha(new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]);
    setModalOrdenAbierto(true);
  };

  const handleCrearOrdenParaProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorParaOrden) return;
    const prod = productosStore.productoPorId(ordenProductoId);
    if (!prod) return;

    const cant = parseInt(ordenCantidad, 10);
    const val = ordenValorTotal ? parseFloat(ordenValorTotal) : prod.precioCompra * cant;

    const res = productosStore.crearOrden({
      productoId: prod.id,
      proveedorId: proveedorParaOrden.id,
      sedeId: ordenSedeId,
      cantidad: cant,
      valorTotal: val,
      unidad: prod.unidad,
      fechaEntregaEstimada: ordenFecha || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      notificar: true,
    });

    if (res.ok) {
      setMensajeExito(`Orden de compra generada para ${proveedorParaOrden.nombre} (${cant} ${prod.unidad}).`);
      setTimeout(() => setMensajeExito(null), 4000);
      setModalOrdenAbierto(false);
      setProveedorParaOrden(null);
    }
  };

  // Órdenes asociadas al proveedor en detalle
  const ordenesDelProveedor: OrdenCompra[] = proveedorDetalle
    ? productosStore.ordenes.filter((o) => o.proveedorId === proveedorDetalle.id)
    : [];

  return (
    <>
      <PageMeta
        title="Proveedores — NECTO"
        description="Directorio de abastecimiento, políticas de devolución y órdenes de compra."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Proveedores Comerciales"
          descripcion="Directorio de abastecimiento, políticas comerciales y emisión directa de órdenes de compra."
          acciones={
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={() => setModalAbierto(true)}
            >
              <PlusIcon className="size-4 mr-1.5" />
              Nuevo Proveedor
            </Button>
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

        <Card className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900">
          <CardHeader className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Buscar por nombre, producto o correo..."
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500">
              {proveedoresFiltrados.length} proveedores registrados
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/5">
                <TableRow>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Proveedor
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Producto Principal
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Teléfono
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Correo Electrónico
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500">
                    Política de Devolución
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                    En Camino
                  </TableCell>
                  <TableCell header className="px-5 py-3 text-xs text-gray-500 text-end">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {proveedoresFiltrados.map((prov) => (
                  <TableRow key={prov.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                      <div className="flex items-center gap-3">
                        {prov.logoDataUrl ? (
                          <img
                            src={prov.logoDataUrl}
                            alt={prov.nombre}
                            className="h-8 w-8 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-white/10"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold text-xs ring-1 ring-brand-100 dark:ring-brand-500/20">
                            {prov.nombre.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="block truncate font-semibold text-gray-900 dark:text-white text-sm">
                            {prov.nombre}
                          </span>
                          <span className="block truncate text-theme-xs text-gray-400 font-normal">
                            {prov.categoria}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {prov.productoPrincipal}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs text-gray-500">
                      {prov.telefono}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs text-gray-500">
                      {prov.email}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <Badge
                        variant="light"
                        color={prov.aceptaDevoluciones ? "success" : "error"}
                      >
                        {prov.aceptaDevoluciones ? "Acepta devoluciones" : "No acepta devoluciones"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-end font-semibold text-sm text-blue-600 dark:text-blue-400">
                      {prov.enCamino > 0 ? `${prov.enCamino} unds` : "—"}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="bg-brand-500 hover:bg-brand-600 text-white text-xs px-2.5 py-1"
                          onClick={() => handleAbrirCrearOrden(prov)}
                        >
                          <ShoppingBagIcon className="size-3.5 mr-1" />
                          Crear Orden
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 py-1"
                          onClick={() => handleAbrirDetalle(prov)}
                        >
                          <InformationCircleIcon className="size-3.5 mr-1" />
                          Ficha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 py-1"
                          onClick={() => handleAbrirEditar(prov)}
                        >
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Modal Nuevo Proveedor */}
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Nuevo Proveedor Comercial
            </h3>

            <form onSubmit={handleCrearProveedor} className="space-y-4">
              <div>
                <Label htmlFor="provNombre">Razón Social o Nombre Comercial *</Label>
                <Input
                  id="provNombre"
                  required
                  placeholder="Ej. Distribuidora del Norte SAS"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Logo o distintivo comercial</Label>
                {logoDataUrl ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <img
                      src={logoDataUrl}
                      alt="Logo proveedor"
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => inputLogoRef.current?.click()}
                      >
                        Cambiar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-error-600"
                        onClick={() => setLogoDataUrl(null)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputLogoRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] text-theme-xs text-gray-500 transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Subir logo de la empresa (PNG, JPG)</span>
                  </button>
                )}
                <input
                  ref={inputLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setLogoDataUrl(typeof r.result === "string" ? r.result : null);
                    r.readAsDataURL(f);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="provProducto">Producto o línea principal suministrada</Label>
                <Input
                  id="provProducto"
                  placeholder="Ej. Lácteos, Aseo, Grano seleccionado"
                  value={productoPrincipal}
                  onChange={(e) => setProductoPrincipal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="provTel">Teléfono</Label>
                  <Input
                    id="provTel"
                    placeholder="Ej. 310 555 1234"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="provEmail">Correo electrónico</Label>
                  <Input
                    id="provEmail"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="provPolitica">Política de Devolución</Label>
                <Select
                  options={[
                    { value: "si", label: "Acepta devoluciones (Taking Return)" },
                    { value: "no", label: "Venta en firme / No acepta devoluciones" },
                  ]}
                  defaultValue="si"
                  onChange={(val) => setAceptaDevoluciones(val === "si")}
                />
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
                  Guardar Proveedor
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Modal Editar Proveedor */}
        <Modal
          isOpen={modalEditarAbierto}
          onClose={() => setModalEditarAbierto(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Editar Proveedor
            </h3>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div>
                <Label htmlFor="editProvNombre">Razón Social o Nombre *</Label>
                <Input
                  id="editProvNombre"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Logo o distintivo comercial</Label>
                {editLogoDataUrl ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <img
                      src={editLogoDataUrl}
                      alt="Logo proveedor"
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => inputEditLogoRef.current?.click()}
                      >
                        Cambiar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-error-600"
                        onClick={() => setEditLogoDataUrl(null)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputEditLogoRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 text-theme-xs text-gray-500 transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Subir logo de la empresa</span>
                  </button>
                )}
                <input
                  ref={inputEditLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setEditLogoDataUrl(typeof r.result === "string" ? r.result : null);
                    r.readAsDataURL(f);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="editProvProd">Línea Principal Suministrada</Label>
                <Input
                  id="editProvProd"
                  value={editProductoPrincipal}
                  onChange={(e) => setEditProductoPrincipal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editProvTel">Teléfono</Label>
                  <Input
                    id="editProvTel"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="editProvEmail">Correo Electrónico</Label>
                  <Input
                    id="editProvEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editProvPol">Política de Devolución</Label>
                <Select
                  options={[
                    { value: "si", label: "Acepta devoluciones (Taking Return)" },
                    { value: "no", label: "Venta en firme / No acepta devoluciones" },
                  ]}
                  defaultValue={editAceptaDevoluciones ? "si" : "no"}
                  onChange={(val) => setEditAceptaDevoluciones(val === "si")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEditarAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Modal Crear Orden de Compra para Proveedor */}
        <Modal
          isOpen={modalOrdenAbierto}
          onClose={() => setModalOrdenAbierto(false)}
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Emitir Orden a {proveedorParaOrden?.nombre}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Línea principal: {proveedorParaOrden?.productoPrincipal} · {proveedorParaOrden?.aceptaDevoluciones ? "Acepta devoluciones" : "Venta en firme"}
              </p>
            </div>

            <form onSubmit={handleCrearOrdenParaProveedor} className="space-y-4">
              <div>
                <Label htmlFor="provOrdProd">Producto a solicitar *</Label>
                <Select
                  options={productosStore.productos.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} (SKU: ${p.codigo})`,
                  }))}
                  defaultValue={ordenProductoId}
                  onChange={(val) => {
                    setOrdenProductoId(val);
                    const prod = productosStore.productoPorId(val);
                    if (prod && ordenCantidad) {
                      setOrdenValorTotal((prod.precioCompra * parseInt(ordenCantidad, 10)).toString());
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="provOrdSede">Sede de Destino *</Label>
                <Select
                  options={productosStore.sedesActivas.map((s) => ({
                    value: s.id,
                    label: s.nombre,
                  }))}
                  defaultValue={ordenSedeId}
                  onChange={(val) => setOrdenSedeId(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="provOrdCant">Cantidad *</Label>
                  <Input
                    id="provOrdCant"
                    type="number"
                    min="1"
                    required
                    value={ordenCantidad}
                    onChange={(e) => {
                      setOrdenCantidad(e.target.value);
                      const prod = productosStore.productoPorId(ordenProductoId);
                      if (prod && e.target.value) {
                        setOrdenValorTotal((prod.precioCompra * parseInt(e.target.value, 10)).toString());
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="provOrdVal">Valor Total ($COP)</Label>
                  <Input
                    id="provOrdVal"
                    type="number"
                    value={ordenValorTotal}
                    onChange={(e) => setOrdenValorTotal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="provOrdFecha">Fecha Estimada de Entrega</Label>
                <Input
                  id="provOrdFecha"
                  type="date"
                  required
                  value={ordenFecha}
                  onChange={(e) => setOrdenFecha(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOrdenAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Enviar Orden de Compra
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Modal Detalle / Ficha del Proveedor */}
        <Modal
          isOpen={modalDetalleAbierto}
          onClose={() => setModalDetalleAbierto(false)}
          className="max-w-2xl p-6"
        >
          {proveedorDetalle && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {proveedorDetalle.logoDataUrl ? (
                    <img
                      src={proveedorDetalle.logoDataUrl}
                      alt={proveedorDetalle.nombre}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold text-lg flex items-center justify-center">
                      {proveedorDetalle.nombre.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {proveedorDetalle.nombre}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {proveedorDetalle.categoria} · {proveedorDetalle.productoPrincipal}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                  onClick={() => {
                    setModalDetalleAbierto(false);
                    handleAbrirCrearOrden(proveedorDetalle);
                  }}
                >
                  <ShoppingBagIcon className="size-4 mr-1.5" />
                  Nueva Orden
                </Button>
              </div>

              {/* Tarjetas resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-white/5">
                  <span className="text-[11px] font-medium text-gray-500 uppercase">Mercancía en camino</span>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {proveedorDetalle.enCamino} unds
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-white/5">
                  <span className="text-[11px] font-medium text-gray-500 uppercase">Órdenes registradas</span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {ordenesDelProveedor.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-white/5">
                  <span className="text-[11px] font-medium text-gray-500 uppercase">Política Devolución</span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                    {proveedorDetalle.aceptaDevoluciones ? "Acepta devoluciones" : "Venta en firme"}
                  </p>
                </div>
              </div>

              {/* Historial de órdenes de este proveedor */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Historial de Órdenes con este Proveedor
                </h4>
                {ordenesDelProveedor.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500">
                    No se han registrado órdenes previas con este proveedor comercial.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                        <TableRow>
                          <TableCell header className="px-3 py-2 text-xs">Orden</TableCell>
                          <TableCell header className="px-3 py-2 text-xs">Producto</TableCell>
                          <TableCell header className="px-3 py-2 text-xs">Sede</TableCell>
                          <TableCell header className="px-3 py-2 text-xs text-end">Cantidad</TableCell>
                          <TableCell header className="px-3 py-2 text-xs text-end">Total</TableCell>
                          <TableCell header className="px-3 py-2 text-xs">Estado</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                        {ordenesDelProveedor.map((ord) => (
                          <TableRow key={ord.id}>
                            <TableCell className="px-3 py-2 font-medium">{ord.numero}</TableCell>
                            <TableCell className="px-3 py-2">{ord.productoNombre}</TableCell>
                            <TableCell className="px-3 py-2 text-gray-500">{ord.sedeNombre || "Bodega"}</TableCell>
                            <TableCell className="px-3 py-2 text-end">{ord.cantidad} {ord.unidad}</TableCell>
                            <TableCell className="px-3 py-2 text-end font-semibold">{formatearMoneda(ord.valorTotal)}</TableCell>
                            <TableCell className="px-3 py-2">
                              <Badge
                                variant="light"
                                color={ord.estado === "recibida" ? "success" : ord.estado === "cancelada" ? "light" : "primary"}
                              >
                                {ord.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalDetalleAbierto(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ContenedorPagina>
    </>
  );
});
