import React, { useState, useMemo } from "react";
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
  Phone,
  UtensilsCrossed,
  Store,
  Sparkles,
  Server,
  Activity,
  Layers,
  CheckCircle2,
  QrCode,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Terminal,
} from "lucide-react";

/* ── Business Archetypes ─────────────────────────────────────────────── */

interface ArchetypeConfig {
  id: BusinessType;
  title: string;
  category: string;
  tagline: string;
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
    icon: UtensilsCrossed,
    defaultModules: ["pedidos", "inventarios", "reservas"],
    iconKey: "utensils",
    features: ["KDS Cocina", "Escandallo Insumos", "Delivery WhatsApp", "POS Mesas"],
    mockOrder: {
      id: "ORD-9402",
      item: "Smash Burger Doble + Papas Rústicas",
      detail: "Mesa 4 · Sin cebolla · Té helado",
      price: "$34.500 COP",
      badge: "En Preparación",
    },
  },
  {
    id: "retail_store",
    title: "Comercio & Retail",
    category: "E-Commerce / Store",
    tagline: "Control de stock multialmacén, variantes por SKU y catálogo en línea sincronizado.",
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
    icon: Calendar,
    defaultModules: ["agendamiento", "turnos", "referidos"],
    iconKey: "coffee",
    features: ["Agenda de Citas", "Cuadrante de Turnos", "Recordatorio Auto", "Portal Clientes"],
    mockOrder: {
      id: "CTA-0391",
      item: "Mantenimiento & Sesión de Diagnóstico",
      detail: "Dr. Andrea Morales · 15:30 PM",
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
    }, 1200);
  };

  const canProceedStep1 = companyName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Navbar */}
      <header className="h-14 px-6 sm:px-10 border-b border-zinc-800/80 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-950 flex items-center justify-center font-black text-sm select-none shadow-sm">
            N
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Necto</span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/60">
              Workspace Setup
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SaaS Core v2.4</span>
          </div>

          {businesses.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/workspaces")}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900"
            >
              Volver al Hub
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-3.5rem)]">
        {/* Left Column: Interactive Wizard Controls (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800/80 space-y-8">
          <div className="space-y-8">
            {/* Stepper Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {STEPS.map((s, idx) => {
                  const isPassed = s.num < step;
                  const isCurrent = s.num === step;

                  return (
                    <React.Fragment key={s.num}>
                      <button
                        type="button"
                        disabled={s.num > step && !canProceedStep1}
                        onClick={() => {
                          if (s.num < step || canProceedStep1) setStep(s.num);
                        }}
                        className={`flex items-center gap-2 text-xs font-mono transition-all text-left ${
                          isCurrent
                            ? "text-white font-bold"
                            : isPassed
                            ? "text-zinc-400 hover:text-zinc-200 cursor-pointer"
                            : "text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                            isCurrent
                              ? "bg-[#FF3F1A] text-white shadow-xs"
                              : isPassed
                              ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                              : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                          }`}
                        >
                          {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                        </div>
                        <span className="hidden sm:inline">{s.label}</span>
                      </button>

                      {idx < STEPS.length - 1 && (
                        <div
                          className={`h-px w-6 sm:w-10 transition-colors ${
                            s.num < step ? "bg-[#FF3F1A]" : "bg-zinc-800"
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
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Configura tu espacio de operaciones
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Selecciona la arquitectura que mejor describe tu modelo de negocio. Necto pre-configurará los flujos y módulos óptimos.
                  </p>
                </div>

                {/* Archetype Selector */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
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
                              ? "bg-zinc-900 border-[#FF3F1A]/80 ring-1 ring-[#FF3F1A]/50 shadow-md"
                              : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "border border-zinc-700"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-white tracking-tight">
                              {arch.title}
                            </h3>
                            <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                              {arch.tagline}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                      <span>Nombre Comercial del Negocio</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Requerido</span>
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
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-[#FF3F1A] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Country & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                        País & Moneda
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
                        <select
                          value={country}
                          onChange={e => setCountry(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-zinc-700 cursor-pointer"
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                        Ciudad / Región
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Ej. Bogotá, CDMX, Miami"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Línea de Atención / WhatsApp
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                      <input
                        type="tel"
                        placeholder="+57 300 123 4567"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: WHATSAPP CLOUD API ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Meta Business Integration</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Conecta tu canal oficial de WhatsApp
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Necto se integra directamente con la Cloud API de Meta para gestionar pedidos, reservas y notificaciones con máxima tasa de entrega y latencia sub-segundo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      icon: Zap,
                      title: "Toma de Pedidos Autónoma",
                      desc: "El bot inteligente atiende clientes, valida stock y genera comandas.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Infraestructura Cloud Oficial",
                      desc: "Sin riesgo de bloqueos por usar soluciones no autorizadas.",
                    },
                    {
                      icon: MessageSquare,
                      title: "Bandeja Omnicanal Central",
                      desc: "Tus agentes y administradores responden desde un único panel.",
                    },
                    {
                      icon: QrCode,
                      title: "Integración QR en Local",
                      desc: "Permite a los clientes escanear en mesa y abrir el chat directamente.",
                    },
                  ].map(item => (
                    <div
                      key={item.title}
                      className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">{item.title}</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connection Box */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center border border-[#25D366]/20 font-bold">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">WhatsApp Business Cloud API</h4>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {isMetaConnected ? "Vinculación Exitosa · Auth Token OK" : "Pendiente de autorización con Meta"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase font-bold ${
                        isMetaConnected
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950/60 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {isMetaConnected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsMetaConnected(!isMetaConnected)}
                      className={`py-2.5 px-5 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                        isMetaConnected
                          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                          : "bg-[#FF3F1A] hover:bg-[#e03413] text-white shadow-xs"
                      }`}
                    >
                      {isMetaConnected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Desconectar Meta API</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Autorizar con Meta</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs text-zinc-400 hover:text-white font-mono px-3 py-2 cursor-pointer transition-colors"
                    >
                      Vincular más tarde →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: ARQUITECTURA MODULAR ──────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-950/40 text-[#FF3F1A] border border-orange-800/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Layers className="w-3 h-3" />
                    <span>Configuración Modular</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Personaliza los módulos de tu espacio
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Hemos activado los módulos recomendados para <strong className="text-white">{activeArchetype.title}</strong>. Puedes encender o apagar cualquier módulo según tus requerimientos.
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
                            ? "bg-zinc-900 border-zinc-700 shadow-xs"
                            : "bg-zinc-950/40 border-zinc-800/60 opacity-60 hover:opacity-100 hover:bg-zinc-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#FF3F1A] text-white"
                                : "bg-zinc-800 text-zinc-500"
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
                                  : "border border-zinc-700"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white">{mod.title}</h4>
                          <p className="text-[11px] text-zinc-400 leading-snug">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Wizard Footer Navigation */}
          <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="py-2.5 px-4 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso Anterior</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 && !canProceedStep1}
                onClick={() => setStep(step + 1)}
                className={`py-3 px-7 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  step === 1 && !canProceedStep1
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-white text-zinc-950 hover:bg-[#FF3F1A] hover:text-white"
                }`}
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isDeploying}
                onClick={handleFinish}
                className="py-3 px-8 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
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
              </button>
            )}
          </div>
        </div>

        {/* Right Column: High-Fidelity Workspace Live Simulator (5 Cols) */}
        <div className="lg:col-span-5 bg-[#09090B] p-6 sm:p-10 flex flex-col justify-between space-y-6 overflow-hidden relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF3F1A]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Live Simulator Header */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Live Workspace Preview
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                Interactive State
              </span>
            </div>

            {/* Simulated Desktop App Frame */}
            <div className="rounded-2xl border border-zinc-800 bg-[#121214] shadow-2xl overflow-hidden text-xs">
              {/* Window Bar */}
              <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                  necto.app/{companyName ? companyName.toLowerCase().replace(/\s+/g, "-") : "mi-negocio"}
                </div>
                <div className="w-4" />
              </div>

              {/* Simulated Inner Workspace Content */}
              <div className="p-4 space-y-4">
                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold text-xs border border-zinc-700">
                      {companyName ? companyName.charAt(0).toUpperCase() : "N"}
                    </div>
                    <div>
                      <h4 className="font-bold text-white truncate max-w-[150px]">
                        {companyName.trim() || "Nombre del Negocio"}
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {city ? `${city} · ` : ""}{country} ({currencyForCountry(country)})
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {activeArchetype.category}
                  </span>
                </div>

                {/* Active Modules HUD */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Módulos Conectados ({selectedModules.length}/6)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MODULE_DEFINITIONS.map(m => {
                      const isActive = selectedModules.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                            isActive
                              ? "bg-zinc-800/80 border-zinc-700 text-white"
                              : "bg-zinc-900/40 border-zinc-800/40 text-zinc-600 line-through"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#FF3F1A]" : "bg-zinc-700"
                            }`}
                          />
                          <span className="truncate">{m.title.split(" ")[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Sample Order / Action Preview */}
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500">Live Ticket Event</span>
                    <span className="text-[#FF3F1A] font-bold">{activeArchetype.mockOrder.badge}</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{activeArchetype.mockOrder.item}</span>
                      <span className="font-mono text-zinc-300 text-xs font-bold">
                        {activeArchetype.mockOrder.price}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{activeArchetype.mockOrder.detail}</p>
                  </div>
                </div>

                {/* WhatsApp Status Simulator */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isMetaConnected ? "bg-emerald-400 animate-ping" : "bg-zinc-600"
                      }`}
                    />
                    <span className="text-[11px] font-mono text-zinc-300">
                      Canal WhatsApp Meta
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isMetaConnected ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  >
                    {isMetaConnected ? "ACTIVO (Webhook OK)" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Architecture Note */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center flex-none">
              <Shield className="w-4 h-4 text-[#FF3F1A]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Garantía Multi-Tenant Necto</p>
              <p className="text-[10px] text-zinc-400 leading-snug">
                Datos aislados por espacio criptográficamente con respaldo continuo en Cloud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
