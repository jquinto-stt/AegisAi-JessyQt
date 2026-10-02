import { ReactNode } from "react";
import { observer } from 'mobx-react-lite';
import { uiStore } from "@/stores";
import { Backdrop } from "@/shell/sidebar/Backdrop";

interface BaseAppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  noCard?: boolean;
  pantallaFija?: boolean;
}

/**
 * @kgId 3e19a736bcb7
 *
 * ── Los tres `min-w-0`: por qué están aquí y no en cada pantalla ────────────
 *
 * Medido a 1440px: `/pedidos/historial` desbordaba **+227px** y
 * `/inventarios` +231px, con `main` midiendo 1362-1366px dentro de un viewport
 * de 1425. `/pedidos/inicio` no desbordaba.
 *
 * La causa no era ninguna de esas pantallas: es que la cadena flex
 * `necto-lienzo → div.flex-1 → main → .necto-panel` estaba **entera sin
 * `min-w-0`**. En flexbox un hijo tiene `min-width: auto` por defecto, es decir
 * «no me encojas por debajo de mi contenido»; con `flex-1` eso hace que el panel
 * crezca hasta el ancho natural de su contenido más ancho (una tabla de siete
 * columnas) y **empuje el documento entero**, sacando del viewport la cabecera
 * que va encima. Un contenido fluido no lo revela; uno ancho, sí — por eso
 * `inicio` se salvaba y `historial` no.
 *
 * Se corrige AQUÍ y no en cada pantalla por dos motivos: el defecto es del
 * layout compartido (Pedidos lo tiene igual, sin que nadie lo tocara), y una
 * pantalla que lo parcheara por su cuenta dejaría a las demás rompiéndose en
 * silencio. El `min-w-0` en los tres niveles es lo que permite que el contenido
 * ancho haga scroll DENTRO de su caja —que es lo que `overflow-x-auto` de las
 * tablas necesita— en vez de arrastrar la página.
 */
export const BaseAppShell: React.FC<BaseAppShellProps> = observer(({
  sidebar,
  header,
  footer,
  children,
  noCard = false,
  pantallaFija = false,
}) => {
  return (
    <div className={`necto-lienzo ${pantallaFija ? "h-screen overflow-hidden" : "min-h-screen"} xl:flex`}>
      {sidebar}
      <Backdrop />
      <div
        className={`flex min-w-0 ${pantallaFija ? "h-screen overflow-hidden" : "min-h-screen"} flex-1 flex-col transition-all duration-300 ease-in-out ${
          uiStore.isSidebarVisible ? "xl:ml-[290px]" : "xl:ml-[94px]"
        }`}
      >
        {/* Header as a floating rounded panel */}
        <div className={`shrink-0 ${pantallaFija ? "px-4 pt-3 md:px-6 md:pt-3.5" : "px-4 pt-4 md:px-6 md:pt-6"}`}>
          {header}
        </div>

        {/* Main content */}
        <main className={`min-w-0 flex-1 ${pantallaFija ? "px-4 pt-2.5 pb-3.5 md:px-6 md:pt-3 md:pb-4 min-h-0 flex flex-col overflow-hidden" : "px-4 py-4 md:px-6 md:py-6"}`}>
          {noCard ? (
            <div className={pantallaFija ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "min-h-full"}>
              {children}
            </div>
          ) : (
            <div className={`necto-panel animate-aparecer min-w-0 ${pantallaFija ? "p-3.5 sm:p-4.5 lg:p-5 flex-1 min-h-0 flex flex-col overflow-hidden" : "min-h-full p-6"}`}>
              {children}
            </div>
          )}
        </main>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-4 pb-4 md:px-6 md:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default BaseAppShell;
