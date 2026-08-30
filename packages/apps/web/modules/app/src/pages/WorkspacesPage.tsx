import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { AccountSettingsModal } from "../compositions/workspace/AccountSettingsModal";
import {
  Plus,
  ArrowRight,
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
} from "lucide-react";

import { NectoLogo } from "../compositions/shared/NectoLogo";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, activeBusinessId, switchBusiness } = useBusiness();

  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Minimal Header */}
      <header className="px-8 sm:px-16 py-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NectoLogo size="xs" inline />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAccountSettingsOpen(true)}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <User className="w-3.5 h-3.5" />
            <span>Cuenta</span>
          </button>

          <button
            onClick={() => navigate("/onboarding")}
            className="py-2 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Negocio</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
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
            Selecciona un negocio para entrar al panel de operaciones o administra los parámetros de cada sucursal.
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
                className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-xs"
                    : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {/* Left Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                      {biz.name}
                    </h3>
                    {isActive ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                        ACTIVO
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
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

                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:self-center flex-none pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={e => handleOpenSettings(e, biz)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={`Ajustes de ${biz.name}`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectBusiness(biz.id)}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-[#FF3F1A] text-white hover:bg-[#e03413] shadow-xs"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
    </div>
  );
}
