import React, { useState } from "react";
import { useSearchParams } from "react-router";
import { useTransicionOnboarding } from "./useTransicionOnboarding";
import { observer } from "mobx-react-lite";
import { ThemeToggleButton } from "@/shell";
import { Check, ArrowRight, Users, Sparkles } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";

interface CanalDescubrimiento {
  id: string;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  colorBorder?: string;
}

const CANALES: CanalDescubrimiento[] = [
  {
    id: "instagram",
    nombre: "Instagram",
    descripcion: "Reels, historias o publicaciones",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    nombre: "TikTok",
    descripcion: "Videos o creadores de contenido",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    nombre: "Facebook",
    descripcion: "Grupos o anuncios publicitarios",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    nombre: "LinkedIn",
    descripcion: "Artículos, red o perfil corporativo",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    nombre: "YouTube",
    descripcion: "Tutoriales o recomendaciones en video",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: "google",
    nombre: "Google / Búsqueda",
    descripcion: "Búsqueda web o artículos de blog",
    icono: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  },
  {
    id: "referido",
    nombre: "Recomendación",
    descripcion: "Un amigo, socio o colega me contó",
    icono: <Users className="w-6 h-6" />,
  },
  {
    id: "otro",
    nombre: "Otro medio",
    descripcion: "Eventos, prensa u otro canal",
    icono: <Sparkles className="w-6 h-6" />,
  },
];

export const EncuestaOnboardingPage = observer(() => {
  const irAPaso = useTransicionOnboarding();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/inicio";

  const usuarioActual = organizacionStore.usuario;
  const [seleccionado, setSeleccionado] = useState<string>(
    usuarioActual?.comoNosConociste ? usuarioActual.comoNosConociste.toLowerCase() : ""
  );
  const [cargando, setCargando] = useState(false);

  const handleSeleccionarYEnviar = async (canalId: string) => {
    setSeleccionado(canalId);
    setCargando(true);

    const canalEncontrado = CANALES.find((c) => c.id === canalId);
    const textoFinal = canalEncontrado ? canalEncontrado.nombre : canalId;

    try {
      // 1. Guardar en el store local
      organizacionStore.actualizarPerfil({
        comoNosConociste: textoFinal,
      });

      // 2. Sincronizar remotamente
      await actualizarPerfilRemoto({
        comoNosConociste: textoFinal,
      });

      // 3. Navegar a la pantalla de carga para finalizar
      irAPaso(`/onboarding/cargando?redirect=${encodeURIComponent(redirectTo)}`);
    } catch {
      irAPaso(`/onboarding/cargando?redirect=${encodeURIComponent(redirectTo)}`);
    } finally {
      setCargando(false);
    }
  };

  const handleContinuar = () => {
    if (!seleccionado) return;
    void handleSeleccionarYEnviar(seleccionado);
  };

  const handleOmitir = () => {
    irAPaso(`/onboarding/cargando?redirect=${encodeURIComponent(redirectTo)}`);
  };

  return (
    <>
      <PageMeta
        title="¿Cómo conociste a Necto? — Necto"
        description="Cuéntanos por cuál canal o plataforma descubriste Necto."
      />

      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Barra delgada de progreso superior (Paso 3 de 3 - 100%) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-20">
          <div
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: "100%", viewTransitionName: "onboarding-progreso" }}
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

        {/* Contenido Central */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-2xl mx-auto w-full my-auto z-10 pointer-events-auto py-6"
          style={{ viewTransitionName: "onboarding-contenido" }}
        >
          {/* Título de la pregunta */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold">
                3
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Paso 3 de 3
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-title dark:text-white leading-tight">
              ¿Cómo te enteraste de Necto?<span className="text-brand-500">*</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Selecciona la plataforma o medio principal por el que nos descubriste.
            </p>
          </div>

          {/* Grilla interactiva de plataformas con logos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {CANALES.map((c) => {
              const estaSeleccionado = seleccionado === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void handleSeleccionarYEnviar(c.id)}
                  disabled={cargando}
                  className={`group relative flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    estaSeleccionado
                      ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 shadow-sm ring-2 ring-brand-500/20 text-brand-700 dark:text-brand-300"
                      : "border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 hover:border-brand-300 hover:shadow-xs text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors shrink-0 ${
                      estaSeleccionado
                        ? "bg-brand-500 text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-brand-50 dark:group-hover:bg-brand-950 group-hover:text-brand-600"
                    }`}
                  >
                    {c.icono}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="text-sm font-bold truncate leading-tight">
                      {c.nombre}
                    </h3>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 truncate mt-0.5 font-normal">
                      {c.descripcion}
                    </p>
                  </div>

                  {estaSeleccionado && (
                    <div className="absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleOmitir}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
              Omitir este paso
            </button>

            <button
              type="button"
              disabled={!seleccionado || cargando}
              onClick={handleContinuar}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-md shadow-brand-500/25 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{cargando ? "Finalizando..." : "Continuar"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>
          <span>Paso 3 de 3</span>
        </footer>
      </div>
    </>
  );
});

export default EncuestaOnboardingPage;
