import { Fragment, useState } from "react";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import { TrashBinIcon } from "@/icons";
import { CAPACIDAD_GRUPOS, CAPACIDAD_LABEL, rolesStore, type Capacidad, type Rol } from "@/stores";
import { CATEGORIA_COLORES } from "./equipo.constants";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "ROLES"
// ═══════════════════════════════════════════════════════════════════════════
//
// Un rol es un paquete NOMBRADO y REUTILIZABLE de capacidades (contrato §1.3).
// Esta pestaña es el sustituto del antiguo "modal con interruptores" por
// persona: en vez de marcar secciones una a una sobre cada operador, se define
// el rol una vez y se asigna a quien corresponda.
//
// Distinción que el editor hace visible:
//   - El ROL define el paquete base de capacidades.
//   - Las EXCEPCIONES por persona (extras/removidas) se editan en el perfil,
//     no aquí. Un rol limpio es un rol reutilizable.
//
// ═══════════════════════════════════════════════════════════════════════════

export const RolesTab = observer(() => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(rolesStore.roles[0]?.id ?? null);
  const seleccionado = rolesStore.porId(seleccionadoId);

  const nuevoRol = () => {
    const rol = rolesStore.crear({ nombre: "Rol sin nombre", descripcion: "", capacidades: [] });
    setSeleccionadoId(rol.id);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      {/* Lista de roles */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Roles ({rolesStore.roles.length})
          </h2>
          <Button size="sm" variant="outline" onClick={nuevoRol}>Nuevo rol</Button>
        </div>

        <div className="flex flex-col gap-2">
          {rolesStore.roles.map((rol) => (
            <div
              key={rol.id}
              onClick={() => setSeleccionadoId(rol.id)}
              className={`group relative flex items-center justify-between w-full rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                rol.id === seleccionadoId
                  ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-700"
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{rol.nombre}</span>
                  {rol.sistema && <Badge color="light" size="xs">Sistema</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {rol.capacidades.length} de 18 capacidades
                </p>
              </div>

              {!rol.sistema && (
                <button
                  type="button"
                  title="Eliminar este rol"
                  onClick={(e) => {
                    e.stopPropagation();
                    rolesStore.eliminar(rol.id);
                    if (seleccionadoId === rol.id) {
                      setSeleccionadoId(rolesStore.roles[0]?.id ?? null);
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-lg opacity-80 group-hover:opacity-100 transition-all"
                >
                  <TrashBinIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor del rol seleccionado.
          La `key` remonta el editor al cambiar de rol, así el borrador local no
          arrastra lo editado en otro rol. */}
      {seleccionado ? (
        <RolEditor key={seleccionado.id} rol={seleccionado} onDuplicado={setSeleccionadoId} />
      ) : (
        <Card>
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Selecciona un rol para editarlo.
          </p>
        </Card>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DE ROL
// ═══════════════════════════════════════════════════════════════════════════

const RolEditor = observer(({ rol, onDuplicado }: { rol: Rol; onDuplicado: (id: string) => void }) => {
  // Borrador local: no toca el store hasta "Guardar cambios".
  const [nombre, setNombre] = useState(rol.nombre);
  const [descripcion, setDescripcion] = useState(rol.descripcion);
  const [capacidades, setCapacidades] = useState<Capacidad[]>([...rol.capacidades]);
  const [guardado, setGuardado] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const gruposFiltrados = categoriaFiltro === "todas"
    ? CAPACIDAD_GRUPOS
    : CAPACIDAD_GRUPOS.filter((g) => g.id === categoriaFiltro);

  const tiene = (c: Capacidad) => capacidades.includes(c);

  const toggle = (c: Capacidad) => {
    setCapacidades((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setGuardado(false);
  };

  /** Enciende o apaga todas las capacidades de un grupo de una vez. */
  const toggleGrupo = (grupo: Capacidad[]) => {
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
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Editar rol</h2>
            {rol.sistema && <Badge color="light" size="xs">Sistema</Badge>}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Los roles de sistema no se pueden eliminar. Puedes duplicarlos para partir de una base.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {guardado && <span className="text-xs text-success-600 dark:text-success-500">Guardado ✓</span>}
          <Button size="sm" variant="ghost" onClick={duplicar}>Duplicar</Button>
          {/* El `title` va en un envoltorio: `ButtonProps` no lo acepta, y un
              botón deshabilitado no siempre emite eventos de ratón. */}
          <span title={rol.sistema ? "Los roles de sistema no se pueden eliminar" : "Eliminar este rol"}>
            <Button size="sm" variant="destructive" disabled={rol.sistema} onClick={eliminar}>
              Eliminar
            </Button>
          </span>
        </div>
      </div>

      {/* Datos del rol */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rol-nombre">Nombre</Label>
          <Input
            id="rol-nombre"
            value={nombre}
            placeholder="Ej. Supervisor de turno"
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
            placeholder="Para qué sirve este rol"
            onChange={(e) => {
              setDescripcion(e.target.value);
              setGuardado(false);
            }}
          />
        </div>
      </div>

      {/* Tabla de capacidades estructurada por categorías */}
      <div className="mt-6">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Capacidades del rol</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {capacidades.length} de 18 capacidades activas. Organizadas por categorías de negocio.
            </p>
          </div>
          {/* Filtros rápidos por categoría */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoriaFiltro("todas")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                categoriaFiltro === "todas"
                  ? "bg-brand-500 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Todas ({capacidades.length}/18)
            </button>
            {CAPACIDAD_GRUPOS.map((g) => {
              const activas = g.capacidades.filter(tiene).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(g.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    categoriaFiltro === g.id
                      ? "bg-brand-500 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {g.label} ({activas}/{g.capacidades.length})
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
          <Table>
            <TableHeader className="bg-gray-50/70 border-b border-gray-100 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell header className="py-3 pl-5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Categoría
                </TableCell>
                <TableCell header className="py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Capacidad / Acción
                </TableCell>
                <TableCell header className="py-3 text-right pr-5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Estado
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gruposFiltrados.map((grupo) => {
                const activasEnGrupo = grupo.capacidades.filter(tiene).length;
                const todas = activasEnGrupo === grupo.capacidades.length;
                return (
                  <Fragment key={grupo.id}>
                    {/* Encabezado de grupo de categoría con botón para activar/desactivar todo */}
                    <tr className="bg-gray-50/60 dark:bg-white/[0.015] border-t border-b border-gray-100 dark:border-gray-800">
                      <td colSpan={3} className="px-5 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs" className="font-semibold">
                              {grupo.label}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {activasEnGrupo} de {grupo.capacidades.length} activas
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleGrupo(grupo.capacidades)}
                            className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 cursor-pointer"
                          >
                            {todas ? "Quitar todo" : "Activar todo"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {grupo.capacidades.map((cap) => {
                      const activa = tiene(cap);
                      return (
                        <TableRow key={cap} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <TableCell className="py-2.5 pl-5 whitespace-nowrap">
                            <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs">
                              {grupo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {CAPACIDAD_LABEL[cap]}
                              </p>
                              <p className="font-mono text-[11px] text-gray-400">{cap}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-right pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className={`text-xs font-medium ${activa ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
                                {activa ? "Habilitada" : "Deshabilitada"}
                              </span>
                              <Switch checked={activa} onChange={() => toggle(cap)} aria-label={cap} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button size="sm" onClick={guardar}>Guardar cambios</Button>
      </div>
    </Card>
  );
});
