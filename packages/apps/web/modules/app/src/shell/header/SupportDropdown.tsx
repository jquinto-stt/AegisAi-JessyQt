import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ChevronRightIcon, 
  ArrowTopRightOnSquareIcon,
  NewspaperIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { openSupportWidget } from "../support-widget/FloatingSupportWidget";

export const SupportDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botón trigger circular con icono de interrogación/soporte */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center text-gray-600 transition-colors bg-white border border-gray-200/90 rounded-full hover:text-gray-900 h-11 w-11 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer shadow-xs focus:outline-none"
        title="Centro de Ayuda y Soporte"
        aria-label="Ayuda y Soporte"
        aria-expanded={isOpen}
      >
        <QuestionMarkCircleIcon className="size-5 stroke-[1.8]" />
      </button>

      {/* Popover desplegable estilo Necto */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[350px] rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-2xl z-50 p-5 flex flex-col gap-1 text-left animate-aparecer">
          {/* Icono central de cabecera */}
          <div className="flex justify-center pt-1 pb-1">
            <div className="w-11 h-11 flex items-center justify-center text-gray-900 dark:text-white">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                className="w-10 h-10"
              >
                {/* Bocadillo estilizado */}
                <path
                  d="M24 6c-8.8 0-16 6.7-16 15 0 3.8 1.5 7.3 4 10.1L10 39l8.5-2.5c1.7.6 3.6.9 5.5.9 8.8 0 16-6.7 16-15S32.8 6 24 6z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 17.5c.6-1.8 2.4-2.8 4.2-2.2 1.7.5 2.5 2.1 2 3.5-.8 1.8-3.2 2.5-3.2 4.7"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="28.5" r="1.2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Título y subtítulo */}
          <div className="text-center px-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              ¿Necesitas ayuda?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              Prueba ver un tutorial o buscar un artículo en la central de ayuda.
            </p>
          </div>

          {/* Banner de Tutoriales con Laptop */}
          <div
            onClick={() => handleNavigate("/tutoriales")}
            className="mt-3.5 p-3.5 rounded-2xl bg-[#F6F6F8] dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            {/* Columna izquierda: texto y logo */}
            <div className="flex flex-col justify-between self-stretch pr-2">
              <div>
                <div className="w-5 h-5 rounded-md bg-white dark:bg-gray-800 border border-black/10 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-1.5 shadow-2xs">
                  <PlayIcon className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">
                  Tutoriales
                </span>
                <div className="mt-0.5">
                  <img
                    src="/images/logo/necto-full.svg"
                    alt="necto"
                    className="h-4 w-auto dark:hidden"
                  />
                  <img
                    src="/images/logo/necto-full-white.svg"
                    alt="necto"
                    className="hidden h-4 w-auto dark:block"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-gray-800 dark:text-gray-200 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                <span>Ir a Tutoriales</span>
                <ChevronRightIcon className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>

            {/* Columna derecha: ilustración de laptop */}
            <div className="w-28 h-20 shrink-0 relative flex items-center justify-center">
              <svg
                viewBox="0 0 160 110"
                fill="none"
                className="w-full h-full drop-shadow-md"
              >
                {/* Pantalla y marco */}
                <rect
                  x="25"
                  y="8"
                  width="110"
                  height="72"
                  rx="6"
                  fill="#111827"
                  stroke="#374151"
                  strokeWidth="2"
                />
                {/* Pantalla blanca con interfaz mockeada */}
                <rect x="29" y="12" width="102" height="64" rx="3" fill="#FFFFFF" />
                {/* Filas y acentos de color */}
                <rect x="33" y="16" width="28" height="4" rx="1.5" fill="#FF3F1A" />
                <rect x="33" y="24" width="94" height="2" fill="#E2E8F0" />
                <rect x="33" y="29" width="45" height="3" rx="1" fill="#64748B" />
                <rect x="33" y="35" width="94" height="2" fill="#E2E8F0" />
                <rect x="33" y="40" width="65" height="3" rx="1" fill="#94A3B8" />
                <rect x="33" y="46" width="94" height="2" fill="#E2E8F0" />
                <rect x="33" y="51" width="55" height="3" rx="1" fill="#CBD5E1" />
                <rect x="33" y="57" width="94" height="2" fill="#E2E8F0" />
                <rect x="33" y="62" width="38" height="3" rx="1" fill="#CBD5E1" />
                <rect x="33" y="68" width="94" height="2" fill="#E2E8F0" />
                {/* Base y teclado */}
                <path
                  d="M12 82h136l-8 12H20l-8-12z"
                  fill="#E2E8F0"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                />
                <rect x="68" y="85" width="24" height="3" rx="1" fill="#94A3B8" />
              </svg>
            </div>
          </div>

          {/* Separador */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

          {/* Menú Sección 1 */}
          <div className="flex flex-col gap-0.5">
            {/* 1. Central de ayuda */}
            <button
              type="button"
              onClick={() => handleNavigate("/soporte")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                {/* Icono Auriculares / Soporte */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75V11a7.5 7.5 0 0115 0v1.75a2.25 2.25 0 01-2.25 2.25h-.5a2.25 2.25 0 01-2.25-2.25V11a5 5 0 00-10 0v1.75a2.25 2.25 0 01-2.25 2.25h-.5A2.25 2.25 0 014.5 12.75z"
                  />
                </svg>
                <span className="text-xs sm:text-[13px] font-medium text-gray-800 dark:text-gray-200">
                  Central de ayuda
                </span>
              </div>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200 stroke-[2]" />
            </button>

            {/* 2. Dejar sugerencias */}
            <button
              type="button"
              onClick={() => handleNavigate("/sugerencias")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                {/* Bocadillo con cara sonriente o mensaje */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v5.999z"
                  />
                </svg>
                <span className="text-xs sm:text-[13px] font-medium text-gray-800 dark:text-gray-200">
                  Dejar sugerencias
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 stroke-[2]" />
            </button>

            {/* 3. Novedades de la plataforma */}
            <button
              type="button"
              onClick={() => handleNavigate("/novedades")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <NewspaperIcon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white stroke-[1.8]" />
                <span className="text-xs sm:text-[13px] font-medium text-gray-800 dark:text-gray-200">
                  Novedades de la plataforma
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 stroke-[2]" />
            </button>
          </div>

          {/* Separador */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

          {/* Menú Sección 2: Contacto con iconos circulares oscuros */}
          <div className="flex flex-col gap-1">
            {/* 4. Contactar con Soporte */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.open(
                  "https://api.whatsapp.com/send?phone=573145793333&text=Hola!%20Necesito%20ayuda%20con%20Necto",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#242426] dark:bg-gray-800 border border-transparent dark:border-gray-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  {/* Icono de Teléfono / WhatsApp */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.79 14.07c-.24.67-1.4 1.28-1.93 1.33-.49.05-1.12.08-3.62-.95-3.08-1.28-5.06-4.41-5.21-4.61-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.52.28-.3.61-.38.81-.38.2 0 .41 0 .59.01.19.01.44-.07.69.52.25.6.86 2.1.94 2.26.08.16.13.35.03.55-.1.2-.16.32-.31.5-.15.18-.32.4-.46.54-.15.15-.31.31-.13.62.18.31.79 1.3 1.7 2.11 1.17 1.04 2.16 1.36 2.47 1.51.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.41-.26.69-.15.28.11 1.78.84 2.09.99.31.15.51.23.59.36.08.14.08.79-.16 1.46z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                  Contactar con Soporte
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 stroke-[2]" />
            </button>

            {/* 5. Chatear en Vivo */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSupportWidget("chat");
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#242426] dark:bg-gray-800 border border-transparent dark:border-gray-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                  Chatear en Vivo
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 stroke-[2]" />
            </button>
          </div>

          {/* Footer con el Logo oficial de Necto */}
          <div className="pt-3 pb-1 flex items-center justify-center">
            <img
              src="/images/logo/necto-full.svg"
              alt="Necto"
              className="h-5 w-auto dark:hidden opacity-90"
            />
            <img
              src="/images/logo/necto-full-white.svg"
              alt="Necto"
              className="hidden h-5 w-auto dark:block opacity-90"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDropdown;
