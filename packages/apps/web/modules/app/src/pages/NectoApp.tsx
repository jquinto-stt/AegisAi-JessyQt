import { useState, useEffect } from "react";
import {
  Home, Eye, Users, Boxes, Settings, HelpCircle, LogOut,
  ChevronDown, ChevronRight, X, Mail, Megaphone, Package, Gift,
  FileText, BarChart2, UserCircle, Sun, Moon, Bell, BellRing,
  FolderTree, Camera, ShieldCheck, LineChart, BookOpen, MapPin,
  FileDown, Search, ShieldAlert, Sparkles, Check, ShoppingBag,
  ChefHat, Calendar, Layers, Zap, History, TrendingUp, Menu
} from "lucide-react";
import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";
import { PedidosModule } from "@/compositions/pedidos/PedidosModule";
import { PedidosSection, OperacionTab, GestionTab } from "@/compositions/pedidos/types";
import { BusinessSwitcher } from "@/compositions/workspace/BusinessSwitcher";

export type InventariosRole = "operador" | "analista";
export type OperadorSubView = string;
export type AnalistaSubView = string;

/* ── Brand Colors ────────────────────────────────────────────────────────── */

const NAVY = "#190088";
const ORANGE = "#FF3F1A";

/* ── Notifications ───────────────────────────────────────────────────────── */

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: "order" | "stock" | "alert" | "system";
  module: "pedidos" | "inventarios";
  pedidosSection?: PedidosSection;
  pedidosOpTab?: OperacionTab;
  pedidosGeTab?: GestionTab;
  targetOrderId?: string;
  targetModal?: "ticket" | "ai" | "incidencias" | "product";
  targetProductId?: string;
  inventariosRole?: InventariosRole;
  inventariosSubView?: any;
}

function NotificationBellDropdown({
  notifications,
  setNotifications,
  onNavigate,
}: {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onNavigate: (n: NotificationItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleClick = (n: NotificationItem) => {
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
    setOpen(false);
    onNavigate(n);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-gray-500 transition-colors hover:bg-slate-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
        title="Notificaciones de Necto IA"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF3F1A]"></span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white dark:bg-[#2C2D31] border-2 border-slate-200 dark:border-[#374151] rounded-2xl shadow-2xl z-50 overflow-hidden space-y-2 animate-scale-up">
            <div className="p-4 border-b border-gray-100 dark:border-[#374151] flex items-center justify-between bg-slate-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">Notificaciones</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-extrabold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer">
                    Marcar leídas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-400 flex items-center justify-center cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-80 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`p-3.5 flex gap-3 hover:bg-slate-100 dark:hover:bg-gray-800/80 transition-colors cursor-pointer ${n.unread ? "bg-orange-50/30 dark:bg-orange-950/20" : ""}`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center flex-none text-orange-500 border border-slate-200 dark:border-[#374151]">
                    {n.type === "order" ? <ShoppingBag className="w-4 h-4 text-[#FF3F1A]" /> : n.type === "stock" ? <Package className="w-4 h-4 text-[#FF3F1A]" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                      {n.unread && <span className="w-2 h-2 rounded-full bg-[#FF3F1A] flex-none" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{n.desc}</p>
                    <p className="text-[10px] font-mono text-gray-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-[#374151] text-center bg-slate-50/50 dark:bg-gray-800/30">
              <button onClick={() => setOpen(false)} className="text-xs font-extrabold text-[#190088] dark:text-blue-400 hover:underline cursor-pointer">
                Ver todas las notificaciones
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── TailAdmin Breadcrumb Component ─────────────────────────────────────── */

export function TailAdminBreadcrumb({
  moduleName = "Pedidos",
  roleName = "Operación",
  pageName = "Pedidos Activos",
  onNavigateHome
}: {
  moduleName?: string;
  roleName?: string;
  pageName?: string;
  onNavigateHome?: () => void;
}) {
  return (
    <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
      <button
        onClick={onNavigateHome}
        className="hover:text-gray-900 dark:hover:text-white transition-colors items-center gap-1 cursor-pointer hidden sm:flex"
      >
        <span>Home</span>
      </button>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-none hidden sm:inline" />
      <span className="text-gray-600 dark:text-gray-300 font-bold hidden md:inline">{moduleName}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-none hidden md:inline" />
      <span className="text-gray-500 dark:text-gray-400 font-medium hidden sm:inline">{roleName}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-none hidden sm:inline" />
      <span className="text-[#FF3F1A] dark:text-orange-400 font-extrabold truncate max-w-[130px] sm:max-w-none">{pageName}</span>
    </nav>
  );
}

/* ── Logo ───────────────────────────────────────────────────────────────── */

function NectoLogo({ size = "md", className = "", style, inline = false }: { size?: "xs" | "sm" | "md" | "lg"; className?: string; style?: React.CSSProperties; inline?: boolean }) {
  if (inline) {
    const mainWidths = { xs: "w-20", sm: "w-24", md: "w-32", lg: "w-40" };
    const subWidths = { xs: "w-12", sm: "w-14", md: "w-18", lg: "w-22" };

    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`} style={style}>
        <div className={`relative ${mainWidths[size]} flex-none`}>
          <svg className="block w-full h-auto" fill="none" viewBox="0 0 235 50.3601" preserveAspectRatio="xMidYMid meet">
            <g id="Group4">
              <path d={svgPaths.p31604a80} fill="#FF3F1A" />
              <path d={svgPaths.p1b22ab80} className="necto-logo-e fill-[#190088]" fill="#190088" />
              <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
              <path d={svgPaths.p204e9500} fill="#FF3F1A" />
              <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
              <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
            </g>
          </svg>
        </div>
        <div className={`relative ${subWidths[size]} flex-none`}>
          <svg className="block w-full h-auto" fill="none" viewBox="0 0 105.906 39.3108" preserveAspectRatio="xMidYMid meet">
            <g id="Group3">
              <path d={svgPaths.p3c6b27c0} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p14f5d000} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p19d15a00} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p13839f00} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p2f3333f0} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p2ad78300} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p4b91f00} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p250f9580} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p80b6880} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p1224d800} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p1ea5d900} className="fill-[#190088] dark:fill-white" />
              <path d={svgPaths.p31032480} className="fill-[#190088] dark:fill-white" />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  const dims = {
    xs: "w-24 h-10",
    sm: "w-32 h-14",
    md: "w-44 h-18",
    lg: "w-56 h-24",
  }[size];

  return (
    <div className={`relative ${dims} select-none ${className}`} style={style}>
      <svg className="block w-full h-full" fill="none" viewBox="0 0 235 97" preserveAspectRatio="xMidYMid meet">
        <g id="Group3">
          <path d={svgPaths.p3c6b27c0} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p14f5d000} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p19d15a00} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p13839f00} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p2f3333f0} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p2ad78300} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p4b91f00} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p250f9580} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p80b6880} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p1224d800} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p1ea5d900} className="fill-[#190088] dark:fill-white" />
          <path d={svgPaths.p31032480} className="fill-[#190088] dark:fill-white" />
        </g>
        <g id="Group4">
          <path d={svgPaths.p31604a80} fill="#FF3F1A" />
          <path d={svgPaths.p1b22ab80} className="necto-logo-e fill-[#190088]" fill="#190088" />
          <path d={svgPaths.p1aedf600} fill="#FF3F1A" />
          <path d={svgPaths.p204e9500} fill="#FF3F1A" />
          <path d={svgPaths.p14a87f30} fill="#FF3F1A" />
          <path d={svgPaths.pd6f1500} fill="#FF3F1A" />
        </g>
      </svg>
    </div>
  );
}

/* ── Unified Sidebar Component ──────────────────────────────────────────── */

function Sidebar({
  activeModule = "pedidos",
  pedidosSection,
  pedidosOpTab,
  pedidosGeTab,
  onNavigatePedidos,
  isMobileOpen = false,
  onCloseMobile
}: {
  activeModule?: "pedidos";
  pedidosSection: PedidosSection;
  pedidosOpTab: OperacionTab;
  pedidosGeTab: GestionTab;
  onNavigatePedidos: (section: PedidosSection, tab: any) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("necto_sidebar_collapsed");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true; // Por defecto colapsada (no desplegada)
  });

  const handleSetCollapsed = (val: boolean) => {
    setIsCollapsed(val);
    try {
      localStorage.setItem("necto_sidebar_collapsed", JSON.stringify(val));
    } catch (e) {}
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    subscriptor: false,
    pedidos: true,
    pedOperacion: true,
    pedGestion: true,
  });

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  function NavItem({
    icon,
    label,
    onClick,
    active = false,
    indent = false,
    isMobile = false
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    indent?: boolean;
    isMobile?: boolean;
  }) {
    const handleItemClick = () => {
      onClick();
      if (isMobile && onCloseMobile) onCloseMobile();
    };

    if (isCollapsed && !isMobile) {
      return (
        <button
          onClick={handleItemClick}
          title={label}
          className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-medium transition-all cursor-pointer ${
            active
              ? "bg-[#FF3F1A] text-white shadow-md"
              : "text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          {icon}
        </button>
      );
    }

    return (
      <button
        onClick={handleItemClick}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer ${
          active
            ? "bg-[#FF3F1A] text-white shadow-sm font-bold"
            : "text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
        } ${indent ? "pl-7" : ""}`}
      >
        <span className={`flex-none ${active ? "text-white" : "text-gray-400 dark:text-gray-400"}`}>{icon}</span>
        <span className="flex-1 truncate">{label}</span>
      </button>
    );
  }

  function SectionHeader({
    icon,
    label,
    section,
    active,
    onHeaderClick,
    isMobile = false
  }: {
    icon: React.ReactNode;
    label: string;
    section: string;
    active?: boolean;
    onHeaderClick?: () => void;
    isMobile?: boolean;
  }) {
    if (isCollapsed && !isMobile) {
      return (
        <button
          onClick={() => { if (onHeaderClick) onHeaderClick(); else toggle(section); }}
          title={label}
          className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-semibold transition-all cursor-pointer ${
            active
              ? "bg-[#FF3F1A] text-white shadow-sm"
              : "text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800"
          }`}
        >
          {icon}
        </button>
      );
    }

    return (
      <button
        onClick={() => { toggle(section); if (onHeaderClick) onHeaderClick(); }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
          active
            ? "bg-[#FF3F1A] text-white shadow-sm font-bold"
            : "text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <span className={`flex-none ${active ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>{icon}</span>
        <span className="flex-1 text-left truncate">{label}</span>
        {expanded[section] ? <ChevronDown className="w-3.5 h-3.5 flex-none" /> : <ChevronRight className="w-3.5 h-3.5 flex-none" />}
      </button>
    );
  }

  const renderNavLinks = (isMobile = false) => (
    <>
      <NavItem icon={<Home className="w-4 h-4" />} label="Inicio" onClick={() => onNavigatePedidos("operacion", "en-vivo")} isMobile={isMobile} />
      <NavItem icon={<Eye className="w-4 h-4" />} label="Visitante" onClick={() => {}} isMobile={isMobile} />

      <SectionHeader icon={<Users className="w-4 h-4" />} label="Subscriptor" section="subscriptor" isMobile={isMobile} />
      {(!isCollapsed || isMobile) && expanded.subscriptor && (
        <div className="flex flex-col gap-0.5">
          <NavItem icon={<Mail className="w-3.5 h-3.5" />} label="Invitaciones" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<Megaphone className="w-3.5 h-3.5" />} label="Campañas" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<Package className="w-3.5 h-3.5" />} label="Productos" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<Gift className="w-3.5 h-3.5" />} label="Recompensas" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<FileText className="w-3.5 h-3.5" />} label="Formularios" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<BarChart2 className="w-3.5 h-3.5" />} label="Métricas" onClick={() => {}} indent isMobile={isMobile} />
          <NavItem icon={<UserCircle className="w-3.5 h-3.5" />} label="Administradores" onClick={() => {}} indent isMobile={isMobile} />
        </div>
      )}

      {/* SECTION: Pedidos & Restaurante */}
      <SectionHeader
        icon={<ShoppingBag className="w-4 h-4" />}
        label="Pedidos"
        section="pedidos"
        active={activeModule === "pedidos"}
        onHeaderClick={() => onNavigatePedidos(pedidosSection, pedidosSection === "operacion" ? pedidosOpTab : pedidosGeTab)}
        isMobile={isMobile}
      />
      {(!isCollapsed || isMobile) && expanded.pedidos && (
        <div className="flex flex-col gap-0.5">
          {/* Subcategoría 1: Operación en Vivo */}
          <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#FF3F1A]" /> Operación en Vivo
          </div>
          <NavItem
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            label="Pedidos Activos"
            active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "en-vivo"}
            onClick={() => onNavigatePedidos("operacion", "en-vivo")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<ChefHat className="w-3.5 h-3.5" />}
            label="KDS Cocina"
            active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "preparacion"}
            onClick={() => onNavigatePedidos("operacion", "preparacion")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Programados"
            active={activeModule === "pedidos" && pedidosSection === "operacion" && pedidosOpTab === "programados"}
            onClick={() => onNavigatePedidos("operacion", "programados")}
            indent
            isMobile={isMobile}
          />

          {/* Subcategoría 2: Menú & Abastecimiento */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-t border-slate-100 dark:border-gray-800/80 mt-1.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#FF3F1A]" /> Menú & Abastecimiento
          </div>
          <NavItem
            icon={<Layers className="w-3.5 h-3.5" />}
            label="Catálogo de Platos"
            active={activeModule === "pedidos" && (pedidosSection === "menu" || pedidosSection === "gestion") && pedidosGeTab === "catalogo"}
            onClick={() => onNavigatePedidos("menu", "catalogo")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<Package className="w-3.5 h-3.5" />}
            label="Insumos & Stock"
            active={activeModule === "pedidos" && (pedidosSection === "menu" || pedidosSection === "gestion") && pedidosGeTab === "insumos"}
            onClick={() => onNavigatePedidos("menu", "insumos")}
            indent
            isMobile={isMobile}
          />

          {/* Subcategoría 3: Analítica & Reportes */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-t border-slate-100 dark:border-gray-800/80 mt-1.5 flex items-center gap-1.5">
            <BarChart2 className="w-3 h-3 text-[#FF3F1A]" /> Analítica & Reportes
          </div>
          <NavItem
            icon={<BarChart2 className="w-3.5 h-3.5" />}
            label="Dashboard Pedidos"
            active={activeModule === "pedidos" && (pedidosSection === "analitica" || pedidosSection === "gestion") && pedidosGeTab === "resumen"}
            onClick={() => onNavigatePedidos("analitica", "resumen")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<History className="w-3.5 h-3.5" />}
            label="Historial de Ventas"
            active={activeModule === "pedidos" && (pedidosSection === "analitica" || pedidosSection === "gestion") && pedidosGeTab === "historial"}
            onClick={() => onNavigatePedidos("analitica", "historial")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Rendimiento & Canales"
            active={activeModule === "pedidos" && (pedidosSection === "analitica" || pedidosSection === "gestion") && pedidosGeTab === "analitica"}
            onClick={() => onNavigatePedidos("analitica", "analitica")}
            indent
            isMobile={isMobile}
          />

          {/* Subcategoría 4: Configuración & Equipo */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-t border-slate-100 dark:border-gray-800/80 mt-1.5 flex items-center gap-1.5">
            <Users className="w-3 h-3 text-[#FF3F1A]" /> Configuración & Equipo
          </div>
          <NavItem
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Automatizaciones & IA"
            active={activeModule === "pedidos" && (pedidosSection === "configuracion" || pedidosSection === "gestion") && pedidosGeTab === "automatizaciones"}
            onClick={() => onNavigatePedidos("configuracion", "automatizaciones")}
            indent
            isMobile={isMobile}
          />
          <NavItem
            icon={<Users className="w-3.5 h-3.5" />}
            label="Turnos y Capacidad"
            active={activeModule === "pedidos" && (pedidosSection === "configuracion" || pedidosSection === "gestion") && pedidosGeTab === "turnos"}
            onClick={() => onNavigatePedidos("configuracion", "turnos")}
            indent
            isMobile={isMobile}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (hidden on mobile, visible on lg and up) */}
      <div
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } hidden lg:flex transition-all duration-300 flex-none bg-white dark:bg-[#2C2D31] dark:border dark:border-[#374151] rounded-2xl shadow-sm overflow-hidden flex-col`}
        style={{ minHeight: 0 }}
      >
        {/* Top Header with Logo & Circular Collapse Toggle */}
        <div className="p-3 px-3.5 pt-4 flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <NectoLogo size="xs" inline />
              <button
                onClick={() => handleSetCollapsed(true)}
                title="Colapsar barra lateral"
                className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                type="button"
                onClick={() => handleSetCollapsed(false)}
                title="Expandir barra lateral"
                className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] flex items-center justify-center shadow-2xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer select-none group"
              >
                <span className="font-black text-xl text-[#FF3F1A] tracking-tighter group-hover:scale-110 transition-transform">
                  N
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {renderNavLinks(false)}
        </nav>

        {/* Bottom Action Section */}
        <div className="p-2 flex flex-col gap-1 border-t border-slate-100 dark:border-gray-800">
          <NavItem icon={<Settings className="w-4 h-4" />} label="Configuración" onClick={() => {}} />
          <NavItem icon={<HelpCircle className="w-4 h-4" />} label="Ayuda" onClick={() => {}} />
          <NavItem icon={<LogOut className="w-4 h-4 text-red-500" />} label="Cerrar sesión" onClick={() => {}} />
        </div>
      </div>

      {/* 2. Mobile Slide-over Drawer (visible on < lg when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
          />

          {/* Drawer Sheet */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#2C2D31] h-full shadow-2xl flex flex-col z-10 animate-slide-right border-r border-slate-200 dark:border-gray-700">
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <NectoLogo size="xs" inline />
              <button
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {renderNavLinks(true)}
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1 bg-slate-50/50 dark:bg-gray-800/40">
              <NavItem icon={<Settings className="w-4 h-4" />} label="Configuración" onClick={() => {}} isMobile={true} />
              <NavItem icon={<HelpCircle className="w-4 h-4" />} label="Ayuda" onClick={() => {}} isMobile={true} />
              <NavItem icon={<LogOut className="w-4 h-4 text-red-500" />} label="Cerrar sesión" onClick={() => {}} isMobile={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="w-full overflow-hidden text-white font-sans mt-auto flex-none">
      <div className="bg-[#FF3F1A] dark:bg-[#212121] px-6 md:px-12 py-8 transition-colors">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-12">
          
          <div className="flex flex-col items-start gap-5 flex-none">
            <div className="relative w-[235px] h-[97px]">
              <div className="absolute inset-[59.42%_31.4%_0.06%_23.53%]">
                <svg className="block w-full h-full" fill="none" viewBox="0 0 105.906 39.3108" preserveAspectRatio="none">
                  <g id="Group">
                    <path d={svgPaths.p3c6b27c0} fill="#FFFFFF" />
                    <path d={svgPaths.p14f5d000} fill="#FFFFFF" />
                    <path d={svgPaths.p19d15a00} fill="#FFFFFF" />
                    <path d={svgPaths.p13839f00} fill="#FFFFFF" />
                    <path d={svgPaths.p2f3333f0} fill="#FFFFFF" />
                    <path d={svgPaths.p2ad78300} fill="#FFFFFF" />
                    <path d={svgPaths.p4b91f00} fill="#FFFFFF" />
                    <path d={svgPaths.p250f9580} fill="#FFFFFF" />
                    <path d={svgPaths.p80b6880} fill="#FFFFFF" />
                    <path d={svgPaths.p1224d800} fill="#FFFFFF" />
                    <path d={svgPaths.p1ea5d900} fill="#FFFFFF" />
                    <path d={svgPaths.p31032480} fill="#FFFFFF" />
                  </g>
                </svg>
              </div>

              <div className="absolute inset-[-0.06%_0_48.14%_0]">
                <svg className="block w-full h-full" fill="none" viewBox="0 0 235 50.3601" preserveAspectRatio="none">
                  <g id="Group">
                    <path d={svgPaths.p31604a80} fill="#FFFFFF" />
                    <path d={svgPaths.p1b22ab80} className="necto-logo-e fill-[#190088]" fill="#190088" />
                    <path d={svgPaths.p1aedf600} fill="#FFFFFF" />
                    <path d={svgPaths.p204e9500} fill="#FFFFFF" />
                    <path d={svgPaths.p14a87f30} fill="#FFFFFF" />
                    <path d={svgPaths.pd6f1500} fill="#FFFFFF" />
                  </g>
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-1">
              <div className="w-[30px] h-[30px] cursor-pointer hover:scale-105 transition-transform">
                <svg className="block w-full h-full" fill="none" viewBox="0 0 30.5497 29.36">
                  <path d={svgPaths.p1836e480} fill="#FFFFFF" />
                  <path d={svgPaths.p13ab9f40} fill="#FFFFFF" />
                  <path d={svgPaths.p20e40300} fill="#FFFFFF" />
                </svg>
              </div>
              <div className="w-[30px] h-[30px] cursor-pointer hover:scale-105 transition-transform">
                <svg className="block w-full h-full" fill="none" viewBox="0 0 32 29">
                  <path d={svgPaths.p46a0e80} fill="#FFFFFF" />
                </svg>
              </div>
              <div className="w-[30px] h-[30px] cursor-pointer hover:scale-105 transition-transform">
                <svg className="block w-full h-full" fill="none" viewBox="0 0 30.4995 29.3051">
                  <path d={svgPaths.p37f6d480} fill="#FFFFFF" />
                  <path d={svgPaths.p14ad3130} fill="#FFFFFF" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-14 flex-1 max-w-4xl w-full">
            {[
              { title: "Nosotros", items: ["Plataforma Necto", "Tecnología IA", "Restaurantes & SST"] },
              { title: "Servicios", items: ["Gestión de Pedidos", "KDS Cocina", "Catálogo de Productos"] },
              { title: "Contacto", items: ["Soporte Técnico", "Mesa de Ayuda", "Comunidad"] },
            ].map(col => (
              <div key={col.title} className="flex items-start gap-3.5">
                <div className="w-[3px] h-10 bg-white/80 dark:bg-[#374151] rounded-full flex-none mt-1" />
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-lg sm:text-xl leading-tight mb-1">{col.title}</h4>
                  {col.items.map((item, idx) => (
                    <span key={idx} className="font-medium text-white/90 dark:text-gray-300 hover:text-white text-sm leading-snug cursor-pointer hover:underline">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="bg-[#FF3F1A] dark:bg-[#212121] relative transition-colors">
        <div className="bg-[#190088] dark:bg-[#FF3F1A] rounded-t-[32px] text-center py-3.5 px-6 transition-colors shadow-inner">
          <p className="text-white text-[13px] font-bold tracking-wide">
            © 2026 Necto. Plataforma de Operaciones y Gestión para Restaurantes. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── Main Root Component ─────────────────────────────────────────────────── */

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeModule, setActiveModule] = useState<"pedidos" | "inventarios">("pedidos");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pedidos Navigation State
  const [pedidosSection, setPedidosSection] = useState<PedidosSection>("operacion");
  const [pedidosOpTab, setPedidosOpTab] = useState<OperacionTab>("en-vivo");
  const [pedidosGeTab, setPedidosGeTab] = useState<GestionTab>("resumen");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [targetModal, setTargetModal] = useState<"ticket" | "ai" | "incidencias" | "product" | null>(null);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Nuevo Pedido Interpretado por IA",
      desc: "Mariana Silva envió solicitud vía WhatsApp por $75.000 (Confianza Alta)",
      time: "Hace 2 min",
      unread: true,
      type: "order",
      module: "pedidos",
      pedidosSection: "operacion",
      pedidosOpTab: "en-vivo",
      targetOrderId: "PED-1025",
      targetModal: "ai",
    },
    {
      id: "2",
      title: "Alerta de Comanda Retrasada",
      desc: "PED-1020 superó los 40 min estimados en KDS Cocina",
      time: "Hace 15 min",
      unread: true,
      type: "alert",
      module: "pedidos",
      pedidosSection: "operacion",
      pedidosOpTab: "preparacion",
      targetOrderId: "PED-1020",
      targetModal: "ticket",
    },
    {
      id: "3",
      title: "Alerta de Stock Crítico",
      desc: "Humita Cremosa desactivada por quiebre de stock",
      time: "Hace 40 min",
      unread: false,
      type: "stock",
      module: "pedidos",
      pedidosSection: "gestion",
      pedidosGeTab: "insumos",
      targetProductId: "p3",
      targetModal: "product",
    },
  ]);

  const handleNavigateFromNotification = (n: NotificationItem) => {
    setActiveModule("pedidos");
    if (n.pedidosSection) setPedidosSection(n.pedidosSection);
    if (n.pedidosOpTab) setPedidosOpTab(n.pedidosOpTab);
    if (n.pedidosGeTab) setPedidosGeTab(n.pedidosGeTab);
    setTargetOrderId(n.targetOrderId || null);
    setTargetModal(n.targetModal || null);
    setTargetProductId(n.targetProductId || null);
  };

  // Breadcrumb Labels Calculation
  const pedidosOpPageNames: Record<OperacionTab, string> = {
    "en-vivo": "Pedidos Activos",
    "preparacion": "KDS Cocina y Tiempos",
    "programados": "Pedidos Programados",
  };

  const pedidosGePageNames: Record<GestionTab, string> = {
    resumen: "Dashboard Pedidos",
    historial: "Historial de Pedidos",
    catalogo: "Catálogo de Productos",
    insumos: "Insumos & Stock",
    automatizaciones: "Automatizaciones & Recurrencias",
    turnos: "Turnos y Capacidad",
    analitica: "Analítica de Rendimiento",
  };

  const sectionRoleNames: Record<PedidosSection, string> = {
    operacion: "Operación en Vivo",
    menu: "Menú & Abastecimiento",
    analitica: "Analítica & Reportes",
    configuracion: "Configuración & Equipo",
    gestion: "Gestión",
  };

  const currentRoleName = sectionRoleNames[pedidosSection] || "Gestión";
  const currentPageName =
    pedidosSection === "operacion"
      ? pedidosOpPageNames[pedidosOpTab]
      : pedidosGePageNames[pedidosGeTab];

  return (
    <div
      className="min-h-screen flex flex-col transition-colors bg-[#ECECEC] dark:bg-[#212121] text-[#212121] dark:text-[#ECECEC]"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="flex flex-1 gap-2 sm:gap-3 p-1.5 sm:p-3 min-h-0" style={{ minHeight: "calc(100vh - 24px)" }}>
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule}
          pedidosSection={pedidosSection}
          pedidosOpTab={pedidosOpTab}
          pedidosGeTab={pedidosGeTab}
          onNavigatePedidos={(section, tab) => {
            setActiveModule("pedidos");
            setPedidosSection(section);
            if (section === "operacion") setPedidosOpTab(tab);
            else setPedidosGeTab(tab);
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0 transition-colors bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-[#212121] dark:text-[#ECECEC]">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Top Bar with TailAdmin Breadcrumb & Module Switchers */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex-none">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Menu Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex-none"
                  title="Abrir menú de navegación"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <TailAdminBreadcrumb
                  moduleName={activeModule === "pedidos" ? "Módulo Pedidos" : "Inventarios SST"}
                  roleName={currentRoleName}
                  pageName={currentPageName}
                  onNavigateHome={() => {
                    setActiveModule("pedidos");
                    setPedidosSection("operacion");
                    setPedidosOpTab("en-vivo");
                  }}
                />

                <div className="hidden sm:block">
                  <BusinessSwitcher />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="sm:hidden">
                  <BusinessSwitcher />
                </div>

                <NotificationBellDropdown
                  notifications={notifications}
                  setNotifications={setNotifications}
                  onNavigate={handleNavigateFromNotification}
                />

                {/* Dark Mode Circular Button */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-gray-500 transition-colors hover:bg-slate-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                  title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20 transition-transform duration-300 transform rotate-0 hover:rotate-45" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform duration-300 transform rotate-0 hover:-rotate-12" />
                  )}
                </button>
              </div>
            </div>

            {/* Active Module Container */}
            <div className="flex-1 overflow-auto">
              <PedidosModule
                sectionProp={activeModule === "inventarios" ? "gestion" : pedidosSection}
                opTabProp={pedidosOpTab}
                geTabProp={activeModule === "inventarios" ? "insumos" : pedidosGeTab}
                targetOrderId={targetOrderId}
                targetModal={targetModal}
                targetProductId={targetProductId}
                onSectionChange={setPedidosSection}
                onOpTabChange={setPedidosOpTab}
                onGeTabChange={setPedidosGeTab}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
