import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  Home, Eye, Users, Settings, HelpCircle, LogOut,
  ChevronDown, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, X, Mail, Megaphone, Package, Gift,
  FileText, BarChart2, UserCircle, Bell,
  Shield,
  ShieldAlert, ShoppingBag,
  ChefHat, Layers, SlidersHorizontal, Activity, Menu,
  Building2,
  MessageSquare,
  Boxes,
  Truck,
  Bookmark,
  Calendar,
  Clock,
  Store,
  Tag,
  Coins,
  TrendingUp,
  History,
} from "lucide-react";

import svgPaths from "@/imports/BannerYFooter/svg-mzezy80iwx";
import { PedidosModule } from "@/compositions/pedidos/PedidosModule";
import { ModuloInventario, InventoryTab } from "@/ModuloInventario";
import { PedidosSection, OperacionTab, GestionTab } from "@/compositions/pedidos/types";
import { BusinessSwitcher } from "@/compositions/workspace/BusinessSwitcher";
import { EmptyModulesHubView } from "@/compositions/workspace/EmptyModulesHubView";
import { UserProfileDropdown } from "@/compositions/workspace/UserProfileDropdown";
import { RoleSelectionModal } from "@/compositions/workspace/RoleSelectionModal";
import { CommandPalette } from "@/compositions/workspace/CommandPalette";
import { ThemeToggle } from "@/compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "@/compositions/shared/GlobalSearchButton";
import { NectoLogo, NectoSidebarLogo } from "@/compositions/shared/NectoLogo";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/auth/AuthContext";
import { Button, Badge, Breadcrumb } from "@/elements";
import type { BreadcrumbItem } from "@/elements/ui/breadcrumb";
import { BaseAppShell } from "@/shell";
import { AppFooter } from "@/shell/footer";
import { BasePageLayout, BasePageHeader } from "@/layouts/base-page";
import { StockFlowSidebar } from "@/compositions/shell/StockFlowSidebar";
import { StockFlowHeader } from "@/compositions/shell/StockFlowHeader";


export type InventariosRole = "operador" | "analista";
export type OperadorSubView = string;
export type AnalistaSubView = string;

/* ── Brand Colors ────────────────────────────────────────────────────────── */

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
        className="relative flex h-10 w-10 sm:h-11 sm:w-11 aspect-square flex-none items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white shadow-theme-xs hover:scale-105 active:scale-95 cursor-pointer"
        title="Notificaciones de Necto IA"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500 border-2 border-white dark:border-gray-900"></span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-lg z-50 overflow-hidden space-y-2 animate-scale-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notificaciones</h4>
                {unreadCount > 0 && (
                  <Badge variant="light" color="error" size="sm">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" intent="shell.notifications.markAllRead" onClick={markAllRead} className="p-0 text-xs font-semibold text-brand-500 hover:underline cursor-pointer">
                    Marcar leídas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  intent="shell.notifications.close"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 p-0 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`p-3.5 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${n.unread ? "bg-brand-50/40 dark:bg-brand-500/[0.08]" : ""}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none text-brand-500 border border-gray-200 dark:border-gray-700">
                    {n.type === "order" ? <ShoppingBag className="w-4 h-4 text-brand-500" /> : n.type === "stock" ? <Package className="w-4 h-4 text-brand-500" /> : <ShieldAlert className="w-4 h-4 text-warning-500" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                      {n.unread && <span className="w-2 h-2 rounded-full bg-brand-500 flex-none" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{n.desc}</p>
                    <p className="text-[10px] font-mono text-gray-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/30">
              <Button variant="ghost" intent="shell.notifications.viewAll" onClick={() => setOpen(false)} className="p-0 text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer">
                Ver todas las notificaciones
              </Button>
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
  onNavigateHome,
  onNavigateSection,
  onOpenRoleModal,
}: {
  moduleName?: string;
  roleName?: string;
  pageName?: string;
  onNavigateHome?: () => void;
  onNavigateSection?: () => void;
  onOpenRoleModal?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Breadcrumb
        separator="chevron"
        items={[
          { label: "Hub", href: "/workspaces", icon: <Building2 className="w-4 h-4 text-brand-500" /> },
          { label: moduleName, href: "/workspaces" },
          { label: roleName },
          { label: pageName },
        ]}
      />
      {onOpenRoleModal && (
        <Badge
          variant="light"
          color="warning"
          size="sm"
          onClick={onOpenRoleModal}
          className="ml-2 cursor-pointer hover:opacity-80 transition-opacity hidden sm:inline-flex"
        >
          {roleName}
        </Badge>
      )}
    </div>
  );
}

/* ── Main Root Component ─────────────────────────────────────────────────── */

export default function App() {
  const [isDarkMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeModule, setActiveModule] = useState<"pedidos" | "inventarios" | "modules-hub">(() => {
    const mod = searchParams.get("module");
    if (mod === "modules-hub") return "modules-hub";
    if (mod === "inventarios") return "inventarios";
    return "pedidos";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const { activeBusiness, activeRole, semantics } = useBusiness();
  const isFood = activeBusiness?.businessType === "restaurant_virtual";
  const activeModules = activeBusiness?.activeModules || [];
  const hasPedidos = activeModules.includes("pedidos");
  const hasInventarios = activeModules.includes("inventarios");
  const hasAnyModule = hasPedidos || hasInventarios;

  // Pedidos Navigation State initialized from URL search params
  const [pedidosSection, setPedidosSection] = useState<PedidosSection>(() => {
    const s = searchParams.get("section") as PedidosSection | null;
    if (s === "operacion") return "ordenes";
    return s || "ordenes";
  });
  const [pedidosOpTab, setPedidosOpTab] = useState<OperacionTab>(() => {
    const t = searchParams.get("tab") as OperacionTab | null;
    return t || "en-vivo";
  });
  const [pedidosGeTab, setPedidosGeTab] = useState<GestionTab>(() => {
    const t = searchParams.get("tab") as GestionTab | null;
    return t || "catalogo";
  });

  const [inventarioTab, setInventarioTab] = useState<InventoryTab>(() => {
    const t = searchParams.get("tab") as InventoryTab | null;
    return t || "catalog";
  });

  // Intelligent module redirection
  useEffect(() => {
    if (!hasAnyModule) {
      if (activeModule !== "modules-hub") {
        setActiveModule("modules-hub");
      }
      return;
    }

    if (!hasPedidos && hasInventarios && activeModule === "pedidos") {
      setActiveModule("inventarios");
      setSearchParams({ module: "inventarios", tab: inventarioTab }, { replace: true });
    } else if (!hasInventarios && hasPedidos && activeModule === "inventarios") {
      setActiveModule("pedidos");
      setSearchParams({ section: pedidosSection, tab: pedidosSection === "operacion" ? pedidosOpTab : pedidosGeTab }, { replace: true });
    }
  }, [hasPedidos, hasInventarios, hasAnyModule, activeModule, inventarioTab, pedidosSection, pedidosOpTab, pedidosGeTab, setSearchParams]);

  const handleNavigatePedidos = (section: PedidosSection, tab?: any) => {
    setActiveModule("pedidos");
    const normSection: PedidosSection = section === "operacion" ? "ordenes" : section;
    setPedidosSection(normSection);
    if (tab) {
      if (normSection === "ordenes") setPedidosOpTab(tab);
      else setPedidosGeTab(tab);
      setSearchParams({ section: normSection, tab }, { replace: true });
    } else {
      setSearchParams({ section: normSection }, { replace: true });
    }
  };

  const handleNavigateInventario = (tab: InventoryTab) => {
    setActiveModule("inventarios");
    setInventarioTab(tab);
    setSearchParams({ module: "inventarios", tab }, { replace: true });
  };

  const handleNavigateModule = (mod: "pedidos" | "inventarios" | "modules-hub") => {
    setActiveModule(mod);
    if (mod === "modules-hub") {
      setSearchParams({ module: "modules-hub" }, { replace: true });
    } else if (mod === "inventarios") {
      setSearchParams({ module: "inventarios", tab: inventarioTab }, { replace: true });
    } else {
      setSearchParams({ section: pedidosSection, tab: pedidosSection === "operacion" ? pedidosOpTab : pedidosGeTab }, { replace: true });
    }
  };

  // Synchronize when URL parameters change (e.g. from CommandPalette, direct links, or Hub)
  useEffect(() => {
    const mod = searchParams.get("module");
    if (mod === "modules-hub") {
      setActiveModule("modules-hub");
      return;
    }
    if (mod === "inventarios") {
      setActiveModule("inventarios");
      const t = searchParams.get("tab") as InventoryTab | null;
      if (t) {
        setInventarioTab(t);
      }
      return;
    }
    const s = searchParams.get("section") as PedidosSection | null;
    const t = searchParams.get("tab") as string | null;
    if (s) {
      setActiveModule("pedidos");
      setPedidosSection(s);
      if (s === "operacion") {
        if (t === "en-vivo" || t === "preparacion" || t === "programados" || t === "conversaciones") {
          setPedidosOpTab(t as OperacionTab);
        }
      } else {
        if (t) {
          setPedidosGeTab(t as GestionTab);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.section) {
        handleNavigatePedidos(e.detail.section, e.detail.opTab || e.detail.geTab);
      }
    };
    window.addEventListener("necto_navigate_pedidos", handleNavigate);
    return () => window.removeEventListener("necto_navigate_pedidos", handleNavigate);
  }, []);

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
      title: "Alerta de Pedido Retrasado",
      desc: "PED-1020 superó el tiempo estimado de entrega",
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
      desc: "Stock en nivel mínimo para producto de alta rotación",
      time: "Hace 40 min",
      unread: false,
      type: "stock",
      module: "pedidos",
      pedidosSection: "menu",
      pedidosGeTab: "catalogo",
      targetProductId: "p3",
      targetModal: "product",
    },
  ]);

  const handleNavigateFromNotification = (n: NotificationItem) => {
    setActiveModule("pedidos");
    const sec: PedidosSection =
      n.pedidosSection === "gestion"
        ? (n.pedidosGeTab === "insumos" || n.pedidosGeTab === "catalogo" ? "menu" : "configuracion")
        : (n.pedidosSection || "operacion");
    const tab = sec === "operacion" ? (n.pedidosOpTab || "en-vivo") : (n.pedidosGeTab || "catalogo");

    handleNavigatePedidos(sec, tab);

    setTargetOrderId(null);
    setTargetModal(null);
    setTargetProductId(null);
    setTimeout(() => {
      setTargetOrderId(n.targetOrderId || null);
      setTargetModal(n.targetModal || null);
      setTargetProductId(n.targetProductId || null);
    }, 20);
  };

  // Breadcrumb Labels Calculation
  const pedidosOpPageNames: Record<OperacionTab, string> = {
    "en-vivo": "Pedidos en Vivo",
    "preparacion": semantics?.stationNoun || "Alistamiento & Despacho",
    "programados": "Pedidos Programados",
    "conversaciones": "Atención WhatsApp & Clientes",
  };

  const pedidosGePageNames: Record<GestionTab, string> = {
    resumen: "Dashboard de Pedidos",
    historial: "Historial de Pedidos",
    catalogo: isFood ? "Catálogo de Platos" : "Catálogo de Productos",
    insumos: isFood ? "Insumos & Recetas" : "Insumos & Materiales",
    roles: "Roles & Permisos",
    automatizaciones: "Automatizaciones & Flujos",
    turnos: "Turnos y Horarios",
    analitica: "Analítica Comercial",
  };

  const sectionRoleNames: Record<PedidosSection, string> = {
    ordenes: "Órdenes",
    programados: "Pedidos Programados",
    preparacion: "Preparación & Alistamiento",
    canales: "Canales de Venta",
    configuracion: "Configuración",
    operacion: "Órdenes",
    menu: isFood ? "Menú & Insumos" : "Catálogo de Productos",
    analitica: "Analítica & Reportes",
    gestion: "Gestión",
  };

  const currentRoleName = sectionRoleNames[pedidosSection] || "Pedidos";
  const currentPageName =
    pedidosSection === "ordenes" || pedidosSection === "operacion"
      ? (pedidosOpTab === "conversaciones" ? "Atención WhatsApp & Clientes" : "Órdenes Activas")
      : pedidosSection === "programados"
      ? "Pedidos Programados"
      : pedidosSection === "preparacion"
      ? "Mesa de Preparación & Alistamiento"
      : pedidosSection === "canales"
      ? "Canales Conectados & Asistente"
      : pedidosSection === "configuracion"
      ? "Configuración del Módulo"
      : pedidosGePageNames[pedidosGeTab] || "Pedidos";

  const isModulesHub = !hasAnyModule || activeModule === "modules-hub";

  const pageTitle =
    isModulesHub
      ? "Módulos de Tienda & Plugins"
      : activeModule === "inventarios"
      ? (inventarioTab === "valuation"
          ? "Valor de Inventario"
          : inventarioTab === "locations"
          ? "Bodegas & Sucursales"
          : inventarioTab === "purchasing"
          ? "Compras & Facturas"
          : inventarioTab === "kardex"
          ? "Historial de Movimientos"
          : inventarioTab === "pricelists"
          ? "Listas de Precios"
          : "Productos & Servicios")
      : currentPageName;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: activeBusiness?.name || "Necto", href: "/app" },
    {
      label: isModulesHub
        ? "Espacio & Plugins"
        : activeModule === "inventarios"
        ? "Inventario"
        : currentRoleName,
    },
    { label: pageTitle },
  ];

  return (
    <>
      <BaseAppShell
        sidebar={
          <StockFlowSidebar
            activeModule={activeModule}
            pedidosSection={pedidosSection}
            pedidosOpTab={pedidosOpTab}
            pedidosGeTab={pedidosGeTab}
            inventarioTab={inventarioTab}
            onNavigatePedidos={handleNavigatePedidos}
            onNavigateModule={handleNavigateModule}
            onNavigateInventario={handleNavigateInventario}
            onOpenRoleModal={() => setIsRoleModalOpen(true)}
            activeRoleName={activeRole?.name || "Dueño"}
          />
        }
        header={
          <StockFlowHeader
            breadcrumbItems={breadcrumbItems}
            activeRoleName={activeRole?.name || "Dueño"}
            onOpenRoleModal={() => setIsRoleModalOpen(true)}
            notificationsDropdown={
              <NotificationBellDropdown
                notifications={notifications}
                setNotifications={setNotifications}
                onNavigate={handleNavigateFromNotification}
              />
            }
          />
        }
        footer={<AppFooter />}
      >
        <BasePageLayout
          header={
            <BasePageHeader
              title={pageTitle}
              breadcrumbItems={breadcrumbItems}
            />
          }
        >
          {isModulesHub ? (
            <EmptyModulesHubView
              business={activeBusiness}
              onNavigateToModule={(mod) => {
                if (mod === "pedidos") {
                  handleNavigatePedidos("operacion", "en-vivo");
                } else if (mod === "inventarios") {
                  handleNavigateInventario("products");
                }
              }}
            />
          ) : activeModule === "inventarios" && hasInventarios ? (
            <ModuloInventario
              activeTab={inventarioTab}
              onNavigateTab={handleNavigateInventario}
            />
          ) : hasPedidos ? (
            <PedidosModule
              sectionProp={pedidosSection}
              opTabProp={pedidosOpTab}
              geTabProp={pedidosGeTab}
              targetOrderId={targetOrderId}
              targetModal={targetModal}
              targetProductId={targetProductId}
              onSectionChange={s => handleNavigatePedidos(s, s === "operacion" ? pedidosOpTab : pedidosGeTab)}
              onOpTabChange={t => handleNavigatePedidos("operacion", t)}
              onGeTabChange={t => {
                const targetSec: PedidosSection =
                  (t === "resumen" || t === "historial" || t === "analitica")
                    ? "analitica"
                    : (t === "roles" || t === "automatizaciones" || t === "turnos")
                    ? "configuracion"
                    : "menu";
                handleNavigatePedidos(targetSec, t);
              }}
            />
          ) : (
            <EmptyModulesHubView
              business={activeBusiness}
              onNavigateToModule={(mod) => {
                if (mod === "pedidos") {
                  handleNavigatePedidos("operacion", "en-vivo");
                } else if (mod === "inventarios") {
                  handleNavigateInventario("products");
                }
              }}
            />
          )}
        </BasePageLayout>
      </BaseAppShell>

      <CommandPalette />
      <RoleSelectionModal
        business={activeBusiness}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </>
  );
}


