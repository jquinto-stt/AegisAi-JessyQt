import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { sessionStore, operadoresStore } from "@/stores";
import type { Operador } from "@/stores/operadores.store";
import { rolSimuladoNombre } from "@/stores/acceso.utils";
import {
  ChevronDownIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export const OperadorSelector: React.FC = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const opSimulado = sessionStore.operadorSimulado;
  const isSimulando = sessionStore.isSimulando;
  const operadores = operadoresStore
    .porModulo("pedidos")
    .filter((o: Operador) => o.estado === "activo");

  const handleSeleccionar = (operadorId: string) => {
    sessionStore.simular(operadorId);
    setIsOpen(false);
  };

  const handleSalir = () => {
    sessionStore.salirSimulacion();
    setIsOpen(false);
  };

  // Iniciales del operador actual o "AD" para admin
  const iniciales = opSimulado
    ? opSimulado.nombre
        .split(" ")
        .map((p: string) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const rolTexto = isSimulando ? (rolSimuladoNombre() ?? "Operador") : "Administrador";
  const nombreTexto = isSimulando ? opSimulado?.nombre : "Sesión Principal";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-left text-gray-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.04] cursor-pointer"
        title="Cambiar perfil rápido para probar permisos y vistas"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${
            isSimulando ? "bg-amber-500" : "bg-brand-500"
          }`}
        >
          {iniciales}
        </span>

        <div className="hidden flex-col leading-tight sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {isSimulando ? "Simulando Rol" : "Perfil Activo"}
            </span>
            {isSimulando && (
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                Test
              </span>
            )}
          </div>
          <span className="max-w-[140px] truncate text-xs font-semibold text-gray-900 dark:text-white">
            {rolTexto}
            <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
              · {nombreTexto}
            </span>
          </span>
        </div>

        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Alternar Perfil Oficial (Necto)
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Selecciona un operador para auditar vistas y permisos en vivo.
            </p>
          </div>

          <div className="mt-1 space-y-1">
            {operadores.map((op: Operador) => {
              const estaActivo = isSimulando && sessionStore.operadorSimuladoId === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleSeleccionar(op.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${
                    estaActivo
                      ? "bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-200"
                      : "hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        estaActivo
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {op.nombre
                        .split(" ")
                        .map((p: string) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                        {op.nombre}
                      </p>
                      <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {op.cargo}
                      </p>
                    </div>
                  </div>

                  {estaActivo && (
                    <CheckIcon className="h-4 w-4 shrink-0 text-brand-500" />
                  )}
                </button>
              );
            })}
          </div>

          {isSimulando && (
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              <button
                type="button"
                onClick={handleSalir}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Restaurar sesión Administrador
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default OperadorSelector;
