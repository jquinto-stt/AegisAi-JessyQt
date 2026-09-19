import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import {
  AlertIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CopyIcon,
  LockIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import {
  CAPACIDAD_GRUPOS,
  CAPACIDAD_LABEL,
  operadoresStore,
  rolesStore,
  type Capacidad,
  type Rol,
} from "@/stores";
import { CATEGORIA_COLORES } from "./equipo.constants";
import {
  ERROR_ROL_SIN_CAPACIDADES,
  MOTIVO_ROL_SISTEMA,
  motivoRolConMiembros,
  validarRol,
} from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// AYUDAS DE INTEGRIDAD REFERENCIAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Miembros del equipo que tienen asignado este rol.
 *
 * La lista de operadores es de la ORGANIZACIÓN (mezcla módulos), así que se
 * cuenta sin filtrar por módulo: el rol es global, igual que el problema.
 *
 * Se incluyen los `pendiente`. Un operador recién creado desde el panel ya nace
 * con rol y aparece en la tabla, así que si solo mirásemos los `activo` podríamos
 * borrar un rol que está a punto de entrar en uso. Y los `inactivo` también
 * cuentan: siguen teniendo el `rolId` escrito y recuperarían el rol al
 * reactivarlos, con lo que borrarlo ahora los dejaría sin capacidades.
 */
const miembrosConRol = (rolId: string) =>
  operadoresStore.operadores.filter((op) => op.rolId === rolId);

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "ROLES"
// ═══════════════════════════════════════════════════════════════════════════

export const RolesTab = observer(() => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(rolesStore.roles[0]?.id ?? null);
  const seleccionado = rolesStore.porId(seleccionadoId);

  /**
   * Rol cuya eliminación está pendiente, o `null` si no hay ninguna.
   *
   * Se guarda el rol entero (no solo el id) porque el aviso tiene que decir
   * cuántos miembros lo usan, y ese número se calcula al abrir. Es un único
   * estado para las dos razones por las que se bloquea —tener miembros—, así
   * que el modal puede explicar el caso concreto sin ramas duplicadas.
   */
  const [aEliminar, setAEliminar] = useState<Rol | null>(null);

  /**
   * Eliminación pendiente de confirmación (rol sin miembros).
   *
   * El requisito solo pide bloquear cuando hay gente asignada, pero borrar un rol
   * es irreversible y aquí no hay papelera ni deshacer. Un borrado con un solo
   * clic, sin red, es la clase de control que este proyecto evita: se confirma
   * siempre, y el modal dice además cuánta gente queda cubierta por él.
   */
  const [aConfirmar, setAConfirmar] = useState<Rol | null>(null);

  /**
   * Punto único de eliminación. Nada borra un rol sin pasar por aquí.
   *
   * Encapsula el guardia de integridad referencial en un solo sitio para que no
   * exista una segunda ruta de borrado que se olvide de comprobarlo: antes había
   * dos botones (lista y editor) y cada uno llamaba a `rolesStore.eliminar` por
   * su cuenta.
   *
   * Los roles de sistema ni siquiera llegan aquí —sus botones están
   * deshabilitados—, pero se comprueba igual: el store los ignora y sería un
   * fallo silencioso si alguna ruta futura se saltara la UI.
   */
  const pedirEliminar = (rol: Rol) => {
    if (rol.sistema) return;
    // Con miembros: se BLOQUEA y se explica. Sin miembros: se pide confirmación.
    // Son dos preguntas distintas —"no puedes" frente a "¿seguro?"— y por eso
    // son dos estados separados y no un solo modal con dos modos.
    if (miembrosConRol(rol.id).length > 0) {
      setAEliminar(rol);
      return;
    }
    setAConfirmar(rol);
  };

  const eliminarRol = (rolId: string) => {
    rolesStore.eliminar(rolId);
    if (seleccionadoId === rolId) {
      setSeleccionadoId(rolesStore.roles[0]?.id ?? null);
    }
    setAEliminar(null);
    setAConfirmar(null);
  };

  /**
   * Crea un rol vacío y lo abre en el editor.
   *
   * El rol nace con nombre provisional («Rol sin nombre») y sin capacidades, dos
   * estados que el requisito 3 prohíbe guardar. Es deliberado: el editor necesita
   * algo que editar antes de que el admin escriba, y forzar un formulario modal
   * de nombre antes de mostrar el editor complicaría el flujo sin ganar nada.
   *
   * Lo que importa es que ese borrador **no se puede guardar tal cual**: el botón
   * Guardar queda bloqueado y ambos campos muestran su error en cuanto se
   * intenta, así que el rol provisional nunca llega a ser un rol válido sin
   * pasar por la validación.
   */
  const nuevoRol = () => {
    const rol = rolesStore.crear({ nombre: "Rol sin nombre", descripcion: "", capacidades: [] });
    setSeleccionadoId(rol.id);
  };

  const miembrosDelQueSeElimina = aEliminar ? miembrosConRol(aEliminar.id).length : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)]">
      {/* ── LISTA DE ROLES (SIDEBAR IZQUIERDO) ─────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Roles ({rolesStore.roles.length})
          </h2>
          <Button size="sm" variant="outline" onClick={nuevoRol}>
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Nuevo rol
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {rolesStore.roles.map((r) => {
            const esSeleccionado = r.id === seleccionadoId;
            // Los de sistema se cuentan igual, para poder decir en el título
            // cuánta gente depende del rol aunque no se pueda borrar.
            const asignados = miembrosConRol(r.id).length;

            return (
              <div
                key={r.id}
                onClick={() => setSeleccionadoId(r.id)}
                className={`group relative flex items-center justify-between w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  esSeleccionado
                    ? "border-brand-500 bg-brand-50/70 shadow-xs dark:border-brand-500 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-sm font-semibold ${
                        esSeleccionado
                          ? "text-brand-900 dark:text-brand-200"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {r.nombre}
                    </span>
                    {r.sistema && <Badge color="light" size="xs">Sistema</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {r.capacidades.length} de 18 capacidades · {asignados}{" "}
                    {asignados === 1 ? "miembro" : "miembros"}
                  </p>
                </div>

                {/*
                  El botón de eliminar se pinta SIEMPRE, también en los roles de
                  sistema, pero deshabilitado. Ocultarlo —que es lo que hacía
                  antes— deja al admin buscando un botón que no está y sin saber
                  si es una limitación del producto o un fallo. Deshabilitado con
                  `title` explica el porqué en el propio control.

                  Es un `<button>` nativo y no el `Button` del catálogo por dos
                  razones concretas: el `Button` no acepta `title` y necesitamos
                  el tooltip, y aquí el control es un icono suelto de 28 px, que
                  es un tamaño que el catálogo no cubre. El estilo sigue los
                  tokens de la app.
                */}
                <button
                  type="button"
                  disabled={!!r.sistema}
                  title={r.sistema ? MOTIVO_ROL_SISTEMA : "Eliminar este rol"}
                  aria-label={r.sistema ? MOTIVO_ROL_SISTEMA : "Eliminar rol"}
                  onClick={(e) => {
                    e.stopPropagation();
                    pedirEliminar(r);
                  }}
                  className={
                    r.sistema
                      ? "flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 cursor-not-allowed dark:text-gray-600"
                      : "flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                  }
                >
                  {r.sistema ? (
                    <LockIcon className="h-3.5 w-3.5" />
                  ) : (
                    <TrashBinIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EDITOR DEL ROL SELECCIONADO ───────────────────────────────────── */}
      {seleccionado ? (
        <RolEditor
          key={seleccionado.id}
          rol={seleccionado}
          onDuplicado={setSeleccionadoId}
          onPedirEliminar={pedirEliminar}
        />
      ) : (
        <Card className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Selecciona un rol para editarlo.
        </Card>
      )}

      {/* ── AVISO: NO SE PUEDE BORRAR UN ROL CON MIEMBROS ─────────────────── */}
      <Modal
        isOpen={!!aEliminar}
        onClose={() => setAEliminar(null)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-500 dark:bg-warning-500/10">
            <AlertIcon className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No se puede eliminar el rol
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {motivoRolConMiembros(miembrosDelQueSeElimina)}
          </p>

          {/*
            Se listan los nombres, no solo el número. El mensaje dice "hay 3
            miembros"; saber QUIÉNES son es lo que convierte el aviso en algo
            accionable, porque el admin tiene que ir a reasignarlos de uno en uno
            y necesita saber a cuáles.
          */}
          {aEliminar && (
            <ul className="mt-4 w-full space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-left dark:border-gray-800 dark:bg-white/[0.02]">
              {miembrosConRol(aEliminar.id).map((op) => (
                <li key={op.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                    {op.nombre}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {op.estado === "pendiente" ? "Pendiente" : op.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex w-full items-center justify-center gap-2">
            <Button size="sm" onClick={() => setAEliminar(null)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CONFIRMACIÓN: BORRAR UN ROL SIN MIEMBROS ──────────────────────── */}
      <Modal
        isOpen={!!aConfirmar}
        onClose={() => setAConfirmar(null)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/10">
            <TrashBinIcon className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            ¿Eliminar «{aConfirmar?.nombre}»?
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Este rol no lo tiene asignado nadie, así que nadie pierde acceso. La acción no se puede
            deshacer y el rol no se puede recuperar.
          </p>

          <div className="mt-6 flex w-full items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => aConfirmar && eliminarRol(aConfirmar.id)}
            >
              Eliminar rol
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DE ROL — LIMPIO Y JERÁRQUICO
// ═══════════════════════════════════════════════════════════════════════════

const RolEditor = observer(({
  rol,
  onDuplicado,
  onPedirEliminar,
}: {
  rol: Rol;
  onDuplicado: (id: string) => void;
  onPedirEliminar: (rol: Rol) => void;
}) => {
  const [nombre, setNombre] = useState(rol.nombre);
  const [descripcion, setDescripcion] = useState(rol.descripcion);
  const [capacidades, setCapacidades] = useState<Capacidad[]>([...rol.capacidades]);
  const [guardado, setGuardado] = useState(false);
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  /**
   * Si el admin ya intentó guardar.
   *
   * Los errores no se muestran mientras escribe —vería "el rol necesita un
   * nombre" nada más abrir un rol nuevo, cuando todavía no ha hecho nada mal—,
   * sino a partir del primer clic en Guardar. Una vez activado, el error se
   * recalcula en cada render, así que desaparece solo al corregir.
   */
  const [intentado, setIntentado] = useState(false);

  const toggleColapso = (grupoId: string) => {
    setColapsados((prev) => ({ ...prev, [grupoId]: !prev[grupoId] }));
  };

  const expandirTodos = () => {
    setColapsados({});
  };

  const colapsarTodos = () => {
    const todos: Record<string, boolean> = {};
    for (const g of CAPACIDAD_GRUPOS) {
      todos[g.id] = true;
    }
    setColapsados(todos);
  };

  const tiene = (c: Capacidad) => capacidades.includes(c);

  const toggle = (c: Capacidad) => {
    setCapacidades((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setGuardado(false);
  };

  const alternarGrupo = (grupo: Capacidad[]) => {
    const todas = grupo.every((c) => capacidades.includes(c));
    setCapacidades((prev) => {
      const set = new Set(prev);
      for (const c of grupo) {
        if (todas) set.delete(c);
        else set.add(c);
      }
      return [...set];
    });
    setGuardado(false);
  };

  /**
   * Validación del rol en edición.
   *
   * Se pasa `rol.id` como rol editado para que **no choque consigo mismo**: sin
   * eso, un rol ya guardado siempre tendría su propio nombre ocupado y el botón
   * Guardar quedaría muerto para siempre. Al duplicar, la copia sí choca con el
   * original —correctamente— hasta que se le cambie el nombre.
   */
  const validacion = validarRol({ nombre, capacidades }, rolesStore.roles, rol.id);
  const errorNombre = intentado ? validacion.errorNombre : "";
  const errorCapacidades = intentado ? validacion.errorCapacidades : "";

  /**
   * Un rol de sistema es de solo lectura: nombre, descripción y capacidades se
   * editan deshabilitados. Guardar sobre él no tendría nada que escribir, así
   * que el botón se deshabilita también en vez de fingir un guardado.
   */
  const soloLectura = !!rol.sistema;

  const guardar = () => {
    setIntentado(true);
    if (soloLectura) return;
    if (!validacion.valido) return;

    rolesStore.actualizar(rol.id, {
      nombre: nombre.trim().replace(/\s+/g, " "),
      descripcion: descripcion.trim(),
      capacidades,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const duplicar = () => {
    const copia = rolesStore.duplicar(rol.id);
    if (copia) onDuplicado(copia.id);
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Cabecera del Editor */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {nombre || "Rol sin nombre"}
            </h2>
            {rol.sistema ? (
              <Badge color="light" size="xs">Rol de Sistema</Badge>
            ) : (
              <Badge color="success" size="xs">Personalizado</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {rol.sistema
              ? "Los roles de sistema son predefinidos. Puedes duplicarlo para crear una base personalizada."
              : "Rol editable. Los operadores con este rol recibirán estas capacidades por defecto."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {guardado && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mr-1">
              Guardado
            </span>
          )}

          {/* El `Button` del catálogo no acepta `title`, así que envolverlo en un
              `<span>` es lo que da el tooltip sin romper el tipado. (`RolesTab` no
              es el único sitio con este problema: `ConfiguracionModulosPage` pasa
              `title` directo al `Button` y arrastra el mismo error de tipos.) */}
          <span title="Duplicar rol">
            <Button size="sm" variant="outline" onClick={duplicar}>
              <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
              Duplicar
            </Button>
          </span>

          {/*
            El botón Eliminar se pinta siempre y se deshabilita en los roles de
            sistema, con el motivo en el `title`. Se usa un `<button>` nativo
            porque `Button` del catálogo no acepta `title` (documentado en
            REFERENCIA.md) y sin `title` el motivo sería invisible: quedaría un
            botón apagado sin explicación, que es justo lo que el requisito
            quiere evitar.

            En un rol personalizado delega en `onPedirEliminar`, el guardia único
            del padre, que decide si borra o si abre el aviso por tener miembros.
          */}
          <button
            type="button"
            disabled={soloLectura}
            title={soloLectura ? MOTIVO_ROL_SISTEMA : "Eliminar este rol"}
            aria-label={soloLectura ? MOTIVO_ROL_SISTEMA : "Eliminar este rol"}
            onClick={() => onPedirEliminar(rol)}
            className={
              soloLectura
                ? "inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 text-sm font-medium text-gray-300 dark:border-gray-800 dark:text-gray-600"
                : "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 px-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            }
          >
            {soloLectura ? (
              <LockIcon className="h-3.5 w-3.5" />
            ) : (
              <TrashBinIcon className="h-3.5 w-3.5" />
            )}
            Eliminar
          </button>

          <Button size="sm" disabled={soloLectura} onClick={guardar}>
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Aviso permanente en los roles de sistema: el `title` del botón explica
          el caso puntual al pasar el ratón, pero quien no pase el ratón merece
          saber por qué el editor está bloqueado. */}
      {soloLectura && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
          <LockIcon className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>
            Este es un <span className="font-semibold">rol predeterminado del sistema</span> y no se
            puede editar ni eliminar. {MOTIVO_ROL_SISTEMA} Usa{" "}
            <span className="font-semibold">Duplicar</span> para crear una versión propia.
          </span>
        </div>
      )}

      {/* Datos del rol */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rol-nombre">Nombre del Rol</Label>
          {/*
            `Input` del catálogo pinta el mensaje de `hint` y lo tiñe rojo si
            `error`, así que el error se pasa por ahí y no con un `<p>` aparte
            (duplicaría el texto). El `id` es único y estable por rol porque el
            editor se remonta con `key={rol.id}`.
          */}
          <Input
            id="rol-nombre"
            value={nombre}
            placeholder="Ej. Supervisor de turno"
            disabled={soloLectura}
            error={Boolean(errorNombre)}
            hint={errorNombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setGuardado(false);
            }}
          />
        </div>
        <div>
          <Label htmlFor="rol-desc">Descripción</Label>
          <Input
            id="rol-desc"
            value={descripcion}
            placeholder="Propósito u operativa de este rol"
            disabled={soloLectura}
            onChange={(e) => {
              setDescripcion(e.target.value);
              setGuardado(false);
            }}
          />
        </div>
      </div>

      {/* ── REGLAS Y PERMISOS DEL ROL (GRID JERÁRQUICO COLAPSABLE) ─────────── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Reglas y Permisos del Rol
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Activa o desactiva las capacidades asignadas al paquete de este rol.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* El contador se tiñe de rojo cuando el rol no tiene ninguna
                capacidad y ya se intentó guardar: es el punto donde el requisito
                "no permitir roles vacíos" se hace visible sin ocupar una línea
                extra, porque el contador ya estaba ahí y ya dice lo que importa. */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                errorCapacidades
                  ? "border-error-200 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                  : "border-gray-100 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300"
              }`}
            >
              <CheckCircleIcon
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  errorCapacidades ? "text-error-500" : "text-emerald-500"
                }`}
              />
              <span>{capacidades.length} de 18 activas</span>
            </span>

            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                onClick={expandirTodos}
                title="Expandir todas las categorías"
                aria-label="Expandir todas las categorías"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 6l5 5 5-5" />
                  <path d="M5 11l5 5 5-5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={colapsarTodos}
                title="Contraer todas las categorías"
                aria-label="Contraer todas las categorías"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 9l5-5 5 5" />
                  <path d="M5 14l5-5 5 5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje del rol vacío. Va aquí, pegado al encabezado de la sección y
            no dentro de una tarjeta, porque el problema no es de una categoría
            concreta sino del rol entero. */}
        {errorCapacidades && (
          <p className="flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 px-3.5 py-2.5 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{ERROR_ROL_SIN_CAPACIDADES}</span>
          </p>
        )}

        {/* Grid de tarjetas de categorías con switches estables */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {CAPACIDAD_GRUPOS.map((grupo) => {
            const puede = grupo.capacidades.filter(tiene);
            const completa = puede.length === grupo.capacidades.length;
            const estaColapsado = !!colapsados[grupo.id];

            return (
              <div
                key={grupo.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Cabecera de la Tarjeta con botón de colapso */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleColapso(grupo.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleColapso(grupo.id);
                    }
                  }}
                  className={`flex cursor-pointer select-none items-center justify-between p-4 transition-colors hover:bg-gray-50/75 dark:hover:bg-white/[0.02] ${
                    !estaColapsado ? "border-b border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs">
                      {grupo.label}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {puede.length} de {grupo.capacidades.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!estaColapsado && !soloLectura && (
                      <button
                        type="button"
                        onClick={() => alternarGrupo(grupo.capacidades)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
                      >
                        {completa ? "Quitar todo" : "Dar todo"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleColapso(grupo.id)}
                      aria-label={estaColapsado ? `Expandir ${grupo.label}` : `Contraer ${grupo.label}`}
                      title={estaColapsado ? "Expandir" : "Contraer"}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          estaColapsado ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Lista limpia y ordenada de capacidades */}
                {!estaColapsado && (
                  <div className="p-4 space-y-2.5">
                    {grupo.capacidades.map((cap) => {
                      const activa = tiene(cap);

                      return (
                        <div
                          key={cap}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2.5 transition-colors dark:border-gray-800 dark:bg-white/[0.02]"
                        >
                          <span
                            title={cap}
                            className="truncate text-xs font-medium text-gray-800 dark:text-gray-200"
                          >
                            {CAPACIDAD_LABEL[cap]}
                          </span>

                          <Switch
                            checked={activa}
                            disabled={soloLectura}
                            onChange={() => toggle(cap)}
                            label=""
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón inferior para guardar */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        {guardado && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Cambios guardados correctamente
          </span>
        )}
        <Button size="sm" disabled={soloLectura} onClick={guardar}>
          Guardar cambios
        </Button>
      </div>
    </Card>
  );
});
