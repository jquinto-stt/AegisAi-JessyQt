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
import { MultiSelect } from "@/elements/form/multi-select";
import { operadoresStore, agendaStore, queuesStore, SECCIONES, type Modulo, type Operador, type OperadorEstado } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// PROFESIONALES (helpers para el vínculo operador ↔ profesional en Agendamiento)
// ═══════════════════════════════════════════════════════════════════════════

/** Opciones de profesionales para el MultiSelect ({value:id, text:nombre}). */
const opcionesProfesionales = () =>
  agendaStore.profesionales.map((p) => ({ value: p.id, text: p.nombre }));

/** Nombres de los profesionales dado un array de ids. */
const nombresProfesionales = (ids: string[]) =>
  ids
    .map((id) => agendaStore.profesionales.find((p) => p.id === id)?.nombre)
    .filter((n): n is string => Boolean(n));

// ═══════════════════════════════════════════════════════════════════════════
// COLAS (helpers para el vínculo operador ↔ cola en Turnos)
// ═══════════════════════════════════════════════════════════════════════════

/** Opciones de colas para el MultiSelect ({value:id, text:nombre}). */
const opcionesColas = () =>
  queuesStore.queues.map((q) => ({ value: q.id, text: q.nombre }));

/** Nombres de las colas dado un array de ids. */
const nombresColas = (ids: string[]) =>
  ids
    .map((id) => queuesStore.queues.find((q) => q.id === id)?.nombre)
    .filter((n): n is string => Boolean(n));

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const RequiredMark = () => <span className="text-error-500">*</span>;

/** Mapea el estado del operador a color + etiqueta del Badge del catálogo. */
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

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

interface OperadoresPageProps {
  /** Módulo cuya lista de operadores se muestra (listas independientes). */
  modulo: Modulo;
}

/**
 * OperadoresPage — gestión del equipo de operadores del administrador (mock).
 *
 * Reutilizable por módulo (turnos | agendamiento): recibe `modulo` y muestra
 * su lista independiente. Construida con el flujo Elements: Table (patrones
 * BadgeTable + ActionsTable), Badge de estado, Modal de creación y
 * Input/Label/Button del catálogo. Las acciones se reflejan directo en la
 * tabla (mock sin backend).
 */
export const OperadoresPage = observer(({ modulo }: OperadoresPageProps) => {
  const esAgendamiento = modulo === "agendamiento";
  const esTurnos = modulo === "turnos";
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<OperadorForm>(EMPTY_FORM);
  // Profesionales seleccionados en el modal de crear (solo Agendamiento).
  const [nuevoProfesionales, setNuevoProfesionales] = useState<string[]>([]);
  // Colas seleccionadas en el modal de crear (solo Turnos).
  const [nuevoColas, setNuevoColas] = useState<string[]>([]);
  // Contador para re-montar el MultiSelect (uncontrolled) al reabrir el modal.
  const [crearKey, setCrearKey] = useState(0);
  // Operador cuyo perfil se está viendo/editando (null = modal de perfil cerrado).
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const operadores = operadoresStore.porModulo(modulo);
  const pendientes = operadoresStore.pendientesCount(modulo);
  const moduloLabel = { turnos: "Turnos", agendamiento: "Agendamiento", pedidos: "Pedidos" }[modulo];
  const operadorPerfil = operadores.find((o) => o.id === perfilId) ?? null;

  const set = (campo: keyof OperadorForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  const datosBasicosOk =
    form.nombre.trim() !== "" && form.email.trim() !== "" && form.telefono.trim() !== "";
  // Vínculo obligatorio según el módulo: Agendamiento ≥1 profesional; Turnos ≥1 cola.
  const requeridosCompletos =
    datosBasicosOk &&
    (!esAgendamiento || nuevoProfesionales.length > 0) &&
    (!esTurnos || nuevoColas.length > 0);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setNuevoProfesionales([]);
    setNuevoColas([]);
    setCrearKey((k) => k + 1);
    setModalOpen(true);
  };

  const guardar = () => {
    if (!requeridosCompletos) return;
    operadoresStore.crear(modulo, {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      profesionalIds: esAgendamiento ? nuevoProfesionales : undefined,
      colaIds: esTurnos ? nuevoColas : undefined,
    });
    setModalOpen(false);
  };

  return (
    <>
      <PageMeta title={`Operadores · ${moduloLabel}`} description="Gestiona el equipo que trabaja contigo en este módulo" />

      {/* Encabezado de página */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Operadores</h1>
            {pendientes > 0 && (
              <Badge color="warning" size="sm">
                {pendientes} pendiente{pendientes > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona el equipo que trabaja contigo en {moduloLabel}. Haz clic en un operador para ver su perfil y permisos.
          </p>
        </div>
        <Button size="sm" onClick={abrirCrear}>Añadir operador</Button>
      </div>

      {/* Tabla de operadores */}
      {operadores.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Aún no hay operadores en {moduloLabel}. Usa “Añadir operador” para crear el primero.
          </p>
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Nombre</TableCell>
                <TableCell header>Correo electrónico</TableCell>
                <TableCell header>Teléfono</TableCell>
                {esAgendamiento && <TableCell header>Profesional(es)</TableCell>}
                {esTurnos && <TableCell header>Filas</TableCell>}
                <TableCell header>Estado</TableCell>
                <TableCell header className="text-right">Acciones</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operadores.map((op) => (
                <OperadorRow
                  key={op.id}
                  op={op}
                  mostrarProfesionales={esAgendamiento}
                  mostrarColas={esTurnos}
                  onAbrirPerfil={() => setPerfilId(op.id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal crear operador */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Añadir operador</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          El operador quedará activo y podrá trabajar en {moduloLabel}.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="op-nombre">Nombre completo <RequiredMark /></Label>
            <Input id="op-nombre" value={form.nombre} placeholder="Ej. María Fernández" onChange={(e) => set("nombre")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="op-email">Correo electrónico <RequiredMark /></Label>
            <Input id="op-email" type="email" value={form.email} placeholder="operador@negocio.com" onChange={(e) => set("email")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="op-tel">Teléfono <RequiredMark /></Label>
            <Input id="op-tel" type="tel" value={form.telefono} placeholder="+57 300 000 0000" onChange={(e) => set("telefono")(e.target.value)} />
          </div>

          {/* Vínculo con profesionales — solo en Agendamiento, obligatorio */}
          {esAgendamiento && (
            <div>
              <MultiSelect
                key={`prof-${crearKey}`}
                label="Profesional(es) a cargo *"
                options={opcionesProfesionales()}
                defaultSelected={[]}
                onChange={setNuevoProfesionales}
                hint="El operador solo verá los datos de los profesionales que le asignes."
              />
            </div>
          )}

          {/* Vínculo con colas — solo en Turnos, obligatorio */}
          {esTurnos && (
            <div>
              <MultiSelect
                key={`cola-${crearKey}`}
                label="Fila(s) que puede manejar *"
                options={opcionesColas()}
                defaultSelected={[]}
                onChange={setNuevoColas}
                hint="El operador solo verá y atenderá las filas que le asignes."
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button size="sm" disabled={!requeridosCompletos} onClick={guardar}>Guardar</Button>
        </div>
      </Modal>

      {/* Modal perfil + permisos */}
      {operadorPerfil && (
        <PerfilModal
          op={operadorPerfil}
          modulo={modulo}
          onClose={() => setPerfilId(null)}
        />
      )}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFIL MODAL (datos readonly + editor de permisos)
// ═══════════════════════════════════════════════════════════════════════════

interface PerfilModalProps {
  op: Operador;
  modulo: Modulo;
  onClose: () => void;
}

/**
 * PerfilModal — perfil del operador con editor de permisos (qué secciones del
 * módulo puede ver). Los toggles arrancan preseleccionados según op.permisos.
 * Guardar aplica los cambios con operadoresStore.setPermisos y cierra.
 */
const PerfilModal = ({ op, modulo, onClose }: PerfilModalProps) => {
  const secciones = SECCIONES[modulo];
  const badge = estadoBadge[op.estado];
  const esAgendamiento = modulo === "agendamiento";
  const esTurnos = modulo === "turnos";

  // Estado local editable (borrador): no toca el store hasta Guardar.
  const [permisos, setPermisos] = useState<string[]>([...op.permisos]);
  const [profesionales, setProfesionales] = useState<string[]>([...op.profesionalIds]);
  const [colas, setColas] = useState<string[]>([...op.colaIds]);

  const toggle = (id: string) =>
    setPermisos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const todos = secciones.every((s) => permisos.includes(s.id));
  const toggleTodos = () =>
    setPermisos(todos ? [] : secciones.map((s) => s.id));

  // Vínculo mínimo obligatorio: Agendamiento ≥1 profesional; Turnos ≥1 cola.
  const profesionalesOk = !esAgendamiento || profesionales.length > 0;
  const colasOk = !esTurnos || colas.length > 0;
  const vinculoOk = profesionalesOk && colasOk;

  const guardar = () => {
    if (!vinculoOk) return;
    operadoresStore.setPermisos(op.id, permisos);
    if (esAgendamiento) operadoresStore.setProfesionales(op.id, profesionales);
    if (esTurnos) operadoresStore.setColas(op.id, colas);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg p-6">
      {/* Encabezado: nombre + badge de estado */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{op.nombre}</h2>
        <div className="mt-1">
          <Badge color={badge.color} size="sm">{badge.label}</Badge>
        </div>
      </div>

      {/* Datos solo lectura */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Correo electrónico</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{op.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Teléfono</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{op.telefono}</p>
        </div>
      </div>

      {/* Profesionales a cargo — solo Agendamiento */}
      {esAgendamiento && (
        <div className="mb-6">
          <MultiSelect
            label="Profesionales a cargo *"
            options={opcionesProfesionales()}
            defaultSelected={op.profesionalIds}
            onChange={setProfesionales}
            error={!profesionalesOk}
            hint={
              profesionalesOk
                ? "Este operador solo verá los datos de estos profesionales."
                : "Debe tener al menos un profesional asignado."
            }
          />
        </div>
      )}

      {/* Colas a cargo — solo Turnos */}
      {esTurnos && (
        <div className="mb-6">
          <MultiSelect
            label="Filas que puede manejar *"
            options={opcionesColas()}
            defaultSelected={op.colaIds}
            onChange={setColas}
            error={!colasOk}
            hint={
              colasOk
                ? "Este operador solo verá y atenderá estas filas."
                : "Debe tener al menos una fila asignada."
            }
          />
        </div>
      )}

      {/* Permisos */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">¿Qué puede ver en la app?</h3>

        {/* Banda de contexto: contador + seleccionar todo/ninguno */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {permisos.length} de {secciones.length} secciones activas
          </span>
          <button
            type="button"
            onClick={toggleTodos}
            className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            {todos ? "Ninguno" : "Seleccionar todo"}
          </button>
        </div>

        {/* Lista de secciones con switch */}
        <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {secciones.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
              <Switch checked={permisos.includes(s.id)} onChange={() => toggle(s.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!vinculoOk} onClick={guardar}>Guardar cambios</Button>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila de operador. Al hacer clic en la fila se abre el perfil (onAbrirPerfil).
 * Los botones de acción usan stopPropagation para no disparar el perfil.
 */
const OperadorRow = observer(
  ({ op, mostrarProfesionales, mostrarColas, onAbrirPerfil }: { op: Operador; mostrarProfesionales: boolean; mostrarColas: boolean; onAbrirPerfil: () => void }) => {
  const badge = estadoBadge[op.estado];
  const profesionales = nombresProfesionales(op.profesionalIds);
  const colas = nombresColas(op.colaIds);

  // Clase para las celdas clickeables (todas menos la de acciones).
  const celdaClickeable = "cursor-pointer transition-colors";

  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
      <TableCell className={`font-medium text-gray-800 dark:text-white/90 ${celdaClickeable}`}>
        <div onClick={onAbrirPerfil}>{op.nombre}</div>
      </TableCell>
      <TableCell className={`text-gray-500 dark:text-gray-400 ${celdaClickeable}`}>
        <div onClick={onAbrirPerfil}>{op.email}</div>
      </TableCell>
      <TableCell className={`text-gray-500 dark:text-gray-400 ${celdaClickeable}`}>
        <div onClick={onAbrirPerfil}>{op.telefono}</div>
      </TableCell>
      {mostrarProfesionales && (
        <TableCell className={celdaClickeable}>
          <div onClick={onAbrirPerfil} className="flex flex-wrap gap-1">
            {profesionales.length > 0 ? (
              profesionales.map((n) => (
                <Badge key={n} color="info" size="sm">{n}</Badge>
              ))
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </TableCell>
      )}
      {mostrarColas && (
        <TableCell className={celdaClickeable}>
          <div onClick={onAbrirPerfil} className="flex flex-wrap gap-1">
            {colas.length > 0 ? (
              colas.map((n) => (
                <Badge key={n} color="info" size="sm">{n}</Badge>
              ))
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </TableCell>
      )}
      <TableCell className={celdaClickeable}>
        <div onClick={onAbrirPerfil}>
          <Badge color={badge.color} size="sm">{badge.label}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {op.estado === "pendiente" && (
            <Button size="sm" onClick={() => operadoresStore.aprobar(op.id)}>Aprobar</Button>
          )}
          {op.estado === "activo" && (
            <Button size="sm" variant="outline" onClick={() => operadoresStore.desactivar(op.id)}>Desactivar</Button>
          )}
          {op.estado === "inactivo" && (
            <Button size="sm" variant="outline" onClick={() => operadoresStore.activar(op.id)}>Activar</Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => operadoresStore.eliminar(op.id)}>Eliminar</Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default OperadoresPage;
