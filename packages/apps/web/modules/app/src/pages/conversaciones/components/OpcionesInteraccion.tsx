import { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { conversacionesStore } from "@/stores/conversaciones.store";

interface OpcionesInteraccionProps {
  convId: string;
}

export const OpcionesInteraccion = observer(({ convId }: OpcionesInteraccionProps) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const conv = conversacionesStore.getConversacion(convId);
  if (!conv) return null;

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    if (menuAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuAbierto]);

  const esDestacada = Boolean(conv.destacada);

  const handleLlamar = () => {
    const telLimpio = conv.contacto.telefono.replace(/[^\d+]/g, "");
    window.open(`tel:${telLimpio}`, "_self");
  };

  const handleCopiarTelefono = async () => {
    try {
      await navigator.clipboard.writeText(conv.contacto.telefono);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      setMenuAbierto(false);
    } catch {}
  };

  const handleAlternarDestacada = () => {
    conversacionesStore.toggleDestacada(convId);
  };

  const handleMarcarNoLeido = () => {
    conv.noLeidos = (conv.noLeidos || 0) + 1;
    conversacionesStore.persistir();
    setMenuAbierto(false);
  };

  const handleReiniciarBot = () => {
    conversacionesStore.asignar(convId, null);
    setMenuAbierto(false);
  };

  const handleCerrarConversacion = () => {
    conversacionesStore.cerrar(convId);
    setMenuAbierto(false);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5" ref={menuRef}>
      {/* 1. Botón Llamada 📞 */}
      <button
        type="button"
        onClick={handleLlamar}
        title={`Llamar a ${conv.contacto.telefono}`}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>

      {/* 2. Botón Destacar ⭐ */}
      <button
        type="button"
        onClick={handleAlternarDestacada}
        title={esDestacada ? "Quitar de destacados" : "Marcar conversación como destacada"}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
          esDestacada
            ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
            : "text-gray-500 hover:text-amber-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={esDestacada ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {/* 3. Menú de 3 puntos ⋮ */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          title="Más opciones de interacción"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            menuAbierto
              ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {menuAbierto && (
          <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 dark:bg-gray-900 dark:ring-white/10 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={handleCopiarTelefono}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiado ? "¡Teléfono copiado!" : "Copiar número de WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={handleMarcarNoLeido}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Marcar como no leído</span>
            </button>

            <button
              type="button"
              onClick={handleReiniciarBot}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-xl transition-colors dark:text-purple-300 dark:hover:bg-purple-950/40 cursor-pointer"
            >
              <svg className="size-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
              <span>Reactivar Bot en este chat</span>
            </button>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

            <button
              type="button"
              onClick={handleCerrarConversacion}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>Cerrar conversación</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default OpcionesInteraccion;

