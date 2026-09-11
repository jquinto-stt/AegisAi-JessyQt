import { useState } from "react";
import { Link } from "react-router-dom";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";

/**
 * @kgId ae8e4db4af8e
 */
export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="flex flex-col flex-1 w-full lg:w-1/2">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-black text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace de recuperación.
          </p>
        </div>

        {sent ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Enlace de recuperación enviado
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Hemos enviado las instrucciones a <strong>{email}</strong>. Revisa tu bandeja de entrada o spam.
            </p>
            <div className="pt-2">
              <Link to="/login" className="text-xs font-bold text-[#FF3F1A] hover:underline">
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
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
                  <Button className="w-full" size="sm" type="submit">
                    Enviar enlace de recuperación
                  </Button>
                </div>
              </div>
            </form>
            <div className="mt-6 text-center">
              <p className="text-xs font-normal text-gray-700 dark:text-gray-400">
                ¿Recordaste tu contraseña?{" "}
                <Link to="/login" className="font-bold text-[#FF3F1A] hover:underline">
                  Volver al login
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
