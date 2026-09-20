import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Checkbox } from "@/elements/form/checkbox";
import { Button } from "@/elements/ui/button";
import { sessionStore, organizacionStore, modulosOperablesDeSesion } from "@/stores";

/**
 * @kgId 07b80348fc4c
 */
export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (userEmail?: string) => {
    const finalEmail = userEmail || email.trim() || "admin@necto.io";
    const nombreUsuario = finalEmail.split("@")[0] || "Admin";

    // 1. En mockup sin backend, cualquier credencial autentica. Registramos el perfil.
    organizacionStore.actualizarPerfil({
      nombre: nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1),
      apellido: "Necto",
      email: finalEmail,
      pais: "Colombia",
    });

    // 2. Garantizamos una organización base si no existía
    if (!organizacionStore.organizacion) {
      organizacionStore.crearOrganizacion({
        nombre: "Mi Empresa",
        pais: "Colombia",
        moneda: "COP",
        zonaHoraria: "America/Bogota",
      });
    }

    // 3. La sesión recibe como máximo lo que la organización tiene activo.
    //
    // Antes decía `["pedidos"]` fijo: la sesión afirmaba operar un módulo que la
    // organización podía no tener instalado, en contra de la regla
    // `Sesión ⊆ Organización`.
    sessionStore.configurar(
      modulosOperablesDeSesion(organizacionStore.modulosActivos),
      "administrador",
    );

    // 4. Si el módulo Pedidos ya está instalado, entra directo; si no, va a /modulos para agregarlo
    if (organizacionStore.tieneModuloPedidos) {
      navigate("/pedidos/inicio");
    } else {
      navigate("/modulos");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const handleGoogleLogin = () => {
    handleLogin("usuario.google@necto.io");
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Inicia sesion</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ingresa tus credenciales para acceder a tu panel de control.</p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>Correo electronico <span className="text-error-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Contrasena <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contrasena"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
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
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">Mantener sesion iniciada</span>
                  </div>
                  <Link to="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">Olvidaste tu contrasena?</Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" type="submit">Iniciar sesion</Button>
                </div>
              </div>
            </form>
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/70 dark:border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">O CONTINUA CON</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex items-center justify-center w-full gap-3 py-3 text-sm font-normal text-gray-700 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-white/90 dark:hover:bg-white/5 cursor-pointer"
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
                <Link to="/register" className="text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium">Registrate aqui</Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ¿Tienes alguna duda sobre Necto?{" "}
                <Link
                  to="/ayuda"
                  className="font-semibold text-gray-700 dark:text-gray-300 hover:text-brand-500 dark:hover:text-brand-400 underline"
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
