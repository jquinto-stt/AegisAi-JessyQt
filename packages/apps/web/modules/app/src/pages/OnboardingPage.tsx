import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, NectoModuleKey, BusinessType, BusinessIconKey } from "../context/BusinessContext";
import {
  Users,
  ShoppingBag,
  Calendar,
  Bookmark,
  Package,
  Clock,
  Check,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  Building2,
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
  MapPin,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState<number>(5); // Default to Step 5 as in Figma, allowing navigation across 1-5

  // Form State
  const [name, setName] = useState("Burger House");
  const [city, setCity] = useState("Bogotá, Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [phone, setPhone] = useState("+57 300 123 4567");
  const [userName, setUserName] = useState("Administrador");
  const [userEmail, setUserEmail] = useState("admin@necto.app");

  // Modules Selection (Step 5)
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>([
    "referidos",
    "pedidos",
    "inventarios",
  ]);

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleFinish = () => {
    createBusiness({
      name: name.trim() || "Mi Negocio",
      slug: (name || "mi-negocio")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      businessType: "restaurant_virtual",
      iconKey: "utensils",
      currency,
      city,
      channels: {
        whatsapp: true,
        web: true,
        pos: true,
      },
      kitchenBufferMin: 20,
      specialty: "Gastronomía & Pedidos",
      activeModules: selectedModules,
    });

    navigate("/");
  };

  // Modules Definition matching Figma
  const modulesList: Array<{
    id: NectoModuleKey;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "referidos",
      title: "Referidos",
      description:
        "Gestiona programas de lealtad y recomendaciones de clientes para atraer nuevas ventas.",
      icon: Users,
    },
    {
      id: "pedidos",
      title: "Pedidos",
      description:
        "Control centralizado de órdenes entrantes, estados de entrega y facturación rápida.",
      icon: ShoppingBag,
    },
    {
      id: "agendamiento",
      title: "Agendamiento",
      description:
        "Organiza citas y servicios con un calendario inteligente integrado con tu equipo.",
      icon: Calendar,
    },
    {
      id: "reservas",
      title: "Reservas",
      description:
        "Sistema especializado para locales físicos que requieren gestión de espacios y mesas.",
      icon: Bookmark,
    },
    {
      id: "inventarios",
      title: "Inventarios",
      description:
        "Seguimiento en tiempo real de stock, alertas de agotados y reportes de insumos.",
      icon: Package,
    },
    {
      id: "turnos",
      title: "Turnos",
      description:
        "Optimiza la jornada laboral de tu personal con cuadrantes y rotaciones automatizadas.",
      icon: Clock,
    },
  ];

  const steps = [
    { num: 1, label: "Cuenta", title: "Crea tu cuenta de acceso", desc: "Datos de usuario y credenciales del propietario." },
    { num: 2, label: "Verificación", title: "Verificación de seguridad", desc: "Confirma tu país, región y protocolo de datos." },
    { num: 3, label: "Negocio", title: "Identidad de tu negocio", desc: "Nombre de tu marca, sucursal, ciudad y moneda." },
    { num: 4, label: "WhatsApp", title: "Conexión de WhatsApp IA", desc: "Enlaza la línea oficial para el asistente inteligente." },
    { num: 5, label: "Configuración", title: "Configura tu espacio de trabajo", desc: "Selecciona los módulos que mejor se adapten a las necesidades de tu negocio. Podrás activarlos o desactivarlos más adelante desde los ajustes." },
  ];

  const currentStepInfo = steps.find(s => s.num === step) || steps[4];

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#0E0E10] text-[#1E1E24] dark:text-[#E4E4E7] flex flex-col font-sans selection:bg-[#E53E3E] selection:text-white antialiased">
      {/* Top Bar matching Figma */}
      <header className="px-8 sm:px-14 py-5 border-b border-[#EBEBEA] dark:border-zinc-800/80 bg-[#FBFBFA]/90 dark:bg-[#0E0E10]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        {/* Necto Brand with Red Node Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E53E3E] text-white flex items-center justify-center shadow-xs">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M12 9v3m-3.5 2.5L12 12m3.5 2.5L12 12" />
            </svg>
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#E53E3E]">
            Necto
          </span>
        </div>

        {/* Right Help / Actions */}
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold tracking-wide transition-colors cursor-pointer"
          >
            ¿NECESITAS AYUDA?
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <button
            type="button"
            onClick={() => navigate(businesses.length > 0 ? "/workspaces" : "/")}
            className="px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
          >
            {businesses.length > 0 ? "Mis Espacios" : "Cerrar Sesión"}
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* LEFT COLUMN: Stepper & Step Info */}
        <div className="lg:col-span-4 space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE8E8] dark:bg-red-950/40 text-[#E53E3E] text-[11px] font-extrabold tracking-wide uppercase">
            <Sparkles className="w-3 h-3" />
            <span>PERSONALIZACIÓN</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-zinc-50 tracking-tight leading-tight">
              {currentStepInfo.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {currentStepInfo.desc}
            </p>
          </div>

          {/* Vertical Stepper with Connecting Line */}
          <div className="relative pl-2 pt-2 space-y-6">
            {/* Connecting Vertical Line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[#E53E3E]/30" />

            {steps.map(s => {
              const isPassed = s.num < step;
              const isCurrent = s.num === step;

              return (
                <div
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className="flex items-center gap-3.5 relative z-10 cursor-pointer group"
                >
                  {/* Circle Indicator */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                      isCurrent
                        ? "bg-[#E53E3E] text-white ring-4 ring-[#E53E3E]/20"
                        : isPassed
                        ? "bg-[#FDE8E8] dark:bg-red-950/60 text-[#E53E3E] border border-[#E53E3E]"
                        : "bg-white dark:bg-zinc-800 text-zinc-400 border border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>

                  {/* Label */}
                  <div className="text-xs">
                    <p
                      className={`font-bold tracking-tight transition-colors ${
                        isCurrent
                          ? "text-[#E53E3E]"
                          : isPassed
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-400"
                      }`}
                    >
                      PASO {s.num}
                    </p>
                    <p
                      className={`text-xs ${
                        isCurrent
                          ? "font-extrabold text-zinc-950 dark:text-zinc-50"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Step Content */}
        <div className="lg:col-span-8 space-y-8 flex flex-col justify-between min-h-[520px]">
          {/* STEP 5: MÓDULOS DISPONIBLES (Exact Figma Screen) */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                    Módulos Disponibles
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedModules.length} de {modulesList.length} seleccionados
                  </p>
                </div>

                <button
                  type="button"
                  className="text-xs text-[#E53E3E] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configuración avanzada</span>
                </button>
              </div>

              {/* 6-Module Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {modulesList.map(mod => {
                  const isSelected = selectedModules.includes(mod.id);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleModule(mod.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 min-h-[170px] relative group ${
                        isSelected
                          ? "border-[#E53E3E] bg-[#FFF5F5] dark:bg-red-950/20 shadow-xs"
                          : "border-[#EBEBEA] dark:border-zinc-800 bg-white dark:bg-[#16161A] hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {/* Top Row: Icon + Checkmark */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#E53E3E] text-white"
                              : "bg-[#F3F4F6] dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Top-Right Round Check Badge */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-2 border-[#E53E3E] text-[#E53E3E] bg-white dark:bg-zinc-900"
                              : "border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-40"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                          {mod.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: CUENTA */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-[#16161A] p-6 sm:p-8 rounded-3xl border border-[#EBEBEA] dark:border-zinc-800 shadow-2xs">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
                Información del Propietario
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFICACIÓN */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-[#16161A] p-6 sm:p-8 rounded-3xl border border-[#EBEBEA] dark:border-zinc-800 shadow-2xs">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
                Verificación & Región
              </h2>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-none" />
                <span>Cuenta verificada correctamente con protocolo de datos seguro.</span>
              </div>
            </div>
          )}

          {/* STEP 3: NEGOCIO */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-[#16161A] p-6 sm:p-8 rounded-3xl border border-[#EBEBEA] dark:border-zinc-800 shadow-2xs">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
                Datos del Negocio
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nombre del Negocio / Sede
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Burger House"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Moneda
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E] cursor-pointer"
                    >
                      <option value="COP">COP ($)</option>
                      <option value="USD">USD ($)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="ARS">ARS ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WHATSAPP */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-[#16161A] p-6 sm:p-8 rounded-3xl border border-[#EBEBEA] dark:border-zinc-800 shadow-2xs">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
                Línea de WhatsApp para Agente IA
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Número de WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-[#E53E3E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM ACTIONS BAR matching Figma */}
          <div className="pt-6 flex items-center justify-between gap-4 mt-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Regresar al Paso {step - 1}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step === 5 && (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Omitir por ahora
                </button>
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  className="px-7 py-2.5 rounded-full bg-[#E53E3E] hover:bg-[#D32F2F] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-7 py-2.5 rounded-full bg-[#E53E3E] hover:bg-[#D32F2F] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
