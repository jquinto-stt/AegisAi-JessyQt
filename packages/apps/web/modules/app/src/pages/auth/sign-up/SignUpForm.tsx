import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Checkbox } from "@/elements/form/checkbox";
import { Button } from "@/elements/ui/button";
import { useAuth } from "../../../auth/AuthContext";

/**
 * @kgId e6a33b25bbfe
 */
export default function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecked) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (signUp) {
        await signUp(email, password);
      }
      navigate("/onboarding");
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-10">
        {/* Heading */}
        <div className="mb-8 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
            Paso 1 — Tu cuenta
          </span>
          <h1 className="text-[32px] font-black leading-[1.08] tracking-tight text-secondary-600 dark:text-white">
            Crea tu cuenta
          </h1>
          <p className="text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            Registra tu espacio y comienza a operar tu negocio en minutos.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-error-50 px-4 py-3 text-xs font-semibold text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label>
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
                <Label>
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
              <Label>
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
              <Label>
                Contraseña <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
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

            <div className="flex items-start gap-3 pt-1">
              <Checkbox className="w-5 h-5 mt-0.5" checked={isChecked} onChange={setIsChecked} />
              <p className="inline-block text-xs font-normal leading-snug text-gray-500 dark:text-gray-400">
                Al crear una cuenta aceptas los{" "}
                <span className="font-semibold text-gray-800 dark:text-white/90">Términos y Condiciones</span> y
                nuestra <span className="font-semibold text-gray-800 dark:text-white">Política de Privacidad</span>.
              </p>
            </div>

            <div className="pt-3">
              <Button className="w-full h-11 rounded-full text-[13px] font-bold" type="submit" disabled={loading}>
                {loading ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="font-bold text-brand-500 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
