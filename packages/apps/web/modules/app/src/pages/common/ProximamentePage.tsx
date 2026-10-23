import React from "react";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import { 
  ArrowLeftIcon, 
  HomeIcon,
  SparklesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export interface ProximamentePageProps {
  titulo?: string;
  subtitulo?: string;
  codigo?: string;
  categoria?: string;
}

export const ProximamentePage: React.FC<ProximamentePageProps> = ({
  titulo = "Próximamente",
  subtitulo = "Estamos trabajando en esta sección para que tengas la mejor experiencia. Muy pronto estará disponible en Necto.",
  codigo = "404",
  categoria = "En construcción",
}) => {
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title={`${titulo} · Necto`}
        description={subtitulo}
      />

      <div className="relative min-h-[calc(100vh-80px)] w-full flex flex-col justify-center items-center px-4 sm:px-6 py-12 select-none overflow-hidden text-center">
        {/* Aros de marca oficiales de Necto */}
        <div className="dark:hidden pointer-events-none absolute inset-0 overflow-hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block pointer-events-none absolute inset-0 overflow-hidden">
          <DecorativeCircles variant="indigo" />
        </div>

        <div className="relative z-10 max-w-lg w-full flex flex-col items-center animate-aparecer">
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-500 dark:bg-brand-500/20 dark:text-brand-400 border border-brand-500/20 text-xs font-bold uppercase tracking-wider mb-6 shadow-2xs">
            <ClockIcon className="w-4 h-4 stroke-[2]" />
            <span>{categoria} · {codigo}</span>
          </div>

          {/* Gráfico 404 / Próximamente estilizado */}
          <div className="relative flex items-center justify-center my-2">
            <span className="text-7xl sm:text-9xl font-black tracking-tighter text-gray-200/80 dark:text-white/10 select-none">
              {codigo}
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl flex items-center justify-center text-brand-500 dark:text-brand-400">
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.8]" />
              </div>
            </div>
          </div>

          {/* Título y descripción */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-6">
            {titulo}
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
            {subtitulo}
          </p>

          {/* Botones de navegación */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-2xs"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 stroke-[2]" />
              <span>Regresar</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <HomeIcon className="w-3.5 h-3.5 stroke-[2]" />
              <span>Panel Principal</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProximamentePage;
