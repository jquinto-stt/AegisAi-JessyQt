import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { Handshake, Users2, Sparkles, ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { organizacionStore } from "@/stores/organizacion.store";
import { OnboardingLayout } from "./OnboardingLayout";

const InstagramTikTokIcon = () => (
  <div className="flex items-center -space-x-1.5 shrink-0">
    {/* Instagram */}
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-theme-xs">
      <svg className="h-3.5 w-3.5 fill-white" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </div>
    {/* TikTok */}
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-950 text-white shadow-theme-xs border border-white/20">
      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.112a2.89 2.89 0 0 1 2.373-4.526c.435 0 .848.096 1.22.269V9.52a6.335 6.335 0 0 0-1.22-.119 6.336 6.336 0 0 0-6.336 6.336 6.336 6.336 0 0 0 6.336 6.336 6.336 6.336 0 0 0 6.336-6.336V9.01a8.214 8.214 0 0 0 4.775 1.524V7.089a4.814 4.814 0 0 1-1-.403z"/>
      </svg>
    </div>
  </div>
);

const GoogleIcon = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white p-1.5 shadow-theme-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 shrink-0">
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
      <path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
      <path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
      <path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
    </svg>
  </div>
);

// Canal de adquisición, no un estado: por eso no va en la familia de marca ni en la
// de éxito. Toma el celeste de la guía, que ya está en uso en la app.
const ColegaIcon = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-700 border border-accent-200/70 dark:bg-accent-500/10 dark:text-accent-300 dark:border-accent-500/20 shrink-0">
    <Handshake className="h-4.5 w-4.5" />
  </div>
);

// Ídem, al índigo. La familia `violet` de Tailwind no está en la guía.
const ComunidadIcon = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600 border border-secondary-200/70 dark:bg-secondary-500/15 dark:text-secondary-300 dark:border-secondary-500/30 shrink-0">
    <Users2 className="h-4.5 w-4.5" />
  </div>
);

const OtroCanalIcon = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/70 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 shrink-0">
    <Sparkles className="h-4.5 w-4.5" />
  </div>
);

const CANALES_ADQUISICION = [
  {
    id: "Instagram o TikTok",
    label: "Instagram o TikTok",
    renderIcon: () => <InstagramTikTokIcon />,
  },
  {
    id: "Recomendación de un colega",
    label: "Recomendación de un colega",
    renderIcon: () => <ColegaIcon />,
  },
  {
    id: "Búsqueda en Google",
    label: "Búsqueda en Google",
    renderIcon: () => <GoogleIcon />,
  },
  {
    id: "Comunidad o evento",
    label: "Comunidad o evento",
    renderIcon: () => <ComunidadIcon />,
  },
  {
    id: "Otro canal",
    label: "Otro canal",
    renderIcon: () => <OtroCanalIcon />,
  },
];

const BRAND_MESSAGES_ENCUESTA = [
  {
    badge: "Bienvenida",
    title: "Tu organización está lista.",
    subtitle: "Diseñado para darte claridad y agilidad operativa desde el primer minuto.",
  },
  {
    badge: "Comunidad Necto",
    title: "Conectamos con fundadores como tú.",
    subtitle: "Evolucionamos la plataforma de la mano con los negocios que mueven el comercio diario.",
  },
];

export const EncuestaOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/modulos";

  const usuarioActual = organizacionStore.usuario;
  const [canalElegido, setCanalElegido] = useState(
    usuarioActual?.comoNosConociste || "Recomendación de un colega"
  );

  const handleFinalizar = (canal?: string) => {
    const finalCanal = canal || canalElegido;
    organizacionStore.actualizarPerfil({
      comoNosConociste: finalCanal,
    });
    navigate(redirectTo);
  };

  return (
    <>
      <PageMeta
        title="Encuesta Inicial · Necto"
        description="Cuéntanos cómo conociste la plataforma"
      />

      <OnboardingLayout
        pasoActual={2}
        totalPasos={2}
        pasoLabel="Paso final"
        onBack={() => navigate("/onboarding/organizacion")}
        brandMessages={BRAND_MESSAGES_ENCUESTA}
        brandSummary={{
          eyebrow: "Encuesta de bienvenida",
          title: "¿Cómo conociste a Necto?",
          lines: [
            canalElegido ? `Canal: ${canalElegido}` : "Selecciona una opción",
            "Listo para ingresar a tu organización",
          ],
        }}
      >
        <div className="w-full">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Paso final — Encuesta rápida
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
              ¿Cómo conociste a Necto?
            </h1>
            <p className="mt-1.5 text-sm text-ink-body dark:text-gray-400">
              Queremos saber cómo llegaste a nosotros para ofrecerte la mejor experiencia desde el primer momento.
            </p>
          </div>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CANALES_ADQUISICION.map((canal) => {
                const seleccionado = canalElegido === canal.id;
                return (
                  <button
                    key={canal.id}
                    type="button"
                    onClick={() => {
                      setCanalElegido(canal.id);
                    }}
                    className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left font-medium transition-all duration-150 cursor-pointer ${
                      seleccionado
                        ? "border-brand-500 bg-brand-50/70 text-brand-900 shadow-theme-xs ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-100"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {canal.renderIcon()}
                    <span className="text-sm font-semibold">{canal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleFinalizar("Omitido")}
              className="rounded-full px-5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer"
            >
              Omitir
            </Button>
            <Button
              type="button"
              onClick={() => handleFinalizar()}
              className="rounded-full px-8 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer"
            >
              Ir a mi organización
              <ArrowRight className="size-4 ml-1.5 inline" />
            </Button>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
});

export default EncuestaOnboardingPage;
