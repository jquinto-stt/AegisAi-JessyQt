import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { AccountSettingsModal } from "../compositions/workspace/AccountSettingsModal";
import { RoleSelectionModal } from "../compositions/workspace/RoleSelectionModal";
import { CommandPalette } from "../compositions/workspace/CommandPalette";
import {
  Plus,
  ArrowRight,
  MessageSquare,
  Globe,
  Settings,
  User,
  Building2,
  Layers,
  ChevronRight,
} from "lucide-react";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";
import { Button } from "@/elements";


export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, activeBusinessId, switchBusiness } = useBusiness();

  const [hubTab, setHubTab] = useState<"workspaces_list" | "franchise_overview">("franchise_overview");
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [roleSelectBiz, setRoleSelectBiz] = useState<BusinessInstance | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  const handleSelectBusiness = (id: string) => {
    switchBusiness(id);
    navigate("/");
  };

  const handleOpenSettings = (e: React.MouseEvent, biz: BusinessInstance) => {
    e.stopPropagation();
    setSelectedBusinessForSettings(biz);
  };

  return (
    <div className="min-h-screen bg-[#ECECEC] dark:bg-[#212121] text-[#212121] dark:text-[#ECECEC] flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Minimal Header */}
      <header className="px-4 sm:px-12 py-4 sm:py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#2C2D31]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <NectoLogo size="xs" inline />

          {/* Hub Navigation Tabs - Visible on all devices */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
            <Button
              variant="ghost"
              intent="workspaces.hub.tab"
              onClick={() => setHubTab("workspaces_list")}
              className={`p-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                hubTab === "workspaces_list"
                  ? "bg-white text-[#212121] dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-700 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Mis Locales ({businesses.length})</span>
            </Button>
            <Button
              variant="ghost"
              intent="workspaces.hub.tab"
              onClick={() => setHubTab("franchise_overview")}
              className={`p-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                hubTab === "franchise_overview"
                  ? "bg-white text-[#212121] dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-700 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
              <span>Visión Franquicia</span>
            </Button>
          </div>
        </div>


        <div className="flex items-center gap-2 sm:gap-2.5">
          <GlobalSearchButton />
          <ThemeToggle />

          <Button
            variant="ghost"
            intent="workspaces.account.open"
            onClick={() => setIsAccountSettingsOpen(true)}
            className="text-xs font-mono py-2 px-3 rounded-2xl"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cuenta</span>
          </Button>
        </div>

      </header>




      {/* Main Hub Content Area */}
      {hubTab === "franchise_overview" ? (
        <div className="flex-1 max-w-6xl w-full mx-auto">
          <GlobalFranchiseOverview />
        </div>
      ) : (
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-12 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Gestión Multi-Tenant
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Espacios de Trabajo
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl font-normal">
              Selecciona un local para ingresar a su panel de comandas o gestiona la configuración de cada sucursal.
            </p>
          </div>

          {/* Business List (Structured Architectural Rows / Cards) */}
          <div className="space-y-3">


          {businesses.map(biz => {
            const isActive = biz.id === activeBusinessId;

            return (
              <div
                key={biz.id}
                onClick={() => handleSelectBusiness(biz.id)}
                className={`relative p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group overflow-hidden ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-sm"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs"
                }`}
              >
                {/* Crisp Sharp Banner Accent */}
                {biz.bannerUrl && (
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 dark:opacity-25 pointer-events-none overflow-hidden select-none">
                    <img
                      src={biz.bannerUrl}
                      alt=""
                      style={{
                        transform: biz.bannerTransform
                          ? `rotate(${biz.bannerTransform.rotate || 0}deg) scale(${biz.bannerTransform.scale || 1}) translate(${biz.bannerTransform.posX || 0}%, ${biz.bannerTransform.posY || 0}%)`
                          : undefined,
                      }}
                      className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent dark:from-zinc-900 dark:via-zinc-900/70 dark:to-transparent" />
                  </div>
                )}

                {/* Left Info with Brand Avatar & Meta */}
                <div className="flex items-start sm:items-center gap-4 min-w-0 z-10 flex-1">
                  <div className="w-13 h-13 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none shadow-2xs overflow-hidden">
                    {biz.logoUrl ? (
                      <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-base text-[#FF3F1A]">
                        {biz.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                        {biz.name}
                      </h3>
                      {biz.pauseConfig?.isPaused ? (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          EN PAUSA {biz.pauseConfig.pauseEndDate ? `· REABRE ${new Date(biz.pauseConfig.pauseEndDate).toLocaleDateString()}` : ""}
                        </span>
                      ) : isActive ? (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF3F1A] text-white shadow-2xs">
                          SEDE ACTIVA
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/30">
                          SUCURSAL
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono flex-wrap">
                      <span>{biz.specialty || "Gastronomía"}</span>
                      <span>•</span>
                      <span>{biz.city}</span>
                      <span>•</span>
                      <span>{biz.currency}</span>
                      <span>•</span>
                      <span className="text-zinc-400 dark:text-zinc-500">necto.app/{biz.slug}</span>
                    </div>

                    {/* Active Modules & Channels Chips */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {/* Modules */}
                      {biz.activeModules && biz.activeModules.map(m => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#ECECEC]/80 dark:bg-zinc-800 text-[#212121] dark:text-[#ECECEC] border border-zinc-200 dark:border-zinc-700"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A]" />
                          <span>{m}</span>
                        </span>
                      ))}

                      {/* Channels Indicator */}
                      <div className="flex items-center gap-1.5 ml-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                        {biz.channels.whatsapp && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/40 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-[#FF3F1A]" /> WhatsApp
                          </span>
                        )}
                        {biz.channels.web && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/30 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-[#190088]" /> Web
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Right Actions: Enter Workspace or Settings Gear */}
                <div className="flex items-center gap-2 flex-none z-10 justify-end">
                  <Button
                    variant="ghost"
                    intent="workspaces.settings.open"
                    onClick={(e) => handleOpenSettings(e, biz)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[#212121] dark:text-[#ECECEC] hover:bg-[#ECECEC] dark:hover:bg-zinc-800 transition-colors"
                    title="Configuración de esta sede"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="primary"
                    intent="workspaces.enter"
                    onClick={() => handleSelectBusiness(biz.id)}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <span>{isActive ? "Panel Activo" : "Ingresar"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add New Business / Franchise Card */}
          <div
            onClick={() => navigate("/onboarding")}
            className="p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] transition-all cursor-pointer flex items-center justify-between group bg-white/40 dark:bg-zinc-900/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[#FF3F1A] shadow-2xs group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#212121] dark:text-[#ECECEC] group-hover:text-[#FF3F1A] transition-colors">
                  Añadir Nueva Sede o Sucursal
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Conecta una nueva franquicia, sucursal virtual o tienda comercial a Necto.
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-lg bg-[#190088] text-white flex items-center justify-center group-hover:bg-[#FF3F1A] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </main>
    )}


      {/* Settings Modals */}
      <BusinessSettingsModal
        business={selectedBusinessForSettings}
        isOpen={Boolean(selectedBusinessForSettings)}
        onClose={() => setSelectedBusinessForSettings(null)}
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />

      <RoleSelectionModal
        business={roleSelectBiz}
        isOpen={Boolean(roleSelectBiz)}
        onClose={() => setRoleSelectBiz(null)}
      />

      <CommandPalette />
    </div>
  );
}


