import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Checkbox } from "@/elements/form/checkbox";
import { Button } from "@/elements/ui/button";
import { organizacionStore } from "@/stores";
import {
  iniciarSesion,
  iniciarSesionConGoogle,
} from "@/lib/auth.service";

/**
 * @kgId 07b80348fc4c
 */
export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const navigate = useNavigate();

  const ejecutarLogin = async (credenciales: { email: string; password: string }) => {
    const finalEmail = credenciales.email.trim();
    if (!finalEmail) {
      setErrorMensaje("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!credenciales.password) {
      setErrorMensaje("Por favor ingresa tu contraseña.");
      return;
    }

    setCargando(true);
    setErrorMensaje(null);

    try {
      const res = await iniciarSesion({
        email: finalEmail,
        password: credenciales.password,
      });

      if (!res.ok) {
        setErrorMensaje(res.motivo || "No se pudo iniciar sesión.");
        return;
      }

      if (res.requiereOnboarding) {
        navigate("/onboarding/perfil");
        return;
      }

      if (organizacionStore.tieneModuloPedidos) {
        navigate("/pedidos/inicio");
      } else {
        navigate("/modulos");
      }
    } catch {
      setErrorMensaje("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarLogin({ email, password });
  };

  const handleGoogleLogin = async () => {
    setCargando(true);
    setErrorMensaje(null);
    try {
      const res = await iniciarSesionConGoogle();
      if (!res.ok) {
        setErrorMensaje(res.motivo || "Error al conectar con Google.");
      }
    } catch {
      setErrorMensaje("Error al iniciar autenticación con Google.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-ink-title text-title-sm dark:text-white/90 sm:text-title-md">Inicia sesion</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ingresa tus credenciales para acceder a tu panel de control.</p>
          </div>
          <div>
            {errorMensaje && (
              <div
                role="alert"
                className="p-3 mb-5 text-sm text-error-700 bg-error-50 border border-error-200 rounded-xl dark:bg-error-950/40 dark:text-error-300 dark:border-error-800 flex items-start gap-2.5"
              >
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5 text-error-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="flex-1 text-xs leading-relaxed">{errorMensaje}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>
                    Correo electrónico <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    disabled={cargando}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMensaje) setErrorMensaje(null);
                    }}
                  />
                </div>
                <div>
                  <Label>
                    Contraseña <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      disabled={cargando}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMensaje) setErrorMensaje(null);
                      }}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Mantener sesión iniciada
                    </span>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-secondary-600 hover:text-secondary-600 dark:text-brand-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div>
                  <Button
                    className="w-full"
                    size="sm"
                    type="submit"
                    loading={cargando}
                    disabled={cargando}
                  >
                    Iniciar sesión
                  </Button>
                </div>
              </div>
            </form>
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/70 dark:border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  O CONTINÚA CON
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={cargando}
              className="inline-flex items-center justify-center w-full gap-3 py-3 text-sm font-normal text-gray-700 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-white/90 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
                <path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
                <path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
                <path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
              </svg>
              Google
            </button>
            <div className="mt-5 space-y-2 text-center">
              <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
                ¿No tienes una cuenta?{" "}
                <Link to="/register" className="text-secondary-600 hover:text-secondary-600 dark:text-brand-400 font-medium">Registrate aqui</Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ¿Tienes alguna duda sobre Necto?{" "}
                <Link
                  to="/ayuda"
                  className="font-semibold text-gray-700 dark:text-gray-300 hover:text-secondary-600 dark:hover:text-brand-400 underline"
                >
                  Centro de ayuda y FAQ
                </Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <Link to="/onboarding/perfil" className="hover:underline text-gray-500 dark:text-gray-400">
                  O configura un nuevo espacio con el Onboarding
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
