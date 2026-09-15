import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Checkbox } from "@/elements/form/checkbox";
import { Button } from "@/elements/ui/button";
import { Link } from "@/elements/ui/link";
import { useAuth } from "../../../auth/AuthContext";
import { consumePendingRoute } from "../../../compositions/workspace/pending-action";

/**
 * @kgId 07b80348fc4c
 */
export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const {
    signIn,
    signInWithGoogle,
    isLoading,
    isAuthenticated,
    isNewUserOnboardingComplete,
  } = useAuth();
  const navigate = useNavigate();

  /**
   * El destino depende del **onboarding del usuario**, no solo de la sesión.
   *
   * Quien entra sin haberlo completado (se registró y lo abandonó a medias)
   * vuelve a `onboarding_new_user` para retomarlo, en lugar de aterrizar en el
   * hub sin configuración inicial. Quien ya lo completó entra directo al hub y
   * **no vuelve a ver el asistente** en cada inicio de sesión.
   *
   * ⚠️ **La intención pendiente manda sobre todo lo anterior.** Si el usuario
   * pulsó "Nueva sucursal" en el hub sin sesión, venir del login y aterrizar en
   * el hub era otro callejón sin salida: había que volver a buscar el botón. La
   * intención se lee y se **consume** aquí (`consumePendingRoute`), así que sólo
   * desvía el inicio de sesión que la originó.
   *
   * Se decide aquí y no dentro de `handleSubmit` porque tras `signIn` el perfil
   * se hidrata de forma asíncrona: el valor que vería el handler sería el del
   * render anterior a iniciar sesión.
   */
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const pending = consumePendingRoute();
    if (pending) {
      navigate(pending, { replace: true });
      return;
    }
    navigate(isNewUserOnboardingComplete ? "/workspaces" : "/onboarding/nuevo-usuario", {
      replace: true,
    });
  }, [isLoading, isAuthenticated, isNewUserOnboardingComplete, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const targetEmail = email.trim() || "admin@necto.com";
    const targetPassword = password || "necto123";

    setLoading(true);
    try {
      await signIn(targetEmail, targetPassword);
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Acceso con Google.
   *
   * Google aporta la identidad **externa** (`sub`); Necto conserva su propio
   * `userId`. Si ya existía una cuenta con ese correo, se **vincula** Google a
   * ella en lugar de crear un segundo usuario. Ambas vías —formulario y
   * Google— desembocan en el mismo `onboarding_new_user`.
   */
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-8">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-black text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Inicia sesión en Necto
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa con cualquier correo o contraseña para acceder sin restricciones de backend.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="signin-email">
                    Correo electrónico
                  </Label>
                  <Input
                    type="email"
                    id="signin-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@necto.com"
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="signin-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
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
                    text="¿Olvidaste tu contraseña?"
                    variant="secondary"
                    className="text-xs font-medium hover:text-brand-600 dark:text-brand-400"
                  />
                </div>
                <div>
                  <Button className="w-full" size="sm" type="submit" disabled={loading}>
                    {loading ? "Iniciando sesión…" : "Iniciar sesión"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="relative py-4 sm:py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="p-2 font-mono uppercase text-gray-400 bg-white dark:bg-gray-900 sm:px-4">
                  O CONTINÚA CON
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading}
              startIcon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
                  <path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
                  <path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
                  <path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
                </svg>
              }
            >
              Acceder con Google
            </Button>

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs font-normal text-gray-600 dark:text-gray-400">
                ¿Aún no tienes una cuenta?{" "}
                <Link
                  to="/register"
                  text="Regístrate aquí"
                  variant="secondary"
                  className="font-bold hover:underline"
                />
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ¿Tienes alguna duda sobre Necto?{" "}
                <Link
                  to="/ayuda"
                  text="Centro de ayuda y FAQ"
                  variant="gray"
                  underline
                  className="font-semibold text-gray-700 dark:text-gray-300 hover:text-success-500 dark:hover:text-success-400"
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
