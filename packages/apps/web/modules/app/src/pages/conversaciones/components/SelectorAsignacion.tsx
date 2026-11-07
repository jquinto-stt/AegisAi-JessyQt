import { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { operadoresStore } from "@/stores/operadores.store";
import { sessionStore } from "@/stores/session.store";

interface SelectorAsignacionProps {
  convId: string;
}

export const SelectorAsignacion = observer(({ convId }: SelectorAsignacionProps) => {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const conv = conversacionesStore.getConversacion(convId);
  if (!conv) return null;

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [abierto]);

  const operadores = operadoresStore.operadores.filter((op) => op.estado === "activo");
  const operadorAsignado = conv.operadorAsignadoId
    ? operadoresStore.porId(conv.operadorAsignadoId)
    : null;

  const asignar = (operadorId: string | null) => {
    conversacionesStore.asignar(convId, operadorId);
    setAbierto(false);
  };

  const estaAsignado = Boolean(conv.operadorAsignadoId && conv.atencion === "humano");

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón principal estilo Lucid Bot */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
          estaAsignado
            ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
        }`}
        title="Asignar conversación a un usuario u operador"
      >
        <span className="text-sm">🙏</span>
        <span className="max-w-[140px] truncate">
          {estaAsignado ? (operadorAsignado?.nombre || "Asignado") : "Asignar Conversación"}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-gray-500 transition-transform ${abierto ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Menú desplegable */}
      {abierto && (
        <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-hidden z-50 dark:bg-gray-900 dark:ring-white/10 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Asignación de atención
            </p>
          </div>

          <div className="py-1">
            {/* Opción 1: Devolver al Bot Inteligente */}
            <button
              type="button"
              onClick={() => asignar(null)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-colors text-left cursor-pointer ${
                !estaAsignado
                  ? "bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/50 dark:text-purple-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-sm">
                  🤖
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Bot Inteligente</p>
                  <p className="text-[11px] text-gray-400">Atención automática activa</p>
                </div>
              </div>
              {!estaAsignado && (
                <span className="text-purple-600 dark:text-purple-400 text-sm">✓</span>
              )}
            </button>
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {/* Opción 2: Lista de Operadores Disponibles */}
          <div className="px-3 py-1">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
              Operadores del equipo ({operadores.length})
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
            {operadores.map((op) => {
              const seleccionado = conv.operadorAsignadoId === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => asignar(op.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-xl transition-colors text-left cursor-pointer ${
                    seleccionado
                      ? "bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/50 dark:text-purple-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {op.avatarUrl ? (
                      <img
                        src={op.avatarUrl}
                        alt={op.nombre}
                        className="h-7 w-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {op.nombre.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 truncate">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {op.nombre}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {op.cargo || op.modulo || "Asesor"}
                      </p>
                    </div>
                  </div>
                  {seleccionado && (
                    <span className="text-purple-600 dark:text-purple-400 text-sm shrink-0">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default SelectorAsignacion;

