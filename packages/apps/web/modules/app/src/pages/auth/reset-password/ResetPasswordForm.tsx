import { useState } from "react";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { Alert } from "@/elements/ui/alert";
import { Link } from "@/elements/ui/link";

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
          <h1 className="mb-2 font-bold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace de recuperación.
          </p>
        </div>

        {sent ? (
          <Alert
            variant="success"
            title="Enlace de recuperación enviado"
            message={`Hemos enviado las instrucciones a ${email}. Revisa tu bandeja de entrada o spam.`}
            showLink
            linkHref="/login"
            linkText="Volver a Iniciar Sesión"
          />
        ) : (
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
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
              <p className="text-theme-xs font-normal text-gray-700 dark:text-gray-400">
                ¿Recordaste tu contraseña?{" "}
                <Link
                  to="/login"
                  text="Volver al login"
                  variant="secondary"
                  className="text-xs font-bold hover:underline"
                />
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
