import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import {
  AlertIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GridIcon,
  GroupIcon,
  LockIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import {
  CAPACIDADES,
  CAPACIDAD_GRUPOS,
  operadoresStore,
  rolesStore,
  type Capacidad,
  type Rol,
} from "@/stores";
import {
  BloqueConfig,
  CampoConfig,
  GrupoCapacidades,
  type FilaCapacidad,
} from "@/pages/config-layout";
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      {/* ── LISTA DE ROLES (SIDEBAR IZQUIERDO) ─────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-theme-sm font-bold text-ink-title dark:text-white">
            Roles ({rolesStore.roles.length})
          </h2>
          <Button size="sm" variant="outline" onClick={nuevoRol}>
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Nuevo rol
          </Button>
        </div>

        {/* Es una LISTA de selección, no una lista de acciones: el elemento se
            elige, y la única acción destructiva va dentro como control propio.
            Por eso el contenedor es `role="listbox"` y cada fila un `option`
            con `aria-selected`: filas con `onClick` y nada más no las puede
            anunciar un lector de pantalla, y aquí la selección ES el estado
            principal de la pantalla. */}
        <div role="listbox" aria-label="Roles de la organización" className="flex flex-col gap-2">
          {rolesStore.roles.map((r) => {
            const esSeleccionado = r.id === seleccionadoId;
            // Los de sistema se cuentan igual, para poder decir cuánta gente
            // depende del rol aunque no se pueda borrar.
            const asignados = miembrosConRol(r.id).length;

            return (
              <div
                key={r.id}
                role="option"
                aria-selected={esSeleccionado}
                tabIndex={0}
                onClick={() => setSeleccionadoId(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSeleccionadoId(r.id);
                  }
                }}
                className={`group relative flex items-center justify-between w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  esSeleccionado
                    ? "border-brand-500 bg-brand-500/[0.04] shadow-theme-xs dark:border-brand-500 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700 dark:hover:bg-white/[0.05]"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-theme-sm font-semibold ${
                        esSeleccionado
                          ? "text-ink-title dark:text-brand-200"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {r.nombre}
                    </span>
                    {r.sistema && <Badge color="light" size="xs">Sistema</Badge>}
                  </div>
                  <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    {r.capacidades.length} de {CAPACIDADES.length} accesos · {asignados} {asignados === 1 ? "usuario" : "usuarios"}
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
                      : "flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/30 dark:hover:text-error-400 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
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
        <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-gray-200 p-12 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Selecciona un rol para editarlo.
        </div>
      )}

      {/* ── AVISO: NO SE PUEDE BORRAR UN ROL CON MIEMBROS ─────────────────── */}
      <Modal
        isOpen={!!aEliminar}
        onClose={() => setAEliminar(null)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <AlertIcon className="h-7 w-7" />
          </span>
          <h3 className="text-theme-2xl font-bold text-ink-title dark:text-white">
            No se puede eliminar el rol
          </h3>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
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
                  <span className="truncate text-theme-xs font-medium text-gray-800 dark:text-gray-200">
                    {op.nombre}
                  </span>
                  <span className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
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
          <h3 className="text-theme-2xl font-bold text-ink-title dark:text-white">
            ¿Eliminar «{aConfirmar?.nombre}»?
          </h3>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
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
  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    // Por defecto, colapsamos todos los grupos para no abrumar visualmente
    const inicial: Record<string, boolean> = {};
    for (const g of CAPACIDAD_GRUPOS) {
      inicial[g.id] = true;
    }
    return inicial;
  });
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

  /**
   * Cambio de UNA capacidad. Recibe el valor nuevo del interruptor en vez de
   * invertir el estado: el `Switch` ya lo calcula, y derivarlo otra vez aquí
   * sería una segunda fuente de verdad que se puede desincronizar.
   */
  const cambiarCapacidad = (c: Capacidad, nuevo: boolean) => {
    setCapacidades((prev) =>
      nuevo ? (prev.includes(c) ? prev : [...prev, c]) : prev.filter((x) => x !== c),
    );
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

  /**
   * Distribución de las tarjetas de grupo.
   *
   * Rejilla de 2 columnas a ANCHO COMPLETO de la columna del editor. Antes los
   * grupos vivían dentro de una tarjeta con su propio `p-6`, así que había
   * tarjetas (grupo) dentro de tarjetas (editor) dentro de la rejilla de la
   * página: tres marcos concéntricos para una jerarquía de dos niveles. El
   * marco de más no aportaba nada y leía como error de maquetación.
   */
  const rejillaGrupos = "grid grid-cols-1 gap-4 lg:grid-cols-2";

  return (
    <div className="space-y-5">
      {/* ═══ BLOQUE 1 · IDENTIDAD DEL ROL ═══════════════════════════════════
          La pregunta del bloque es lo que el admin se pregunta de verdad
          («¿Cómo se llama este rol y para qué sirve?»), no un sustantivo
          administrativo («Metadatos»). */}
      <BloqueConfig
        icono={GridIcon}
        pregunta="¿Cómo se llama este rol y para qué sirve?"
        descripcion={
          soloLectura
            ? "Los roles de sistema son predefinidos. Puedes duplicarlo para crear una base personalizada."
            : "El rol es un paquete de permisos con nombre. Se define una vez y se asigna a varias personas."
        }
      >
        <div className="flex flex-wrap items-center gap-2 pb-5">
          <h3 className="text-theme-md font-bold text-ink-title dark:text-white">
            {nombre || "Rol sin nombre"}
          </h3>
          {rol.sistema ? (
            <Badge color="dark" size="xs">Rol de sistema</Badge>
          ) : (
            <Badge color="primary" size="xs">Personalizado</Badge>
          )}
        </div>

        {/* Las acciones del rol viven en su bloque, no flotando en la cabecera
            de una tarjeta: duplicar y eliminar son operaciones SOBRE el rol, y
            aquí están junto a lo que identifican. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-5 dark:border-gray-800">
          <span title="Duplicar rol">
            <Button size="sm" variant="outline" onClick={duplicar}>
              <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
              Duplicar
            </Button>
          </span>

          {/* El botón Eliminar se pinta siempre y se deshabilita en los roles de
              sistema, con el motivo en el `title`: un botón apagado sin
              explicación es justo lo que se quiere evitar. `<button>` nativo
              porque el `Button` del catálogo no acepta `title`. */}
          <button
            type="button"
            disabled={soloLectura}
            title={soloLectura ? MOTIVO_ROL_SISTEMA : "Eliminar este rol"}
            aria-label={soloLectura ? MOTIVO_ROL_SISTEMA : "Eliminar este rol"}
            onClick={() => onPedirEliminar(rol)}
            className={
              soloLectura
                ? "inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 text-theme-sm font-medium text-gray-300 dark:border-gray-800 dark:text-gray-600"
                : "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-error-200 px-3.5 text-theme-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-950/30"
            }
          >
            {soloLectura ? (
              <LockIcon className="h-3.5 w-3.5" />
            ) : (
              <TrashBinIcon className="h-3.5 w-3.5" />
            )}
            Eliminar
          </button>
        </div>

        {/* Los campos de identidad solo existen si el rol es editable. En un rol
            de sistema no se pintan deshabilitados —eso es ruido de campos que
            nunca se van a escribir—: arriba queda su descripción, que es el dato
            que sí importa leer. */}
        {!soloLectura ? (
          <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
            <CampoConfig
              etiqueta="Nombre del rol"
              htmlFor="rol-nombre"
              ayuda="Como lo verá el admin al asignarlo. Debe distinguirse de los demás roles."
            >
              <Input
                id="rol-nombre"
                value={nombre}
                placeholder="Ej. Supervisor de turno"
                error={Boolean(errorNombre)}
                hint={errorNombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setGuardado(false);
                }}
              />
            </CampoConfig>
            <CampoConfig
              etiqueta="Descripción"
              htmlFor="rol-desc"
              ayuda="Para qué sirve este rol dentro de tu operación."
            >
              <Input
                id="rol-desc"
                value={descripcion}
                placeholder="Propósito u operativa de este rol"
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  setGuardado(false);
                }}
              />
            </CampoConfig>
          </div>
        ) : (
          descripcion && (
            <p className="pt-5 text-theme-sm text-gray-700 dark:text-gray-300">{descripcion}</p>
          )
        )}
      </BloqueConfig>

      {/* ═══ BLOQUE 2 · PERMISOS DEL ROL ════════════════════════════════════ */}
      <BloqueConfig
        icono={GroupIcon}
        pregunta="¿Qué puede hacer con este rol?"
        descripcion={
          soloLectura
            ? "Capacidades incluidas en este rol predeterminado. Es de solo lectura."
            : "Activa o desactiva las capacidades del paquete. Quien tenga este rol las recibe tal cual."
        }
      >
        {/* Barra de estado y control de la rejilla */}
        <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* El contador se tiñe de rojo cuando el rol no tiene ninguna
                capacidad y ya se intentó guardar: es donde «no permitir roles
                vacíos» se hace visible sin ocupar una línea extra. */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-theme-xs font-medium ${
                errorCapacidades
                  ? "border-error-200 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                  : "border-gray-100 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300"
              }`}
            >
              <CheckCircleIcon
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  errorCapacidades ? "text-error-500" : "text-success-600"
                }`}
              />
              <span>{capacidades.length} de {CAPACIDADES.length} concedidas</span>
            </span>

            {soloLectura && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-theme-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300">
                <LockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                Solo lectura
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 self-start rounded-xl border border-gray-200 bg-white p-0.5 sm:self-auto dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={expandirTodos}
              title="Expandir todas las categorías"
              aria-label="Expandir todas las categorías"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={colapsarTodos}
              title="Contraer todas las categorías"
              aria-label="Contraer todas las categorías"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ChevronUpIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Mensaje del rol vacío. Va pegado al encabezado de la sección y no
            dentro de una tarjeta: el problema es del rol entero, no de una
            categoría concreta. */}
        {errorCapacidades && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 px-3.5 py-2.5 text-theme-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{ERROR_ROL_SIN_CAPACIDADES}</span>
          </p>
        )}

        <div className={rejillaGrupos}>
          {CAPACIDAD_GRUPOS.map((grupo) => {
            const filas: FilaCapacidad[] = grupo.capacidades.map((cap) => ({
              cap,
              activa: tiene(cap),
            }));

            return (
              <GrupoCapacidades
                key={grupo.id}
                grupo={grupo}
                filas={filas}
                colapsado={!!colapsados[grupo.id]}
                onAlternarColapso={() => toggleColapso(grupo.id)}
                colorEtiqueta={CATEGORIA_COLORES[grupo.id] || "light"}
                soloLectura={soloLectura}
                // En solo lectura la acción de grupo se omite: no hay nada que
                // conceder ni revocar, y un «Dar todo» inerte sería una promesa
                // que el control no puede cumplir.
                onAlternarGrupo={soloLectura ? undefined : () => alternarGrupo(grupo.capacidades)}
                onCambiarCapacidad={soloLectura ? undefined : cambiarCapacidad}
              />
            );
          })}
        </div>
      </BloqueConfig>

      {/* ═══ GUARDAR ════════════════════════════════════════════════════════
          En solo lectura no hay botón: guardar sobre un rol de sistema no
          tendría nada que escribir. Fingirlo sería el control que miente. */}
      {!soloLectura && (
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-2xl border border-gray-200 bg-white/95 px-5 py-3.5 shadow-theme-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          {guardado && (
            <span className="text-theme-xs font-semibold text-success-700 dark:text-success-400">
              Cambios guardados correctamente
            </span>
          )}
          <Button
            size="sm"
            // Un rol sin nombre o sin capacidades no se puede guardar: el
            // validador ya lo sabe (`validarRol`) y el botón lo dice antes de
            // que el admin pulse. Antes quedaba accionable y el clic no hacía
            // nada salvo pintar el error — un control que promete algo que el
            // sistema no va a cumplir.
            disabled={!validacion.valido}
            onClick={guardar}
          >
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  );
});
