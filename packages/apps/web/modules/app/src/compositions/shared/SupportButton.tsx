import { useNavigate } from "react-router";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/utils";

/**
 * Soporte — el acceso a `/soporte` desde la cabecera de la aplicación.
 *
 * ⚠️ Navega, y por eso es un `<button>` con `useNavigate` y no un `<Link>`: se
 * pinta como la píldora de la barra de acciones —borde, altura y tipografía
 * compartidas con el resto de controles de la cabecera— y un `<a>` obligaría a
 * neutralizar los estilos del enlace para dejarla igual.
 *
 * ⚠️ Este componente es el **único** punto que cambia si el destino de soporte
 * cambia (un canal externo, un widget, un número de WhatsApp).
 *
 * Nota (20/09): hoy **no lo importa nadie**. La línea anterior decía que lo usaban
 * `StockFlowHeader` y `WorkspacesPage`, y ninguna de las dos es cierta ya. Se
 * conserva porque es superficie compartida de `compositions/shared/` y porque dos
 * docblocks vivos lo citan como el patrón de aislamiento (ver
 * `pages/support/support-requests.ts`). Si se decide que sobra, hay que actualizar
 * esas dos citas en el mismo cambio.
 */
export function SupportButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="Soporte"
      title="Soporte"
      onClick={() => navigate("/soporte")}
      className={cn(
        "group flex h-10 flex-none cursor-pointer items-center gap-2.5 rounded-full border border-gray-200 bg-white px-3.5 text-gray-600 shadow-xs transition-all duration-200 hover:border-public-500/50 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] sm:h-11 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-public-500/50 dark:hover:bg-gray-800/70",
        className
      )}
    >
      <LifeBuoy className="h-4 w-4 flex-none stroke-[2.2] text-gray-400 transition-colors group-hover:text-public-500" />
      <span className="hidden text-theme-sm font-medium text-gray-500 transition-colors group-hover:text-gray-800 lg:inline dark:text-gray-400 dark:group-hover:text-gray-200">
        Soporte
      </span>
    </button>
  );
}
