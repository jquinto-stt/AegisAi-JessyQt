import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import { TrashBinIcon } from "@/icons";
import { CAPACIDAD_GRUPOS, CAPACIDAD_LABEL, rolesStore, type Capacidad, type Rol } from "@/stores";
import { CATEGORIA_COLORES, NIVEL_COLOR } from "./equipo.constants";
import { NIVEL_LABEL, areasCompletas, fraseDeAcceso, resumenDeAreas } from "./equipo.presentacion";

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
// CÓMO SE PRESENTA
//
// Antes el editor era una tabla de cuatro columnas con el código técnico de
// cada capacidad en monoespaciado, un badge de categoría repetido en cada fila
// y ocho píldoras de filtro con fracciones. Aquí:
//
//   - Se quita la columna de categoría: el encabezado del bloque ya la dice.
//   - Se quitan las píldoras de filtro: con los siete bloques visibles y
//     agrupados, filtrar era trabajo extra para esconder información que cabía.
//   - El código técnico (`orders.confirm`) pasa al `title`, accesible al pasar
//     el ratón pero fuera del camino de lectura.
//   - Se añade arriba un resumen en lenguaje de negocio que se recalcula
//     mientras se marcan interruptores: así se ve el efecto de cada cambio sin
//     tener que interpretar la tabla.
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

        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Un rol es un paquete de permisos con nombre. Se define una vez y se asigna a varias personas.
        </p>

        <div className="flex flex-col gap-2">
          {rolesStore.roles.map((rol) => {
            const areas = resumenDeAreas(rol.capacidades);
            const completas = areasCompletas(areas);

            return (
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
                  {/* Se cuenta por áreas, no por permisos: "cubre 4 de 7 áreas"
                      dice mucho más que "13 de 18 capacidades". */}
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Cubre {completas} de {areas.length} áreas
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
            );
          })}
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

  const tiene = (c: Capacidad) => capacidades.includes(c);

  // Se recalcula en cada render, así que el resumen de abajo refleja el borrador
  // al instante: marcar un interruptor mueve el chip del área en el mismo frame.
  const areas = resumenDeAreas(capacidades);
  const completas = areasCompletas(areas);

  const toggle = (c: Capacidad) => {
    setCapacidades((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setGuardado(false);
  };

  /** Enciende o apaga todas las capacidades de un área de una vez. */
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
          {guardado && <span className="text-xs text-success-600 dark:text-success-500">Guardado</span>}
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

      {/* Resumen en lenguaje de negocio, vivo mientras se edita. */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Qué puede hacer este rol
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {capacidades.length} de 18 permisos · cubre {completas} de {areas.length} áreas
          </p>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{fraseDeAcceso(areas)}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {areas.map((area) => (
            <Badge
              key={area.id}
              color={NIVEL_COLOR[area.nivel]}
              size="sm"
              endIcon={<span className="tabular-nums opacity-70">{area.activas}/{area.total}</span>}
            >
              {area.label}: {NIVEL_LABEL[area.nivel]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Los siete bloques de área, sin columnas redundantes ni filtros. */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Permisos del rol</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Agrupados por área de negocio. Pasa el ratón por encima de un permiso para ver su nombre técnico.
        </p>

        <div className="mt-3">
          {CAPACIDAD_GRUPOS.map((grupo) => {
            const activasEnGrupo = grupo.capacidades.filter(tiene).length;
            const todas = activasEnGrupo === grupo.capacidades.length;

            return (
              <div
                key={grupo.id}
                className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs">
                      {grupo.label}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activasEnGrupo} de {grupo.capacidades.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.capacidades)}
                    className="cursor-pointer text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    {todas ? "Quitar todo" : "Dar todo"}
                  </button>
                </div>

                <div className="mt-2">
                  {grupo.capacidades.map((cap) => {
                    const activa = tiene(cap);
                    return (
                      <div
                        key={cap}
                        className="flex items-center justify-between gap-3 border-t border-gray-100 py-2 dark:border-white/5"
                      >
                        <span
                          title={cap}
                          className={`truncate text-sm ${
                            activa ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {CAPACIDAD_LABEL[cap]}
                        </span>
                        <Switch checked={activa} onChange={() => toggle(cap)} aria-label={CAPACIDAD_LABEL[cap]} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button size="sm" onClick={guardar}>Guardar cambios</Button>
      </div>
    </Card>
  );
});
