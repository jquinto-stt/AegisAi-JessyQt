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
  Zap,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Shield,
  Building2,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  UtensilsCrossed,
  Store,
} from "lucide-react";

/* ── Business Archetypes ─────────────────────────────────────────────── */

const ARCHETYPES: Array<{
  id: BusinessType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultModules: NectoModuleKey[];
  iconKey: BusinessIconKey;
}> = [
  {
    id: "restaurant_virtual",
    title: "Restaurante & Gastronomía",
    subtitle:
      "Comandas en vivo, KDS de cocina, escandallos, delivery WhatsApp y POS mostrador.",
    icon: UtensilsCrossed,
    defaultModules: ["pedidos", "inventarios", "reservas"],
    iconKey: "utensils",
  },
  {
    id: "retail_store",
    title: "Comercio & Retail",
    subtitle:
      "Catálogo de productos, control de stock por SKU, ventas de mostrador y tienda web.",
    icon: Store,
    defaultModules: ["pedidos", "inventarios", "referidos"],
    iconKey: "store",
  },
  {
    id: "services",
    title: "Servicios & Citas",
    subtitle:
      "Agenda de turnos, gestión de especialistas, reservas online y recordatorios automáticos.",
    icon: Calendar,
    defaultModules: ["agendamiento", "turnos", "referidos"],
    iconKey: "coffee",
  },
];

const MODULES: Array<{
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
      "Sistema para locales físicos que requieren gestión de espacios y mesas.",
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

const STEPS = [
  { num: 1, label: "Tu Negocio" },
  { num: 2, label: "WhatsApp" },
  { num: 3, label: "Módulos" },
];

/* ── Component ───────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState(1);

  // Step 1: Business Identity
  const [businessModel, setBusinessModel] = useState<BusinessType>("restaurant_virtual");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2: WhatsApp
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  // Step 3: Modules (pre-loaded from archetype on step 1)
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>(
    ARCHETYPES[0].defaultModules
  );

  const handleSelectArchetype = (arch: (typeof ARCHETYPES)[0]) => {
    setBusinessModel(arch.id);
    setSelectedModules(arch.defaultModules);
  };

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const currencyForCountry = (c: string) => {
    const map: Record<string, "COP" | "USD" | "MXN" | "ARS"> = {
      Colombia: "COP",
      México: "MXN",
      Argentina: "ARS",
    };
    return map[c] || "USD";
  };

  const handleFinish = () => {
    const arch = ARCHETYPES.find(a => a.id === businessModel) || ARCHETYPES[0];

    createBusiness({
      name: companyName.trim() || "Mi Negocio",
      slug: (companyName || "mi-negocio")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      businessType: businessModel,
      iconKey: arch.iconKey,
      currency: currencyForCountry(country),
      city: city ? `${city}, ${country}` : country,
      channels: { whatsapp: true, web: true, pos: true },
      kitchenBufferMin: 20,
      specialty: arch.title,
      activeModules: selectedModules,
    });

    navigate("/");
  };

  const canProceedStep1 = companyName.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Header */}
      <header className="px-6 sm:px-14 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter shadow-2xs">
            N
          </div>
          <span className="font-bold text-xs tracking-tight">Necto</span>
        </div>

        {businesses.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 flex flex-col justify-center">
        {/* Horizontal Stepper */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between relative px-2">
          {STEPS.map((s, idx) => {
            const isPassed = s.num < step;
            const isCurrent = s.num === step;

            return (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1.5 z-10">
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

                {idx < STEPS.length - 1 && (
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

        {/* ─── STEP 1: TU NEGOCIO ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-1.5 max-w-lg mx-auto">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                ¿Qué tipo de negocio operas?
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Esto pre-configura automáticamente los módulos y herramientas de tu espacio.
              </p>
            </div>

            {/* Archetype Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ARCHETYPES.map(arch => {
                const isSelected = businessModel === arch.id;
                const Icon = arch.icon;

                return (
                  <div
                    key={arch.id}
                    onClick={() => handleSelectArchetype(arch)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[140px] ${
                      isSelected
                        ? "border-zinc-950 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div
                        className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#FF3F1A] text-white"
                            : "border border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50">
                        {arch.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        {arch.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Business Details Card */}
            <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-8 space-y-5">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nombre comercial
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Burger House"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              </div>

              {/* Country & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    País
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="Colombia">Colombia (COP $)</option>
                      <option value="México">México (MXN $)</option>
                      <option value="Estados Unidos">Estados Unidos (USD $)</option>
                      <option value="Argentina">Argentina (ARS $)</option>
                      <option value="Chile">Chile (CLP $)</option>
                      <option value="España">España (EUR €)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Ciudad
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Ej. Bogotá"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>
              </div>

              {/* Phone (optional, feeds into WhatsApp later) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Teléfono / WhatsApp (opcional)
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="+57 300 123 4567"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className={`py-3 px-8 rounded-2xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98 ${
                    canProceedStep1
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: WHATSAPP ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
              {/* Left Content */}
              <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] border border-orange-200/60 dark:border-orange-900/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span>Recomendado</span>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      Conecta tu cuenta de WhatsApp
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      API oficial de WhatsApp Business a través de Meta. Máxima fiabilidad, seguridad y cumplimiento.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {[
                      {
                        icon: Zap,
                        title: "Activación instantánea",
                        desc: "Configura tu número y comienza a recibir pedidos en minutos.",
                      },
                      {
                        icon: ShieldCheck,
                        title: "API oficial Cloud",
                        desc: "Escalabilidad ilimitada y cumplimiento con políticas de Meta.",
                      },
                      {
                        icon: MessageSquare,
                        title: "Gestión centralizada",
                        desc: "Recibe y responde mensajes desde tu tablero de Necto.",
                      },
                    ].map(item => (
                      <div
                        key={item.title}
                        className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF3F1A] flex items-center justify-center flex-none">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMetaConnected(true);
                        setTimeout(() => setStep(3), 600);
                      }}
                      className="py-3 px-6 rounded-2xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      {isMetaConnected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Conectado</span>
                        </>
                      ) : (
                        <span>Conectar con Meta</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="py-3 px-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Configurar más tarde
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver</span>
                    </button>

                    <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Shield className="w-3 h-3" />
                      <span>Encriptación de extremo a extremo</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Image */}
              <div className="md:col-span-5 relative overflow-hidden border-t md:border-t-0 md:border-l border-zinc-200/80 dark:border-zinc-800/80">
                <img
                  src="/whatsapp-meta-hero.jpg"
                  alt="Necto WhatsApp Business Integration"
                  className="w-full h-full object-cover min-h-[300px]"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF3F1A]">
                    NECTO X META
                  </p>
                  <p className="text-xs text-white/80 mt-0.5 max-w-[240px]">
                    La forma más potente de conectar con tus clientes.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Cards */}
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
                    Un número de teléfono que no esté asociado a una cuenta personal de WhatsApp.
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
                    Necto cumple con GDPR e infraestructuras seguras para las conversaciones de tus clientes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: MÓDULOS ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-10 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                Módulos de tu espacio
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                {selectedModules.length} de {MODULES.length} activos — Recomendados para{" "}
                {ARCHETYPES.find(a => a.id === businessModel)?.title || "tu negocio"}
              </p>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {MODULES.map(mod => {
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
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
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

            {/* Actions */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="py-3 px-8 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Crear Espacio de Trabajo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
