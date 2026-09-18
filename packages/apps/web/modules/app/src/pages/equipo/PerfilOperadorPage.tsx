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
import { aplicarPreset, aplicarToggle, normalizar, procedenciaDe } from "./excepciones";
import {
  PROCEDENCIA_HUMANA,
  ajustesDe,
  inicialesDe,
} from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PERFIL DE MIEMBRO DEL EQUIPO — /equipo/:id
// ═══════════════════════════════════════════════════════════════════════════

export const PerfilOperadorPage = observer(() => {
  const { id } = useParams<{ id: string }>();
  const op = operadoresStore.porId(id);

  if (!op) {
    return (
      <>
        <PageMeta title="Persona no encontrada · Equipo" description="La persona no existe" />
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Esta persona ya no está en el equipo.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Puede que se haya eliminado de la organización.
            </p>
            <Link
              to="/equipo"
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
// CONTENIDO LIMPIO DEL PERFIL
// ═══════════════════════════════════════════════════════════════════════════

const PerfilContent = observer(({ op }: { op: Operador }) => {
  const navigate = useNavigate();

  // Datos editables
  const [nombre, setNombre] = useState(op.nombre);
  const [email, setEmail] = useState(op.email);
  const [telefono, setTelefono] = useState(op.telefono);
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [datosGuardados, setDatosGuardados] = useState(false);

  const estado = ESTADO_META[op.estado];
  const rol = rolesStore.porId(op.rolId);
  const capacidadesDelRol = rol?.capacidades ?? [];
  const efectivas = rolesStore.capacidadesEfectivas(op);
  const rolesAsignables = rolesStore.roles.filter((r) => r.id !== "admin_tienda");
  const ajustes = ajustesDe(op);

  // ── Modificar capacidades individuales ────────────────────────────────────
  const toggleCapacidad = (cap: Capacidad) => {
    const activar = !efectivas.includes(cap);
    const siguiente = aplicarToggle(op, cap, capacidadesDelRol, activar);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  // ── Alternar grupo completo ───────────────────────────────────────────────
  const alternarGrupo = (grupo: (typeof CAPACIDAD_GRUPOS)[number]) => {
    const tiene = new Set(efectivas);
    const completa = grupo.capacidades.every((c) => tiene.has(c));
    const objetivo = completa
      ? efectivas.filter((c) => !grupo.capacidades.includes(c))
      : [...new Set([...efectivas, ...grupo.capacidades])];

    const siguiente = aplicarPreset(op, objetivo, capacidadesDelRol);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  // ── Restablecer todas las excepciones al rol ──────────────────────────────
  const restablecerAlRol = () => {
    operadoresStore.setCapacidadesExtra(op.id, []);
    operadoresStore.setCapacidadesRemovidas(op.id, []);
  };

  // ── Cambio de rol ─────────────────────────────────────────────────────────
  const cambiarRol = (nuevoRolId: string) => {
    const nuevoRol = rolesStore.porId(nuevoRolId);
    if (!nuevoRol) return;
    const normalizadas = normalizar(op, nuevoRol.capacidades);
    operadoresStore.setCapacidadesExtra(op.id, normalizadas.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, normalizadas.capacidadesRemovidas);
    operadoresStore.setRol(op.id, nuevoRolId);
  };

  // ── Guardar datos de contacto ─────────────────────────────────────────────
  const guardarDatos = () => {
    operadoresStore.actualizarDatos(op.id, {
      nombre: nombre.trim() || op.nombre,
      email: email.trim() || op.email,
      telefono: telefono.trim() || op.telefono,
    });
    setEditandoDatos(false);
    setDatosGuardados(true);
    setTimeout(() => setDatosGuardados(false), 3000);
  };

  const puedeVerComo = op.estado === "activo";
  const verComo = () => {
    if (!puedeVerComo) return;
    sessionStore.simular(op.id);
    navigate(sessionStore.homePathActual);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageMeta title={`${op.nombre} · Perfil de Equipo`} description="Gestión de rol y permisos" />

      {/* Navegación hacia atrás */}
      <Link
        to="/equipo"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>← Volver a Equipo</span>
      </Link>

      {/* ── 1. FICHA DEL MIEMBRO ────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              src={op.avatarUrl || ""}
              initials={inicialesDe(op.nombre)}
              size="large"
              status={op.estado === "pendiente" ? "busy" : op.estado === "activo" ? "online" : "none"}
              alt={op.nombre}
              className="flex-shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {op.nombre}
                </h1>
                <Badge color={estado.color} size="xs">
                  {estado.label}
                </Badge>
              </div>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {op.cargo || "Sin cargo definido"} · {op.email} · {op.telefono}
              </p>

              {datosGuardados && (
                <span className="mt-2 inline-block text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Datos actualizados correctamente.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {puedeVerComo && (
              <Button size="sm" variant="outline" onClick={verComo}>
                Ver como (Simular)
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditandoDatos(!editandoDatos)}
            >
              {editandoDatos ? "Cancelar edición" : "Editar datos"}
            </Button>
          </div>
        </div>

        {/* Formulario de edición rápida si se activa */}
        {editandoDatos && (
          <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Editar Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="ed-nom">Nombre</Label>
                <Input
                  id="ed-nom"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ed-em">Correo Electrónico</Label>
                <Input
                  id="ed-em"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ed-tel">Teléfono</Label>
                <Input
                  id="ed-tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditandoDatos(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardarDatos}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── ALERTA DE SOLICITUD PENDIENTE (SI CORRESPONDE) ────────────────── */}
      {op.estado === "pendiente" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10">
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Solicitud de acceso pendiente
            </h3>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              Revisa su rol y permisos a continuación. Al aprobar, el operador podrá iniciar sesión en la plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              onClick={() => {
                operadoresStore.rechazar(op.id);
                navigate("/equipo");
              }}
            >
              Rechazar
            </Button>
            <button
              type="button"
              onClick={() => operadoresStore.aprobar(op.id)}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              Aprobar operador
            </button>
          </div>
        </div>
      )}

      {/* ── 2. SELECCIÓN DEL ROL ────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Rol Asignado
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              El rol define los permisos base del operador. Cualquier cambio reajustará sus capacidades automáticamente.
            </p>
          </div>

          <div className="w-full sm:w-64 sm:flex-shrink-0">
            <Select
              options={rolesAsignables.map((r) => ({ value: r.id, label: r.nombre }))}
              defaultValue={op.rolId ?? ""}
              onChange={cambiarRol}
              placeholder="Seleccionar rol"
            />
          </div>
        </div>

        {ajustes.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <span className="text-xs text-blue-800 dark:text-blue-300">
              Este operador tiene <strong>{ajustes.length}</strong> ajuste{ajustes.length > 1 ? "s" : ""} personalizado{ajustes.length > 1 ? "s" : ""} sobre su rol.
            </span>
            <button
              type="button"
              onClick={restablecerAlRol}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 cursor-pointer"
            >
              Restablecer al rol original
            </button>
          </div>
        )}
      </Card>

      {/* ── 3. REGLAS Y PERMISOS DE ACCESO (TOTALMENTE VISIBLES, SIN COLAPSO) ─ */}
      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Permisos y Reglas de Acceso
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Capacidades visibles por área. Activa o desactiva interruptores para conceder o revocar permisos específicos.
            </p>
          </div>

          <span className="text-xs font-medium text-gray-400">
            {efectivas.length} de 18 capacidades activas
          </span>
        </div>

        {/* Grid de 2 columnas con todas las categorías desplegadas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {CAPACIDAD_GRUPOS.map((grupo) => {
            const tiene = new Set(efectivas);
            const puede = grupo.capacidades.filter((c) => tiene.has(c));
            const completa = puede.length === grupo.capacidades.length;

            return (
              <div
                key={grupo.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Cabecera del Grupo */}
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Badge color={CATEGORIA_COLORES[grupo.id] || "light"} size="xs">
                      {grupo.label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {puede.length} de {grupo.capacidades.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => alternarGrupo(grupo)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
                  >
                    {completa ? "Quitar todo" : "Dar todo"}
                  </button>
                </div>

                {/* Lista limpia de capacidades del grupo con switch directo */}
                <div className="space-y-2.5">
                  {grupo.capacidades.map((cap) => {
                    const activa = efectivas.includes(cap);
                    const proc = procedenciaDe(op, cap, capacidadesDelRol);
                    const meta = PROCEDENCIA_HUMANA[proc];

                    return (
                      <div
                        key={cap}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2.5 transition-colors dark:border-gray-800 dark:bg-white/[0.02]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
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
                          label=""
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
});
