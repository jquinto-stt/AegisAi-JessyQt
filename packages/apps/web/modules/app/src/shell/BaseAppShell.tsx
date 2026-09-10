import { ReactNode } from "react";
import { observer } from 'mobx-react-lite';
import { uiStore } from "@/stores";
import { Backdrop } from "@/shell/sidebar/Backdrop";

interface BaseAppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * @kgId 3e19a736bcb7
 */
export const BaseAppShell: React.FC<BaseAppShellProps> = observer(({
  sidebar,
  header,
  footer,
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 xl:flex">
      {sidebar}
      <Backdrop />
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${
          uiStore.isSidebarVisible ? "xl:ml-[290px]" : "xl:ml-[94px]"
        }`}
      >
        {/* Header as a floating rounded panel */}
        <div className="px-4 pt-4 md:px-6 md:pt-6">
          {header}
        </div>

        {/* Main content as a floating rounded panel */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="min-h-full rounded-3xl bg-white p-6 shadow-theme-sm dark:bg-gray-900">
            {children}
          </div>
        </main>

        {/* Footer */}
        {footer && (
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default BaseAppShell;
