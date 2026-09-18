import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import { CheckCircleIcon, ChevronDownIcon, CopyIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { CAPACIDAD_GRUPOS, CAPACIDAD_LABEL, rolesStore, type Capacidad, type Rol } from "@/stores";
import { CATEGORIA_COLORES } from "./equipo.constants";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "ROLES"
// ═══════════════════════════════════════════════════════════════════════════

export const RolesTab = observer(() => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(rolesStore.roles[0]?.id ?? null);
  const seleccionado = rolesStore.porId(seleccionadoId);

  const nuevoRol = () => {
    const rol = rolesStore.crear({ nombre: "Rol sin nombre", descripcion: "", capacidades: [] });
    setSeleccionadoId(rol.id);
  };

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
                    {r.capacidades.length} de 18 capacidades
                  </p>
                </div>

                {!r.sistema && (
                  <button
                    type="button"
                    title="Eliminar este rol"
                    aria-label="Eliminar rol"
                    onClick={(e) => {
                      e.stopPropagation();
                      rolesStore.eliminar(r.id);
                      if (seleccionadoId === r.id) {
                        setSeleccionadoId(rolesStore.roles[0]?.id ?? null);
                      }
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <TrashBinIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── EDITOR DEL ROL SELECCIONADO ───────────────────────────────────── */}
      {seleccionado ? (
        <RolEditor key={seleccionado.id} rol={seleccionado} onDuplicado={setSeleccionadoId} />
      ) : (
        <Card className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Selecciona un rol para editarlo.
        </Card>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DE ROL — LIMPIO Y JERÁRQUICO
// ═══════════════════════════════════════════════════════════════════════════

const RolEditor = observer(({ rol, onDuplicado }: { rol: Rol; onDuplicado: (id: string) => void }) => {
  const [nombre, setNombre] = useState(rol.nombre);
  const [descripcion, setDescripcion] = useState(rol.descripcion);
  const [capacidades, setCapacidades] = useState<Capacidad[]>([...rol.capacidades]);
  const [guardado, setGuardado] = useState(false);
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});

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

  const guardar = () => {
    rolesStore.actualizar(rol.id, {
      nombre: nombre.trim() || rol.nombre,
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

  const eliminar = () => {
    rolesStore.eliminar(rol.id);
    onDuplicado(rolesStore.roles[0]?.id ?? "");
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

          <Button size="sm" variant="outline" onClick={duplicar} title="Duplicar rol">
            <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
            Duplicar
          </Button>

          {!rol.sistema && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              onClick={eliminar}
            >
              Eliminar
            </Button>
          )}

          <Button size="sm" onClick={guardar}>
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Datos del rol */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rol-nombre">Nombre del Rol</Label>
          <Input
            id="rol-nombre"
            value={nombre}
            placeholder="Ej. Supervisor de turno"
            disabled={rol.sistema}
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
            disabled={rol.sistema}
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
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300">
              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
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
                    {!estaColapsado && !rol.sistema && (
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
                            disabled={rol.sistema}
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
        <Button size="sm" onClick={guardar}>
          Guardar cambios
        </Button>
      </div>
    </Card>
  );
});
