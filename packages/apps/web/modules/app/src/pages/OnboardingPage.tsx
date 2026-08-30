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
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState<number>(5);

  // Form State
  const [name, setName] = useState("Burger House");
  const [city, setCity] = useState("Bogotá, Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [phone, setPhone] = useState("+57 300 123 4567");
  const [userName, setUserName] = useState("Administrador");
  const [userEmail, setUserEmail] = useState("admin@necto.app");

  // Modules Selection (Step 5)
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>([
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

  const modulesList: Array<{
    id: NectoModuleKey;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "pedidos",
      title: "Pedidos",
      description:
        "Control centralizado de órdenes entrantes, estados de entrega y facturación rápida.",
      icon: ShoppingBag,
    },
    {
      id: "inventarios",
      title: "Inventarios",
      description:
        "Seguimiento en tiempo real de stock, alertas de agotados y reportes de insumos.",
      icon: Package,
    },
    {
      id: "reservas",
      title: "Reservas",
      description:
        "Sistema especializado para locales físicos que requieren gestión de espacios y mesas.",
      icon: Bookmark,
    },
    {
      id: "agendamiento",
      title: "Agendamiento",
      description:
        "Organiza citas y servicios con un calendario inteligente integrado con tu equipo.",
      icon: Calendar,
    },
    {
      id: "turnos",
      title: "Turnos",
      description:
        "Optimiza la jornada laboral de tu personal con cuadrantes y rotaciones automatizadas.",
      icon: Clock,
    },
    {
      id: "referidos",
      title: "Referidos",
      description:
        "Gestiona programas de lealtad y recomendaciones de clientes para atraer nuevas ventas.",
      icon: Users,
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Hairline Progress */}
      <div className="w-full bg-zinc-200/80 dark:bg-zinc-800/80 h-0.5 fixed top-0 left-0 right-0 z-50">
        <div
          className="bg-[#FF3F1A] h-full transition-all duration-500 ease-out"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Top Header */}
      <header className="px-8 sm:px-14 py-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter shadow-xs">
            N
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Necto Platform
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {businesses.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/workspaces")}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancelar y volver
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* LEFT COLUMN: Stepper & Step Info */}
        <div className="lg:col-span-4 space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono uppercase tracking-wider">
            <span>PASO 0{step} / 05</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight leading-tight">
              {currentStepInfo.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              {currentStepInfo.desc}
            </p>
          </div>

          {/* Vertical Stepper */}
          <div className="relative pl-2 pt-2 space-y-6">
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-800" />

            {steps.map(s => {
              const isPassed = s.num < step;
              const isCurrent = s.num === step;

              return (
                <div
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className="flex items-center gap-3.5 relative z-10 cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all shadow-2xs ${
                      isCurrent
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-2 ring-zinc-950/20 dark:ring-white/20"
                        : isPassed
                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>

                  <div className="text-xs">
                    <p className={`font-mono text-[10px] uppercase tracking-wider ${isCurrent ? "text-[#FF3F1A] font-bold" : "text-zinc-400"}`}>
                      PASO {s.num}
                    </p>
                    <p
                      className={`text-xs ${
                        isCurrent
                          ? "font-semibold text-zinc-950 dark:text-zinc-50"
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

        {/* RIGHT COLUMN: Step Content */}
        <div className="lg:col-span-8 space-y-8 flex flex-col justify-between min-h-[520px]">
          {/* STEP 5: MÓDULOS DISPONIBLES */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                    Módulos Disponibles
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                    {selectedModules.length} de {modulesList.length} seleccionados
                  </p>
                </div>
              </div>

              {/* 6-Module Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {modulesList.map(mod => {
                  const isSelected = selectedModules.includes(mod.id);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleModule(mod.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 min-h-[170px] relative group ${
                        isSelected
                          ? "bg-white dark:bg-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-xs"
                          : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                      }`}
                    >
                      {/* Top Row: Icon + Checkmark */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#FF3F1A] text-white"
                              : "border border-zinc-300 dark:border-zinc-700 opacity-0 group-hover:opacity-40"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
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
            <div className="space-y-6 animate-fade-in bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Información del Propietario
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFICACIÓN */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Verificación & Región
              </h2>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-none" />
                <span>Cuenta verificada correctamente con protocolo de datos seguro.</span>
              </div>
            </div>
          )}

          {/* STEP 3: NEGOCIO */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Datos del Negocio
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Nombre del Negocio / Sede
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Burger House"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Moneda
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-zinc-400 cursor-pointer"
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
            <div className="space-y-6 animate-fade-in bg-white dark:bg-zinc-900/60 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Línea de WhatsApp para Agente IA
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Número de WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM ACTIONS BAR */}
          <div className="pt-6 flex items-center justify-between gap-4 mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso anterior</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  className="py-3 px-7 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="py-3 px-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Finalizar e Ingresar</span>
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
