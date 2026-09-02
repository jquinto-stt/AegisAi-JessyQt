import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ChefHat,
  MessagesSquare,
  Layers,
  Menu as MenuIcon,
  Bell,
  X,
  Settings,
  HelpCircle,
  LogOut,
  Package,
  Shield,
  Zap,
  Users,
  Building2,
} from "lucide-react";
import { usePedidos } from "../context/PedidosContext";
import { OperacionTab, GestionTab, PedidosSection } from "../types";
import { NectoLogo } from "@/compositions/shared/NectoLogo";
import { ThemeToggle } from "@/compositions/shared/ThemeToggle";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/auth/AuthContext";
import { OrdenesMobileView } from "./operacion/OrdenesMobileView";
import { KdsMobileView } from "./operacion/KdsMobileView";

/** Pestañas de la barra de navegación inferior móvil. */
export type MobileTab = "ordenes" | "kds" | "conversaciones" | "menu" | "mas";

interface NectoMobileShellProps {
  section: PedidosSection;
  opTab: OperacionTab;
  geTab: GestionTab;
  onNavigate: (section: PedidosSection, tab: any) => void;
  unreadNotifications?: number;
}

/* Mapea la navegación de escritorio (section/tab) a la pestaña móvil activa. */
function resolveActiveTab(section: PedidosSection, opTab: OperacionTab): MobileTab {
  if (section === "operacion") {
    if (opTab === "preparacion") return "kds";
    if (opTab === "conversaciones") return "conversaciones";
    return "ordenes";
  }
  if (section === "menu") return "menu";
  return "mas";
}

export const NectoMobileShell: React.FC<NectoMobileShellProps> = ({
  section,
  opTab,
  geTab,
  onNavigate,
  unreadNotifications = 0,
}) => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();
  const { signOut } = useAuth();
  const {
    orders,
    conversations,
    incidencias,
  } = usePedidos();

  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab = resolveActiveTab(section, opTab);

  // Badges de la barra inferior
  const newOrdersCount = orders.filter(o => o.status === "NUEVO").length;
  const kitchenCount = orders.filter(
    o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO"
  ).length;
  const pendingConversations = conversations.filter(
    c => c.status === "REQUIERE_INTERVENCION"
  ).length;
  const activeIncCount = incidencias.filter(i => !i.isResolved).length;

  const handleTab = (tab: MobileTab) => {
    switch (tab) {
      case "ordenes":
        onNavigate("operacion", "en-vivo");
        break;
      case "kds":
        onNavigate("operacion", "preparacion");
        break;
      case "conversaciones":
        onNavigate("operacion", "conversaciones");
        break;
      case "menu":
        onNavigate("menu", geTab === "insumos" ? "insumos" : "catalogo");
        break;
      case "mas":
        setMoreOpen(true);
        break;
    }
  };

  // Título de la barra superior según la pestaña.
  const topTitle =
    activeTab === "ordenes"
      ? "Órdenes en Vivo"
      : activeTab === "kds"
      ? "KDS Cocina"
      : activeTab === "conversaciones"
      ? "Conversaciones"
      : activeTab === "menu"
      ? "Menú & Stock"
      : "Necto";

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col h-[100dvh] bg-[#F4F4F2] dark:bg-[#1B1B1F] text-[#212121] dark:text-[#ECECEC]">
      {/* ── Top App Bar ─────────────────────────────────────────── */}
      <header className="flex-none bg-white/85 dark:bg-[#232327]/85 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 pt-[calc(0.65rem+env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#FF3F1A] flex items-center justify-center flex-none">
            <span className="font-black text-lg text-white tracking-tighter">N</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[15px] text-zinc-950 dark:text-white truncate leading-tight tracking-tight">
              {topTitle}
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate leading-tight">
              {activeBusiness?.name || "Necto"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-none">
          <button
            type="button"
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-colors active:scale-90"
            title="Notificaciones"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3F1A] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#232327]">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Contenido de la pestaña activa ──────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeTab === "ordenes" && <OrdenesMobileView />}
        {activeTab === "kds" && <KdsMobileView />}
        {activeTab !== "ordenes" && activeTab !== "kds" && (
          <div className="p-6 pt-10 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-3xl bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center text-[#FF3F1A] mx-auto mb-3">
              {activeTab === "conversaciones" ? (
                <MessagesSquare className="w-7 h-7" />
              ) : activeTab === "menu" ? (
                <Layers className="w-7 h-7" />
              ) : (
                <MenuIcon className="w-7 h-7" />
              )}
            </div>
            <h2 className="font-bold text-base text-zinc-950 dark:text-zinc-50">
              Pantalla móvil en camino
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-[300px] mx-auto">
              La versión móvil de <strong>Órdenes</strong> y <strong>KDS Cocina</strong> ya
              está lista. Esta sección se adaptará a continuación.
            </p>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ───────────────────────────────────── */}
      <nav className="flex-none bg-white/90 dark:bg-[#232327]/90 backdrop-blur-xl border-t border-black/5 dark:border-white/5 grid grid-cols-5 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        <BottomTab
          label="Órdenes"
          icon={<ShoppingBag className="w-[22px] h-[22px]" />}
          active={activeTab === "ordenes"}
          badge={newOrdersCount}
          onClick={() => handleTab("ordenes")}
        />
        <BottomTab
          label="KDS"
          icon={<ChefHat className="w-[22px] h-[22px]" />}
          active={activeTab === "kds"}
          badge={kitchenCount}
          badgeTone="neutral"
          onClick={() => handleTab("kds")}
        />
        <BottomTab
          label="Chats"
          icon={<MessagesSquare className="w-[22px] h-[22px]" />}
          active={activeTab === "conversaciones"}
          badge={pendingConversations}
          onClick={() => handleTab("conversaciones")}
        />
        <BottomTab
          label="Menú"
          icon={<Layers className="w-[22px] h-[22px]" />}
          active={activeTab === "menu"}
          onClick={() => handleTab("menu")}
        />
        <BottomTab
          label="Más"
          icon={<MenuIcon className="w-[22px] h-[22px]" />}
          active={activeTab === "mas"}
          badge={activeIncCount}
          onClick={() => handleTab("mas")}
        />
      </nav>

      {/* ── "Más" drawer (secciones secundarias) ────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative w-full bg-white dark:bg-[#2C2D31] rounded-t-3xl shadow-2xl border-t border-zinc-200/80 dark:border-zinc-800 animate-slide-up pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="pt-2.5 pb-1 flex items-center justify-center">
              <span className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="px-4 pb-2 pt-1 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <NectoLogo size="xs" inline />
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center active:scale-95"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 grid grid-cols-1 gap-1">
              <MoreItem
                icon={<Package className="w-5 h-5" />}
                label="Insumos & Stock"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate("menu", "insumos");
                }}
              />
              <MoreItem
                icon={<Shield className="w-5 h-5" />}
                label="Roles & Permisos"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate("configuracion", "roles");
                }}
              />
              <MoreItem
                icon={<Zap className="w-5 h-5" />}
                label="Automatizaciones & IA"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate("configuracion", "automatizaciones");
                }}
              />
              <MoreItem
                icon={<Users className="w-5 h-5" />}
                label="Turnos y Capacidad"
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate("configuracion", "turnos");
                }}
              />
              <MoreItem
                icon={<Building2 className="w-5 h-5" />}
                label="Cambiar negocio / Workspaces"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/workspaces");
                }}
              />

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1.5" />

              <MoreItem
                icon={<Settings className="w-5 h-5" />}
                label="Configuración"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/workspaces");
                }}
              />
              <MoreItem
                icon={<HelpCircle className="w-5 h-5" />}
                label="Ayuda"
                onClick={() => setMoreOpen(false)}
              />
              <MoreItem
                icon={<LogOut className="w-5 h-5 text-red-500" />}
                label="Cerrar sesión"
                danger
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                  navigate("/login");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Bottom nav tab button ─────────────────────────────────────── */
const BottomTab: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  badgeTone?: "orange" | "neutral";
  onClick: () => void;
}> = ({ label, icon, active, badge = 0, badgeTone = "orange", onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative flex flex-col items-center justify-center gap-1 pt-1.5 pb-1 min-h-[54px] transition-transform active:scale-90 cursor-pointer"
  >
    <span
      className={`relative flex items-center justify-center h-8 w-14 rounded-2xl transition-all duration-200 ${
        active ? "bg-[#FF3F1A] text-white" : "text-zinc-400 dark:text-zinc-500"
      }`}
    >
      {icon}
      {badge > 0 && (
        <span
          className={`absolute -top-1 right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#232327] ${
            active
              ? "bg-white text-[#FF3F1A]"
              : badgeTone === "orange"
              ? "bg-[#FF3F1A] text-white"
              : "bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-100"
          }`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </span>
    <span
      className={`text-[10px] leading-none transition-colors ${
        active
          ? "font-bold text-[#FF3F1A]"
          : "font-semibold text-zinc-400 dark:text-zinc-500"
      }`}
    >
      {label}
    </span>
  </button>
);

/* ── "Más" list item ───────────────────────────────────────────── */
const MoreItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, label, danger, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors active:scale-[0.99] cursor-pointer ${
      danger
        ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        : "text-zinc-700 dark:text-zinc-200 hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] hover:text-[#FF3F1A]"
    }`}
  >
    <span className={`flex-none ${danger ? "" : "text-[#FF3F1A]"}`}>{icon}</span>
    <span className="flex-1 text-left truncate">{label}</span>
  </button>
);
