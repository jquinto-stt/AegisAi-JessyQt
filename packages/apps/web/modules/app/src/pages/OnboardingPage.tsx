import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, NectoModuleKey } from "../context/BusinessContext";
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
  Zap,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Shield,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Globe,
} from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState<number>(4); // Default on Step 4 as shown in screenshot

  // Form State
  const [name, setName] = useState("Burger House");
  const [city, setCity] = useState("Bogotá, Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [phone, setPhone] = useState("+57 300 123 4567");
  const [userName, setUserName] = useState("Administrador");
  const [userEmail, setUserEmail] = useState("admin@necto.app");
  const [isMetaConnected, setIsMetaConnected] = useState(false);

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
    { num: 1, label: "Cuenta" },
    { num: 2, label: "Verificación" },
    { num: 3, label: "Negocio" },
    { num: 4, label: "WhatsApp" },
    { num: 5, label: "Configuración" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Header */}
      <header className="px-6 sm:px-14 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter shadow-2xs">
            N
          </div>
          <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
            Necto
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

      {/* Main Container with Horizontal Stepper */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 flex flex-col justify-center">
        {/* Horizontal Top Stepper */}
        <div className="w-full max-w-2xl mx-auto flex items-center justify-between relative px-2">
          {steps.map((s, idx) => {
            const isPassed = s.num < step;
            const isCurrent = s.num === step;

            return (
              <React.Fragment key={s.num}>
                {/* Step Circle & Label */}
                <div
                  onClick={() => setStep(s.num)}
                  className="flex flex-col items-center gap-1.5 z-10 cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                      isCurrent
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-4 ring-zinc-950/10 dark:ring-white/10"
                        : isPassed
                        ? "bg-[#FF3F1A] text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-mono transition-colors ${
                      isCurrent
                        ? "text-zinc-950 dark:text-zinc-50 font-bold"
                        : isPassed
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connecting Line between steps */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
                      s.num < step ? "bg-[#FF3F1A]" : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 4: WHATSAPP (Exact Match to New Screenshot) */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            {/* Split Main Card */}
            <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
              {/* Left Column (Content & Actions) */}
              <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] border border-orange-200/60 dark:border-orange-900/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span>Paso Recomendado</span>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      Conecta tu cuenta de WhatsApp
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Necto utiliza la API oficial de WhatsApp Business a través de Meta para garantizar la máxima fiabilidad, seguridad y cumplimiento en tus operaciones.
                    </p>
                  </div>

                  {/* Value Proposition Rows */}
                  <div className="space-y-2.5 pt-2">
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Activación instantánea
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Configura tu número y comienza a recibir pedidos en minutos.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          API oficial Cloud
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Escalabilidad ilimitada y cumplimiento total con las políticas de Meta.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Gestión centralizada
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Recibe y responde mensajes directamente desde tu tablero de Necto.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons & Notice */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMetaConnected(true);
                        setTimeout(() => setStep(5), 600);
                      }}
                      className="py-3 px-6 rounded-2xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      {isMetaConnected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Conectado con Meta</span>
                        </>
                      ) : (
                        <span>Conectar con Meta</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="py-3 px-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Configurar más tarde
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Shield className="w-3 h-3 text-zinc-400" />
                    <span>Tus datos están protegidos por encriptación de extremo a extremo y políticas de Meta.</span>
                  </p>
                </div>
              </div>

              {/* Right Column (Visual Meta Showcase) */}
              <div className="md:col-span-5 bg-gradient-to-br from-zinc-50 to-orange-50/30 dark:from-zinc-900 dark:to-orange-950/20 p-8 flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-zinc-200/80 dark:border-zinc-800/80">
                <div className="w-44 h-44 rounded-3xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 p-5 flex flex-col items-center justify-center gap-3 group hover:scale-102 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-md font-black text-xl">
                    N
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-zinc-400">
                    <span>X</span>
                    <span className="text-blue-500 font-black">Meta</span>
                  </div>
                </div>

                <div className="mt-6 space-y-1">
                  <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF3F1A]">
                    NECTO X META
                  </p>
                  <p className="text-xs text-zinc-400 italic max-w-[220px]">
                    "La forma más potente de conectar con tus clientes."
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom FAQ Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 flex items-start gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center flex-none">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    ¿Qué necesito para empezar?
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Necesitarás un número de teléfono que no esté asociado a una cuenta personal de WhatsApp activa.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 flex items-start gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center flex-none">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Seguridad y Cumplimiento
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Necto cumple con GDPR e infraestructuras seguras para manejar las conversaciones de tus clientes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIGURACIÓN / MÓDULOS */}
        {step === 5 && (
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-10 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
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
                        ? "bg-zinc-50/90 dark:bg-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-xs"
                        : "bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                    }`}
                  >
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

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Regresar a WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="py-3 px-8 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Finalizar e Ingresar al Espacio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: CUENTA */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-10 space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
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
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-6 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFICACIÓN */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-10 space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Verificación & Región
            </h2>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-none" />
              <span>Cuenta verificada correctamente con protocolo de datos seguro.</span>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-2.5 px-6 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: NEGOCIO */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-10 space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
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
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="py-2.5 px-6 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
