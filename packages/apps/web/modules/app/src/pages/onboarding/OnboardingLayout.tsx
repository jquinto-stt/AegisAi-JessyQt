import React from "react";
import { ArrowLeft } from "lucide-react";
import { ThemeToggleButton } from "@/shell";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";

export interface OnboardingBrandMessage {
  title: string;
  subtitle: string;
  badge: string;
}

export interface OnboardingLayoutProps {
  pasoActual: number;
  totalPasos: number;
  pasoLabel: string;
  onBack?: () => void;
  brandMessages?: OnboardingBrandMessage[];
  brandBadge?: string;
  brandHeadline?: string;
  brandDescription?: string;
  brandBullets?: string[];
  brandQuote?: {
    text: string;
    author: string;
  };
  brandSummary?: {
    eyebrow: string;
    title: string;
    lines: string[];
  };
  children: React.ReactNode;
}

export function AnimatedBrandMessages({
  messages,
}: {
  messages: OnboardingBrandMessage[];
}) {
  const [index, setIndex] = React.useState(0);
  const [fadeState, setFadeState] = React.useState<"in" | "out">("in");

  React.useEffect(() => {
    setIndex(0);
    setFadeState("in");
  }, [messages]);

  React.useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFadeState("in");
      }, 300);
    }, 4500);

    return () => clearInterval(timer);
  }, [messages]);

  const currentMsg = messages[index] || messages[0];

  return (
    <div className="space-y-4 min-h-[170px] flex flex-col justify-between pointer-events-auto">
      <div className="space-y-3">
        <div className="flex items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-xs transition-all duration-300">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            {currentMsg.badge}
          </span>
        </div>

        <div
          className={`space-y-2 transition-all duration-300 transform ${
            fadeState === "in"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-1 pointer-events-none"
          }`}
        >
          <h2 className="max-w-md text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug text-white">
            {currentMsg.title}
          </h2>
          <p className="max-w-md text-sm font-normal text-white/90 leading-relaxed">
            {currentMsg.subtitle}
          </p>
        </div>
      </div>

      {messages.length > 1 && (
        <div className="flex items-center space-x-1.5 pt-2">
          {messages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setFadeState("out");
                setTimeout(() => {
                  setIndex(i);
                  setFadeState("in");
                }, 200);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"
              }`}
              aria-label={`Mensaje ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  pasoActual,
  totalPasos,
  pasoLabel,
  onBack,
  brandMessages,
  brandBadge = "Necto",
  brandHeadline = "Tu espacio de trabajo en tiempo real",
  brandDescription = "Configuración rápida para iniciar tus operaciones sin fricción.",
  brandBullets = [],
  brandQuote,
  brandSummary,
  children,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-brand-500 text-white p-3 sm:p-5 lg:p-8 flex items-center justify-center overflow-x-hidden font-sans selection:bg-white selection:text-brand-500 dark:bg-secondary-600">
      {/* Mosaico interactivo de punticos con efecto estelar que sigue el mouse */}
      <InteractiveDotGrid
        dotGap={26}
        baseRadius={2.0}
        activeRadius={4.8}
        glowDistance={180}
      />

      {/* Contenedor principal sin cuerpo físico que opaque los puntos */}
      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        
        {/* ── COLUMNA IZQUIERDA: TARJETA BLANCA FLOTANTE ──────────────── */}
        <div className="lg:col-span-7 xl:col-span-7 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-[28px] sm:rounded-[32px] p-6 sm:p-9 lg:p-12 shadow-2xl flex flex-col justify-between relative z-10 transition-all">
          {/* Barra superior de la tarjeta blanca con Logo en el centro exacto */}
          <div className="relative flex items-center justify-between gap-3 pb-6 border-b border-gray-100 dark:border-gray-800/80">
            {/* Izquierda: Volver + Contador de pasos */}
            <div className="flex items-center gap-3">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex size-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                  title="Volver"
                  aria-label="Volver al paso anterior"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}

              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {pasoActual}/{totalPasos}
                </span>
                <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
                <span>{pasoLabel}</span>
              </div>
            </div>

            {/* Centro: Isotipo oficial de Necto centrado */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <img
                src="/images/logo/necto-icon.svg"
                alt="Necto"
                className="h-8 w-8 select-none"
              />
            </div>

            {/* Derecha: Botón dark/light compacto */}
            <div className="flex items-center">
              <ThemeToggleButton variant="compact" />
            </div>
          </div>

          {/* Contenido inyectado (Título, campos, opciones) */}
          <div className="py-6 my-auto">
            {children}
          </div>
        </div>

        {/* ── COLUMNA DERECHA: INFORMACIÓN DIRECTA SOBRE EL FONDO (SIN CUERPO FÍSICO) ── */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between py-4 lg:py-6 text-white relative z-10 min-h-[480px]">
          {/* Header del panel informativo con mensajes rotativos o fallback */}
          {brandMessages && brandMessages.length > 0 ? (
            <AnimatedBrandMessages messages={brandMessages} />
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-xs shadow-xs">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                {brandBadge}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug text-white">
                {brandHeadline}
              </h2>

              <p className="text-sm font-normal text-white/90 leading-relaxed max-w-md">
                {brandDescription}
              </p>

              {brandBullets.length > 0 && (
                <ul className="space-y-2.5 pt-2">
                  {brandBullets.map((bullet, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs font-semibold text-white/95">
                      <span className="flex size-5 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Parte inferior: Resumen en vivo y Cita (Texto limpio sin fondo de tarjeta que tape los puntos) */}
          <div className="space-y-4 pt-6">
            {brandSummary && brandSummary.title && (
              <div className="pt-3 border-t border-white/20">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block mb-1">
                  {brandSummary.eyebrow}
                </span>
                <p className="truncate text-lg font-bold text-white">
                  {brandSummary.title}
                </p>
                {brandSummary.lines.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {brandSummary.lines.filter(Boolean).map((line, idx) => (
                      <p key={idx} className="text-xs text-white/85 truncate">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {brandQuote ? (
              <div className="pt-2">
                <p className="text-xs italic text-white/90 leading-relaxed">
                  “{brandQuote.text}”
                </p>
                <p className="mt-2 text-[11px] font-bold text-white/75 uppercase tracking-wider">
                  {brandQuote.author}
                </p>
              </div>
            ) : (
              <div className="pt-2">
                <p className="text-xs text-white/85 leading-relaxed">
                  “Necto centraliza tus pedidos, catálogo y operaciones en un flujo ágil y confiable sin cambiar tu manera de trabajar.”
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                  Operaciones en tiempo real · Necto
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingLayout;
