import { observer } from 'mobx-react-lite';
import { uiStore } from "@/stores";

/**
 * @kgId eeb27c126370
 *
 * Botón de alternar (expandir / contraer) la barra lateral.
 * - Cuando la barra está contraída en escritorio: se sitúa arriba en la misma
 *   línea vertical de la barra (columna fija `left-4 w-[54px]`), actuando como
 *   un botón cápsula flotante.
 * - Cuando está expandida (o en móvil): vive dentro de la cabecera en el inicio
 *   de las opciones izquierdas.
 */
export const ToggleAppSidebar: React.FC = observer(() => {
  const isExpanded = uiStore.isSidebarVisible;
  const isMobile = uiStore.isMobile;

  // En móvil o cuando la barra está expandida: botón integrado en la cabecera
  if (isMobile || isExpanded) {
    return (
      <button
        className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200/80 rounded-xl dark:border-gray-800 dark:text-gray-400 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#190088] dark:hover:text-[#97D6DF] active:scale-95 cursor-pointer shadow-theme-xs"
        onClick={() => uiStore.toggleSidebar()}
        aria-label="Contraer barra lateral"
        title="Contraer barra lateral"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 9-3 3 3 3" />
        </svg>
      </button>
    );
  }

  // Cuando la barra está contraída: botón flotante arriba en la misma línea vertical de la barra
  return (
    <div className="fixed top-4 md:top-6 left-4 w-[54px] h-[58px] md:h-[68px] flex items-center justify-center z-[100] animate-aparecer">
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-white/10 shadow-theme-xs text-gray-600 dark:text-gray-300 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:border-[#190088]/30 dark:hover:border-[#97D6DF]/30 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        onClick={() => uiStore.toggleSidebar()}
        aria-label="Expandir barra lateral"
        title="Expandir barra lateral"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="m13 15 3-3-3-3" />
        </svg>
      </button>
    </div>
  );
});

export default ToggleAppSidebar;
