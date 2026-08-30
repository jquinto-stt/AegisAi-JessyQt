import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessInstance } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import { BusinessSettingsModal } from "../compositions/workspace/BusinessSettingsModal";
import { AccountSettingsModal } from "../compositions/workspace/AccountSettingsModal";
import {
  Store,
  Plus,
  ArrowRight,
  Sparkles,
  MapPin,
  Coins,
  MessageSquare,
  Globe,
  ShoppingBag,
  Building2,
  CheckCircle2,
  Layers,
  Settings,
  User,
  ShieldCheck,
} from "lucide-react";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, activeBusinessId, switchBusiness } = useBusiness();

  // Settings State
  const [selectedBusinessForSettings, setSelectedBusinessForSettings] = useState<BusinessInstance | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  const handleSelectBusiness = (id: string) => {
    switchBusiness(id);
    navigate("/");
  };

  const handleOpenBusinessSettings = (e: React.MouseEvent, biz: BusinessInstance) => {
    e.stopPropagation();
    setSelectedBusinessForSettings(biz);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Header */}
      <header className="px-6 sm:px-10 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter shadow-2xs">
            N
          </div>
          <div>
            <span className="font-extrabold text-xs tracking-tight text-zinc-900 dark:text-white">
              Necto Hub
            </span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs text-zinc-400 font-medium">Gestión de Negocios</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Account / User Settings Button */}
          <button
            onClick={() => setIsAccountSettingsOpen(true)}
            className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ajustes de cuenta y perfil de usuario"
          >
            <User className="w-4 h-4 text-zinc-500" />
            <span className="hidden sm:inline">Ajustes de Cuenta</span>
          </button>

          {/* New Business Button */}
          <button
            onClick={() => navigate("/onboarding")}
            className="py-2 px-4 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Negocio</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-8">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/60 text-[#FF3F1A] text-[10px] font-black uppercase tracking-wider font-mono">
            <Layers className="w-3 h-3" />
            <span>Espacios de Trabajo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
            Tus Negocios & Sucursales
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
            Cada negocio opera de forma totalmente aislada con sus propios canales, comandas, tiempos de cocina y stock.
          </p>
        </div>

        {/* Businesses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {businesses.map(biz => {
            const isActive = biz.id === activeBusinessId;

            return (
              <div
                key={biz.id}
                onClick={() => handleSelectBusiness(biz.id)}
                className={`p-6 rounded-3xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer flex flex-col justify-between gap-5 hover:scale-101 shadow-2xs group ${
                  isActive
                    ? "border-[#FF3F1A] ring-2 ring-orange-500/10 shadow-sm"
                    : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                        <BusinessIcon iconKey={biz.iconKey} className="w-5 h-5 text-[#FF3F1A]" />
                      </div>
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] border border-orange-200/80 dark:border-orange-900/60 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>

                    {/* Isolated Business Settings Button */}
                    <button
                      type="button"
                      onClick={e => handleOpenBusinessSettings(e, biz)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={`Ajustes de ${biz.name}`}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 group-hover:text-[#FF3F1A] transition-colors tracking-tight">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                      {biz.specialty || "Gastronomía & Pedidos"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" />
                      {biz.city}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" />
                      {biz.currency}
                    </span>
                  </div>
                </div>

                {/* Footer of Card */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    {biz.channels.whatsapp && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" title="WhatsApp IA Activo" />}
                    {biz.channels.web && <Globe className="w-3.5 h-3.5 text-blue-500" title="Menú Web Activo" />}
                    {biz.channels.pos && <ShoppingBag className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" title="POS Activo" />}
                  </div>

                  <span className="flex items-center gap-1 text-[#FF3F1A] font-black group-hover:translate-x-1 transition-transform">
                    Abrir Espacio <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Create Business CTA Card */}
          <div
            onClick={() => navigate("/onboarding")}
            className="p-6 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700/80 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] bg-transparent hover:bg-orange-50/10 dark:hover:bg-orange-950/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 min-h-[220px] group"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-[#FF3F1A] group-hover:text-white text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-950 dark:text-zinc-50 group-hover:text-[#FF3F1A] transition-colors">
                Crear Nuevo Negocio
              </h3>
              <p className="text-[11px] text-zinc-400 max-w-[200px] mt-0.5">
                Configura una nueva sucursal o marca de restaurante.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals for Settings */}
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
