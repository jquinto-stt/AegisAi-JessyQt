import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Check } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { organizacionStore } from "@/stores/organizacion.store";
import { uiStore } from "@/stores";

export const InicioChecklistPage = observer(() => {
  const navigate = useNavigate();

  // Asegurar que la barra lateral esté contraída al abrir Inicio
  useEffect(() => {
    uiStore.setSidebarExpanded(false);
  }, []);

  // El estado de módulo instalado refleja si la organización ya instaló algún módulo
  const moduloInstalado = organizacionStore.modulosActivos.length > 0;

  const handleCompletarModulo = () => {
    navigate("/configuracion?tab=modulos");
  };

  const handleOmitir = () => {
    navigate("/dashboard");
  };

  return (
    <>
      <PageMeta
        title="Inicio · Necto"
        description="Completa estos pasos y comienza a operar en Necto."
      />

      <div className="flex-1 w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 select-none animate-in fade-in duration-200 font-sans">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Título principal centrado — 36px Bold con Azul profundo NECTO #190088 */}
          <div className="text-center space-y-4">
            <h1 className="text-[28px] sm:text-[36px] font-bold leading-tight tracking-tight text-[#190088] dark:text-white">
              ¡Completa estos pasos y comienza a operar!
            </h1>

            {/* Barra y estado de progreso (1/2 completado) */}
            <div className="max-w-md mx-auto pt-1 space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-[#212121]/70 dark:text-[#ECECEC]/70">
                <span>Configuración</span>
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">
                  Pasos completados {moduloInstalado ? "2/2" : "1/2"}
                </span>
              </div>

              {/* Segmentos de la barra de progreso con Naranja NECTO #FF3F1A y Gris claro #ECECEC */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {/* Paso 1: Crea tu perfil (Completado con #FF3F1A) */}
                <div className="h-2 rounded-full bg-[#FF3F1A] shadow-xs shadow-[#FF3F1A]/30 transition-all duration-300" />
                {/* Paso 2: Instala un módulo (#FF3F1A si está completado, #ECECEC si está pendiente) */}
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    moduloInstalado
                      ? "bg-[#FF3F1A] shadow-xs shadow-[#FF3F1A]/30"
                      : "bg-[#ECECEC] dark:bg-white/10"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Lista de las dos tareas solicitadas */}
          <div className="space-y-3 pt-3">
            {/* Tarea 1: Crea tu perfil (completada con Cyan #97D6DF y Azul profundo #190088) */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#212121]/60 shadow-xs transition-all">
              <div className="flex items-center gap-3.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#97D6DF] text-[#190088] shrink-0 shadow-xs">
                  <Check className="w-4 h-4 stroke-[2.8]" />
                </div>
                <span className="text-[16px] font-normal line-through text-[#212121]/40 dark:text-[#ECECEC]/40">
                  Crea tu perfil
                </span>
              </div>

              <span className="px-4 py-1.5 rounded-xl bg-[#97D6DF]/20 border border-[#97D6DF]/40 text-[#190088] dark:text-[#97D6DF] text-[12px] font-bold tracking-wide select-none">
                Completado
              </span>
            </div>

            {/* Tarea 2: Instala un módulo (pendiente con botón Naranja NECTO #FF3F1A) */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#212121]/60 shadow-xs hover:border-[#97D6DF]/60 dark:hover:border-white/20 transition-all">
              <div className="flex items-center gap-3.5">
                {moduloInstalado ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#97D6DF] text-[#190088] shrink-0 shadow-xs">
                    <Check className="w-4 h-4 stroke-[2.8]" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-[#ECECEC] dark:border-white/20 shrink-0" />
                )}
                <span
                  className={`text-[16px] ${
                    moduloInstalado
                      ? "font-normal line-through text-[#212121]/40 dark:text-[#ECECEC]/40"
                      : "font-bold text-[#212121] dark:text-white"
                  }`}
                >
                  Instala un módulo
                </span>
              </div>

              {moduloInstalado ? (
                <span className="px-4 py-1.5 rounded-xl bg-[#97D6DF]/20 border border-[#97D6DF]/40 text-[#190088] dark:text-[#97D6DF] text-[12px] font-bold tracking-wide select-none">
                  Completado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleCompletarModulo}
                  className="px-6 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] active:scale-[0.98] text-white text-[14px] font-bold tracking-wide cursor-pointer transition-all shadow-md shadow-[#FF3F1A]/25"
                >
                  Completar
                </button>
              )}
            </div>
          </div>

          {/* Enlace para Omitir — 14px Regular */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOmitir}
              className="text-[14px] font-normal text-[#212121]/60 hover:text-[#FF3F1A] dark:text-[#ECECEC]/60 dark:hover:text-[#97D6DF] underline underline-offset-4 cursor-pointer transition-colors"
            >
              Saltar
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default InicioChecklistPage;
