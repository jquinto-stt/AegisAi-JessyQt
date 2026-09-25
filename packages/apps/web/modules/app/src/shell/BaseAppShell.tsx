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
        className={`flex ${pantallaFija ? "h-screen overflow-hidden" : "min-h-screen"} flex-1 flex-col transition-all duration-300 ease-in-out ${
          uiStore.isSidebarVisible ? "xl:ml-[290px]" : "xl:ml-[94px]"
        }`}
      >
        {/* Header as a floating rounded panel */}
        <div className={`shrink-0 ${pantallaFija ? "px-4 pt-3 md:px-6 md:pt-3.5" : "px-4 pt-4 md:px-6 md:pt-6"}`}>
          {header}
        </div>

        {/* Main content */}
        <main className={`flex-1 ${pantallaFija ? "px-4 pt-2.5 pb-3.5 md:px-6 md:pt-3 md:pb-4 min-h-0 flex flex-col overflow-hidden" : "px-4 py-4 md:px-6 md:py-6"}`}>
          {noCard ? (
            <div className={pantallaFija ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "min-h-full"}>
              {children}
            </div>
          ) : (
            <div className={`necto-panel animate-aparecer ${pantallaFija ? "p-3.5 sm:p-4.5 lg:p-5 flex-1 min-h-0 flex flex-col overflow-hidden" : "min-h-full p-6"}`}>
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
