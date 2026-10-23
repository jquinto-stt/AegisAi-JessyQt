import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { organizacionStore } from "@/stores/organizacion.store";
import { createSupportRequest } from "./support-requests";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import {
  SparklesIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export const SugerenciasPage: React.FC = () => {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<0 | 1 | 2>(0);
  const [mensaje, setMensaje] = useState("");
  const [categoria, setCategoria] = useState<string>("mejora");
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea en paso 1
  useEffect(() => {
    if (paso === 1) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [paso]);

  // Manejo de atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Paso 0: Enter avanza
      if (paso === 0 && e.key === "Enter") {
        e.preventDefault();
        setPaso(1);
      }
      // Paso 1: Ctrl+Enter o Cmd+Enter envía
      if (paso === 1 && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (mensaje.trim()) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paso, mensaje]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mensaje.trim()) return;

    setEnviando(true);
    try {
      const emailUsuario =
        organizacionStore.usuario?.email || "usuario@necto.app";
      const nombreUsuario =
        organizacionStore.usuario?.nombre || "Emprendedor";

      createSupportRequest({
        topic: "sugerencia",
        subject: `Sugerencia de ${nombreUsuario} [${categoria}]`,
        message: mensaje.trim(),
        email: emailUsuario,
      });

      setPaso(2);
    } finally {
      setEnviando(false);
    }
  };

  const CATEGORIAS = [
    { id: "mejora", label: "Oportunidad de mejora", icon: SparklesIcon },
    { id: "bug", label: "Reportar un fallo", icon: WrenchScrewdriverIcon },
    { id: "modulo", label: "Nueva función o módulo", icon: LightBulbIcon },
    { id: "otro", label: "Comentario general", icon: ChatBubbleBottomCenterTextIcon },
  ];

  return (
    <>
      <PageMeta
        title="Dejar sugerencia · Necto"
        description="Queremos escuchar tus ideas para mejorar Necto cada día."
      />

      <div className="relative min-h-[calc(100vh-80px)] w-full flex flex-col justify-center items-center px-4 sm:px-6 py-12 select-none overflow-hidden">
        {/* Círculos decorativos oficiales de Necto */}
        <div className="dark:hidden pointer-events-none absolute inset-0 overflow-hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block pointer-events-none absolute inset-0 overflow-hidden">
          <DecorativeCircles variant="indigo" />
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* PASO 0: PANTALLA DE BIENVENIDA                                       */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {paso === 0 && (
          <div className="relative z-10 max-w-xl w-full text-center flex flex-col items-center animate-aparecer">
            <h1 className="text-2xl sm:text-[32px] font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
              ¡Emprendedor, Que bien que quieras darnos tu aporte!
            </h1>

            <p className="mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              Estamos obsesionados con brindarte la mejor experiencia con nuestra plataforma. Por eso nos gustaría que nos cuentes cómo te podemos servir.
            </p>

            <div className="mt-8 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="cursor-pointer bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                COMENZAR
              </button>
              <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                pulsa <span className="font-semibold text-gray-800 dark:text-gray-200">Enter ↵</span>
              </span>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* PASO 1: FORMULARIO TYPEFORM DE SUGERENCIA                           */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {paso === 1 && (
          <div className="relative z-10 max-w-2xl w-full flex flex-col text-left animate-aparecer">
            {/* Botón Volver sutil */}
            <button
              type="button"
              onClick={() => setPaso(0)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mb-6 transition-colors w-fit cursor-pointer"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 stroke-[2]" />
              <span>Atrás</span>
            </button>

            {/* Número y Pregunta Principal */}
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-brand-500 text-white text-xs font-bold shrink-0 mt-1 shadow-xs">
                1
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Ahora sí, cuéntanos, ¿Qué deberíamos corregir, añadir o mejorar en nuestra plataforma?
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Detállanos el error que hayas encontrado, la oportunidad de mejora o los comentarios que quieras hacernos. <span className="italic">Escribe cuanto quieras, tendremos todo en cuenta.</span>
                </p>
              </div>
            </div>

            {/* Categorías con iconos Heroicons (sin emojis) */}
            <div className="mt-6 flex flex-wrap gap-2 pl-9">
              {CATEGORIAS.map((cat) => {
                const Icon = cat.icon;
                const seleccionada = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      seleccionada
                        ? "bg-brand-500 text-white dark:bg-brand-500 dark:text-white font-semibold border-transparent shadow-xs"
                        : "bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Textarea tipo Typeform con línea inferior */}
            <div className="mt-6 pl-9 flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe aquí tu respuesta..."
                rows={3}
                className="w-full text-base sm:text-lg text-gray-900 dark:text-white placeholder:text-gray-400 bg-transparent border-b-2 border-gray-300 dark:border-white/20 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none py-2 resize-none transition-colors"
              />
              <span className="text-[11px] text-gray-600 dark:text-gray-300">
                Pulsa <span className="font-medium text-gray-800 dark:text-gray-200">Shift ⇧ + Enter ↵</span> para añadir un párrafo
              </span>

              {/* Botón Enviar + Atajo */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!mensaje.trim() || enviando}
                  className="cursor-pointer bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {enviando ? "Enviando..." : "Enviar"}
                </button>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">
                  pulsa <span className="font-semibold text-gray-800 dark:text-gray-200">Ctrl + Enter ↵</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* PASO 2: CONFIRMACIÓN Y AGRADECIMIENTO                                */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {paso === 2 && (
          <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center animate-aparecer">
            <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircleIcon className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              ¡Aporte recibido con éxito!
            </h2>

            <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              Muchas gracias por tomarte el tiempo. Tu sugerencia ya fue registrada y el equipo de producto la revisará para seguir mejorando Necto.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMensaje("");
                  setPaso(1);
                }}
                className="cursor-pointer px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                Dejar otra sugerencia
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Volver al Panel Principal
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SugerenciasPage;
