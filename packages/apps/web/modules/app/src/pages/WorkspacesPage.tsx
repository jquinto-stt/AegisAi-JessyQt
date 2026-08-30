import React from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
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
} from "lucide-react";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { businesses, activeBusinessId, switchBusiness } = useBusiness();

  const handleSelectBusiness = (id: string) => {
    switchBusiness(id);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#212121] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#190088] dark:border-[#FF3F1A] flex items-center justify-center shadow-xs select-none">
            <span className="font-black text-xl text-[#FF3F1A] tracking-tighter">N</span>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white">
              Necto Hub
            </span>
            <span className="ml-2 text-xs text-zinc-400 font-mono">Selector de Negocios</span>
          </div>
        </div>

        <button
          onClick={() => navigate("/onboarding")}
          className="py-2 px-4 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Negocio</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3F1A]">
            Plataforma Multi-Negocio
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
            Tus Espacios de Trabajo
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Selecciona un negocio para gestionar sus pedidos, cocina y catálogo, o crea una nueva sucursal.
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
                className={`p-6 rounded-3xl bg-white dark:bg-[#212121] border-2 transition-all cursor-pointer flex flex-col justify-between gap-5 hover:scale-101 shadow-xs group ${
                  isActive
                    ? "border-[#FF3F1A] ring-2 ring-orange-500/10 shadow-sm"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl p-2 rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
                      {biz.logoEmoji || "🍔"}
                    </span>
                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] border border-orange-200 dark:border-orange-900 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                        Restaurante
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {biz.specialty || "Gastronomía & Pedidos"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" />
                      {biz.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" />
                      {biz.currency}
                    </span>
                  </div>
                </div>

                {/* Footer of Card */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    {biz.channels.whatsapp && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" title="WhatsApp IA Activo" />}
                    {biz.channels.web && <Globe className="w-3.5 h-3.5 text-blue-500" title="Menú Web Activo" />}
                    {biz.channels.pos && <ShoppingBag className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" title="POS Activo" />}
                  </div>

                  <span className="flex items-center gap-1 text-[#FF3F1A] font-extrabold group-hover:translate-x-1 transition-transform">
                    Abrir Espacio <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Create Business CTA Card */}
          <div
            onClick={() => navigate("/onboarding")}
            className="p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#FF3F1A] dark:hover:border-[#FF3F1A] bg-transparent hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-[#FF3F1A] group-hover:text-white text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                Crear Nuevo Negocio
              </h3>
              <p className="text-[11px] text-zinc-400 max-w-[220px] mt-0.5">
                Configura un nuevo restaurante, dark kitchen o sucursal.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
