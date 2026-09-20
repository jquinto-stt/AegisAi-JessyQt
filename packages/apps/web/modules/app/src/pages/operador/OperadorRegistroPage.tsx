import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { ThemeToggleButton } from "@/shell";
import {
  CATALOGO_MODULOS,
  operadoresStore,
  organizacionStore,
  sessionStore,
  type IdModuloNegocio,
  type Modulo,
} from "@/stores";

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
const esModuloRegistrable = (id: IdModuloNegocio): id is Modulo => id === "pedidos";

/**
 * Módulos que la organización tiene activos (instalados Y encendidos) **y que
 * además aceptan solicitudes de operador**.
 *
 * El segundo filtro no es cosmético: `operadoresStore.solicitar()` guarda un
 * `Modulo` de sesión (hoy solo `"pedidos"`), así que ofrecer `inventario` —que sí
 * existe en el catálogo y el admin puede encender— llevaría a un formulario que
 * se rellena entero y no se puede enviar, sin decir por qué. Se ofrece lo que de
 * verdad se puede pedir.
 *
 * Cuando `inventario` tenga su propia lista de operadores, basta con ampliar
 * `esModuloRegistrable` y el desplegable lo recoge solo.
 */
const modulosDisponibles = (): { value: IdModuloNegocio; label: string }[] =>
  MODULOS_DE_PLATAFORMA.filter(
    (m) => organizacionStore.estaActivo(m.value) && esModuloRegistrable(m.value)
  );

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
 *
 * Un operador "sale de" un administrador: en vez de entrar directo al módulo,
 * deja sus datos, que (mock, sin backend) se envían como notificación al
 * administrador para darlo de alta.
 *
 * **El envío es real dentro del mock:** llama a `operadoresStore.solicitar()`,
 * que crea un operador en estado `pendiente`. Antes esto solo cambiaba a un
 * estado de éxito visual y no creaba nada, así que los `pendiente` de la tabla
 * venían únicamente del SEED. Ahora el admin lo ve en Equipo → Pendientes y lo
 * aprueba, y desde el perfil le asigna un rol.
 *
 * Vista construida con el flujo Elements: Card + Label + Input + Select +
 * Textarea + Button del catálogo. Al enviar, el formulario se reemplaza por una
 * tarjeta de éxito.
 *
 * @remarks
 * Sin backend no hay envío de correo. El campo "Correo del administrador a
 * notificar" se conserva porque forma parte del relato de la solicitud (y lo
 * consumirá el backend real), pero hoy **no dispara nada**: la notificación es
 * que la solicitud aparece como `pendiente` en Equipo.
 */
export const OperadorRegistroPage = observer(() => {
  const navigate = useNavigate();
  // El módulo se pre-selecciona si el usuario eligió uno solo en /seleccionar.
  // La inicialización es perezosa para que se recalcule en cada montaje y no
  // quede congelada con el valor de la primera visita a la página.
  const [form, setForm] = useState<OperadorForm>(() => ({
    ...EMPTY_FORM,
    modulo: sessionStore.modulos.length === 1 ? sessionStore.modulos[0] : "",
  }));
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
    // Segundo guardia, no redundante: `esModuloValido` deja pasar cualquier
    // módulo ACTIVO del catálogo (hoy `pedidos` e `inventario`), pero
    // `solicitar()` solo entiende un `Modulo` de sesión (`"pedidos"`). Sin este
    // filtro habría que castear `inventario` a `"pedidos"`, y el operador
    // acabaría dado de alta en un módulo que no pidió.
    if (!esModuloRegistrable(form.modulo)) return null;

    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    // El correo del administrador también es obligatorio (ver @remarks).
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
      <PageMeta title="Solicitar acceso como operador" description="Envía tus datos al administrador para obtener acceso" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col">
          {!enviado ? (
            <>
              {/* Encabezado centrado */}
              <div className="mb-8 flex flex-col items-center text-center">
                <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  Solicita tu acceso como operador
                </h1>
                <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  Completa tus datos y se enviarán al administrador para que revise y apruebe tu acceso.
                </p>
              </div>

              {/* Tarjeta con el formulario */}
              <Card>
                <div className="space-y-5">
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
                    id="op-email"
                    label="Correo electrónico"
                    type="email"
                    value={form.email}
                    required
                    placeholder="tu@correo.com"
                    /* La colisión manda sobre el formato: si el correo ya está
                       registrado, eso es lo accionable, aunque además esté mal
                       escrito. (Si está mal escrito no habrá colisión, porque la
                       comparación normaliza, así que el orden no oculta nada.) */
                    error={colisionVisible ? "" : errores.email}
                    onChange={set("email")}
                  />
                  {/* El aviso de duplicado va aparte del Input porque reclama una
                      acción distinta (entrar, o esperar) y tiene que verse sin
                      depender de que el campo esté enfocado o en rojo. */}
                  {colisionVisible && (
                    <div
                      role="alert"
                      className={
                        colisionVisible.tipo === "activo"
                          ? "flex gap-2.5 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                          : "flex gap-2.5 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
                      }
                    >
                      <InfoIcon />
                      <span>{colisionVisible.mensaje}</span>
                    </div>
                  )}
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
                  {/* Módulo: la solicitud es PARA un módulo concreto, así que el
                      admin sabe qué equipo revisar. `Select` no acepta `id`
                      (limitación del componente), de ahí el `aria-label`.

                      `key` con los IDS (no la longitud) fuerza el remontaje si la
                      lista de módulos activos cambia de composición —apagar
                      `pedidos` y encender `inventario` deja la misma longitud—.
                      Hace falta porque el `Select` es uncontrolled: solo lee
                      `defaultValue` al montar, así que sin `key` seguiría
                      mostrando una opción que ya no está en `options`. */}
                  <div>
                    <Label htmlFor="op-modulo">
                      Módulo al que solicitas acceso <span className="text-error-500">*</span>
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
                      /* Sin módulos activos el desplegable no tendría ninguna
                         opción legítima: se dice el motivo en vez de pintar un
                         Select vacío que parezca roto. */
                      <p className="mt-1.5 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                        Tu organización no tiene ningún módulo activo, así que no hay acceso que
                        solicitar. Contacta a tu administrador.
                      </p>
                    )}
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
                      rows={4}
                      placeholder="Cuéntale al administrador quién eres o por qué necesitas acceso (opcional)."
                      onChange={set("nota")}
                    />
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button size="sm" variant="outline" onClick={() => navigate("/seleccionar")}>
                    Atrás
                  </Button>
                  {/*
                    El botón NO se deshabilita por formulario incompleto.
                    Antes era `disabled={!requeridosCompletos}`: si faltaba algo,
                    quedaba apagado y mudo, el usuario no podía pulsarlo y por
                    tanto `intentado` nunca se activaba — los mensajes de error
                    existían pero eran inalcanzables. Se habilita siempre que haya
                    lista de módulos y el clic sea el que explique qué falta.
                    Se deshabilita solo cuando no hay nada que enviar (sin módulos).
                  */}
                  <Button size="sm" disabled={modulos.length === 0} onClick={enviar}>
                    Enviar solicitud
                  </Button>
                </div>
                {intentado && !requeridosCompletos && (
                  <p className="mt-3 text-right text-xs text-error-600 dark:text-error-400">
                    Revisa los campos marcados para poder enviar la solicitud.
                  </p>
                )}
              </Card>
            </>
          ) : (
            /* Estado de éxito: reemplaza por completo al formulario */
            <Card>
              <div className="flex flex-col items-center py-6 text-center">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500 dark:bg-success-500/10">
                  <CheckCircleIcon />
                </span>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  Tu solicitud fue enviada
                </h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  Tu solicitud de acceso a{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {labelDeModulo(form.modulo)}
                  </span>{" "}
                  ya está registrada y <span className="font-medium text-gray-700 dark:text-gray-300">en revisión por el administrador</span>.
                  Él la aprobará y te asignará un rol. Te avisaremos cuando tu cuenta esté lista.
                </p>

                {/* Resumen de lo enviado: el usuario ve con qué datos quedó la
                    solicitud, para detectar un correo mal escrito a tiempo (sin
                    backend no hay correo de confirmación que lo delate). */}
                <dl className="mt-6 w-full max-w-sm space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Módulo solicitado</dt>
                    <dd className="font-medium text-gray-800 dark:text-gray-200">
                      {labelDeModulo(form.modulo)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Correo</dt>
                    <dd className="truncate font-medium text-gray-800 dark:text-gray-200">
                      {form.email.trim()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                    <dd className="font-medium text-warning-600 dark:text-warning-400">
                      Pendiente de aprobación
                    </dd>
                  </div>
                </dl>

                <Button size="sm" className="mt-6" onClick={volverAlInicio}>
                  Volver al inicio / Iniciar sesión
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
});

export default OperadorRegistroPage;
