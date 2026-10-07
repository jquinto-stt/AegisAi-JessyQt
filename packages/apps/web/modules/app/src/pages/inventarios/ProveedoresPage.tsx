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
import { PlusIcon, GroupIcon, DownloadIcon } from "@/icons";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { formatearMoneda } from "./productos.presentacion";
import type { Proveedor } from "@/domain/inventarios/productos.domain";

export const ProveedoresPage = observer(function ProveedoresPage() {
  const [consulta, setConsulta] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario nuevo proveedor
  const [nombre, setNombre] = useState("");
  const [productoPrincipal, setProductoPrincipal] = useState("");
  const [categoria, setCategoria] = useState("Despensa");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [aceptaDevoluciones, setAceptaDevoluciones] = useState(true);
  const [precioBase, setPrecioBase] = useState("");

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

    productosStore.crearProveedor({
      nombre,
      productoPrincipal,
      categoria,
      telefono,
      email,
      aceptaDevoluciones,
      precioBase: precioBase ? parseFloat(precioBase) : undefined,
    });

    setModalAbierto(false);
    setNombre("");
    setProductoPrincipal("");
    setTelefono("");
    setEmail("");
    setPrecioBase("");
  };

  return (
    <>
      <PageMeta
        title="Proveedores — NECTO"
        description="Directorio de proveedores comerciales y condiciones de abastecimiento."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Proveedores Comerciales"
          descripcion="Directorio de abastecimiento, políticas de devolución y mercancía en tránsito."
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
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {proveedoresFiltrados.map((prov) => (
                  <TableRow key={prov.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                      {prov.nombre}
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
              Nuevo Proveedor
            </h3>

            <form onSubmit={handleCrearProveedor} className="space-y-4">
              <div>
                <Label htmlFor="provNombre">Nombre de la empresa o proveedor *</Label>
                <Input
                  id="provNombre"
                  required
                  placeholder="Ej. Distribuidora del Norte SAS"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
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
      </ContenedorPagina>
    </>
  );
});
