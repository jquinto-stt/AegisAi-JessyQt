import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { ThemeToggleButton } from "@/shell";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";

export const EncuestaOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/inicio";

  const usuarioActual = organizacionStore.usuario;
  const [respuesta, setRespuesta] = useState(usuarioActual?.comoNosConociste || "");
  const [cargando, setCargando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-ajustar altura del textarea según el contenido
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(64, textareaRef.current.scrollHeight)}px`;
    }
  }, [respuesta]);

  // Manejo de atajos de teclado: Ctrl/Cmd + Enter para enviar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleEnviar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [respuesta]);

  const handleEnviar = async () => {
    setCargando(true);
    const textoFinal = respuesta.trim() || "No especificado";

    try {
      // 1. Guardar en el store local
      organizacionStore.actualizarPerfil({
        comoNosConociste: textoFinal,
      });

      // 2. Sincronizar remotamente
      await actualizarPerfilRemoto({
        comoNosConociste: textoFinal,
      } as Parameters<typeof actualizarPerfilRemoto>[0]);

      // 3. Navegar a la pantalla de carga con el logo animado
      navigate(`/onboarding/cargando?redirect=${encodeURIComponent(redirectTo)}`);
    } catch {
      navigate(`/onboarding/cargando?redirect=${encodeURIComponent(redirectTo)}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <PageMeta
        title="¿Cómo te enteraste de Necto? — Necto"
        description="Cuéntanos con detalle cómo conociste la plataforma Necto."
      />

      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Barra delgada de progreso superior (estilo Typeform al 85%) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-20">
          <div
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: "88%" }}
          />
        </div>

        {/* Mosaico interactivo de puntos */}
        <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

        {/* Círculos decorativos de marca */}
        <div className="dark:hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block">
          <DecorativeCircles variant="indigo" />
        </div>

        {/* Header con Logo y Selector de Tema */}
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

        {/* Contenido Central: Pregunta 7 (Detalle de Origen) */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-3xl mx-auto w-full my-auto z-10 pointer-events-auto">
          {/* Título de la pregunta */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold mt-1.5 shrink-0">
                7
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white leading-snug">
                Cuéntanos detalladamente: ¿Cómo te enteraste de Necto?<span className="text-brand-500">*</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 pl-8 leading-relaxed">
              Te agradecemos que seas lo más específico posible, ¡extiéndete con tranquilidad!
            </p>
          </div>

          {/* Input de texto subrayado estilo Typeform */}
          <div className="pl-8 space-y-4">
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escribe aquí tu respuesta..."
                rows={1}
                autoFocus
                className="w-full bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-brand-500 dark:focus:border-brand-400 text-lg sm:text-xl text-ink-title dark:text-white placeholder:text-gray-400/80 dark:placeholder:text-gray-600 outline-none pb-3 transition-colors resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Pulsa <strong className="text-gray-600 dark:text-gray-300">Shift ⇧ + Enter ↵</strong> para añadir un párrafo
              </p>
            </div>

            {/* Botón Enviar */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleEnviar}
                disabled={cargando}
                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-lg shadow-brand-500/25 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {cargando ? "Enviando..." : "Enviar"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                pulsa <strong className="text-gray-600 dark:text-gray-300">Ctrl + Enter ↵</strong>
              </span>
            </div>
          </div>
        </main>

        {/* Footer con flechas de navegación Typeform */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/onboarding/modelo-negocio")}
              title="Paso anterior (Modelo de negocio)"
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleEnviar}
              title="Enviar respuesta"
              className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
});

export default EncuestaOnboardingPage;
