import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import { operadoresStore, SECCIONES, type Modulo, type Operador, type OperadorEstado } from "@/stores";

const RequiredMark = () => <span className="text-error-500">*</span>;

const estadoBadge: Record<OperadorEstado, { color: "success" | "warning" | "light"; label: string }> = {
  activo: { color: "success", label: "Activo" },
  pendiente: { color: "warning", label: "Pendiente" },
  inactivo: { color: "light", label: "Inactivo" },
};

interface OperadorForm {
  nombre: string;
  email: string;
  telefono: string;
}

const EMPTY_FORM: OperadorForm = { nombre: "", email: "", telefono: "" };

interface OperadoresPageProps {
  modulo?: Modulo;
}

export const OperadoresPage = observer(({ modulo = "pedidos" }: OperadoresPageProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<OperadorForm>(EMPTY_FORM);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const operadores = operadoresStore.porModulo(modulo);
  const pendientes = operadoresStore.pendientesCount(modulo);
  const operadorPerfil = operadores.find((o) => o.id === perfilId) ?? null;

  const set = (campo: keyof OperadorForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  const datosBasicosOk =
    form.nombre.trim() !== "" && form.email.trim() !== "" && form.telefono.trim() !== "";

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const guardar = () => {
    if (!datosBasicosOk) return;
    operadoresStore.crear(modulo, {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
    });
    setModalOpen(false);
  };

  return (
    <>
      <PageMeta title="Operadores · Pedidos" description="Gestiona el equipo de operadores de pedidos" />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Operadores</h1>
            {pendientes > 0 && (
              <Badge size="sm" color="warning">
                {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra el equipo que tiene acceso a operar el módulo de Pedidos.
          </p>
        </div>

        <Button size="sm" onClick={abrirCrear}>
          + Nuevo operador
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Operador</TableCell>
                <TableCell header>Contacto</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Permisos</TableCell>
                <TableCell header className="text-right">Acciones</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operadores.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>
                    <span className="font-medium text-gray-800 dark:text-white/90">{op.nombre}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <div>{op.email}</div>
                      <div>{op.telefono}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" color={estadoBadge[op.estado].color}>
                      {estadoBadge[op.estado].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {op.permisos.length} de {SECCIONES[modulo].length} secciones
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {op.estado === "pendiente" && (
                        <Button size="sm" onClick={() => operadoresStore.aprobar(op.id)}>
                          Aprobar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setPerfilId(op.id)}>
                        Perfil / Permisos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => operadoresStore.toggleActivo(op.id)}
                      >
                        {op.estado === "activo" ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Nuevo Operador */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-4">Nuevo operador</h2>
        <div className="space-y-4">
          <div>
            <Label>Nombre <RequiredMark /></Label>
            <Input value={form.nombre} onChange={(e) => set("nombre")(e.target.value)} placeholder="Ej. Camila Ortiz" />
          </div>
          <div>
            <Label>Email <RequiredMark /></Label>
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="camila@empresa.com" />
          </div>
          <div>
            <Label>Teléfono <RequiredMark /></Label>
            <Input value={form.telefono} onChange={(e) => set("telefono")(e.target.value)} placeholder="+57 300 000 0000" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button disabled={!datosBasicosOk} onClick={guardar}>Crear operador</Button>
        </div>
      </Modal>

      {/* Modal Perfil y Permisos */}
      {operadorPerfil && (
        <Modal isOpen={true} onClose={() => setPerfilId(null)} className="max-w-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-1">
            Perfil de {operadorPerfil.nombre}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Ajusta las secciones que este operador tiene permitidas en Pedidos.
          </p>

          <div className="space-y-3 border-t border-b border-gray-100 dark:border-gray-800 py-4 my-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Permisos de sección</h3>
            {SECCIONES[modulo].map((sec) => {
              const activa = operadorPerfil.permisos.includes(sec.id);
              return (
                <div key={sec.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{sec.label}</span>
                  <Switch
                    checked={activa}
                    onChange={(val) => {
                      const nuevos = val
                        ? [...operadorPerfil.permisos, sec.id]
                        : operadorPerfil.permisos.filter((p) => p !== sec.id);
                      operadoresStore.setPermisos(operadorPerfil.id, nuevos);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                operadoresStore.eliminar(operadorPerfil.id);
                setPerfilId(null);
              }}
            >
              Eliminar operador
            </Button>
            <Button size="sm" onClick={() => setPerfilId(null)}>Cerrar</Button>
          </div>
        </Modal>
      )}
    </>
  );
});

export default OperadoresPage;
