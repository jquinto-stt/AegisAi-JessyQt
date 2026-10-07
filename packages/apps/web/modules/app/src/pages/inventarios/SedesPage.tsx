import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card, CardBody } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Modal } from "@/elements/ui/modal";
import { PlusIcon, FolderIcon } from "@/icons";
import { productosStore } from "@/stores/productos.store";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import type { Sede } from "@/domain/inventarios/productos.domain";

export const SedesPage = observer(function SedesPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [sedeEditando, setSedeEditando] = useState<Sede | null>(null);

  const [nombre, setNombre] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sedes = productosStore.sedesActivas;

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

  const handleGuardar = (e: React.FormEvent) => {
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

  return (
    <>
      <PageMeta
        title="Gestión de Sedes — NECTO"
        description="Administración de sucursales, bodegas y puntos de venta físicos."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Gestión de Sedes (Manage Store)"
          descripcion="Puntos de venta, tiendas y bodegas físicas donde opera el inventario."
          acciones={
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={abrirModalCrear}
            >
              <PlusIcon className="size-4 mr-1.5" />
              Añadir Sede
            </Button>
          }
        />

        <div className="space-y-4">
          {sedes.map((sede) => {
            // Contar productos con existencias en esta sede
            const existenciasSede = productosStore.existencias.filter(
              (e) => e.sedeId === sede.id && e.cantidad > 0,
            );
            const unidadesTotales = existenciasSede.reduce((acc, e) => acc + e.cantidad, 0);

            return (
              <Card
                key={sede.id}
                className="rounded-2xl border border-gray-100 dark:border-white/5 shadow-theme-xs bg-white dark:bg-gray-900 overflow-hidden hover:border-gray-200 transition-colors"
              >
                <CardBody className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                    {/* Columna Izquierda Destacada: Nombre Sede */}
                    <div className="md:col-span-4 p-6 bg-gray-50/70 dark:bg-white/[0.02] border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                        <FolderIcon className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {sede.nombre}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {existenciasSede.length} productos ({unidadesTotales} unidades en mano)
                        </p>
                      </div>
                    </div>

                    {/* Columna Central: Detalles de Dirección y Teléfono */}
                    <div className="md:col-span-6 p-6">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {sede.nombreComercial || sede.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {sede.direccion} · {sede.ciudad}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Teléfono: {sede.telefono}
                      </p>
                    </div>

                    {/* Columna Derecha: Acción Editar */}
                    <div className="md:col-span-2 p-6 flex justify-end md:justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalEditar(sede)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

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

            <form onSubmit={handleGuardar} className="space-y-4">
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
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {sedeEditando ? "Guardar Cambios" : "Crear Sede"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </ContenedorPagina>
    </>
  );
});
