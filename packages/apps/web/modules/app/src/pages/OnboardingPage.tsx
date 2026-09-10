import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBusiness,
  NectoModuleKey,
} from "../context/BusinessContext";
import { NectoLogo } from "../compositions/shared/NectoLogo";
import { Button, Badge } from "@/elements";
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
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Store,
  Activity,
  Layers,
  CheckCircle2,
  Smartphone,
  Globe,
  Bell,
  Sparkles,
  Info,
} from "lucide-react";

/* ── Module Definitions (Capacidades Plug & Play) ─────────────────────── */

interface ModuleConfig {
  id: NectoModuleKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  isRecommended?: boolean;
}

const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    id: "pedidos",
    title: "Sistema de Pedidos Omnicanal",
    description: "Recepción y flujo de pedidos por WhatsApp, Web y mostrador con Kanban y alistamiento en vivo.",
    icon: ShoppingBag,
    tag: "Ventas & Operación",
    isRecommended: true,
  },
  {
    id: "inventarios",
    title: "Inventario & Control de Stock",
    description: "Control de existencias, kardex de movimientos, compras a proveedores y alertas de reposición.",
    icon: Package,
    tag: "Logística & Stock",
    isRecommended: true,
  },
  {
    id: "turnos",
    title: "Turnos & Horarios Operativos",
    description: "Cuadrantes de rotación de personal, control de horarios y asignación por área de trabajo.",
    icon: Clock,
    tag: "Equipo & Turnos",
    isRecommended: false,
  },
  {
    id: "reservas",
    title: "Reservas de Espacios & Mesas",
    description: "Gestión de citas presenciales, asignación de boxes, mesas o salones según disponibilidad.",
    icon: Bookmark,
    tag: "Aforo & Espacios",
    isRecommended: false,
  },
  {
    id: "agendamiento",
    title: "Agendamiento & Citas",
    description: "Calendario sincronizado con reservas automáticas y confirmación directa con clientes.",
    icon: Calendar,
    tag: "Planificación",
    isRecommended: false,
  },
  {
    id: "referidos",
    title: "Programa de Fidelización & Clientes",
    description: "Registro de compradores, cupones dinámicos, tracking de recompra y fidelización.",
    icon: Users,
    tag: "Crecimiento & Clientes",
    isRecommended: false,
  },
];

const STEPS = [
  { num: 1, label: "Identidad de la Tienda", desc: "Datos básicos del contenedor" },
  { num: 2, label: "Capacidades Modulares", desc: "¿Qué deseas gestionar?" },
  { num: 3, label: "Lanzamiento", desc: "Resumen y acceso a la tienda" },
];

/* ── Main Component ─────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createBusiness } = useBusiness();
  const [step, setStep] = useState(1);

  // Store Container State (Nivel 1)
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Capabilities State (Nivel 2)
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>([
    "pedidos",
    "inventarios",
  ]);
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllRecommended = () => {
    setSelectedModules(["pedidos", "inventarios"]);
  };

  const handleClearModules = () => {
    setSelectedModules([]);
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
    setIsDeploying(true);
    setTimeout(() => {
      try {
        createBusiness({
          name: companyName.trim() || "Mi Tienda",
          slug: (companyName || "mi-tienda")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          businessType: "retail_store",
          iconKey: "store",
          currency: currencyForCountry(country),
          city: city ? `${city}, ${country}` : country,
          channels: { whatsapp: isMetaConnected, web: true, pos: true },
          kitchenBufferMin: 20,
          specialty: specialty.trim() || "Comercio & Operaciones",
          activeModules: selectedModules,
        });
        navigate("/");
      } catch (err) {
        console.error("Error creating business space:", err);
        setIsDeploying(false);
      }
    }, 600);
  };

  const canProceedStep1 = companyName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Standard Navigation Header */}
      <header className="h-14 px-4 sm:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NectoLogo size="xs" inline />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Arquitectura 3 Capas v3.0</span>
          </div>

          <Button
            variant="ghost"
            intent="onboarding.header.exit"
            onClick={() => navigate("/workspaces")}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white py-1.5 px-3"
          >
            Salir al Panel
          </Button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full">
        {/* Left Column: Wizard Form & Configuration Steps */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-8">
          <div className="space-y-8">
            {/* Step Navigation Bar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <span>Paso {step} de 3</span>
                <span>—</span>
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">
                  {STEPS[step - 1].label}
                </span>
              </div>

              {/* Step Progress Indicators */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {STEPS.map((s, idx) => {
                  const isCurrent = s.num === step;
                  const isPassed = s.num < step;

                  return (
                    <React.Fragment key={s.num}>
                      <Button
                        variant="ghost"
                        intent="onboarding.stepper.jump"
                        disabled={s.num > step && !canProceedStep1}
                        onClick={() => {
                          if (s.num < step || canProceedStep1) setStep(s.num);
                        }}
                        className={`flex items-center gap-2 text-xs font-mono transition-all text-left ${
                          isCurrent
                            ? "text-zinc-950 dark:text-white font-bold"
                            : isPassed
                            ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 cursor-pointer"
                            : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                            isCurrent
                              ? "bg-[#190088] text-white shadow-xs ring-2 ring-[#190088]/20"
                              : isPassed
                              ? "bg-[#FF3F1A] text-white"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                        </div>
                        <span className="hidden sm:inline">{s.label}</span>
                      </Button>

                      {idx < STEPS.length - 1 && (
                        <div
                          className={`h-px w-6 sm:w-10 transition-colors ${
                            s.num < step ? "bg-[#FF3F1A]" : "bg-zinc-200 dark:bg-zinc-800"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ─── STEP 1: IDENTIDAD DE LA TIENDA (EL CONTENEDOR PURO) ────── */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Store className="w-3.5 h-3.5" />
                    <span>Nivel 1 · Contenedor Universal</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#190088] dark:text-[#EFE6D3]">
                    Crea tu Tienda
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Define la identidad y datos base de tu nuevo espacio. La tienda funciona como un contenedor independiente listo para recibir capacidades.
                  </p>
                </div>

                {/* Form Fields */}
                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <span>Nombre Comercial de la Tienda</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Requerido</span>
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Zapatería Milano / Ferretería Central / Lumina Tech"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-[#190088] transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Country & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        País & Moneda Base
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
                        <select
                          value={country}
                          onChange={e => setCountry(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 cursor-pointer shadow-2xs"
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Ciudad / Ubicación
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Ej. Bogotá, Medellín, CDMX, Miami"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone & Specialty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Línea de Contacto / Teléfono
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                        <input
                          type="tel"
                          placeholder="+57 300 123 4567"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Especialidad o Rubro (Opcional)
                      </label>
                      <div className="relative flex items-center">
                        <Store className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Ej. Calzado & Moda, Materiales, Servicios..."
                          value={specialty}
                          onChange={e => setSpecialty(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transversal Store Features Card (Included by Default) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Capacidades Transversales Incluidas en la Tienda</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Nivel 1 Activo
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tu tienda nace con identidad propia, configuración regional, roles de equipo (Dueño, Administrador, Operador, Consulta), centro de notificaciones e integraciones sin depender de ningún módulo.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                      <span>Identidad & Marca</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                      <span>Horarios Globales</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                      <span>Alertas Centrales</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                      <span>Integraciones API</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: CAPACIDADES MODULARES (PLUG & PLAY) ───────────── */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF3F1A] text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Nivel 2 · Capacidades Plug & Play</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#190088] dark:text-[#EFE6D3]">
                    ¿Qué deseas gestionar en tu tienda?
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Los módulos son capacidades independientes que se agregan a tu contenedor. Puedes activar los que necesitas hoy o comenzar con la tienda limpia y agregarlos después.
                  </p>
                </div>

                {/* Quick Toggle Action Bar */}
                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="w-2 h-2 rounded-full bg-[#190088] dark:bg-[#97D6DF]" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedModules.length === 0
                        ? "Tienda limpia (0 capacidades seleccionadas)"
                        : `${selectedModules.length} capacidad(es) seleccionada(s)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedModules.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleClearModules}
                        className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Limpiar todos (Empezar en 0)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSelectAllRecommended}
                        className="text-xs font-semibold text-[#190088] dark:text-[#97D6DF] hover:underline px-3 py-1.5 rounded-xl hover:bg-[#190088]/10 transition-colors cursor-pointer"
                      >
                        Activar recomendados
                      </button>
                    )}
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {MODULE_DEFINITIONS.map(mod => {
                    const isSelected = selectedModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group ${
                          isSelected
                            ? "bg-[#190088]/5 dark:bg-[#190088]/20 border-[#190088] dark:border-[#190088]/70 ring-1 ring-[#190088]/30 shadow-xs"
                            : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#190088] text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:text-[#190088] dark:group-hover:text-white"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {mod.tag}
                            </span>
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "border border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                            {mod.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Information Callout */}
                <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
                  <Info className="w-4 h-4 text-[#190088] dark:text-[#97D6DF] mt-0.5 flex-none" />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <strong>Desacoplamiento total:</strong> Si no seleccionas ningún módulo, tu tienda se abrirá con el hub de módulos disponible para instalar capacidades en caliente con 1 solo clic.
                  </p>
                </div>
              </div>
            )}

            {/* ─── STEP 3: LANZAMIENTO Y CANAL WHATSAPP ───────────────────── */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Nivel 3 · Configuración & Lanzamiento</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#190088] dark:text-[#EFE6D3]">
                    Tu tienda está lista para despegar
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Revisa el resumen de tu espacio de trabajo antes de entrar al centro de mando.
                  </p>
                </div>

                {/* Store Passport Summary Card */}
                <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                        Espacio de Trabajo
                      </span>
                      <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                        {companyName.trim() || "Mi Tienda"}
                      </h3>
                    </div>
                    <Badge variant="primary" intent="onboarding.passport.badge">
                      {currencyForCountry(country)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Ubicación</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {city ? `${city}, ${country}` : country}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Contacto</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {contactPhone || "Línea por configurar"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Especialidad</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {specialty || "Comercio & Operaciones"}
                      </span>
                    </div>
                  </div>

                  {/* Active Capabilities Summary */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Capacidades a Instalar:
                    </span>
                    {selectedModules.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedModules.map(m => {
                          const def = MODULE_DEFINITIONS.find(d => d.id === m);
                          return (
                            <span
                              key={m}
                              className="px-2.5 py-1 rounded-lg bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] text-xs font-bold border border-[#190088]/20 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                              <span>{def?.title || m}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <Store className="w-4 h-4 text-amber-600 flex-none" />
                        <span>Tienda Limpia: No se instalarán módulos iniciales. Podrás activarlos cuando desees.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional WhatsApp Quick Connect if Pedidos is selected */}
                {selectedModules.includes("pedidos") && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-none">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                          Conexión Opcional con WhatsApp Web
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {isMetaConnected
                            ? "Canal vinculado con éxito. Podrás calibrar el tono y respuestas en Ajustes."
                            : "Vincúlalo ahora o déjalo para más adelante desde los ajustes de la tienda."}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={isMetaConnected ? "outline" : "primary"}
                      intent="onboarding.whatsapp.connect"
                      onClick={() => {
                        window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
                        setIsMetaConnected(true);
                      }}
                      className="text-xs font-bold py-2 px-4 rounded-xl cursor-pointer flex-none"
                    >
                      {isMetaConnected ? "Reabrir WhatsApp Web" : "Conectar WhatsApp Web"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wizard Footer Navigation */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="ghost"
                intent="onboarding.step.prev"
                onClick={() => setStep(step - 1)}
                className="py-2.5 px-4 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso Anterior</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                intent="onboarding.step.cancel"
                onClick={() => navigate("/workspaces")}
                className="py-2.5 px-4 text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar / Volver</span>
              </Button>
            )}

            {step < 3 ? (
              <Button
                variant="primary"
                intent="onboarding.step.next"
                disabled={step === 1 && !canProceedStep1}
                onClick={() => setStep(step + 1)}
                className="py-3 px-7 text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03412] text-white shadow-md cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="accent"
                intent="onboarding.finish"
                disabled={isDeploying}
                onClick={handleFinish}
                className="py-3 px-8 text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03412] text-white shadow-md cursor-pointer"
              >
                {isDeploying ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Configurando Espacio...</span>
                  </>
                ) : (
                  <>
                    <span>Finalizar & Entrar a mi Tienda</span>
                    <Store className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Visual Showcase */}
        <div className="lg:col-span-5 relative bg-zinc-950 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden border-t lg:border-t-0 min-h-[520px]">
          {/* High-Resolution Background Photography */}
          <img
            src={
              step === 1
                ? "/onboarding-modular-sync.jpg"
                : step === 2
                ? "/onboarding-operations.jpg"
                : "/onboarding-whatsapp-orders.jpg"
            }
            alt="Necto Core Architecture"
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all duration-700 scale-100"
          />

          {/* Soft Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF3F1A]/15 via-transparent to-black/40 pointer-events-none" />

          {/* Top Brand & Trust Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-sm">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Arquitectura 3 Capas</span>
            </div>

            <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
              Necto Core
            </span>
          </div>

          {/* Center Value Content */}
          <div className="relative z-10 space-y-6 my-auto py-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-400 px-3 py-1 rounded-lg bg-orange-500/20 backdrop-blur-md border border-orange-500/40 inline-block shadow-sm">
                {step === 1
                  ? "Espacio de Trabajo Universal"
                  : step === 2
                  ? "Capacidades Plug & Play"
                  : "Tu Tienda en Vivo"}
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                {step === 1
                  ? `La tienda es el contenedor. Las capacidades se agregan después.`
                  : step === 2
                  ? "Enciende únicamente los módulos que requieres hoy."
                  : "Tu espacio de trabajo está listo para recibir operaciones."}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-md drop-shadow-sm font-medium">
                {step === 1
                  ? "Crea tu espacio con identidad limpia, roles transversales e integraciones. Cero suposiciones de industria."
                  : step === 2
                  ? "Los módulos son capacidades independientes. Si necesitas pedidos, inventario o turnos, los activas sin rehacer tu configuración."
                  : "Acceso inmediato al centro de operaciones, catálogo de módulos y administración transversal."}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>0 Módulos</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-snug">
                  La tienda funciona por sí sola con sus roles y configuración base.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Plug & Play</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-snug">
                  Activa o remueve capacidades en cualquier momento sin fricción.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Seguro</span>
            </span>
            <span className="font-mono text-zinc-500">v3.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
