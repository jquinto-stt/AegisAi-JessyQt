import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Avatar } from "@/elements/ui/avatar";
import { Card } from "@/elements/ui/card";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Switch } from "@/elements/form/switch";
import { ChevronDownIcon } from "@/icons";
import {
  CAPACIDAD_GRUPOS,
  CAPACIDAD_LABEL,
  operadoresStore,
  rolesStore,
  sessionStore,
  type Capacidad,
  type Operador,
} from "@/stores";
import { ESTADO_META, CATEGORIA_COLORES, NIVEL_COLOR } from "./equipo.constants";
import { aplicarPreset, aplicarToggle, normalizar, procedenciaDe } from "./excepciones";
import {
  NIVEL_LABEL,
  PERFILES_TAREA,
  PROCEDENCIA_HUMANA,
  ajustesDe,
  areasCompletas,
  fraseDeAcceso,
  inicialesDe,
  perfilQueEncaja,
  resumenDeAreas,
  unirConY,
  type ResumenArea,
} from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// PERFIL DE UNA PERSONA DEL EQUIPO — /pedidos/equipo/:id
// ═══════════════════════════════════════════════════════════════════════════
//
// Es una RUTA, no un modal (decisión del contrato / propuesta): se puede
// compartir, recargar y enlazar.
//
// CÓMO ESTÁ ORDENADA, Y POR QUÉ
//
// Antes esta pantalla era una tabla de 18 filas —categoría, capacidad, código
// técnico, procedencia— con un interruptor por fila, más 8 píldoras de filtro.
// Responder "¿qué puede hacer Camila?" exigía leer las 18 filas y, de paso,
// entender `preparation.manage` y la diferencia entre heredar y conceder.
//
// Ahora la pantalla va de lo general a lo concreto, en cuatro capas:
//
//   1. QUIÉN ES. Nombre, rol y una frase que resume su acceso entero.
//   2. QUÉ PUEDE HACER. Siete áreas de negocio con un chip Sí / Parcial / No.
//      Cuando un área es parcial se dice **qué falta**, que es lo accionable.
//   3. QUÉ SE DESVÍA DEL ROL. Solo los ajustes a mano, si los hay.
//   4. LOS 18 INTERRUPTORES. Detrás de "Ajustar permisos uno por uno", cerrado
//      por defecto. Nada se pierde: la precisión sigue disponible para quien
//      la necesita, pero deja de ser lo primero que se ve.
//
// Regla que se respeta en todo el archivo: **la pantalla no decide nada**. Los
// conjuntos se calculan con `rolesStore.capacidadesEfectivas` y las escrituras
// pasan por `aplicarToggle` / `aplicarPreset`, que son los que mantienen las
// excepciones mínimas. Aquí solo se elige cómo contarlo.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Segunda línea de una fila de área.
 *
 * El caso `parcial` es el único que necesita explicación —"sí" y "no" se
 * entienden solos—, así que es el único que enumera capacidades. Se listan las
 * que **faltan**, no las que tiene: si alguien cubre 5 de 6, lo que hay que
 * revisar es la que falta.
 */
function detalleDeArea(area: ResumenArea): string {
  if (area.nivel === "no") return "Sin acceso a esta área.";
  if (area.nivel === "parcial") return `Le falta: ${unirConY(area.faltantes)}.`;
  return area.resumen;
}

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

  // Divulgación progresiva: las dos zonas que empiezan cerradas.
  const [contactoAbierto, setContactoAbierto] = useState(false);
  const [permisosAbiertos, setPermisosAbiertos] = useState(false);

  const estado = ESTADO_META[op.estado];
  const rol = rolesStore.porId(op.rolId);
  const capacidadesDelRol = rol?.capacidades ?? [];
  const efectivas = rolesStore.capacidadesEfectivas(op);

  const rolesAsignables = rolesStore.roles.filter((r) => r.id !== "admin_tienda");

  // Todo lo que se pinta sale de aquí y se recalcula en cada render: al mover un
  // interruptor, el resumen de arriba tiene que cambiar en el mismo frame.
  const areas = resumenDeAreas(efectivas);
  const completas = areasCompletas(areas);
  const ajustes = ajustesDe(op);
  const perfilActual = perfilQueEncaja(efectivas);

  // ── Escrituras ────────────────────────────────────────────────────────────
  //
  // Un único camino para todo cambio de permisos, en bloque o de uno en uno.
  // `aplicarPreset` ya sabe calcular la diferencia contra lo que hay, así que
  // no hace falta que la UI lleve la cuenta.

  const aplicarObjetivo = (objetivo: Capacidad[]) => {
    const siguiente = aplicarPreset(op, objetivo, capacidadesDelRol);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  const toggleCapacidad = (cap: Capacidad) => {
    const activar = !efectivas.includes(cap);
    const siguiente = aplicarToggle(op, cap, capacidadesDelRol, activar);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  /** Enciende el área entera si le falta algo, y la apaga si ya la tiene completa. */
  const alternarArea = (grupo: (typeof CAPACIDAD_GRUPOS)[number]) => {
    const tiene = new Set(efectivas);
    const completa = grupo.capacidades.every((c) => tiene.has(c));
    const objetivo = completa
      ? efectivas.filter((c) => !grupo.capacidades.includes(c))
      : [...new Set([...efectivas, ...grupo.capacidades])];
    aplicarObjetivo(objetivo);
  };

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

  // ── Datos de contacto y acceso ────────────────────────────────────────────
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

  return (
    <>
      <PageMeta title={`${op.nombre} · Equipo`} description="Perfil, rol y permisos de la persona" />

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

      {/* ── 1. Quién es ─────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            src={op.avatarUrl || ""}
            initials={inicialesDe(op.nombre)}
            size="large"
            status={op.estado === "pendiente" ? "busy" : op.estado === "activo" ? "online" : "none"}
            alt={op.nombre}
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">{op.nombre}</h1>
              <Badge color={estado.color} size="sm">
                {estado.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {op.cargo || "Sin cargo"} ·{" "}
              {rol ? (
                <>
                  rol <span className="font-medium text-gray-700 dark:text-gray-300">{rol.nombre}</span>
                </>
              ) : (
                <span className="text-warning-600 dark:text-warning-400">sin rol asignado</span>
              )}
            </p>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              {fraseDeAcceso(areas)}
            </p>
          </div>
          <span
            className="flex-shrink-0"
            title={puedeVerComo ? `Entrar como ${op.nombre}` : "Solo se puede ver como una persona activa"}
          >
            <Button size="sm" variant="outline" disabled={!puedeVerComo} onClick={verComo}>
              Ver como
            </Button>
          </span>
        </div>
      </Card>

      {/* Solicitud pendiente: aquí viven las acciones, y solo aquí. */}
      {op.estado === "pendiente" && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-warning-500/30 dark:bg-warning-500/10">
          <div>
            <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
              Solicitó acceso
            </p>
            <p className="mt-0.5 text-xs text-warning-600 dark:text-warning-400">
              Elige su rol abajo y pulsa «Aprobar». Hasta entonces no puede entrar.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800"
              onClick={rechazar}
            >
              Rechazar
            </Button>
            <Button size="sm" onClick={() => operadoresStore.aprobar(op.id)}>
              Aprobar
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. Qué puede hacer ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Qué puede hacer
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {completas} de {areas.length} áreas completas
          </p>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Siete áreas de negocio en vez de dieciocho permisos sueltos.
        </p>

        {/* Rol: la base de la que sale todo lo de abajo. */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Label htmlFor="pf-rol">Su rol</Label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                El rol es el paquete de permisos que hereda. Cambiarlo reajusta lo de abajo.
              </p>
            </div>
            <div className="w-full sm:w-56 sm:flex-shrink-0">
              <Select
                options={rolesAsignables.map((r) => ({ value: r.id, label: r.nombre }))}
                defaultValue={op.rolId ?? ""}
                onChange={cambiarRol}
                placeholder="Sin rol"
              />
            </div>
          </div>
          {!rol && (
            <p className="mt-2 text-xs text-warning-600 dark:text-warning-400">
              Sin rol no hereda ningún permiso: todo lo que tenga sería añadido a mano.
            </p>
          )}
        </div>

        {/* Las siete áreas. */}
        <div className="mt-2">
          {areas.map((area) => (
            <div
              key={area.id}
              data-area={area.id}
              data-nivel={area.nivel}
              data-activas={area.activas}
              data-total={area.total}
              className={`flex items-start justify-between gap-4 border-t border-gray-100 py-3 dark:border-white/5 ${
                area.nivel === "no" ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{area.label}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {detalleDeArea(area)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[11px] tabular-nums text-gray-400">
                  {area.activas}/{area.total}
                </span>
                <Badge color={NIVEL_COLOR[area.nivel]} size="xs">
                  {NIVEL_LABEL[area.nivel]}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Ajustes a mano: solo existen si hay algo que contar. */}
        {ajustes.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-light-200 bg-blue-light-50/60 p-3 dark:border-blue-light-500/30 dark:bg-blue-light-500/10">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {ajustes.length} ajuste{ajustes.length === 1 ? "" : "s"} solo para {op.nombre.split(" ")[0]}
              </p>
              <button
                type="button"
                onClick={() => aplicarObjetivo(capacidadesDelRol)}
                className="cursor-pointer text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Dejar solo su rol
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {ajustes.map((ajuste) => (
                <li key={`${ajuste.tipo}-${ajuste.capacidad}`} className="text-xs text-gray-600 dark:text-gray-300">
                  <span
                    className={
                      ajuste.tipo === "mas"
                        ? "font-semibold text-success-600 dark:text-success-400"
                        : "font-semibold text-warning-600 dark:text-warning-400"
                    }
                  >
                    {ajuste.tipo === "mas" ? "＋" : "－"}
                  </span>{" "}
                  {ajuste.label}
                  <span className="text-gray-400">
                    {" "}
                    — {PROCEDENCIA_HUMANA[ajuste.tipo === "mas" ? "concedida" : "removida"].label.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Asistente de tareas: para quien no quiere pensar en permisos. */}
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/5">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">¿Qué hace esta persona?</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Elige un oficio y dejamos los permisos listos. Reemplaza los de ahora; después puedes retocarlos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERFILES_TAREA.map((perfil) => {
              const objetivo = new Set(perfil.capacidades);
              const actuales = new Set(efectivas);
              const da = perfil.capacidades.filter((c) => !actuales.has(c)).length;
              const quita = efectivas.filter((c) => !objetivo.has(c)).length;
              const esActual = perfilActual?.id === perfil.id;

              return (
                <button
                  key={perfil.id}
                  type="button"
                  data-perfil={perfil.id}
                  onClick={() => aplicarObjetivo(perfil.capacidades)}
                  title={perfil.descripcion}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors ${
                    esActual
                      ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                      : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                      {perfil.nombre}
                    </span>
                    {esActual && (
                      <Badge color="primary" size="xs">
                        Actual
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">
                    {perfil.descripcion}
                  </span>
                  {/* El delta va en su propia línea, nunca en lugar de la
                      descripción: cuando más falta hace entender qué hace el
                      perfil es justo cuando más permisos cambia. */}
                  {(da > 0 || quita > 0) && (
                    <span className="mt-1 block text-[11px] text-gray-400 dark:text-gray-500">
                      {[da > 0 && `suma ${da}`, quita > 0 && `quita ${quita}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── 4. Los 18 interruptores, detrás de una divulgación ──────────────── */}
      <Card className="mb-6 p-0">
        <button
          type="button"
          onClick={() => setPermisosAbiertos((v) => !v)}
          aria-expanded={permisosAbiertos}
          className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
              Ajustar permisos uno por uno
            </span>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {efectivas.length} de 18 activos. Para quien necesita el detalle exacto.
            </span>
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
              permisosAbiertos ? "rotate-180" : ""
            }`}
          />
        </button>

        {permisosAbiertos && (
          <div className="border-t border-gray-100 px-5 pb-5 dark:border-white/5">
            {CAPACIDAD_GRUPOS.map((grupo) => {
              const tiene = new Set(efectivas);
              const activasEnGrupo = grupo.capacidades.filter((c) => tiene.has(c)).length;
              const completa = activasEnGrupo === grupo.capacidades.length;

              return (
                <div key={grupo.id} className="mt-4">
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
                      onClick={() => alternarArea(grupo)}
                      className="cursor-pointer text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      {completa ? "Quitar todo" : "Dar todo"}
                    </button>
                  </div>

                  <div className="mt-1">
                    {grupo.capacidades.map((cap) => {
                      const proc = procedenciaDe(op, cap, capacidadesDelRol);
                      const meta = PROCEDENCIA_HUMANA[proc];
                      const activa = proc === "rol" || proc === "concedida";

                      return (
                        <div
                          key={cap}
                          className="flex items-center justify-between gap-3 border-t border-gray-100 py-2 dark:border-white/5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {/* El código técnico va en el `title`: sigue accesible
                                para quien depura, pero no compite con la etiqueta. */}
                            <span
                              title={cap}
                              className="truncate text-sm text-gray-700 dark:text-gray-300"
                            >
                              {CAPACIDAD_LABEL[cap]}
                            </span>
                            {meta.tono !== "neutro" && (
                              <Badge
                                color={meta.tono === "mas" ? "success" : "warning"}
                                size="xs"
                              >
                                {meta.label}
                              </Badge>
                            )}
                          </div>
                          <Switch
                            checked={activa}
                            onChange={() => toggleCapacidad(cap)}
                            aria-label={CAPACIDAD_LABEL[cap]}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Contacto y acceso: lo administrativo, al final ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Datos de contacto
              </h2>
              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                {op.email} · {op.telefono}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setContactoAbierto((v) => !v)}>
              {contactoAbierto ? "Cerrar" : "Editar"}
            </Button>
          </div>

          {contactoAbierto && (
            <>
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
                {datosGuardados && (
                  <span className="text-xs text-success-600 dark:text-success-500">Guardado</span>
                )}
                <Button size="sm" variant="outline" onClick={guardarDatos}>
                  Guardar datos
                </Button>
              </div>
            </>
          )}
        </Card>

        {op.estado !== "pendiente" && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Acceso al sistema</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {op.estado === "activo" ? "Puede entrar" : "No puede entrar"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {op.estado === "activo"
                    ? "Su acceso está habilitado según los permisos de arriba."
                    : "Su cuenta sigue aquí, pero no puede iniciar sesión."}
                </p>
              </div>
              {op.estado === "activo" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 cursor-pointer border-warning-300 text-warning-700 hover:bg-warning-50 hover:text-warning-800 dark:border-warning-800 dark:text-warning-400 dark:hover:bg-warning-950/30"
                  onClick={() => operadoresStore.desactivar(op.id)}
                >
                  Suspender
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 cursor-pointer border-success-300 text-success-700 hover:bg-success-50 hover:text-success-800 dark:border-success-800 dark:text-success-400 dark:hover:bg-success-950/30"
                  onClick={() => operadoresStore.activar(op.id)}
                >
                  Reactivar
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
});

export default PerfilOperadorPage;
