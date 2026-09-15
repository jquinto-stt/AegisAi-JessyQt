import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Checkbox } from "@/elements/form/checkbox";
import { Button } from "@/elements/ui/button";
import { Link } from "@/elements/ui/link";
import { useAuth } from "../../../auth/AuthContext";
import { LEGAL_DOCUMENTS } from "../../../legal/legal.constants";

/**
 * @kgId e6a33b25bbfe
 */
export default function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ⚠️ La casilla **no** viene marcada: el asentimiento tiene que ser un acto,
    // no un valor por defecto. Con `useState(true)` se podía crear la cuenta sin
    // que nadie llegara a leer ni a marcar nada, que no es consentimiento
    // informado. Por eso tampoco basta con desmarcarla: el mensaje dice **qué**
    // falta, no sólo que algo falta.
    if (!isChecked) {
      setError("Marca la casilla para aceptar los Términos y la Política de Privacidad.");
      return;
    }
    if (!email.trim()) {
      setError("Introduce tu correo electrónico.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // ⚠️ Antes se llamaba `signUp(email, password)`: firstName y lastName se
      // recogían en el formulario y se descartaban, así que Cognito nunca recibía
      // given_name / family_name.
      await signUp({ email, password, firstName, lastName });
      // El registro **crea la cuenta** y ya generó el `userId`. El siguiente
      // destino es el onboarding del usuario nuevo, que completa a la persona.
      // La tienda no aparece aquí: se crea después, desde el hub.
      navigate("/onboarding/nuevo-usuario");
    } catch (err: any) {
      setError(err?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-10">
        {/* Heading */}
        <div className="mb-8 space-y-3">
          <span className="text-theme-xs font-bold uppercase tracking-[0.2em] text-brand-500">
            Tu cuenta
          </span>
          <h1 className="text-3xl font-bold leading-[1.08] tracking-tight text-secondary-600 dark:text-white">
            Crea tu cuenta
          </h1>
          <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            Registra tu espacio y comienza a operar tu negocio en minutos.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-error-50 px-4 py-3 text-theme-xs font-semibold text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="fname">
                  Nombre <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="fname"
                  name="fname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="lname">
                  Apellido <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="lname"
                  name="lname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">
                Correo electrónico <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">
                Contraseña <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* ⚠️ Las dos referencias legales son **enlaces reales**, no spans
                con estilo de enlace: antes eran texto que no llevaba a ninguna
                parte, así que la casilla pedía aceptar algo que no se podía
                leer. Las rutas salen de `LEGAL_DOCUMENTS` para que el rótulo y
                el destino no puedan divergir. */}
            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="accept-legal"
                className="w-5 h-5 mt-0.5"
                checked={isChecked}
                onChange={setIsChecked}
                aria-label="Aceptar los Términos y la Política de Privacidad"
              />
              <p className="inline-block text-theme-xs font-normal leading-snug text-gray-500 dark:text-gray-400">
                Al crear una cuenta aceptas los{" "}
                <Link
                  to={LEGAL_DOCUMENTS.terms.path}
                  text={LEGAL_DOCUMENTS.terms.title}
                  variant="dark"
                  className="text-xs font-semibold underline-offset-2 hover:underline"
                />{" "}
                y la{" "}
                <Link
                  to={LEGAL_DOCUMENTS.privacy.path}
                  text={LEGAL_DOCUMENTS.privacy.title}
                  variant="dark"
                  className="text-xs font-semibold underline-offset-2 hover:underline dark:text-white"
                />
                .
              </p>
            </div>

            <div className="pt-3">
              <Button className="w-full h-11 rounded-full text-theme-sm font-bold" type="submit" loading={loading}>
                {loading ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-theme-xs font-normal text-gray-500 dark:text-gray-400">
            ¿Ya tienes una cuenta?{" "}
            <Link
              to="/login"
              text="Inicia sesión"
              variant="secondary"
              className="text-xs font-bold hover:underline"
            />
          </p>
        </div>
      </div>
    </div>
  );
}
