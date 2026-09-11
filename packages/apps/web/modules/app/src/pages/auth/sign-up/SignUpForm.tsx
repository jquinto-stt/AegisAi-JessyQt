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
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-8">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-black text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Crea tu cuenta en Necto
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registra tu espacio y comienza a operar tu negocio en minutos.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
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
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox className="w-5 h-5 mt-0.5" checked={isChecked} onChange={setIsChecked} />
                  <p className="inline-block text-xs font-normal text-gray-500 dark:text-gray-400 leading-snug">
                    Al crear una cuenta aceptas los{" "}
                    <span className="font-semibold text-gray-800 dark:text-white/90">Términos y Condiciones</span> y nuestra{" "}
                    <span className="font-semibold text-gray-800 dark:text-white">Política de Privacidad</span>.
                  </p>
                </div>
                <div className="pt-2">
                  <Button className="w-full" size="sm" type="submit" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs font-normal text-gray-600 dark:text-gray-400">
                ¿Ya tienes una cuenta?{" "}
                <Link to="/login" className="font-bold text-[#FF3F1A] hover:underline">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
