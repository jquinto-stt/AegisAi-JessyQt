import { useState } from "react";
import { ShellDropdown } from "@/shell/header/ShellDropdown";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { inventarioStore, sessionStore, type AlertaInventario } from "@/stores";

/**
 * Notificaciones reales: hoy las genera Inventario (stock agotado o bajo,
 * órdenes atrasadas, tomas por revisar y el resumen del día). Antes esta lista
 * eran datos de ejemplo de la plantilla.
 *
 * «Visto» se guarda por id en el navegador: una alerta nueva (otro artículo
 * agotado, otra orden atrasada) vuelve a encender el punto.
 */
const CLAVE_VISTAS = "necto.notificaciones.vistas";

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function guardarVistas(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento: el punto se vuelve a encender al recargar.
  }
}

const TONO: Record<AlertaInventario["tono"], string> = {
  alerta: "bg-brand-500",
  aviso: "bg-warning-500",
  info: "bg-accent-300",
};

const NotificationDropdown = observer(function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [vistas, setVistas] = useState<Set<string>>(leerVistas);

  const alertas = sessionStore.modulos.includes("inventarios") ? inventarioStore.alertas() : [];
  const notifying = alertas.some((a) => !vistas.has(a.id));

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    setIsOpen((v) => !v);
    const ids = alertas.map((a) => a.id);
    guardarVistas(ids);
    setVistas(new Set(ids));
  };

  const ir = (ruta: string) => {
    closeDropdown();
    navigate(ruta);
  };

  return (
    <div className="relative">
      {/* Botón trigger circular con campana outline y punto naranja */}
      <button
        className="relative flex items-center justify-center text-gray-600 transition-colors bg-white border border-gray-200/90 rounded-full dropdown-toggle hover:text-gray-900 h-11 w-11 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={handleClick}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <span
          className={`absolute right-1 top-1 z-10 size-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-gray-900 ${
            !notifying ? "hidden" : "block"
          }`}
        />
        <svg
          className="size-5 stroke-current fill-none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>

      {/* Menú desplegable de Notificaciones */}
      <ShellDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-16 sm:right-0 mt-3 flex w-[350px] sm:w-[390px] flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-50 animate-entrada-menu font-sans"
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-[16px] font-bold text-ink-title dark:text-white">
            Notificaciones
          </h3>
          <button
            type="button"
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar notificaciones"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Lista de notificaciones */}
        {alertas.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-gray-600 dark:text-gray-400">
            Todo en orden: no hay nada que requiera tu atención.
          </p>
        ) : (
          <ul className="flex max-h-[380px] flex-col divide-y divide-gray-100 overflow-y-auto pr-1 custom-scrollbar dark:divide-gray-800/80">
            {alertas.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => ir(item.ruta)}
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-white/5"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONO[item.tono]}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-ink-body dark:text-white">{item.titulo}</span>
                    <span className="mt-0.5 block text-[12px] text-gray-600 dark:text-gray-400">{item.detalle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => ir("/inventarios/config?seccion=reorden")}
            className="w-full rounded-xl py-2.5 text-center text-[14px] font-bold text-ink-title transition-colors hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
          >
            Configurar avisos
          </button>
        </div>
      </ShellDropdown>
    </div>
  );
});

export default NotificationDropdown;
