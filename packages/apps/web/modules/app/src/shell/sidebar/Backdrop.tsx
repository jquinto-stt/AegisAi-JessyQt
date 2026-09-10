import { observer } from 'mobx-react-lite';
import { uiStore } from "@/stores";

/**
 * @kgId 63081355afb0
 */
export const Backdrop: React.FC = observer(() => {
  if (!uiStore.sidebarMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
      onClick={() => uiStore.closeMobileSidebar()}
    />
  );
});

export default Backdrop;
