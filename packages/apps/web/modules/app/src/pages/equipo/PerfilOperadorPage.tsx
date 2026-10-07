import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Avatar } from "@/elements/ui/avatar";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  AdjustmentsHorizontalIcon,
  AlertIcon,
  AngleDoubleDownIcon,
  AngleDoubleUpIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  EyeIcon,
  IdentificationIcon,
  KeyIcon,
  LockIcon,
  PencilIcon,
  TrashBinIcon,
} from "@/icons";
import {
  CAPACIDAD_GRUPOS,
  operadoresStore,
  rolesStore,
  sessionStore,
  type Capacidad,
  type Operador,
} from "@/stores";
import { puede } from "@/stores/acceso.utils";
import { BloqueConfig, GrupoCapacidades, type FilaCapacidad } from "@/pages/config-layout";
import { ESTADO_META, CATEGORIA_COLORES } from "./equipo.constants";
import { aplicarPreset, aplicarToggle, normalizar, procedenciaDe } from "./excepciones";
import {
  CAPACIDADES_GESTION,
  PROCEDENCIA_HUMANA,
  ajustesDe,
  inicialesDe,
  motivoAutodesahucio,
  validarContacto,
} from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// GUARDAS FRONTEND DE SEGURIDAD (mock, sin backend)
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta pantalla es la única de "Equipo" donde se puede revocar un permiso a la
// persona que a su vez administra el equipo. Dos reglas se comprueban aquí, en
// la capa de presentación, porque el mock no tiene backend donde ponerlas:
//
//   1. AUTODESAhuicio (self-lockout). Quitarse `team.manage` a uno mismo —o
//      degradarse a un rol sin gestión de equipo— deja a la sesión sin la
//      capacidad con la que se llegó a esta pantalla. En un sistema real lo
//      rechazaría el servidor; aquí se **deshabilita el control y se explica
//      por qué**, que es más honesto que un interruptor que no guarda.
//
//   2. Acciones de ciclo de vida sobre uno mismo (auto-suspensión, auto-borrado).
//      Mismo razonamiento: la sesión que se suspende a sí misma queda sin sesión.
//
// El guard NO es autorización: eso es `puede()` (contrato §2). Esto es la
// variante "y además no sobre ti mismo", que el contrato no cubría porque asume
// un actor distinto del sujeto (contrato §1.7).
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ¿La sesión está inspeccionando a la persona con la que entró?
 *
 * Se compara solo cuando hay simulación (`operadorSimuladoId !== null`): en una
 * sesión directa de administrador no hay "yo" que pueda colisionar con la fila,
 * y el admin del SEED (`d0`) no es el administrador que navega.
 */
function esUnoMismo(op: Operador): boolean {
  return sessionStore.operadorSimuladoId !== null && sessionStore.operadorSimuladoId === op.id;
}

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
        <div className="rounded-3xl border border-gray-100 bg-white py-12 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-theme-sm font-medium text-ink-title dark:text-white">
            Esta persona ya no está en el equipo.
          </p>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            Puede que se haya eliminado de la organización.
          </p>
          <Link
            to="/equipo"
            className="mt-4 inline-block text-theme-sm font-medium text-secondary-600 hover:text-secondary-700 dark:text-brand-400"
          >
            Volver al equipo
          </Link>
        </div>
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
  /**
   * Campos tocados desde que se abrió el formulario.
   *
   * Existe para no pintar en rojo "El nombre es obligatorio" nada más abrir el
   * editor: un formulario que nace en error se lee como roto. Los errores se
   * calculan siempre, pero solo se muestran en los campos ya tocados, y
   * "Guardar" se bloquea igual.
   */
  const [tocados, setTocados] = useState<{ nombre: boolean; email: boolean; telefono: boolean }>({
    nombre: false,
    email: false,
    telefono: false,
  });

  const estado = ESTADO_META[op.estado];
  const rol = rolesStore.porId(op.rolId);
  const capacidadesDelRol = rol?.capacidades ?? [];
  const efectivas = rolesStore.capacidadesEfectivas(op);
  const ajustes = ajustesDe(op);

  // ── Guardas de la sesión sobre sí misma ───────────────────────────────────
  const esUnoMismoOp = esUnoMismo(op);
  const motivoSelf = motivoAutodesahucio(op, capacidadesDelRol);
  /**
   * La sesión puede gestionar el equipo (capacidad `team.manage`).
   *
   * No basta con estar *en* esta pantalla: entrar exige `team.read` y operarla
   * exige `team.manage` (contrato §1.5 / invariante C5). Sin esto, el perfil
   * ofrecía interruptores que un rol de solo lectura podía accionar.
   */
  const puedeGestionar = puede("team.manage");

  // ── Rol: `admin_tienda` se muestra, no se cambia ──────────────────────────
  //
  // El selector filtraba `admin_tienda` de las opciones y el rol del operador
  // caía a un `<option>` que no existía → el `<select>` se pintaba vacío y
  // parecía que la persona no tenía rol. Se corrige en los dos sentidos:
  //
  //   - si la persona YA tiene el rol de administrador, se pinta una etiqueta
  //     fija (dato exacto, no un desplegable en blanco);
  //   - si no lo tiene, el selector ofrece los roles asignables **más su rol
  //     actual**, marcado como heredado, para que un rol fuera del catálogo
  //     (p. ej. uno creado a mano) tampoco se pierda de vista.
  const esAdminPrincipal = op.rolId === "admin_tienda";
  const opcionesRol =
    esAdminPrincipal || !op.rolId || rolesStore.porId(op.rolId)
      ? rolesStore.roles
          .filter((r) => r.id !== "admin_tienda" || r.id === op.rolId)
          .map((r) => ({
            value: r.id,
            label: r.id === op.rolId && r.id !== "admin_tienda" ? `${r.nombre} (actual)` : r.nombre,
          }))
      : [
          ...rolesStore.roles.filter((r) => r.id !== "admin_tienda").map((r) => ({ value: r.id, label: r.nombre })),
          { value: op.rolId, label: "Rol heredado (fuera del catálogo)" },
        ];

  const validez = validarContacto({ nombre, email, telefono });

  // ── Modificar capacidades individuales ────────────────────────────────────
  const toggleCapacidad = (cap: Capacidad) => {
    // Segunda línea de defensa: la UI ya deshabilita el interruptor, pero el
    // handler no depende de que el interruptor esté bien pintado.
    if (esUnoMismoOp && CAPACIDADES_GESTION.includes(cap)) return;

    const activar = !efectivas.includes(cap);
    const siguiente = aplicarToggle(op, cap, capacidadesDelRol, activar);
    operadoresStore.setCapacidadesExtra(op.id, siguiente.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, siguiente.capacidadesRemovidas);
  };

  // ── Alternar grupo completo ───────────────────────────────────────────────
  const alternarGrupo = (grupo: (typeof CAPACIDAD_GRUPOS)[number]) => {
    const tiene = new Set(efectivas);
    const completa = grupo.capacidades.every((c) => tiene.has(c));
    let objetivo = completa
      ? efectivas.filter((c) => !grupo.capacidades.includes(c))
      : [...new Set([...efectivas, ...grupo.capacidades])];

    // El preset no puede revocar la gestión de equipo a quien está mirando su
    // propio perfil: "Quitar todo" en el grupo Equipo recortaría el conjunto
    // sin que el interruptor deshabilitado lo insinúe.
    if (esUnoMismoOp) objetivo = objetivo.filter((c) => !CAPACIDADES_GESTION.includes(c));

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

    // La persona no puede quitarse a sí misma la gestión de equipo cambiándose
    // el rol. En vez de degradar a ciegas se abre el aviso de autodesahuicio.
    if (esUnoMismoOp && !nuevoRol.capacidades.includes("team.manage")) {
      setAvisoRol(nuevoRol.nombre);
      return;
    }

    const normalizadas = normalizar(op, nuevoRol.capacidades);
    operadoresStore.setCapacidadesExtra(op.id, normalizadas.capacidadesExtra);
    operadoresStore.setCapacidadesRemovidas(op.id, normalizadas.capacidadesRemovidas);
    operadoresStore.setRol(op.id, nuevoRolId);
  };

  // ── Guardar datos de contacto ─────────────────────────────────────────────
  //
  // Antes, cada campo vacío caía a su valor anterior en silencio
  // (`nombre.trim() || op.nombre`): el formulario aceptaba cualquier cosa y
  // "guardaba" sin guardar. Ahora se valida y no se puede guardar inválido.
  const guardarDatos = () => {
    if (!validez.valido) {
      setTocados({ nombre: true, email: true, telefono: true });
      return;
    }
    operadoresStore.actualizarDatos(op.id, {
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
    });
    setEditandoDatos(false);
    setDatosGuardados(true);
    setTimeout(() => setDatosGuardados(false), 3000);
  };

  /** Cierra el editor y descarta lo escrito, para que no quede a medias. */
  const cancelarEdicion = () => {
    setNombre(op.nombre);
    setEmail(op.email);
    setTelefono(op.telefono);
    setTocados({ nombre: false, email: false, telefono: false });
    setEditandoDatos(false);
    setAvisoRol(null);
  };

  const puedeVerComo = op.estado === "activo" && !esUnoMismoOp;
  const verComo = () => {
    if (!puedeVerComo) return;
    sessionStore.simular(op.id);
    navigate(sessionStore.homePathActual);
  };

  // ── Acciones de ciclo de vida ─────────────────────────────────────────────
  const [confirmacion, setConfirmacion] = useState<null | "suspender" | "reactivar" | "eliminar">(null);
  const [avisoRol, setAvisoRol] = useState<string | null>(null);

  /** Auto-suspensión y auto-borrado: la sesión se dejaría sin sesión. */
  const motivoCicloPropio = "No puedes realizar esta acción sobre tu propia cuenta.";

  const cerrarConfirmacion = () => setConfirmacion(null);

  const ejecutarCiclo = () => {
    if (!confirmacion) return;
    if (confirmacion === "eliminar") {
      operadoresStore.eliminar(op.id);
      cerrarConfirmacion();
      navigate("/equipo");
      return;
    }
    if (confirmacion === "suspender") operadoresStore.desactivar(op.id);
    if (confirmacion === "reactivar") operadoresStore.activar(op.id);
    cerrarConfirmacion();
  };

  // ── Control de colapso de categorías por tarjetas ─────────────────────────
  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    // Por defecto, colapsamos todos los grupos para no abrumar visualmente
    const inicial: Record<string, boolean> = {};
    for (const g of CAPACIDAD_GRUPOS) {
      inicial[g.id] = true;
    }
    return inicial;
  });

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

  return (
    <div className="space-y-6 pb-12">
      <PageMeta title={`${op.nombre} · Perfil de Equipo`} description="Gestión de rol y permisos" />

      {/* Navegación hacia atrás */}
      <Link
        to={op.modulo === "inventarios" ? "/inventarios/operadores" : "/pedidos/operadores"}
        className="inline-flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        {/* El icono ya dice «atrás»: el texto no necesita además un «←». */}
        <ChevronLeftIcon className="h-4 w-4" />
        <span>Volver a Operadores</span>
      </Link>

      {/* ── 1. FICHA DEL MIEMBRO ────────────────────────────────────────────── */}
      <BloqueConfig
        icono={IdentificationIcon}
        pregunta={op.nombre}
        descripcion="Datos de contacto, estado de acceso y acciones sobre esta persona."
      >
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
              {/* El nombre ya es la `pregunta` del bloque: aquí solo van los
                  distintivos de estado, para no repetir el nombre dos veces. */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge color={estado.color} size="xs">
                  {estado.label}
                </Badge>
                {esUnoMismoOp && (
                  <Badge color="primary" size="xs">
                    Eres tú
                  </Badge>
                )}
              </div>

              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {op.cargo || "Sin cargo definido"} · {op.email} · {op.telefono}
              </p>

              {datosGuardados && (
                <span className="mt-2 inline-block text-theme-xs font-medium text-success-700 dark:text-success-400">
                  Datos actualizados correctamente.
                </span>
              )}

              {!puedeGestionar && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  <LockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Solo lectura: tu rol no permite gestionar el equipo.</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              {puedeVerComo && (
                <button
                  type="button"
                  onClick={verComo}
                  title="Ver como (Simular)"
                  aria-label="Ver como (Simular)"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <EyeIcon className="h-4.5 w-4.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => (editandoDatos ? cancelarEdicion() : setEditandoDatos(true))}
                disabled={!puedeGestionar}
                title={
                  !puedeGestionar
                    ? "Requiere el permiso «Gestionar equipo»."
                    : editandoDatos
                    ? "Cancelar edición"
                    : "Editar datos"
                }
                aria-label={editandoDatos ? "Cancelar edición" : "Editar datos"}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  !puedeGestionar
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-600"
                    : editandoDatos
                    ? "border-secondary-500 bg-secondary-50 text-secondary-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400 cursor-pointer"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
                }`}
              >
                <PencilIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Acciones de ciclo de vida — antes solo existían en la tabla.
                Van con `<button>` nativo y no con `<Button>` porque hacen falta
                dos cosas que el componente del catálogo no expone: `title`
                (el motivo del bloqueo, que es la mitad del requisito) y el
                icono pegado al texto. */}
            {puedeGestionar && op.estado !== "pendiente" && (
              <div className="flex items-center gap-2">
                {op.estado === "activo" && (
                  <button
                    type="button"
                    disabled={esUnoMismoOp}
                    title={esUnoMismoOp ? motivoCicloPropio : "Retira el acceso sin borrar su historial"}
                    onClick={() => setConfirmacion("suspender")}
                    className={`h-9 rounded-lg px-3 text-theme-sm font-medium ring-1 ring-inset transition-colors ${
                      esUnoMismoOp
                        ? "cursor-not-allowed bg-white text-gray-300 ring-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:ring-gray-700"
                        : "bg-white text-brand-700 ring-brand-200 hover:bg-brand-50 dark:bg-gray-800 dark:text-brand-300 dark:ring-brand-500/30 dark:hover:bg-brand-500/10"
                    }`}
                  >
                    Suspender operador
                  </button>
                )}

                {op.estado === "inactivo" && (
                  <button
                    type="button"
                    disabled={esUnoMismoOp}
                    title={esUnoMismoOp ? motivoCicloPropio : "Vuelve a darle acceso"}
                    onClick={() => setConfirmacion("reactivar")}
                    className={`h-9 rounded-lg px-3 text-theme-sm font-medium ring-1 ring-inset transition-colors ${
                      esUnoMismoOp
                        ? "cursor-not-allowed bg-white text-gray-300 ring-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:ring-gray-700"
                        : "bg-white text-brand-700 ring-brand-200 hover:bg-brand-50 dark:bg-gray-800 dark:text-brand-300 dark:ring-brand-500/30 dark:hover:bg-brand-500/10"
                    }`}
                  >
                    Reactivar operador
                  </button>
                )}

                <button
                  type="button"
                  disabled={esUnoMismoOp}
                  title={esUnoMismoOp ? motivoCicloPropio : "Elimina a la persona del equipo"}
                  onClick={() => setConfirmacion("eliminar")}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-theme-sm font-medium transition-colors ${
                    esUnoMismoOp
                      ? "cursor-not-allowed bg-error-300 text-white"
                      : "bg-error-500 text-white shadow-theme-xs hover:bg-error-600"
                  }`}
                >
                  <TrashBinIcon className="h-4 w-4" />
                  Eliminar del equipo
                </button>
              </div>
            )}

            {puedeGestionar && op.estado !== "pendiente" && esUnoMismoOp && (
              <p className="max-w-[16rem] text-right text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
                Las acciones de suspender y eliminar están deshabilitadas sobre tu propia cuenta.
              </p>
            )}
          </div>
        </div>

        {/* Formulario de edición rápida si se activa */}
        {editandoDatos && (
          <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 className="mb-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Editar Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="ed-nom">
                  Nombre <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="ed-nom"
                  value={nombre}
                  error={tocados.nombre && !!validez.errores.nombre}
                  hint={tocados.nombre ? validez.errores.nombre : undefined}
                  aria-describedby={tocados.nombre && validez.errores.nombre ? "ed-nom-err" : undefined}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setTocados((prev) => ({ ...prev, nombre: true }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="ed-em">
                  Correo Electrónico <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="ed-em"
                  type="email"
                  value={email}
                  error={tocados.email && !!validez.errores.email}
                  hint={tocados.email ? validez.errores.email : undefined}
                  aria-describedby={tocados.email && validez.errores.email ? "ed-em-err" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTocados((prev) => ({ ...prev, email: true }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="ed-tel">
                  Teléfono <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="ed-tel"
                  value={telefono}
                  error={tocados.telefono && !!validez.errores.telefono}
                  hint={tocados.telefono ? validez.errores.telefono : undefined}
                  aria-describedby={tocados.telefono && validez.errores.telefono ? "ed-tel-err" : undefined}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    setTocados((prev) => ({ ...prev, telefono: true }));
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancelarEdicion}>
                Cancelar
              </Button>
              <Button size="sm" disabled={!validez.valido} onClick={guardarDatos}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </BloqueConfig>

      {/* ── ALERTA DE SOLICITUD PENDIENTE (SI CORRESPONDE) ────────────────── */}
      {op.estado === "pendiente" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-brand-500/20 dark:bg-brand-500/10">
          <div>
            <h3 className="text-theme-sm font-bold text-brand-900 dark:text-brand-200">
              Solicitud de acceso pendiente
            </h3>
            <p className="mt-0.5 text-theme-xs text-brand-700 dark:text-brand-300">
              Revisa su rol y permisos a continuación. Al aprobar, el operador podrá iniciar sesión en la plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-400"
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
              className="h-9 px-4 rounded-xl text-theme-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors cursor-pointer"
            >
              Aprobar operador
            </button>
          </div>
        </div>
      )}

      {/* ── 2. SELECCIÓN DEL ROL ────────────────────────────────────────────── */}
      <BloqueConfig
        icono={KeyIcon}
        pregunta="Rol asignado"
        descripcion="El rol define los permisos base. Cualquier cambio reajusta sus capacidades automáticamente."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-theme-sm font-semibold text-ink-title dark:text-white">
              Rol de la persona
            </h3>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Se aplica a todas sus capacidades, salvo los ajustes personales que verás abajo.
            </p>
          </div>

          <div className="w-full sm:w-72 sm:flex-shrink-0">
            {esAdminPrincipal ? (
              // El rol de administrador no se ofrece en el selector: si la
              // persona lo tiene, se muestra como etiqueta fija para que el
              // dato se lea en vez de aparecer un desplegable en blanco.
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">
                    {rolesStore.nombreDe(op.rolId) || "Administrador de tienda"}
                  </span>
                  <Badge color="dark" size="xs">
                    Rol de sistema
                  </Badge>
                </div>
                <p className="mt-1 text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
                  El rol de administrador es único por tienda y no se puede reasignar desde el perfil.
                </p>
              </div>
            ) : (
              <>
                <Select
                  key={op.rolId ?? "sin-rol"}
                  options={opcionesRol}
                  defaultValue={op.rolId ?? ""}
                  onChange={cambiarRol}
                  disabled={!puedeGestionar || esUnoMismoOp}
                  placeholder="Seleccionar rol"
                  hint={
                    esUnoMismoOp
                      ? "Tu propio rol no se puede cambiar desde aquí: perderías el acceso a esta pantalla."
                      : undefined
                  }
                />
                {avisoRol && (
                  <div className="mt-2 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-500/25 dark:bg-brand-500/10">
                    <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                    <p className="text-theme-xs leading-snug text-brand-800 dark:text-brand-200">
                      No se aplicó «{avisoRol}»: ese rol no incluye la gestión de equipo y te dejaría sin
                      acceso a esta pantalla. Elige otro rol o ajusta los permisos a mano.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!esAdminPrincipal && op.rolId && !rolesStore.porId(op.rolId) && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
            <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="text-theme-xs text-brand-800 dark:text-brand-200">
              Esta persona apunta a un rol que ya no existe en el catálogo, así que ahora mismo no tiene
              capacidades. Asígnale un rol para devolverle el acceso.
            </span>
          </div>
        )}

        {ajustes.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-estado-amarillo bg-estado-amarillo/60 px-4 py-3 dark:border-estado-amarillo/20 dark:bg-estado-amarillo/10">
            <span className="text-theme-xs text-ink-body dark:text-estado-amarillo">
              Este operador tiene <strong>{ajustes.length}</strong> ajuste{ajustes.length > 1 ? "s" : ""} personalizado{ajustes.length > 1 ? "s" : ""} sobre su rol.
            </span>
            <button
              type="button"
              onClick={restablecerAlRol}
              disabled={!puedeGestionar}
              title={!puedeGestionar ? "Requiere el permiso «Gestionar equipo»." : undefined}
              className={`inline-flex items-center gap-1.5 text-theme-xs font-semibold ${
                puedeGestionar
                  ? "text-secondary-600 hover:underline dark:text-brand-400 cursor-pointer"
                  : "cursor-not-allowed text-gray-400 dark:text-gray-600"
              }`}
            >
              <ArrowUturnLeftIcon className="h-3.5 w-3.5 flex-shrink-0" />
              Restablecer al rol original
            </button>
          </div>
        )}
      </BloqueConfig>

      {/* ── 3. REGLAS Y PERMISOS DE ACCESO ─────────────────────────────────── */}
      <BloqueConfig
        icono={AdjustmentsHorizontalIcon}
        pregunta="Permisos y reglas de acceso"
        descripcion="Capacidades por área. Activa o desactiva para conceder o revocar permisos específicos a esta persona."
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-theme-sm font-semibold text-ink-title dark:text-white">
              Capacidades efectivas
            </h3>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Se pintan en Solo lectura mientras tu rol no incluya «Gestionar equipo».
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-theme-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300">
              <CheckCircleIcon className="h-3.5 w-3.5 text-success-600 flex-shrink-0" />
              <span>{efectivas.length} de 18 activas</span>
            </span>

            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                onClick={expandirTodos}
                title="Expandir todas las categorías"
                aria-label="Expandir todas las categorías"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                {/* Doble chevron hacia abajo: las 18 filas se despliegan de una vez. */}
                <AngleDoubleDownIcon className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={colapsarTodos}
                title="Contraer todas las categorías"
                aria-label="Contraer todas las categorías"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <AngleDoubleUpIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Aviso de autodesahuicio: se explica aquí, una vez, en vez de dejar al
            admin adivinando por qué un interruptor no responde. */}
        {esUnoMismoOp && motivoSelf && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
            <LockIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
            <p className="text-theme-xs leading-relaxed text-brand-800 dark:text-brand-200">
              <span className="font-semibold">Protección contra autodesahuicio.</span> {motivoSelf}
            </p>
          </div>
        )}

        {!puedeGestionar && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <p className="text-theme-xs leading-relaxed text-gray-700 dark:text-gray-300">
              Estás viendo esta pantalla en modo solo lectura. Los interruptores están deshabilitados porque tu rol
              no incluye la capacidad <span className="font-semibold">Gestionar equipo</span>.
            </p>
          </div>
        )}

        {/* Rejilla de capacidades — la MISMA pieza que usa el editor de roles.
            Lo único distinto aquí es el `pie` de cada fila, que dice de dónde
            viene el permiso; la estructura no se duplica. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {CAPACIDAD_GRUPOS.map((grupo) => {
            const tiene = new Set(efectivas);
            // El preset no puede tocar la gestión de equipo de uno mismo.
            const alternarDeshabilitado =
              !puedeGestionar || (esUnoMismoOp && grupo.capacidades.some((c) => CAPACIDADES_GESTION.includes(c)));

            const filas: FilaCapacidad[] = grupo.capacidades.map((cap) => {
              const activa = efectivas.includes(cap);
              const proc = procedenciaDe(op, cap, capacidadesDelRol);
              const meta = PROCEDENCIA_HUMANA[proc];
              // Interruptor candado: revocar la gestión de equipo a la propia
              // sesión la dejaría fuera de la pantalla.
              const bloqueada = esUnoMismoOp && activa && CAPACIDADES_GESTION.includes(cap);

              return {
                cap,
                activa,
                bloqueada,
                motivoBloqueo: bloqueada
                  ? "No puedes revocar tu propio permiso de administración"
                  : undefined,
                etiqueta: bloqueada ? (
                  <Badge color="warning" size="xs">
                    Protegida
                  </Badge>
                ) : null,
                // El pie es lo que hace de esta pantalla la de una PERSONA y no
                // la de un rol: dice si el permiso viene del rol, se concedió de
                // más o se quitó a mano. Con tono neutro se omite —decir «viene
                // de su rol» en 18 filas seguidas es ruido, no información—.
                pie:
                  meta.tono !== "neutro" ? (
                    <span
                      className={`text-theme-xs leading-snug ${
                        meta.tono === "mas"
                          ? "text-success-700 dark:text-success-400"
                          : "text-error-600 dark:text-error-400"
                      }`}
                    >
                      {meta.label}
                    </span>
                  ) : null,
              };
            });

            return (
              <GrupoCapacidades
                key={grupo.id}
                grupo={grupo}
                filas={filas}
                colapsado={!!colapsados[grupo.id]}
                onAlternarColapso={() => toggleColapso(grupo.id)}
                colorEtiqueta={CATEGORIA_COLORES[grupo.id] || "light"}
                // Sin permiso de gestión, la rejilla entera es de solo lectura:
                // los controles pasan a indicadores y la acción de grupo se
                // omite en vez de pintarse inerte.
                soloLectura={!puedeGestionar}
                onAlternarGrupo={alternarDeshabilitado ? undefined : () => alternarGrupo(grupo)}
                onCambiarCapacidad={
                  !puedeGestionar
                    ? undefined
                    : (cap) => {
                        if (alternarDeshabilitado && !tiene.has(cap)) return;
                        toggleCapacidad(cap);
                      }
                }
              />
            );
          })}
        </div>
      </BloqueConfig>

      {/* ── 4. CONFIRMACIONES DE CICLO DE VIDA ─────────────────────────────── */}
      <Modal
        isOpen={confirmacion !== null}
        onClose={cerrarConfirmacion}
        className="max-w-md p-6"
      >
        {confirmacion === "eliminar" && (
          <>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
              <TrashBinIcon className="h-5 w-5 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="mb-1 text-theme-2xl font-semibold text-ink-title dark:text-white/90">
              ¿Eliminar a {op.nombre} del equipo?
            </h2>
            <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
              Se borra su ficha y sus permisos. No se puede deshacer. Si solo quieres retirarle el acceso
              conservando su historial, suspéndelo en vez de eliminarlo.
            </p>
          </>
        )}

        {confirmacion === "suspender" && (
          <>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
              <LockIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="mb-1 text-theme-2xl font-semibold text-ink-title dark:text-white/90">
              ¿Suspender a {op.nombre}?
            </h2>
            <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
              Pierde el acceso a la plataforma de inmediato. Su ficha y su historial se conservan, y puedes
              reactivarla cuando quieras.
            </p>
          </>
        )}

        {confirmacion === "reactivar" && (
          <>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-estado-verde dark:bg-estado-verde/10">
              <CheckCircleIcon className="h-5 w-5 text-success-700 dark:text-estado-verde" />
            </div>
            <h2 className="mb-1 text-theme-2xl font-semibold text-ink-title dark:text-white/90">
              ¿Reactivar a {op.nombre}?
            </h2>
            <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
              Vuelve a tener acceso con el rol y los permisos que ya tenía configurados.
            </p>
          </>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={cerrarConfirmacion}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant={confirmacion === "eliminar" ? "destructive" : "primary"}
            onClick={ejecutarCiclo}
          >
            {confirmacion === "eliminar"
              ? "Eliminar del equipo"
              : confirmacion === "suspender"
              ? "Suspender"
              : "Reactivar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
});
