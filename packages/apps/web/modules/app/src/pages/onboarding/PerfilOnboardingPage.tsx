import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Label } from "@/elements/form/label";
import { Button } from "@/elements/ui/button";
import { organizacionStore, PAISES_CONFIG } from "@/stores/organizacion.store";
import { OnboardingLayout } from "./OnboardingLayout";

const BRAND_MESSAGES_PERFIL = [
  {
    badge: "Tu Perfil",
    title: "El punto de partida de tu operativa.",
    subtitle: "Tu cuenta te identifica en todos los espacios de trabajo y gestiones de tu negocio.",
  },
  {
    badge: "Identidad Única",
    title: "Control centralizado, cero duplicados.",
    subtitle: "Administra múltiples empresas o módulos desde un único inicio de sesión.",
  },
  {
    badge: "Experiencia Local",
    title: "Formatos adaptados a tu región.",
    subtitle: "Sincronizamos fechas, moneda y asistencia según tu país de residencia.",
  },
];

export const PerfilOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const usuarioActual = organizacionStore.usuario;

  const [pais, setPais] = useState(usuarioActual?.pais || "Colombia");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    organizacionStore.actualizarPerfil({
      pais,
    });

    navigate("/onboarding/organizacion");
  };

  const nombreCompleto = `${usuarioActual?.nombre || "Usuario"} ${
    usuarioActual?.apellido || ""
  }`.trim();
  const emailUsuario = usuarioActual?.email || "usuario@empresa.com";

  return (
    <>
      <PageMeta title="Tu Perfil · Necto" description="Completa tu perfil personal" />

      <OnboardingLayout
        pasoActual={1}
        totalPasos={2}
        pasoLabel="Perfil"
        brandMessages={BRAND_MESSAGES_PERFIL}
        brandSummary={{
          eyebrow: "Tu perfil",
          title: nombreCompleto,
          lines: [
            emailUsuario,
            `Residencia: ${pais}`,
          ],
        }}
      >
        <div className="w-full">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Paso 1 de 2 — Perfil
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              ¡Te damos la bienvenida a Necto!
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Selecciona tu país de residencia para completar tu perfil personal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="pais" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                País de residencia <span className="text-brand-500">*</span>
              </Label>
              <div className="mt-2 relative">
                <select
                  id="pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  {Object.keys(PAISES_CONFIG).map((pKey) => (
                    <option key={pKey} value={pKey}>
                      {pKey}
                    </option>
                  ))}
                  <option value="Otro">Otro país</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Utilizamos tu país para adaptar formatos regionales y asistencia local.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-400">
                Paso 1 de 2
              </span>
              <Button
                type="submit"
                className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 cursor-pointer"
              >
                Continuar a Organización
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
          </form>
        </div>
      </OnboardingLayout>
    </>
  );
});

export default PerfilOnboardingPage;
