import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { BaseAppSidebar, MenuItem, useShellConfig } from "@/shell";
import { useSidebarContext } from "@/shell/sidebar/SidebarContext";
import { useAuth } from "@/auth/AuthContext";
import { PlugInIcon, InfoIcon, ArrowRightIcon, UserCircleIcon } from "@/icons";
import { PanelLeftClose, SlidersHorizontal, ChevronRight, MessageSquare, Bot } from "lucide-react";
import { NectoSidebarWordmark } from "@/compositions/shared/NectoLogo";
import { uiStore } from "@/stores";


// ═══════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "necto_sidebar_open_sections";

type SectionKey = "conversacional" | "sede";

interface SectionState {
  conversacional: boolean;
  sede: boolean;
}

const DEFAULT_SECTIONS: SectionState = {
  conversacional: true,
  sede: true,
};

function loadSectionState(): SectionState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SECTIONS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SECTIONS };
}

function saveSectionState(state: SectionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface CollapsibleSectionHeaderProps {
  title: string;
  sectionKey: SectionKey;
  isOpen: boolean;
  onToggle: (key: SectionKey) => void;
}

const CollapsibleSectionHeader: React.FC<CollapsibleSectionHeaderProps> = observer(
  ({ title, sectionKey, isOpen, onToggle }) => {
    const { isExpanded: showExpanded } = useSidebarContext();
    const { icons: shellIcons } = useShellConfig();

    if (!showExpanded) {
      return (
        <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400 xl:justify-center">
          {shellIcons.sectionCollapsed}
        </h2>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="mb-2 w-full flex items-center justify-between text-xs uppercase leading-[20px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer group px-1 rounded"
        title={isOpen ? `Colapsar ${title}` : `Expandir ${title}`}
      >
        <span className="select-none">{title}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-90" : "rotate-0"
          } opacity-0 group-hover:opacity-100 transition-opacity`}
        />
      </button>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = () => (
  <div className="flex items-center justify-between w-full">
    <button
      type="button"
      onClick={() => uiStore.toggleSidebar()}
      className="flex items-center cursor-pointer group focus:outline-none"
      title="Colapsar barra lateral"
    >
      <NectoSidebarWordmark className="transition-opacity group-hover:opacity-75" />
    </button>
    <button
      type="button"
      onClick={() => uiStore.toggleSidebar()}
      className="hidden xl:flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      title="Colapsar barra lateral"
    >
      <PanelLeftClose className="w-4 h-4" />
    </button>
  </div>
);

const LogoCollapsed = () => (
  <button
    type="button"
    onClick={() => uiStore.toggleSidebar()}
    className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-brand-500 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors group focus:outline-none"
    title="Expandir barra lateral"
  >
    <img
      src="/images/logo/necto-icon.svg"
      alt="NECTO"
      className="h-6 w-6 group-hover:scale-105 transition-transform"
    />
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER — pinned actions (Rol, Sucursales, Ayuda, Cerrar sesión)
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarFooterProps {
  activeRoleName: string;
  onOpenRoleModal: () => void;
  onOpenSettingsModal?: (tab?: string) => void;
}

const SidebarFooter = observer(({ activeRoleName, onOpenRoleModal, onOpenSettingsModal }: SidebarFooterProps) => {
  const { isExpanded: showExpanded } = useSidebarContext();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  const rowClasses = `menu-item group menu-item-inactive ${
    !showExpanded ? "xl:justify-center" : "xl:justify-start"
  }`;

  return (
    <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4 pb-6">
      <ul className="flex flex-col gap-1">
        <li>
          <button
            type="button"
            onClick={onOpenRoleModal}
            className={rowClasses}
            title={`Rol activo: ${activeRoleName}. Clic para cambiar.`}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive text-brand-500">
              <UserCircleIcon />
            </span>
            {showExpanded && (
              <span className="menu-item-text truncate">
                Rol: <span className="font-semibold text-brand-500">{activeRoleName}</span>
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => (onOpenSettingsModal ? onOpenSettingsModal() : navigate("/workspaces"))}
            className={rowClasses}
            title="Configuración de Sede"
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            {showExpanded && <span className="menu-item-text">Configuración</span>}
          </button>
        </li>
        <li>
          <a
            href="https://necto.app/help"
            target="_blank"
            rel="noopener noreferrer"
            className={rowClasses}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <InfoIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Ayuda</span>}
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className={`menu-item group text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 cursor-pointer ${
              !showExpanded ? "xl:justify-center" : "xl:justify-start"
            }`}
          >
            <span className="menu-item-icon-size text-error-500">
              <ArrowRightIcon />
            </span>
            {showExpanded && <span className="menu-item-text">Cerrar sesión</span>}
          </button>
        </li>
      </ul>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT
// ═══════════════════════════════════════════════════════════════════════════

export interface StockFlowSidebarProps {
  activeModule: "pedidos" | "inventarios" | "modules-hub";
  onNavigateModule: (module: "pedidos" | "inventarios" | "modules-hub") => void;
  onOpenRoleModal: () => void;
  onOpenSettingsModal?: (tab?: string) => void;
  activeRoleName?: string;
}

export const StockFlowSidebar = observer(({
  activeModule,
  onNavigateModule,
  onOpenRoleModal,
  onOpenSettingsModal,
  activeRoleName = "Dueño",
}: StockFlowSidebarProps) => {

  // ── Collapsible sections state ──
  const [openSections, setOpenSections] = useState<SectionState>(loadSectionState);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveSectionState(next);
      return next;
    });
  }, []);

  return (
    <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
      <nav className="flex flex-col flex-1">
        <div className="flex flex-col gap-6">
          {/* SECCIÓN CANAL CONVERSACIONAL — capacidad de la SEDE, no de un módulo */}
          <div>
            <CollapsibleSectionHeader
              title="Canal Conversacional"
              sectionKey="conversacional"
              isOpen={openSections.conversacional}
              onToggle={toggleSection}
            />
            {openSections.conversacional && (
              <ul className="flex flex-col gap-1">
                <MenuItem
                  icon={<MessageSquare className="w-4 h-4" />}
                  name="Canales de Entrada"
                  onClick={() => onOpenSettingsModal?.("channels")}
                />
                <MenuItem
                  icon={<Bot className="w-4 h-4" />}
                  name="Asistente WhatsApp IA"
                  onClick={() => onOpenSettingsModal?.("whatsapp_bot")}
                />
              </ul>
            )}
          </div>

          {/* SECCIÓN SEDE & TIENDA */}
          <div>
            <CollapsibleSectionHeader
              title="Sede & Tienda"
              sectionKey="sede"
              isOpen={openSections.sede}
              onToggle={toggleSection}
            />
            {openSections.sede && (
              <ul className="flex flex-col gap-1">
                <MenuItem
                  icon={<PlugInIcon />}
                  name="Módulos de Tienda"
                  active={activeModule === "modules-hub"}
                  onClick={() => onNavigateModule("modules-hub")}
                />
              </ul>
            )}
          </div>
        </div>

        <SidebarFooter
          activeRoleName={activeRoleName}
          onOpenRoleModal={onOpenRoleModal}
          onOpenSettingsModal={onOpenSettingsModal}
        />
      </nav>
    </BaseAppSidebar>
  );
});

export default StockFlowSidebar;
