import { Fragment, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Switch } from "@/elements/form/switch";
import {
  CAPACIDAD_GRUPOS,
  CAPACIDAD_LABEL,
  operadoresStore,
  rolesStore,
  sessionStore,
  type Capacidad,
  type Operador,
} from "@/stores";
import { ESTADO_META, CATEGORIA_COLORES } from "./equipo.constants";
import { aplicarToggle, normalizar, procedenciaDe, type Procedencia } from "./excepciones";

// ═══════════════════════════════════════════════════════════════════════════
// PERFIL DE UNA PERSONA DEL EQUIPO — /pedidos/equipo/:id
// ═══════════════════════════════════════════════════════════════════════════
//
// Es una RUTA, no un modal (decisión del contrato / propuesta): el editor de rol
// más 16 capacidades con su procedencia no cabe en un diálogo, y una ruta se
// puede compartir, recargar y enlazar.
//
// Lo que esta pantalla hace visible y que el modelo anterior no podía:
//
//   Cada capacidad muestra de DÓNDE viene —heredada del rol, concedida a mano,
//   o revocada a mano— en vez de un simple interruptor. Así el admin ve el
//   paquete del rol y las desviaciones de esta persona por separado, que es
//   justo la diferencia entre "rol" y "excepción".
//
// ═══════════════════════════════════════════════════════════════════════════

/** Texto y color de cada procedencia, para la etiqueta de la derecha. */
const PROCEDENCIA_META: Record<Procedencia, { label: string; color: "light" | "info" | "warning" }> = {
  rol: { label: "Heredado del rol", color: "light" },
  concedida: { label: "Concedido a mano", color: "info" },
  removida: { label: "Revocado a mano", color: "warning" },
  ninguna: { label: "No concedido", color: "light" },
};

/**
 * Envoltorio de ruta. Resuelve la persona y, si existe, delega en `PerfilContent`
 * con `key={op.id}`.
 *
 * La `key` no es decorativa: al pasar de `/pedidos/equipo/d1` a `.../d2` React
 * Router **reutiliza** la misma instancia del componente, así que sin remontar
 * el borrador de "Datos de contacto" seguiría mostrando el nombre de la persona
 * anterior. Remontar por id lo resetea sin necesidad de sincronizar a mano.
 */
export const PerfilOperadorPage = observer(() => {
  const { id } = useParams<{ id: string }>();
  const op = operadoresStore.porId(id);

  if (!op) {
    return (
      <>
        <PageMeta title="Persona no encontrada · Pedidos" description="La persona no existe" />
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Esta persona ya no está en el equipo.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Puede que se haya eliminado desde otra pestaña.
            </p>
            <Link
              to="/pedidos/equipo"
              className="mt-4 inline-block text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Volver al equipo
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return <PerfilContent key={op.id} op={op} />;
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTENIDO DEL PERFIL
// ═══════════════════════════════════════════════════════════════════════════

const PerfilContent = observer(({ op }: { op: Operador }) => {
  const navigate = useNavigate();

  // Borrador de datos de contacto. El componente está remontado por `key`, así
  // que estos inicializadores se ejecutan de nuevo al cambiar de persona.
  const [nombre, setNombre] = useState(op.nombre);
  const [email, setEmail] = useState(op.email);
  const [telefono, setTelefono] = useState(op.telefono);
  const [datosGuardados, setDatosGuardados] = useState(false);

  const estado = ESTADO_META[op.estado];
  const rol = rolesStore.porId(op.rolId);
  const capacidadesDelRol = rol?.capacidades ?? [];
  const efectivas = rolesStore.capacidadesEfectivas(op);

  const rolesAsignables = rolesStore.roles.filter((r) => r.id !== "admin_tienda");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const gruposFiltrados = categoriaFiltro === "todas"
    ? CAPACIDAD_GRUPOS
    : CAPACIDAD_GRUPOS.filter((g) => g.id === categoriaFiltro);

  // ── Cambio de rol ─────────────────────────────────────────────────────────
  const cambiarRol = (nuevoRolId: string) => {
    const nuevoRol = rolesStore.porId(nuevoRolId);
    if (!nuevoRol) return;
    // Reexpresamos las excepciones contra el rol nuevo ANTES de asignarlo, para
    // que no queden revocaciones o concesiones que ya no aportan nada.
    const normalizadas = normalizar(op, nuevoRol.capacidades);
    operadoresStore.setCapacidadesExtra(op.id, normalizadas.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, normalizadas.capacidadesRemovidas);
    operadoresStore.setRol(op.id, nuevoRolId);
  };

  // ── Excepciones ───────────────────────────────────────────────────────────
  const toggleCapacidad = (cap: Capacidad) => {
    const activar = !efectivas.includes(cap);
    const siguiente = aplicarToggle(op, cap, capacidadesDelRol, activar);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  const guardarDatos = () => {
    operadoresStore.actualizarDatos(op.id, {
      nombre: nombre.trim() || op.nombre,
      email: email.trim() || op.email,
      telefono: telefono.trim() || op.telefono,
    });
    setDatosGuardados(true);
  };

  const rechazar = () => {
    operadoresStore.rechazar(op.id);
    navigate("/pedidos/equipo");
  };

  const puedeVerComo = op.estado === "activo";
  const verComo = () => {
    if (!puedeVerComo) return;
    sessionStore.simular(op.id);
    navigate(sessionStore.homePathActual);
  };

  const excepcionesCount = (op.capacidadesExtra?.length ?? 0) + (op.capacidadesRemovidas?.length ?? 0);

  return (
    <>
      <PageMeta title={`${op.nombre} · Equipo`} description="Perfil, rol y capacidades de la persona" />

      {/* Volver */}
      <Link
        to="/pedidos/equipo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Equipo
      </Link>

      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">{op.nombre}</h1>
            <Badge color={estado.color} size="sm">{estado.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {rol ? `Rol: ${rol.nombre}` : "Sin rol asignado"}
            {excepcionesCount > 0 && ` · ${excepcionesCount} ajuste${excepcionesCount === 1 ? "" : "s"} a mano`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* El `title` va en un envoltorio: `ButtonProps` no lo acepta, y un
              botón deshabilitado no siempre emite eventos de ratón. */}
          <span title={puedeVerComo ? `Entrar como ${op.nombre}` : "Solo se puede ver como una persona activa"}>
            <Button size="sm" variant="outline" disabled={!puedeVerComo} onClick={verComo}>
              Ver como
            </Button>
          </span>
          {op.estado === "pendiente" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-error-600 hover:bg-error-50 border-error-200 dark:border-error-800"
                onClick={rechazar}
              >
                Rechazar
              </Button>
              <Button size="sm" onClick={() => operadoresStore.aprobar(op.id)}>
                Aprobar
              </Button>
            </>
          )}
        </div>
      </div>

      {op.estado === "pendiente" && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
          <div>
            <p className="text-sm font-medium text-warning-700 dark:text-warning-300">Solicitud pendiente</p>
            <p className="mt-0.5 text-xs text-warning-600 dark:text-warning-400">
              Asigna un rol y pulsa «Aprobar» para darle acceso, o «Rechazar» para descartar la solicitud.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-error-600 hover:bg-error-50 border-error-200 dark:border-error-800"
              onClick={rechazar}
            >
              Rechazar solicitud
            </Button>
            <Button size="sm" onClick={() => operadoresStore.aprobar(op.id)}>
              Aprobar
            </Button>
          </div>
        </div>
      )}

      {/* Grid: datos a la izquierda, capacidades a la derecha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda: datos + rol */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Datos de contacto</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="pf-nombre">Nombre completo</Label>
                <Input
                  id="pf-nombre"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setDatosGuardados(false);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="pf-email">Correo electrónico</Label>
                <Input
                  id="pf-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setDatosGuardados(false);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="pf-tel">Teléfono</Label>
                <Input
                  id="pf-tel"
                  type="tel"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    setDatosGuardados(false);
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              {datosGuardados && <span className="text-xs text-success-600 dark:text-success-500">Guardado ✓</span>}
              <Button size="sm" variant="outline" onClick={guardarDatos}>Guardar datos</Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Rol y Acceso</h2>
              <Badge color={estado.color} size="xs">{estado.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              El rol es el paquete de capacidades que esta persona hereda. Cambiarlo reexpresa sus ajustes a
              mano contra el rol nuevo.
            </p>
            <div className="mt-4">
              <Select
                options={rolesAsignables.map((r) => ({ value: r.id, label: r.nombre }))}
                defaultValue={op.rolId ?? ""}
                onChange={cambiarRol}
                placeholder="Sin rol"
              />
            </div>
            {rol ? (
              <p className="mt-2 text-xs text-gray-400">{rol.descripcion}</p>
            ) : (
              <p className="mt-2 text-xs text-warning-600 dark:text-warning-400">
                Sin rol no tiene ninguna capacidad (fail-closed).
              </p>
            )}

            {/* Gestión del acceso: botón de Suspender / Reactivar */}
            {op.estado !== "pendiente" && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {op.estado === "activo" ? "Acceso habilitado" : "Acceso suspendido"}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {op.estado === "activo"
                      ? "Puede entrar y operar según su rol."
                      : "No puede entrar al sistema."}
                  </p>
                </div>
                {op.estado === "activo" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-warning-700 border-warning-300 hover:bg-warning-50 hover:text-warning-800 dark:text-warning-400 dark:border-warning-800 dark:hover:bg-warning-950/30 cursor-pointer"
                    onClick={() => operadoresStore.desactivar(op.id)}
                  >
                    Suspender
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success-700 border-success-300 hover:bg-success-50 hover:text-success-800 dark:text-success-400 dark:border-success-800 dark:hover:bg-success-950/30 cursor-pointer"
                    onClick={() => operadoresStore.activar(op.id)}
                  >
                    Reactivar
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Columna derecha: capacidades estructuradas como tabla con categorías */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-5 pb-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Capacidades y Permisos</h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {efectivas.length} de 18 capacidades activas. Organizadas por categorías de negocio.
                  </p>
                </div>
              </div>

              {/* Filtros rápidos por categoría */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro("todas")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    categoriaFiltro === "todas"
                      ? "bg-brand-500 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  Todas ({efectivas.length}/18)
                </button>
                {CAPACIDAD_GRUPOS.map((g) => {
                  const activas = g.capacidades.filter((c) => efectivas.includes(c)).length;
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
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/70 border-b border-gray-100 dark:border-white/5 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell header className="py-3 pl-5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Categoría
                  </TableCell>
                  <TableCell header className="py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Capacidad / Acción
                  </TableCell>
                  <TableCell header className="py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Origen
                  </TableCell>
                  <TableCell header className="py-3 text-right pr-5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Acceso
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposFiltrados.map((grupo) => (
                  <Fragment key={grupo.id}>
                    {grupo.capacidades.map((cap) => {
                      const proc = procedenciaDe(op, cap, capacidadesDelRol);
                      const meta = PROCEDENCIA_META[proc];
                      const activa = proc === "rol" || proc === "concedida";
                      return (
                        <TableRow key={cap} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <TableCell className="py-3 pl-5 whitespace-nowrap">
                            <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs" className="font-semibold">
                              {grupo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {CAPACIDAD_LABEL[cap]}
                              </p>
                              <p className="font-mono text-[11px] text-gray-400">{cap}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap">
                            <Badge color={meta.color} size="xs">{meta.label}</Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className={`text-xs font-medium ${activa ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
                                {activa ? "Habilitada" : "Deshabilitada"}
                              </span>
                              <Switch
                                checked={activa}
                                onChange={() => toggleCapacidad(cap)}
                                aria-label={CAPACIDAD_LABEL[cap]}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
});

export default PerfilOperadorPage;
