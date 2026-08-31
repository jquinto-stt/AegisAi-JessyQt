import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { AccountSettingsModal } from "../compositions/workspace/AccountSettingsModal";
import { CommandPalette } from "../compositions/workspace/CommandPalette";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Coins,
  MessageSquare,
  Globe,
  ShoppingBag,
  Settings,
  User,
  Check,
  Building2,
  Layers,
  ChevronRight,
  Sliders,
  Search,
  Sun,
  Moon,
} from "lucide-react";

import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { GlobalFranchiseOverview } from "../compositions/workspace/GlobalFranchiseOverview";


export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, activeBusiness, activeBusinessId, switchBusiness, setIsCommandPaletteOpen } = useBusiness();

  const [hubTab, setHubTab] = useState<"workspaces_list" | "franchise_overview">("franchise_overview");
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };


  const handleSelectBusiness = (id: string) => {
    switchBusiness(id);
    navigate("/");
  };

  const handleOpenSettings = (e: React.MouseEvent, biz: BusinessInstance) => {
    e.stopPropagation();
    setSelectedBusinessForSettings(biz);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Minimal Header */}
      <header className="px-4 sm:px-12 py-4 sm:py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <NectoLogo size="xs" inline />


          {/* Hub Navigation Tabs - Visible on all devices */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setHubTab("workspaces_list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hubTab === "workspaces_list"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Mis Locales ({businesses.length})</span>
            </button>
            <button
              onClick={() => setHubTab("franchise_overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hubTab === "franchise_overview"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Visión Franquicia</span>
            </button>
          </div>
        </div>


        <div className="flex items-center gap-2 sm:gap-2.5">
          <GlobalSearchButton />
          <ThemeToggle />

          <button
            onClick={() => setIsAccountSettingsOpen(true)}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cuenta</span>
          </button>
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
                    : "bg-white/70 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs"
                }`}
              >
                {/* Background Banner Watermark if uploaded */}
                {biz.bannerUrl && (
                  <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12] pointer-events-none overflow-hidden">
                    <img src={biz.bannerUrl} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-500" />
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
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
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
                          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        >
                          {m}
                        </span>
                      ))}

                      {/* Channels */}
                      {biz.channels.whatsapp && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                          <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                        </span>
                      )}
                      {biz.channels.web && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                          <Globe className="w-2.5 h-2.5" /> Web
                        </span>
                      )}
                    </div>
                  </div>
                </div>


                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:self-center flex-none pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={e => handleOpenSettings(e, biz)}
                    className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={`Configuración y eliminación de ${biz.name}`}
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-500 group-hover:rotate-45 transition-transform" />
                    <span>Ajustes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectBusiness(biz.id)}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isActive
                        ? "bg-[#FF3F1A] text-white hover:bg-[#e03413]"
                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white"
                    }`}
                  >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}

          {/* Add New Business Row */}
          <div
            onClick={() => navigate("/onboarding")}
            className="p-5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950 text-zinc-500 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                  Crear un nuevo restaurante o sucursal
                </p>
                <p className="text-xs text-zinc-400 font-mono">
                  Configura un espacio independiente en 2 minutos
                </p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
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

      <CommandPalette />
    </div>
  );
}

