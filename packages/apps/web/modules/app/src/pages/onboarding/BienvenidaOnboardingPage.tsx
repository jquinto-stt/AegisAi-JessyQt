import React from "react";
import { useNavigate } from "react-router";
import { ThemeToggleButton } from "@/shell";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";

export function BienvenidaOnboardingPage() {
  const navigate = useNavigate();

  const handleComenzar = () => {
    navigate("/onboarding/telefono");
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
        <header className="relative w-full flex items-center justify-between z-10 pointer-events-auto">
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
        <main className="relative flex-1 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto z-10 pointer-events-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-ink-title dark:text-white leading-tight mb-4">
            ¡Esta es tu bienvenida a{" "}
            <span className="text-brand-500 dark:text-brand-400">Necto</span>!
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed mb-8">
            ¿Qué tal si nos conocemos un poco para saber cómo podemos ayudarte de la mejor manera?
          </p>

          <div>
            <button
              type="button"
              onClick={handleComenzar}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-lg shadow-brand-500/25 transition-all duration-150 cursor-pointer"
            >
              <span>Comenzar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Footer inferior sutil */}
        <footer className="w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10">
          <span>Necto &copy; {new Date().getFullYear()}</span>
          <span>Plataforma de Operaciones y Gestión</span>
        </footer>
      </div>
    </>
  );
}
