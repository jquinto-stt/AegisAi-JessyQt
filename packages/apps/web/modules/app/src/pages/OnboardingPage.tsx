import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBusiness,
  NectoModuleKey,
  BusinessType,
  OfferModel,
  BUSINESS_ARCHETYPES,
} from "../context/BusinessContext";
import { NectoLogo } from "../compositions/shared/NectoLogo";
import GridShape from "@/elements/common/GridShape";
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
  Utensils,
  Wrench,
  Shirt,
  Laptop,
  Pill,
  Scissors,
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
  { num: 1, label: "Contexto & Arquetipo", desc: "Identidad y modelo de negocio" },
  { num: 2, label: "Capacidades Modulares", desc: "¿Qué deseas gestionar?" },
  { num: 3, label: "Lanzamiento", desc: "Resumen y acceso a la tienda" },
];

/* ── Main Component ─────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createBusiness } = useBusiness();
  const [step, setStep] = useState(1);

  // Store Container State (Nivel 1: Contexto e Identidad)
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<BusinessType>("retail_store");
  const [selectedOfferModel, setSelectedOfferModel] = useState<OfferModel>("physical_products");

  // Capabilities State (Nivel 2)
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>([
    "pedidos",
    "inventarios",
  ]);
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const currentArchetype =
    BUSINESS_ARCHETYPES.find(a => a.id === selectedArchetype) || BUSINESS_ARCHETYPES[1];

  const handleSelectArchetype = (type: BusinessType) => {
    setSelectedArchetype(type);
    const arch = BUSINESS_ARCHETYPES.find(a => a.id === type);
    if (arch) {
      setSelectedOfferModel(arch.defaultOfferModel);
      setSelectedModules(arch.recommendedModules);
    }
  };

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllRecommended = () => {
    setSelectedModules(currentArchetype.recommendedModules);
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
          businessType: selectedArchetype,
          offerModel: selectedOfferModel,
          iconKey: currentArchetype.iconKey,
          currency: currencyForCountry(country),
          city: city ? `${city}, ${country}` : country,
          channels: { whatsapp: isMetaConnected, web: true, pos: true },
          kitchenBufferMin: selectedArchetype === "restaurant_virtual" ? 20 : 10,
          specialty: currentArchetype.label,
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090B] text-gray-900 dark:text-gray-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Standard Navigation Header */}
      <header className="h-14 px-6 sm:px-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NectoLogo size="xs" inline />
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
            Configuración de Nueva Tienda
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Necto OS v3.0</span>
          </div>

          <Button
            variant="ghost"
            intent="onboarding.header.exit"
            onClick={() => navigate("/workspaces")}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white py-1.5 px-3 rounded-lg"
          >
            Salir al Panel
          </Button>
        </div>
      </header>

      {/* Full-Width Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 w-full min-h-[calc(100vh-3.5rem)]">
        {/* Left Column: Interactive Assistant Studio (Expanded & Clean) */}
        <div className="lg:col-span-7 xl:col-span-7 px-8 sm:px-14 lg:px-16 py-8 sm:py-10 flex flex-col justify-between space-y-8 bg-white dark:bg-[#0D0D10] border-r border-gray-200/80 dark:border-gray-800/80">
          <div className="space-y-8 max-w-2xl mx-auto w-full">
            {/* Step Navigation Bar */}
            <div className="space-y-3 pb-2 border-b border-gray-100 dark:border-gray-800/60">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400 uppercase tracking-widest text-[10px]">
                  Fase {step} de 3
                </span>
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold tracking-tight">
                  {STEPS[step - 1].label}
                </span>
              </div>

              {/* Step Progress Indicators */}
              <div className="flex items-center gap-3">
                {STEPS.map((s, idx) => {
                  const isCurrent = s.num === step;
                  const isPassed = s.num < step;

                  return (
                    <React.Fragment key={s.num}>
                      <button
                        type="button"
                        disabled={s.num > step && !canProceedStep1}
                        onClick={() => {
                          if (s.num < step || canProceedStep1) setStep(s.num);
                        }}
                        className={`flex items-center gap-2.5 text-xs transition-all text-left cursor-pointer ${
                          isCurrent
                            ? "text-gray-950 dark:text-white font-semibold"
                            : isPassed
                            ? "text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-200"
                            : "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                            isCurrent
                              ? "bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#09090B] ring-4 ring-[#190088]/10 dark:ring-[#97D6DF]/10"
                              : isPassed
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                          }`}
                        >
                          {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                        </div>
                        <span className="hidden sm:inline font-medium">{s.label}</span>
                      </button>

                      {idx < STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 transition-colors rounded-full ${
                            s.num < step
                              ? "bg-emerald-500"
                              : isCurrent
                              ? "bg-[#190088]/30 dark:bg-[#97D6DF]/30"
                              : "bg-gray-100 dark:bg-gray-800"
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
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
                    Identidad y Naturaleza de la Tienda
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Indica los datos clave de tu negocio. Necto pre-configurará el catálogo, existencias y canales acordes a tu modelo operativo.
                  </p>
                </div>

                {/* Form Elements with clean, minimalist hierarchy */}
                <div className="space-y-6">
                  {/* Store Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Nombre Comercial</span>
                      <span className="text-[11px] text-gray-400 font-normal">Requerido</span>
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 absolute left-3.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Milano Store / Ferretería Central / Burger House"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:border-[#190088] dark:focus:border-[#97D6DF] focus:bg-white dark:focus:bg-gray-900 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* 1. Primary Activity Cards */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        1. Tipo de Negocio / Actividad Principal
                      </label>
                      <span className="text-[11px] font-mono text-[#190088] dark:text-[#97D6DF]">
                        Modelo de Operación
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: "retail",
                          label: "Retail & Comercio",
                          desc: "Venta física o digital",
                          icon: ShoppingBag,
                          defaultType: "retail_store" as BusinessType,
                        },
                        {
                          id: "gastronomy",
                          label: "Gastronomía",
                          desc: "Comanda & recetas",
                          icon: Utensils,
                          defaultType: "restaurant_virtual" as BusinessType,
                        },
                        {
                          id: "services",
                          label: "Servicios & Citas",
                          desc: "Turnos & reservas",
                          icon: Scissors,
                          defaultType: "services" as BusinessType,
                        },
                        {
                          id: "health",
                          label: "Salud & Bienestar",
                          desc: "Farmacia & clínica",
                          icon: Pill,
                          defaultType: "pharmacy_health" as BusinessType,
                        },
                      ].map(group => {
                        const isGroupActive =
                          group.id === "retail"
                            ? [
                                "retail_store",
                                "hardware_store",
                                "fashion_footwear",
                                "tech_electronics",
                                "ecommerce_direct",
                              ].includes(selectedArchetype)
                            : group.id === "gastronomy"
                            ? selectedArchetype === "restaurant_virtual"
                            : group.id === "services"
                            ? selectedArchetype === "services"
                            : selectedArchetype === "pharmacy_health";

                        const Icon = group.icon;

                        return (
                          <button
                            type="button"
                            key={group.id}
                            onClick={() => handleSelectArchetype(group.defaultType)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                              isGroupActive
                                ? "bg-[#190088]/5 dark:bg-[#190088]/20 border-[#190088] dark:border-[#97D6DF] ring-1 ring-[#190088] dark:ring-[#97D6DF]"
                                : "bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  isGroupActive
                                    ? "bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#09090B]"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              {isGroupActive && (
                                <div className="w-4 h-4 rounded-full bg-[#190088] dark:bg-[#97D6DF] text-white dark:text-[#09090B] flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">
                                {group.label}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                {group.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Retail Subtype Selector Pills */}
                    {[
                      "retail_store",
                      "hardware_store",
                      "fashion_footwear",
                      "tech_electronics",
                      "ecommerce_direct",
                    ].includes(selectedArchetype) && (
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap animate-fade-in">
                        <span className="text-[11px] text-gray-400 mr-1 font-mono uppercase tracking-wider">
                          Especialidad:
                        </span>
                        {[
                          { id: "retail_store" as BusinessType, label: "Minimarket / General", icon: Store },
                          { id: "fashion_footwear" as BusinessType, label: "Moda & Calzado", icon: Shirt },
                          { id: "hardware_store" as BusinessType, label: "Ferretería & Insumos", icon: Wrench },
                          { id: "tech_electronics" as BusinessType, label: "Tecnología & Gadgets", icon: Laptop },
                          { id: "ecommerce_direct" as BusinessType, label: "D2C / Marca Digital", icon: Package },
                        ].map(sub => {
                          const isSubActive = selectedArchetype === sub.id;
                          const SubIcon = sub.icon;
                          return (
                            <button
                              type="button"
                              key={sub.id}
                              onClick={() => handleSelectArchetype(sub.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isSubActive
                                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-xs"
                                  : "bg-gray-100/80 dark:bg-gray-800/80 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5" />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Offer Model Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        2. ¿Qué comercializas principalmente?
                      </label>
                      <span className="text-[11px] font-mono text-gray-400">
                        Lógica del Catálogo
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: "physical_products" as OfferModel,
                          title: "Productos Físicos",
                          desc: "SKUs, variantes de stock y kardex",
                        },
                        {
                          id: "prepared_products" as OfferModel,
                          title: "Preparados",
                          desc: "Recetas, insumos y comanda",
                        },
                        {
                          id: "services_appointments" as OfferModel,
                          title: "Servicios",
                          desc: "Turnos, reservas y duraciones",
                        },
                        {
                          id: "hybrid" as OfferModel,
                          title: "Híbrido",
                          desc: "Combinación mixta con stock",
                        },
                      ].map(om => {
                        const isSelected = selectedOfferModel === om.id;
                        return (
                          <div
                            key={om.id}
                            onClick={() => setSelectedOfferModel(om.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                              isSelected
                                ? "bg-orange-500/5 dark:bg-orange-500/10 border-[#FF3F1A] dark:border-[#FF3F1A] ring-1 ring-[#FF3F1A]"
                                : "bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                {om.title}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-[#FF3F1A] font-mono">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">
                              {om.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Location & Phone Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        País & Moneda
                      </label>
                      <select
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:border-[#190088] cursor-pointer"
                      >
                        <option value="Colombia">Colombia (COP $)</option>
                        <option value="México">México (MXN $)</option>
                        <option value="Estados Unidos">EE.UU. (USD $)</option>
                        <option value="Argentina">Argentina (ARS $)</option>
                        <option value="Chile">Chile (CLP $)</option>
                        <option value="España">España (EUR €)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Bogotá, CDMX"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:border-[#190088]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="tel"
                        placeholder="+57 300 123 4567"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:border-[#190088]"
                      />
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

                {/* Archetype Recommendation Banner */}
                <div className="p-3.5 rounded-2xl bg-[#190088]/5 dark:bg-[#190088]/20 border border-[#190088]/20 flex items-start gap-3 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[#190088] dark:text-[#97D6DF] mt-0.5 flex-none" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#190088] dark:text-[#97D6DF]">
                      Sugerencia para {currentArchetype.label}
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Hemos preseleccionado los módulos esenciales para tu modelo de{" "}
                      <strong>
                        {selectedOfferModel === "physical_products"
                          ? "productos físicos con control de existencias"
                          : selectedOfferModel === "prepared_products"
                          ? "productos preparados y cocina"
                          : selectedOfferModel === "services_appointments"
                          ? "servicios y turnos por agenda"
                          : "operación híbrida"}
                      </strong>
                      . Puedes activar o desactivar cualquiera según tu necesidad.
                    </p>
                  </div>
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
                    <Badge variant="light" color="primary" intent="onboarding.passport.badge">
                      {currencyForCountry(country)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Ubicación</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {city ? `${city}, ${country}` : country}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Arquetipo</span>
                      <span className="font-semibold text-[#190088] dark:text-[#97D6DF]">
                        {currentArchetype.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Modelo de Oferta</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {selectedOfferModel === "physical_products"
                          ? "Productos Físicos (SKU)"
                          : selectedOfferModel === "prepared_products"
                          ? "Preparados (Recetas)"
                          : selectedOfferModel === "services_appointments"
                          ? "Servicios & Citas"
                          : "Modelo Híbrido"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-mono uppercase block">Contacto</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {contactPhone || "Línea por configurar"}
                      </span>
                    </div>
                  </div>

                  {/* Seed Catalog & Categories Inferred */}
                  <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Catálogo & Categorías Semilla:
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      {currentArchetype.defaultCategories.join(" · ")}
                    </p>
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
                variant="primary"
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

        {/* Right Column: Visual Showcase & Brand Studio (Identical to Login Architecture) */}
        <div className="lg:col-span-5 xl:col-span-5 relative bg-[#190088] dark:bg-zinc-950 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden border-l border-zinc-200 dark:border-zinc-800 min-h-[560px]">
          {/* Exact Login Brand Grid Pattern */}
          <GridShape />

          {step === 1 ? (
            /* ── Step 1: Live Blueprint Architecture Studio ── */
            <div className="relative z-10 flex flex-col justify-between h-full space-y-5 animate-fade-in w-full">
              {/* Brand Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/logo/necto-full-white.svg"
                    alt="Necto"
                    className="h-7 w-auto"
                  />
                  <div className="h-4 w-px bg-white/30" />
                  <span className="text-xs font-mono uppercase tracking-widest text-white/90 font-semibold">
                    Instancia de Negocio
                  </span>
                </div>
                <span className="text-xs font-mono text-white/70 tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/10">
                  Vista Previa en Vivo
                </span>
              </div>

              {/* Main Blueprint Terminal Card (Expanded to take real space) */}
              <div className="flex-1 rounded-2xl bg-black/25 dark:bg-white/[0.04] border border-white/20 backdrop-blur-xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
                {/* Identity Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5">
                  <div className="space-y-2 flex-1 min-w-0">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-white/70 block font-semibold">
                      Espacio Operativo
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 truncate">
                      <span>{companyName.trim() || "Nombre de tu Tienda"}</span>
                      {companyName.trim() && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-none" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2.5 text-sm text-white/85">
                      <MapPin className="w-4 h-4 text-white/70" />
                      <span className="truncate">{city ? `${city}, ${country}` : country}</span>
                      <span>·</span>
                      <span className="font-mono text-white font-bold px-2 py-0.5 rounded-md bg-white/20 text-xs tracking-wider">
                        {currencyForCountry(country)}
                      </span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/15 text-white flex items-center justify-center flex-none shadow-lg border border-white/25">
                    {currentArchetype.iconKey === "utensils" ? (
                      <Utensils className="w-7 h-7" />
                    ) : currentArchetype.iconKey === "wrench" ? (
                      <Wrench className="w-7 h-7" />
                    ) : currentArchetype.iconKey === "shirt" ? (
                      <Shirt className="w-7 h-7" />
                    ) : currentArchetype.iconKey === "laptop" ? (
                      <Laptop className="w-7 h-7" />
                    ) : currentArchetype.iconKey === "pill" ? (
                      <Pill className="w-7 h-7" />
                    ) : currentArchetype.iconKey === "scissors" ? (
                      <Scissors className="w-7 h-7" />
                    ) : (
                      <Store className="w-7 h-7" />
                    )}
                  </div>
                </div>

                {/* Inferred Layers Breakdown */}
                <div className="space-y-5 flex-1 flex flex-col justify-around">
                  {/* Archetype & Offer */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl bg-black/25 border border-white/10 space-y-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-white/70 block">
                        Arquetipo
                      </span>
                      <div className="text-sm sm:text-base font-bold text-white truncate">
                        {currentArchetype.label}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/25 border border-white/10 space-y-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-white/70 block">
                        Modelo de Oferta
                      </span>
                      <div className="text-sm sm:text-base font-bold text-[#97D6DF] truncate">
                        {selectedOfferModel === "physical_products"
                          ? "Productos Físicos (SKU)"
                          : selectedOfferModel === "prepared_products"
                          ? "Preparados (Recetas)"
                          : selectedOfferModel === "services_appointments"
                          ? "Servicios (Citas)"
                          : "Híbrido Mixto"}
                      </div>
                    </div>
                  </div>

                  {/* Catalog Schema Inferred */}
                  <div className="p-4.5 rounded-xl bg-black/25 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-white/75">
                      <span className="flex items-center gap-2 text-white font-bold">
                        <Package className="w-4 h-4 text-[#97D6DF]" />
                        <span>Esquema de Catálogo</span>
                      </span>
                      <span className="text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                        Estructurado
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm text-white/95">
                      {selectedOfferModel === "physical_products" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Control de SKUs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Talla, color y medidas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Margen & costos base</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Kardex por bodega</span>
                          </div>
                        </>
                      ) : selectedOfferModel === "prepared_products" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Recetas & escandallo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Modificadores de plato</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Comanda a cocina</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Descargo de insumos</span>
                          </div>
                        </>
                      ) : selectedOfferModel === "services_appointments" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Duración en minutos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Asignación de staff</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Buffer entre sesiones</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Recordatorio por WhatsApp</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Stock físico de insumos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Servicios agendables</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Cobro combinado en caja</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-300 flex-none" />
                            <span>Kardex multimodelo</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Operational Capabilities suggested */}
                  <div className="p-4.5 rounded-xl bg-black/25 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-white/75">
                      <span className="flex items-center gap-2 text-white font-bold">
                        <Layers className="w-4 h-4 text-white/85" />
                        <span>Módulos Operativos (Paso 2)</span>
                      </span>
                      <span className="text-white/60 text-[11px]">Ajustable</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentArchetype.recommendedModules.map(modKey => {
                        const m = MODULE_DEFINITIONS.find(def => def.id === modKey);
                        return (
                          <span
                            key={modKey}
                            className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold text-white flex items-center gap-2 border border-white/10"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{m ? m.title.split(" ")[0] : modKey}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Step 2 & 3: Standard Visual Showcase ── */
            <>
              {/* High-Resolution Background Photography */}
              <img
                src={
                  step === 2
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
                    {step === 2 ? "Capacidades Plug & Play" : "Tu Tienda en Vivo"}
                  </span>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                    {step === 2
                      ? "Enciende únicamente los módulos que requieres hoy."
                      : "Tu espacio de trabajo está listo para recibir operaciones."}
                  </h2>

                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-md drop-shadow-sm font-medium">
                    {step === 2
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
