import React from "react";
import { NectoLogo } from "@/compositions/shared/NectoLogo";
import { conversacionesStore } from "@/stores/conversaciones.store";

export const ConversacionVacia: React.FC = () => {
  const bandeja = conversacionesStore.bandeja;

  return (
    <div className="relative flex flex-1 min-h-0 w-full flex-col items-center justify-between overflow-hidden bg-[#FAF9F5] dark:bg-[#0E131F]/90 transition-colors">
      {/* ── Fondo decorativo con patrón sutil estilo WhatsApp ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045] dark:opacity-[0.035] select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C9279' fill-rule='evenodd'%3E%3Cpath d='M11 11h6v6h-6zm40 0h6v6h-6zm-20 20h6v6h-6zm-20 20h6v6h-6zm40 0h6v6h-6zm-20 20h6v6h-6zM32 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 34a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM32 54a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 74a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm40 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* ── Aviso superior de seguridad de Meta ── */}
      <div className="z-10 w-full px-4 pt-4 sm:pt-6 flex justify-center">
        <div className="flex items-center justify-center rounded-xl border border-amber-200/90 bg-[#FFF7D6] px-5 py-2 text-center text-xs sm:text-[13px] font-normal text-amber-950 shadow-xs dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Esta empresa usa un servicio seguro de Meta para administrar este chat
        </div>
      </div>

      {/* ── Mensaje central con Logo Necto ── */}
      <div className="z-10 my-auto flex flex-col items-center justify-center px-4 py-8 text-center animate-aparecer">
        <div className="mb-4 flex items-center justify-center">
          <NectoLogo size="lg" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white/90">
          ¡Aún no has seleccionado un chat de WhatsApp!
        </h2>
      </div>

      {/* ── Botón flotante inferior derecho (FAB) ── */}
      <button
        type="button"
        onClick={() => {
          if (bandeja.length > 0) {
            conversacionesStore.seleccionar(bandeja[0].id);
          }
        }}
        className="absolute bottom-6 right-6 z-10 flex h-13 w-13 items-center justify-center rounded-full bg-[#1F242C] text-white shadow-xl transition-all hover:scale-105 hover:bg-black active:scale-95 dark:bg-brand-500 dark:hover:bg-brand-600"
        title="Abrir chat"
        aria-label="Abrir chat"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>
    </div>
  );
};

export default ConversacionVacia;
