import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { OnboardingLayout } from "@/pages/onboarding";
import {
  CATALOGO_MODULOS,
  operadoresStore,
  organizacionStore,
  sessionStore,
  type IdModuloNegocio,
  type Modulo,
} from "@/stores";

const BRAND_MESSAGES_OPERADOR = [
  {
    badge: "Solicitud de Operador",
    title: "Conéctate al ritmo de la operación.",
    subtitle: "Pide acceso al módulo asignado para empezar a atender pedidos y gestionar tareas.",
  },
  {
    badge: "Seguridad y Control",
    title: "Validación ágil por el administrador.",
    subtitle: "Tu responsable revisará tus datos y habilitará tus permisos en pocos clics.",
  },
  {
    badge: "Acceso Focalizado",
    title: "Solo lo que necesitas para tu labor.",
    subtitle: "Interfaz simplificada y ágil sin distracciones de configuración global.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-9 w-9">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/** Icono de aviso para los recuadros de colisión de correo. */
const InfoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="mt-px h-4 w-4 shrink-0"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface OperadorForm {
  nombre: string;
  email: string;
  telefono: string;
  /**
   * Módulo al que se pide acceso. `""` = todavía sin elegir.
   *
   * Es `string` (y no `Modulo | ""`) para que el setter genérico `set()` siga
   * sirviendo; el valor se valida al enviar con `esModuloValido()`, que es un
   * type guard. Validar es mejor que castear: el `Select` es uncontrolled y
   * preferimos no fiarnos de lo que emite.
   */
  modulo: string;
  adminEmail: string;
  nota: string;
}

const EMPTY_FORM: OperadorForm = {
  nombre: "",
  email: "",
  telefono: "",
  modulo: "",
  adminEmail: "",
  nota: "",
};

/**
 * Módulos ofrecibles, derivados del catálogo de la organización.
 *
 * Antes esto era una lista local con `turnos` y `agendamiento` —dos módulos
 * que ya no existen en el producto (`Modulo = "pedidos"`) y que además no
 * estaban en el catálogo de la organización, así que la comprobación de
 * disponibilidad no tenía nada que consultar para ellos.
 *
 * Ahora sale de `CATALOGO_MODULOS`, que es la fuente única de verdad: si mañana
 * se añade un módulo de negocio al catálogo, aparece aquí solo. Se conserva el
 * orden de inserción del catálogo (pedidos, inventario) para que la lista no
 * baile entre renders.
 */
const MODULOS_DE_PLATAFORMA: { value: IdModuloNegocio; label: string }[] = (
  Object.keys(CATALOGO_MODULOS) as IdModuloNegocio[]
).map((id) => ({ value: id, label: CATALOGO_MODULOS[id].nombre }));

/**
 * ¿`id` sirve como `Modulo` de sesión/operador?
 *
 * `operadoresStore.solicitar()` guarda un `Modulo`, que hoy es solo `"pedidos"`.
 * `IdModuloNegocio` incluye `"inventario"`, que todavía no tiene lista de
 * operadores propia, así que la conversión se comprueba en vez de castearse:
 * un módulo sin soporte de operadores se trata como no registrable.
 *
 * Va declarada ANTES de `modulosDisponibles()` porque ésta la usa: son `const`
 * con función, no declaraciones izadas, y llamarla antes de su inicialización
 * sería un error de zona muerta temporal en tiempo de carga del módulo.
 */
const esModuloRegistrable = (id: IdModuloNegocio): id is Modulo =>
  id === "pedidos" || id === "inventarios";

/**
 * Módulos que la organización o sesión tienen activos.
 */
const modulosDisponibles = (): { value: IdModuloNegocio; label: string }[] => {
  const modulosSesion = sessionStore.modulos;
  if (modulosSesion.length > 0) {
    return MODULOS_DE_PLATAFORMA.filter(
      (m) => modulosSesion.includes(m.value as Modulo) && esModuloRegistrable(m.value)
    );
  }
  const activos = MODULOS_DE_PLATAFORMA.filter(
    (m) => organizacionStore.estaActivo(m.value) && esModuloRegistrable(m.value)
  );
  return activos.length > 0 ? activos : MODULOS_DE_PLATAFORMA;
};

/**
 * Type guard: ¿el valor es uno de los módulos **disponibles** ahora mismo?
 *
 * Estrecha `string` a `IdModuloNegocio` validando de verdad, en vez de castear.
 * Se valida contra los disponibles, no contra el catálogo entero: un valor que
 * llega del DOM no puede colar un módulo apagado.
 */
const esModuloValido = (valor: string): valor is IdModuloNegocio =>
  modulosDisponibles().some((m) => m.value === valor);

/** Etiqueta legible de un módulo, con respaldo si el id no está en el catálogo. */
const labelDeModulo = (id: string): string =>
  MODULOS_DE_PLATAFORMA.find((m) => m.value === id)?.label ?? "el módulo";

/**
 * Validación de los campos de texto de la solicitud.
 *
 * Devuelve un mensaje por campo (vacío si el campo es correcto). Los tres se
 * validan siempre, sin cortocircuito, para que el usuario vea todo lo que falta
 * de una vez en lugar de descubrirlo campo a campo.
 */
interface ErroresForm {
  nombre: string;
  email: string;
  telefono: string;
  modulo: string;
  adminEmail: string;
}

const validar = (form: OperadorForm): ErroresForm => {
  const errores: ErroresForm = { nombre: "", email: "", telefono: "", modulo: "", adminEmail: "" };

  const nombre = form.nombre.trim();
  if (nombre.length === 0) {
    errores.nombre = "El nombre es obligatorio.";
  } else if (nombre.length < 3) {
    // Se cuentan letras, no caracteres: "A. B" tiene 2 letras aunque ocupe 4
    // posiciones, y sería raro aceptarlo como nombre de una persona.
    const letras = nombre.replace(/[^\p{L}]/gu, "").length;
    if (letras < 3) errores.nombre = "El nombre debe tener al menos 3 letras.";
  }

  const email = form.email.trim();
  if (email.length === 0) {
    errores.email = "El correo electrónico es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errores.email = "Escribe un correo válido, con @ y dominio.";
  }

  const telefono = form.telefono.trim();
  const digitos = telefono.replace(/\D/g, "");
  if (telefono.length === 0) {
    errores.telefono = "El teléfono es obligatorio.";
  } else if (digitos.length < 7) {
    errores.telefono = `El teléfono debe tener al menos 7 dígitos (tiene ${digitos.length}).`;
  }

  if (!esModuloValido(form.modulo)) {
    errores.modulo = "Elige el módulo al que solicitas acceso.";
  }

  // El correo del administrador es obligatorio para que la solicitud tenga
  // destinatario (ver @remarks). Sin esto, el envío fallaba en silencio: el
  // botón no hacía nada y ningún campo señalaba la causa.
  const adminEmail = form.adminEmail.trim();
  if (adminEmail.length === 0) {
    errores.adminEmail = "Indica el correo del administrador que debe revisar tu solicitud.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adminEmail)) {
    errores.adminEmail = "Escribe un correo válido, con @ y dominio.";
  }

  return errores;
};

const sinErrores = (e: ErroresForm): boolean =>
  !e.nombre && !e.email && !e.telefono && !e.modulo && !e.adminEmail;

/**
 * Colisión de la solicitud con un operador ya existente.
 *
 * El alta de operadores es por ORGANIZACIÓN, no por módulo: la lista
 * `operadoresStore.operadores` mezcla los de todos los módulos, y el email
 * identifica a una persona dentro de la organización. Por eso se busca sin
 * filtrar por módulo — pedir acceso a `pedidos` con un correo que ya opera en
 * `inventario` también es una colisión.
 *
 * Se compara en minúsculas y sin espacios porque el mismo correo escrito
 * `Maria@Negocio.com` y `maria@negocio.com` es la misma persona; el store no
 * normaliza al guardar, así que normalizamos aquí.
 *
 * Las dos ramas se distinguen porque el usuario tiene que hacer cosas distintas:
 * - `activo` → ya tiene acceso, no debe esperar aprobación: que entre.
 * - `pendiente` → ya hay una solicitud en cola, volver a enviarla duplica el
 *   trabajo del admin: que espere o que le escriba.
 */
type ColisionSolicitud = { tipo: "activo" | "pendiente"; mensaje: string };

const buscarColision = (email: string): ColisionSolicitud | null => {
  const normalizado = email.trim().toLowerCase();
  if (!normalizado) return null;

  const existente = operadoresStore.operadores.find(
    (op) => op.email.trim().toLowerCase() === normalizado
  );
  if (!existente) return null;

  if (existente.estado === "activo") {
    return {
      tipo: "activo",
      mensaje: "Este correo ya tiene acceso activo al sistema. Inicia sesión directamente.",
    };
  }
  if (existente.estado === "pendiente") {
    return {
      tipo: "pendiente",
      mensaje:
        "Ya existe una solicitud pendiente de aprobación con este correo. Contacta a tu administrador.",
    };
  }
  // `inactivo`: tuvo acceso y se le retiró. No es ni alta nueva ni duplicado en
  // cola — quien decide es el admin, así que no bloqueamos el envío.
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// FIELD (Label + Input del catálogo Elements)
// ═══════════════════════════════════════════════════════════════════════════

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  /** Mensaje de error a mostrar bajo el campo. Vacío = sin error. */
  error?: string;
  onChange: (value: string) => void;
}

/**
 * Campo de formulario: Label (con asterisco si requerido) + Input de Elements.
 *
 * El error se delega a `Input` (`error` + `hint`): el componente del catálogo
 * ya pinta el borde en rojo y el texto debajo. Repetir aquí un `<p>` propio
 * duplicaría el mensaje —el patrón que ya nos mordió en EquipoPage—, así que
 * este wrapper no inventa markup de error.
 */
const Field = ({
  id,
  label,
  type = "text",
  value,
  required,
  placeholder,
  error,
  onChange,
}: FieldProps) => (
  <div>
    <Label htmlFor={id}>
      {label} {required && <span className="text-error-500">*</span>}
    </Label>
    {/*
      `Input` del catálogo NO reenvía props desconocidas al `<input>`: las
      desestructura una a una (`Input.tsx:140-160`). Por eso aquí no se añade
      `aria-invalid` —se descartaría en silencio, aparentando accesibilidad que
      nunca llega al DOM— ni `aria-describedby`: el `<p>` que pinta el `hint` no
      tiene `id`, así que la referencia apuntaría a un nodo inexistente, que es
      peor que no referenciar nada.

      El mensaje sigue siendo legible (va en texto, justo bajo el campo, en rojo
      vía `error`), pero su asociación programática depende de una mejora del
      componente del catálogo. Queda anotado como deuda, no disimulado.
    */}
    <Input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      error={Boolean(error)}
      hint={error}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadorRegistroPage — solicitud de acceso del operador (mock).
 */
export const OperadorRegistroPage = observer(() => {
  const navigate = useNavigate();
  const [form, setForm] = useState<OperadorForm>(() => {
    const lista = modulosDisponibles();
    const defaultModulo = sessionStore.modulos.length > 0
      ? sessionStore.modulos[0]
      : (lista[0]?.value ?? "pedidos");
    return {
      ...EMPTY_FORM,
      adminEmail: organizacionStore.usuario?.email || "",
      modulo: defaultModulo,
    };
  });
  const [enviado, setEnviado] = useState(false);
  /**
   * Campos que el usuario ya intentó enviar.
   *
   * Los errores no se pintan mientras se escribe (sería castigar a quien aún no
   * ha terminado), solo tras el primer intento de envío. Una vez "tocado" el
   * formulario, el error se recalcula en cada render, así que desaparece solo
   * en cuanto el campo se corrige — sin `setState` por tecla.
   */
  const [intentado, setIntentado] = useState(false);

  const set = (campo: keyof OperadorForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  /** Módulos activos de la organización: la lista que el usuario puede pedir. */
  const modulos = modulosDisponibles();

  /** Errores de formato. Solo se muestran si el usuario ya intentó enviar. */
  const errores: ErroresForm = intentado
    ? validar(form)
    : { nombre: "", email: "", telefono: "", modulo: "", adminEmail: "" };

  /**
   * Colisión con un operador existente (se calcula siempre, se muestra tras el
   * intento de envío). `solicitudValida()` usa el valor crudo —no el filtrado—
   * porque el bloqueo del envío no depende de que el aviso esté a la vista.
   */
  const colision = buscarColision(form.email);
  const colisionVisible = intentado ? colision : null;

  /**
   * Datos listos para enviar, o `null` si la solicitud no es enviable.
   *
   * Es la única definición de "solicitud válida": la usan el estado del botón y
   * `enviar()`, así que no pueden desincronizarse. Ahora incluye las dos cosas
   * que antes no se comprobaban: el formato de los campos y la colisión de correo.
   */
  const solicitudValida = (): { nombre: string; email: string; telefono: string; modulo: Modulo } | null => {
    if (!sinErrores(validar(form))) return null;
    if (colision) return null;
    if (!esModuloValido(form.modulo)) return null;
    if (!esModuloRegistrable(form.modulo)) return null;

    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    const adminEmail = form.adminEmail.trim();
    if (!adminEmail) return null;

    return { nombre, email, telefono, modulo: form.modulo };
  };

  const requeridosCompletos = solicitudValida() !== null;

  const enviar = () => {
    // Marca el intento ANTES de comprobar: si algo falla, los mensajes aparecen.
    setIntentado(true);
    const datos = solicitudValida();
    if (!datos) return;
    // Mock, sin backend: la solicitud entra en la lista de pendientes del admin.
    operadoresStore.solicitar(datos);
    setEnviado(true);
  };

  const volverAlInicio = () => {
    // Reinicia la sesión mock y vuelve al login (inicio del flujo).
    sessionStore.reset();
    navigate("/login");
  };

  return (
    <>
      <PageMeta
        title="Solicitar acceso como operador · Necto"
        description="Envía tus datos al administrador para obtener acceso"
      />

      <OnboardingLayout
        pasoActual={2}
        totalPasos={2}
        pasoLabel="Solicitud de Operador"
        onBack={() => navigate("/onboarding/organizacion")}
        brandMessages={BRAND_MESSAGES_OPERADOR}
        brandSummary={{
          eyebrow: "Paso final — Operador",
          title: form.nombre.trim() || "Solicitud de Acceso",
          lines: [
            form.email.trim() || "Datos del operador",
            form.modulo ? `Módulo: ${labelDeModulo(form.modulo)}` : "Módulo a solicitar",
            "Aprobación por el administrador",
          ],
        }}
      >
        <div className="w-full">
          {!enviado ? (
            <>
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
                  Paso final — Solicitud de acceso
                </span>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
                  Solicita tu acceso como operador
                </h1>
                <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
                  Completa tus datos y se enviarán al administrador para que revise y apruebe tu acceso.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="op-nombre"
                    label="Nombre completo"
                    value={form.nombre}
                    required
                    placeholder="Ej. María Fernández"
                    error={errores.nombre}
                    onChange={set("nombre")}
                  />
                  <Field
                    id="op-telefono"
                    label="Teléfono"
                    type="tel"
                    value={form.telefono}
                    required
                    placeholder="+57 300 000 0000"
                    error={errores.telefono}
                    onChange={set("telefono")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Field
                      id="op-email"
                      label="Correo electrónico"
                      type="email"
                      value={form.email}
                      required
                      placeholder="tu@correo.com"
                      error={colisionVisible ? "" : errores.email}
                      onChange={set("email")}
                    />
                    {colisionVisible && (
                      <div
                        role="alert"
                        className={
                          colisionVisible.tipo === "activo"
                            ? "mt-2 flex gap-2.5 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                            : "mt-2 flex gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                        }
                      >
                        <InfoIcon />
                        <span>{colisionVisible.mensaje}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="op-modulo">
                      Módulo solicitado <span className="text-error-500">*</span>
                    </Label>
                    {modulos.length > 0 ? (
                      <Select
                        key={`op-modulo-${modulos.map((m) => m.value).join("-")}`}
                        options={modulos}
                        placeholder="Elige un módulo"
                        defaultValue={form.modulo}
                        error={Boolean(errores.modulo)}
                        hint={errores.modulo}
                        aria-label="Módulo al que solicitas acceso"
                        onChange={set("modulo")}
                      />
                    ) : (
                      <p className="mt-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
                        Tu organización no tiene ningún módulo activo. Contacta a tu administrador.
                      </p>
                    )}
                  </div>
                </div>

                <Field
                  id="op-admin-email"
                  label="Correo del administrador a notificar"
                  type="email"
                  value={form.adminEmail}
                  required
                  placeholder="admin@negocio.com"
                  error={errores.adminEmail}
                  onChange={set("adminEmail")}
                />

                <div>
                  <Label htmlFor="op-nota">Nota / mensaje para el administrador</Label>
                  <Textarea
                    value={form.nota}
                    rows={3}
                    placeholder="Cuéntale al administrador quién eres o por qué necesitas acceso (opcional)."
                    onChange={set("nota")}
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/onboarding/organizacion")}
                  className="rounded-full px-6 text-xs font-semibold cursor-pointer"
                >
                  ← Volver a Roles
                </Button>

                <Button
                  type="button"
                  disabled={modulos.length === 0}
                  onClick={enviar}
                  className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar solicitud
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 ml-1.5 inline"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Button>
              </div>

              {intentado && !requeridosCompletos && (
                <p className="mt-3 text-right text-xs text-error-600 dark:text-error-400">
                  Revisa los campos marcados para poder enviar la solicitud.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircleIcon />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
                Solicitud registrada
              </span>
              <h2 className="mt-2 text-2xl font-bold text-ink-title dark:text-white">
                ¡Tu solicitud fue enviada con éxito!
              </h2>
              <p className="mt-2 max-w-md text-sm text-ink-body dark:text-gray-400">
                Tu solicitud de acceso a{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {labelDeModulo(form.modulo)}
                </span>{" "}
                ya está registrada y en revisión por el administrador. Te avisaremos en cuanto tu cuenta esté activa.
              </p>

              <dl className="mt-6 w-full max-w-md space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left text-xs dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Módulo solicitado</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-200">
                    {labelDeModulo(form.modulo)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Correo</dt>
                  <dd className="truncate font-semibold text-gray-800 dark:text-gray-200">
                    {form.email.trim()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd className="font-semibold text-brand-600 dark:text-brand-400">
                    Pendiente de aprobación
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6 text-xs font-semibold cursor-pointer"
                  onClick={() => navigate("/operador/login")}
                >
                  Probar simulación
                </Button>
                <Button
                  type="button"
                  className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer"
                  onClick={volverAlInicio}
                >
                  Ir a inicio de sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </OnboardingLayout>
    </>
  );
});

export default OperadorRegistroPage;
