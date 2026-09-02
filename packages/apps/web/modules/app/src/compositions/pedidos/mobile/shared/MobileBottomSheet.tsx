import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * MobileBottomSheet — panel deslizante inferior para móvil.
 *
 * Sustituye a los paneles laterales / drawers de escritorio por una hoja que
 * emerge desde abajo (patrón nativo iOS/Android). Incluye backdrop, handle de
 * arrastre visual, cabecera opcional y scroll interno con `max-height`.
 *
 * Mantiene la identidad Necto: superficies blancas / #2C2D31 en dark,
 * esquinas muy redondeadas (rounded-t-3xl) y acentos naranja para las acciones.
 */
export const MobileBottomSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Ocupa toda la altura (para detalles ricos tipo ficha de pedido). */
  fullHeight?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, icon, fullHeight = false, footer, children }) => {
  // Bloquea el scroll del body mientras la hoja está abierta.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Cierre con tecla Escape (útil en emuladores / tablets con teclado).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative w-full bg-white dark:bg-[#2C2D31] rounded-t-3xl shadow-2xl border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col animate-slide-up ${
          fullHeight ? "h-[92vh]" : "max-h-[85vh]"
        }`}
      >
        {/* Drag handle */}
        <div className="pt-2.5 pb-1 flex-none flex items-center justify-center">
          <span className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        {(title || icon) && (
          <div className="px-4 pb-3 pt-1 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 flex-none">
            {icon && (
              <div className="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[#FF3F1A] flex-none">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-400 font-medium truncate">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-none active:scale-95"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

        {/* Sticky footer (acciones principales, alcanzables con el pulgar) */}
        {footer && (
          <div className="flex-none px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-[#2C2D31]/95 backdrop-blur-sm pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
