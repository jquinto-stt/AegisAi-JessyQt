import { useLocation } from "react-router";
import {
  BaseAppSidebar,
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { DollarLineIcon, ListIcon, ShootingStarIcon, BoxIconLine } from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Necto wordmark for the expanded sidebar. */
const Logo = () => (
  <div className="flex items-end gap-1.5">
    <span className="text-2xl font-extrabold tracking-tight text-brand-500">NECTO</span>
    <span className="mb-0.5 text-[9px] font-semibold leading-none text-indigo-600">
      grow<br />together
    </span>
  </div>
);

/** Compact Necto mark for the collapsed sidebar. */
const LogoCollapsed = () => (
  <span className="text-2xl font-extrabold tracking-tight text-brand-500">N</span>
);

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const SidebarContent = () => {
  // useLocation makes the active state reactive to SPA navigation — window.location
  // is read once at render and wouldn't update when navigating via <Link>.
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="mb-6">
      <div className="flex flex-col gap-4">
        <div>
          <MenuSectionHeader title="Cobros" />
          <ul className="flex flex-col gap-1">
            <MenuItem
              icon={<DollarLineIcon />}
              name="Crear enlace"
              path="/app/enlaces"
              isActive={isActive}
            />
            <MenuItem
              icon={<ListIcon />}
              name="Enlaces activos"
              path="/app/enlaces/listado"
              isActive={isActive}
            />
          </ul>
        </div>
        <div>
          <MenuSectionHeader title="Suscripciones" />
          <ul className="flex flex-col gap-1">
            <MenuItem
              icon={<ShootingStarIcon />}
              name="Planes"
              path="/app/suscripciones"
              isActive={isActive}
            />
            <MenuItem
              icon={<BoxIconLine />}
              name="Mis suscripciones"
              path="/app/suscripciones/listado"
              isActive={isActive}
            />
          </ul>
        </div>
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AppSidebar — Necto app navigation (logo + "Cobros" and "Suscripciones"
 * sections: payment-link creator/list and subscription plans/list).
 * @kgId 8025fcb3eb97
 */
export const AppSidebar = () => (
  <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
    <SidebarContent />
  </BaseAppSidebar>
);

export default AppSidebar;
