import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, NectoModuleKey, BusinessType, BusinessIconKey } from "../context/BusinessContext";
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
  Zap,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Building2,
  MapPin,
  Phone,
  UtensilsCrossed,
  Store,
  Sparkles,
  Activity,
  Layers,
  CheckCircle2,
  QrCode,
  SlidersHorizontal,
} from "lucide-react";

/* ── Business Archetypes ─────────────────────────────────────────────── */

interface ArchetypeConfig {
  id: BusinessType;
  title: string;
  category: string;
  tagline: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultModules: NectoModuleKey[];
  iconKey: BusinessIconKey;
  features: string[];
  mockOrder: {
    id: string;
    item: string;
    detail: string;
    price: string;
    badge: string;
  };
}

const ARCHETYPES: ArchetypeConfig[] = [
  {
    id: "restaurant_virtual",
    title: "Restaurante & Gastronomía",
    category: "Food & Beverage",
    tagline: "KDS en cocina, comandas en tiempo real, escandallo y delivery WhatsApp.",
    image: "/onboarding-restaurant.jpg",
    icon: UtensilsCrossed,
    defaultModules: ["pedidos", "inventarios", "reservas"],
    iconKey: "utensils",
    features: ["KDS Cocina", "Escandallo Insumos", "Delivery WhatsApp", "POS Mesas"],
    mockOrder: {
      id: "ORD-9402",
      item: "Smash Burger Doble + Papas Rústicas",
      detail: "Mesa 4 · Sin cebolla · Bebida fría",
      price: "$34.500 COP",
      badge: "En Preparación",
    },
  },
  {
    id: "retail_store",
    title: "Comercio & Retail",
    category: "E-Commerce / Store",
    tagline: "Control de stock multialmacén, variantes por SKU y catálogo en línea sincronizado.",
    image: "/onboarding-retail.jpg",
    icon: Store,
    defaultModules: ["pedidos", "inventarios", "referidos"],
    iconKey: "store",
    features: ["Stock por SKU", "Venta de Mostrador", "Catálogo Web", "Fidelización"],
    mockOrder: {
      id: "VTA-1108",
      item: "Hoodie Oversize Heavyweight (Talla L)",
      detail: "Almacén Central · Envío Express",
      price: "$149.000 COP",
      badge: "Despachado",
    },
  },
  {
    id: "services",
    title: "Servicios & Citas",
    category: "Professional Services",
    tagline: "Agenda automatizada por especialista, turnos inteligentes y recordatorios vía WhatsApp.",
    image: "/onboarding-services.jpg",
    icon: Calendar,
    defaultModules: ["agendamiento", "turnos", "referidos"],
    iconKey: "coffee",
    features: ["Agenda de Citas", "Cuadrante de Turnos", "Recordatorio Auto", "Portal Clientes"],
    mockOrder: {
      id: "CTA-0391",
      item: "Mantenimiento & Sesión de Diagnóstico",
      detail: "Especialista asignado · 15:30 PM",
      price: "$120.000 COP",
      badge: "Confirmado",
    },
  },
];

const MODULE_DEFINITIONS: Array<{
  id: NectoModuleKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}> = [
  {
    id: "pedidos",
    title: "Pedidos & Comandas",
    description: "Flujo de venta unificado: WhatsApp, mostrador y mesa con actualización en vivo.",
    icon: ShoppingBag,
    tag: "Core Operativo",
  },
  {
    id: "inventarios",
    title: "Inventario & Insumos",
    description: "Descuento automático por receta, control de mermas y alertas de stock crítico.",
    icon: Package,
    tag: "Control de Costos",
  },
  {
    id: "reservas",
    title: "Reservas de Espacios",
    description: "Gestión de mesas, salones y asignación inteligente de zonas.",
    icon: Bookmark,
    tag: "Aforo & Mesas",
  },
  {
    id: "agendamiento",
    title: "Agendamiento & Citas",
    description: "Calendario sincronizado con reservas automáticas desde WhatsApp.",
    icon: Calendar,
    tag: "Planificación",
  },
  {
    id: "turnos",
    title: "Turnos de Personal",
    description: "Cuadrantes de rotación, control de asistencia y asignación por área.",
    icon: Clock,
    tag: "Equipo",
  },
  {
    id: "referidos",
    title: "Programa de Fidelización",
    description: "Cupones dinámicos, tracking de referidos y métricas de recompra.",
    icon: Users,
    tag: "Crecimiento",
  },
];

const STEPS = [
  { num: 1, label: "Identidad & Modelo", desc: "Configuración del negocio" },
  { num: 2, label: "Canal WhatsApp", desc: "Meta Business Cloud API" },
  { num: 3, label: "Arquitectura Modular", desc: "Módulos operativos" },
];

/* ── Main Component ─────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState(1);

  // Form State
  const [businessModel, setBusinessModel] = useState<BusinessType>("restaurant_virtual");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>(
    ARCHETYPES[0].defaultModules
  );
  const [isDeploying, setIsDeploying] = useState(false);

  // Active Archetype Details
  const activeArchetype = useMemo(() => {
    return ARCHETYPES.find(a => a.id === businessModel) || ARCHETYPES[0];
  }, [businessModel]);

  const handleSelectArchetype = (arch: ArchetypeConfig) => {
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
    setIsDeploying(true);
    setTimeout(() => {
      createBusiness({
        name: companyName.trim() || "Mi Negocio",
        slug: (companyName || "mi-negocio")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        businessType: businessModel,
        iconKey: activeArchetype.iconKey,
        currency: currencyForCountry(country),
        city: city ? `${city}, ${country}` : country,
        channels: { whatsapp: isMetaConnected, web: true, pos: true },
        kitchenBufferMin: 20,
        specialty: activeArchetype.title,
        activeModules: selectedModules,
      });
      navigate("/");
    }, 1000);
  };

  const canProceedStep1 = companyName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Navbar */}
      <header className="h-14 px-4 sm:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            intent="onboarding.back-btn"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </Button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <NectoLogo size="xs" inline />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SaaS Core v2.4</span>
          </div>

          <Button
            variant="outline"
            intent="onboarding.cancel-exit"
            onClick={() => navigate("/")}
            className="text-xs font-bold px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            Cancelar y salir
          </Button>
        </div>
      </header>

      {/* Main Grid Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-3.5rem)]">
        {/* Left Column: Interactive Wizard Controls (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 space-y-8 bg-white dark:bg-[#09090B]">
          <div className="space-y-8">
            {/* Stepper Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {STEPS.map((s, idx) => {
                  const isPassed = s.num < step;
                  const isCurrent = s.num === step;

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
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ring-zinc-950/10 dark:ring-white/10"
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

            {/* ─── STEP 1: IDENTIDAD Y MODELO DE NEGOCIO ──────────────────── */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    Configura tu espacio de operaciones
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Selecciona la arquitectura que mejor describe tu modelo de negocio. Necto pre-configurará los flujos y módulos óptimos.
                  </p>
                </div>

                {/* Archetype Selector */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF3F1A]" />
                    <span>Modelo Operativo</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ARCHETYPES.map(arch => {
                      const isSelected = businessModel === arch.id;
                      const Icon = arch.icon;

                      return (
                        <div
                          key={arch.id}
                          onClick={() => handleSelectArchetype(arch)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group ${
                            isSelected
                              ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-950 dark:border-[#FF3F1A]/80 ring-1 ring-zinc-950 dark:ring-[#FF3F1A]/50 shadow-sm"
                              : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-zinc-950 text-white dark:bg-[#FF3F1A]"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-zinc-200"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "border border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-zinc-950 dark:text-white tracking-tight">
                              {arch.title}
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                              {arch.tagline}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <span>Nombre Comercial del Negocio</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Requerido</span>
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Trattoria di Roma / Urban Bakery"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-[#FF3F1A] transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Country & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        País & Moneda
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
                        Ciudad / Región
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Ej. Bogotá, CDMX, Miami"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Línea de Atención / WhatsApp
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
                </div>

                {/* Step 1: Representative Archetype Showcase Card */}
                <div className="relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[190px] flex flex-col justify-end p-6">
                  {/* Photo Background */}
                  <img
                    src={activeArchetype.image}
                    alt={activeArchetype.title}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                  {/* Content */}
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF3F1A] px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-[#FF3F1A]/30">
                        {activeArchetype.category}
                      </span>
                      <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                        Configuración Optimizada
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white tracking-tight">
                      {activeArchetype.title}
                    </p>
                    <p className="text-xs text-zinc-300 max-w-lg leading-relaxed">
                      {activeArchetype.tagline}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: WHATSAPP CLOUD API ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Meta Business Integration</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    Conecta tu canal oficial de WhatsApp
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Necto se integra directamente con la Cloud API de Meta para gestionar pedidos, reservas y notificaciones con máxima tasa de entrega y latencia sub-segundo.
                  </p>
                </div>

                {/* Main Hero Connection Box */}
                <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#25D366]/15 text-[#008069] dark:text-[#25D366] flex items-center justify-center border border-[#25D366]/30 font-bold flex-none shadow-2xs">
                        <Smartphone className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                          WhatsApp Business Web & Bot IA
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                          {isMetaConnected
                            ? "✓ Dispositivo vinculado con éxito. Canal activo para comandas."
                            : "Vincula tu cuenta para recibir comandas automáticas y atender clientes en tiempo real."}
                        </p>
                      </div>
                    </div>

                    {isMetaConnected && (
                      <Badge
                        variant="success"
                        intent="onboarding.meta.status"
                        className="self-start sm:self-center"
                      >
                        Conectado
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                    <Button
                      variant="primary"
                      intent="onboarding.meta.toggle"
                      onClick={() => {
                        window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
                        setIsMetaConnected(true);
                      }}
                      className="py-3.5 px-6 rounded-2xl text-sm font-bold bg-[#008069] hover:bg-[#006e5a] text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      {isMetaConnected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Reabrir WhatsApp Web</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Conectar con WhatsApp Web</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      intent="onboarding.meta.skip"
                      onClick={() => setStep(3)}
                      className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-mono px-4 py-3 cursor-pointer transition-colors text-center"
                    >
                      Vincular más tarde →
                    </Button>
                  </div>
                </div>

                {/* Large WhatsApp Meta Showcase Card at the Bottom of Step 2 */}
                <div className="relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[220px] flex flex-col justify-end p-6">
                  {/* Photo Background */}
                  <img
                    src="/whatsapp-meta-hero.jpg"
                    alt="Necto WhatsApp Meta Integration"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Glassmorphism Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                  {/* Content Overlay */}
                  <div className="relative z-10 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF3F1A] px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-[#FF3F1A]/30">
                        NECTO X META
                      </span>
                      <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                        Official Cloud API
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white tracking-tight">
                      La forma más potente de conectar con tus clientes.
                    </p>
                    <p className="text-xs text-zinc-300 max-w-lg leading-relaxed">
                      Atención automática 24/7, sincronización directa con KDS de cocina e inventario sin intermediarios.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: ARQUITECTURA MODULAR ──────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] border border-orange-200 dark:border-orange-800/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Layers className="w-3 h-3" />
                    <span>Configuración Modular</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    Personaliza los módulos de tu espacio
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Hemos activado los módulos recomendados para <strong className="text-zinc-950 dark:text-white">{activeArchetype.title}</strong>. Puedes encender o apagar cualquier módulo según tus requerimientos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MODULE_DEFINITIONS.map(mod => {
                    const isSelected = selectedModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group ${
                          isSelected
                            ? "bg-white dark:bg-zinc-900 border-zinc-950 dark:border-zinc-700 shadow-xs"
                            : "bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/60 opacity-60 hover:opacity-100 hover:bg-white dark:hover:bg-zinc-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-zinc-950 text-white dark:bg-[#FF3F1A]"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500"
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
                          <h4 className="text-xs font-bold text-zinc-950 dark:text-white">{mod.title}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 3: Representative Operations Showcase Card */}
                <div className="relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[200px] flex flex-col justify-end p-6">
                  {/* Photo Background */}
                  <img
                    src="/onboarding-operations.jpg"
                    alt="Necto Operations Hub"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                  {/* Content */}
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF3F1A] px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-[#FF3F1A]/30">
                        OPERACIONES INTEGRADAS
                      </span>
                      <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                        Cloud Sync
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white tracking-tight">
                      Sincronización Total en Mostrador, Cocina y WhatsApp
                    </p>
                    <p className="text-xs text-zinc-300 max-w-lg leading-relaxed">
                      Cada módulo se conecta directamente al inventario central y registro contable de tu negocio.
                    </p>
                  </div>
                </div>
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
                onClick={() => navigate(-1)}
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
                className="py-3 px-7 text-xs"
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
                className="py-3 px-8 text-xs"
              >
                {isDeploying ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Desplegando Espacio...</span>
                  </>
                ) : (
                  <>
                    <span>Finalizar & Lanzar Espacio</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Aspirational Client-First Visual Showcase */}
        <div className="lg:col-span-5 relative bg-zinc-900 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden border-t lg:border-t-0 min-h-[520px]">
          {/* High-Resolution Background Photography */}
          <img
            src={
              step === 1
                ? "/onboarding-modular-sync.jpg"
                : step === 2
                ? "/onboarding-whatsapp-orders.jpg"
                : "/onboarding-restaurant.jpg"
            }
            alt={activeArchetype.title}
            className="absolute inset-0 w-full h-full object-cover opacity-85 dark:opacity-80 transition-all duration-700 scale-100"
          />

          {/* Balanced Gradient Overlay: keeping photo bright and colorful while ensuring text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30" />

          {/* Top Brand & Trust Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Plataforma Todo-en-Uno</span>
            </div>

            <span className="text-[11px] font-mono text-white/90 uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              Necto Business
            </span>
          </div>

          {/* Center Value Content */}
          <div className="relative z-10 space-y-6 my-auto py-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF3F1A] px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-[#FF3F1A]/30 inline-block">
                {step === 1
                  ? activeArchetype.title
                  : step === 2
                  ? "Canal Oficial WhatsApp & Meta"
                  : "Operaciones Inteligentes"}
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
                {step === 1
                  ? `La forma más simple y potente de gestionar ${companyName.trim() || "tu negocio"}.`
                  : step === 2
                  ? "Tus clientes piden por WhatsApp. Tu equipo despacha al instante."
                  : "Todo tu negocio sincronizado en un solo lugar."}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-md drop-shadow-sm">
                {step === 1
                  ? activeArchetype.tagline
                  : step === 2
                  ? "Atención automatizada 24/7, confirmación de pedidos y reservas en tiempo real sin pagar comisiones a terceros."
                  : "Conecta ventas, control de inventario, cocina y personal para ahorrar tiempo y evitar errores en cada turno."}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-2.5 pt-2">
              {(step === 1
                ? [
                    "Diseñado específicamente para tu modelo de negocio",
                    "Comienza a operar en minutos sin configuraciones difíciles",
                    "Accesible desde cualquier dispositivo (tablet, celular o PC)",
                  ]
                : step === 2
                ? [
                    "API oficial sin riesgo de bloqueo de tu número",
                    "Envío de cartas, menús y confirmaciones automáticas",
                    "Tus clientes no tienen que descargar ninguna app extra",
                  ]
                : [
                    "Activa o desactiva módulos cuando lo necesites",
                    "Alertas automáticas de productos e insumos agotados",
                    "Métricas claras de ventas para tomar mejores decisiones",
                  ]
              ).map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Social Proof Card */}
          <div className="relative z-10 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-3.5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-bold text-sm flex-none shadow-sm">
              {companyName ? companyName.charAt(0).toUpperCase() : "N"}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">
                {companyName.trim() || "Tu nuevo espacio en Necto"}
              </p>
              <p className="text-[11px] text-zinc-300">
                {country} · {selectedModules.length} módulos listos para usar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
