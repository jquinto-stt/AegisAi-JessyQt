import React from "react";
import { ThemeToggleButton } from "@/shell";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { useTransicionOnboarding } from "./useTransicionOnboarding";

// Palabras del titular, reveladas una a una por `css/onboarding.css`.
const TITULAR: { texto: string; marca?: boolean }[] = [
  { texto: "¡Esta" },
  { texto: "es" },
  { texto: "tu" },
  { texto: "bienvenida" },
  { texto: "a" },
  { texto: "Necto", marca: true },
];

const RETARDO_TITULAR_MS = 360;
const PASO_PALABRA_MS = 60;

export function BienvenidaOnboardingPage() {
  const irAPaso = useTransicionOnboarding();

  const handleComenzar = () => {
    irAPaso("/onboarding/telefono");
  };

  return (
    <>
      <PageMeta
        title="Bienvenida a Necto"
        description="Comienza tu configuración en Necto para gestionar tu operación y ventas."
      />
      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Mosaico interactivo de puntos del Login */}
        <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

        {/* Patrón de círculos decorativos de la marca */}
        <div className="dark:hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block">
          <DecorativeCircles variant="indigo" />
        </div>

        {/* Header superior */}
        <header className="bienvenida-cabecera relative w-full flex items-center justify-between z-10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo/necto-full-white.svg"
              alt="Necto"
              className="hidden h-9 w-auto dark:block"
            />
            <img
              src="/images/logo/logo-principal.svg"
              alt="Necto"
              className="h-9 w-auto dark:hidden"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
          </div>
        </header>

        {/* Contenido central */}
        <main
          className="relative flex-1 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto z-10 pointer-events-auto"
          style={{ viewTransitionName: "onboarding-contenido" }}
        >
          {/* Isotipo animado: el cuerpo se asienta, el acento conecta y emite una onda */}
          <div className="relative mb-8 size-16" aria-hidden="true">
            <span className="bienvenida-isotipo__onda absolute inset-0 rounded-full border-2 border-brand-500" />
            <svg viewBox="0 0 44 44" fill="none" className="relative size-16">
              <path
                className="bienvenida-isotipo__cuerpo fill-brand-500"
                d="M32.8588 29.4693L30.0813 32.3566C29.5321 32.9215 28.622 32.9372 28.0571 32.3723L20.1954 24.5107C19.301 23.6163 17.7789 24.2439 17.7789 25.515V31.2896C17.7789 32.0742 17.1512 32.7019 16.3666 32.7019H12.8516C12.067 32.7019 11.4394 32.0742 11.4394 31.2896V16.0528C11.4394 15.6762 11.5806 15.3153 11.8474 15.0485L14.719 12.1769C15.2682 11.6277 16.1312 11.6277 16.6961 12.1455L32.796 27.4451C33.3609 27.9786 33.3766 28.8887 32.8431 29.4536L32.8588 29.4693Z"
              />
              <path
                className="bienvenida-isotipo__acento fill-secondary-600 dark:fill-white"
                d="M33.2511 12.8046V15.2682C33.2511 16.1469 32.5449 16.8688 31.6505 16.8688H26.0956C24.6833 16.8688 23.9772 15.174 24.9501 14.1698L27.3195 11.7061C27.6177 11.3923 28.0257 11.2197 28.465 11.2197H31.6505C32.5292 11.2197 33.2511 11.9258 33.2511 12.8203V12.8046Z"
              />
            </svg>
          </div>

          <h1 className="text-[24px] sm:text-[36px] font-bold tracking-tight text-ink-title dark:text-white leading-tight mb-4">
            {TITULAR.map((palabra, i) => (
              <React.Fragment key={palabra.texto}>
                {i > 0 && " "}
                <span className="bienvenida-palabra">
                  <span
                    className={palabra.marca ? "text-brand-500 dark:text-brand-400" : undefined}
                    style={{ "--retardo": `${RETARDO_TITULAR_MS + i * PASO_PALABRA_MS}ms` } as React.CSSProperties}
                  >
                    {palabra.texto}
                    {palabra.marca && <span className="text-ink-title dark:text-white">!</span>}
                  </span>
                </span>
              </React.Fragment>
            ))}
          </h1>

          <p className="bienvenida-subtitulo text-[16px] font-normal text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed mb-8">
            ¿Qué tal si nos conocemos un poco para saber cómo podemos ayudarte de la mejor manera?
          </p>

          <div className="bienvenida-accion">
            <button
              type="button"
              onClick={handleComenzar}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-[16px] text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-lg shadow-brand-500/25 transition-[background-color,transform] duration-150 cursor-pointer"
            >
              <span>Comenzar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Footer inferior sutil */}
        <footer className="bienvenida-pie w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10">
          <span>Necto &copy; {new Date().getFullYear()}</span>
          <span>Plataforma de Operaciones y Gestión</span>
        </footer>
      </div>
    </>
  );
}
