import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBusiness,
  NectoModuleKey,
  BusinessType,
  BusinessIconKey,
  OfferModel,
  BUSINESS_ARCHETYPES,
} from "../context/BusinessContext";
import { NectoLogo } from "../compositions/shared/NectoLogo";
import { GlobalSearchButton } from "../compositions/shared/GlobalSearchButton";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { UserProfileDropdown } from "../compositions/workspace/UserProfileDropdown";
import { CommandPalette } from "../compositions/workspace/CommandPalette";
import { PageMeta } from "@/shell/meta";
import { ThemeToggleButton } from "@/shell";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { Button } from "@/elements";
import { cn } from "@/utils";
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
  Building2,
  MapPin,
  Store,
  Layers,
  CheckCircle2,
  Smartphone,
  Utensils,
  Wrench,
  Shirt,
  Laptop,
  Pill,
  Scissors,
  Coffee,
  Flame,
  Rocket,
  type LucideIcon,
} from "lucide-react";

/* ── Static catalogs ────────────────────────────────────────────────── */

interface ModuleConfig {
  id: NectoModuleKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
}

const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    id: "pedidos",
    title: "Pedidos Omnicanal",
    shortTitle: "Pedidos",
    description: "WhatsApp, web y mostrador en un solo flujo, con alistamiento en vivo.",
    icon: ShoppingBag,
  },
  {
    id: "inventarios",
    title: "Inventario & Stock",
    shortTitle: "Inventario",
    description: "Existencias, kardex de movimientos, compras y alertas de reposición.",
    icon: Package,
  },
  {
    id: "turnos",
    title: "Turnos & Horarios",
    shortTitle: "Turnos",
    description: "Rotación de personal, control de horarios y asignación por área.",
    icon: Clock,
  },
  {
    id: "reservas",
    title: "Reservas de Espacios",
    shortTitle: "Reservas",
    description: "Asignación de mesas, boxes o salones según disponibilidad.",
    icon: Bookmark,
  },
  {
    id: "agendamiento",
    title: "Agendamiento & Citas",
    shortTitle: "Agendamiento",
    description: "Calendario sincronizado con confirmación directa al cliente.",
    icon: Calendar,
  },
  {
    id: "referidos",
    title: "Fidelización & Clientes",
    shortTitle: "Referidos",
    description: "Cupones, tracking de recompra y programa de referidos.",
    icon: Users,
  },
];

interface MacroGroup {
  id: "retail" | "gastronomy" | "services" | "health";
  label: string;
  short: string;
  icon: LucideIcon;
  defaultType: BusinessType;
}

const MACRO_GROUPS: MacroGroup[] = [
  { id: "retail", label: "Retail & Comercio", short: "Retail", icon: ShoppingBag, defaultType: "retail_store" },
  { id: "gastronomy", label: "Gastronomía", short: "Gastronomía", icon: Utensils, defaultType: "restaurant_virtual" },
  { id: "services", label: "Servicios & Citas", short: "Servicios", icon: Scissors, defaultType: "services" },
  { id: "health", label: "Salud & Bienestar", short: "Salud", icon: Pill, defaultType: "pharmacy_health" },
];

const OFFER_MODELS: { id: OfferModel; title: string; short: string; icon: LucideIcon }[] = [
  { id: "physical_products", title: "Productos físicos", short: "Productos", icon: Package },
  { id: "prepared_products", title: "Preparados", short: "Preparados", icon: Utensils },
  { id: "services_appointments", title: "Servicios", short: "Servicios", icon: Calendar },
  { id: "hybrid", title: "Híbrido", short: "Híbrido", icon: Layers },
];

const OFFER_MODEL_LABEL: Record<OfferModel, string> = {
  physical_products: "Productos físicos",
  prepared_products: "Preparados",
  services_appointments: "Servicios & citas",
  hybrid: "Modelo híbrido",
};

const ARCHETYPE_ICONS: Record<BusinessIconKey, LucideIcon> = {
  utensils: Utensils,
  flame: Flame,
  coffee: Coffee,
  store: Store,
  chef: Utensils,
  layers: Layers,
  shirt: Shirt,
  wrench: Wrench,
  pill: Pill,
  laptop: Laptop,
  scissors: Scissors,
  "shopping-bag": ShoppingBag,
};

const COUNTRIES = [
  { value: "Colombia", label: "Colombia (COP $)" },
  { value: "México", label: "México (MXN $)" },
  { value: "Estados Unidos", label: "EE.UU. (USD $)" },
  { value: "Argentina", label: "Argentina (ARS $)" },
  { value: "Chile", label: "Chile (CLP $)" },
  { value: "España", label: "España (EUR €)" },
];

const STEPS = [
  { num: 1, label: "Identidad", desc: "Identidad" },
  { num: 2, label: "Capacidades", desc: "Capacidades" },
  { num: 3, label: "Lanzamiento", desc: "Lanzamiento" },
];

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500";

function Eyebrow({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.2em]",
        tone === "brand" ? "text-brand-500" : "text-gray-400"
      )}
    >
      {children}
    </span>
  );
}

/* ── Rotating Step Messages Component ───────────────────────────── */

interface MessageItem {
  title: string;
  subtitle: string;
  badge: string;
}

const STEP_MESSAGES: Record<number, MessageItem[]> = {
  1: [
    {
      title: "Nos cruzamos, nos unimos, crecemos.",
      subtitle: "Construyendo la identidad digital de tu negocio en un solo lugar.",
      badge: "Identidad & Marca",
    },
    {
      title: "Sincronización total omnicanal.",
      subtitle: "WhatsApp, tienda web y mostrador integrados en una misma plataforma.",
      badge: "Multicanal",
    },
    {
      title: "Adaptado a tu modelo comercial.",
      subtitle: "Configuración nativa según tus productos, insumos y forma de venta.",
      badge: "Arquitectura",
    },
  ],
  2: [
    {
      title: "Enciende solo lo que necesitas hoy.",
      subtitle: "Suma o quita módulos cuando quieras, sin rehacer tu configuración.",
      badge: "Capacidades Modulares",
    },
    {
      title: "Inteligencia artificial para tus ventas.",
      subtitle: "Interpretación automática de pedidos por WhatsApp con alta precisión.",
      badge: "IA Conversacional",
    },
    {
      title: "Control en tiempo real de stock e insumos.",
      subtitle: "Alertas tempranas de reposición y recetas dinámicas integradas.",
      badge: "Inventario Inteligente",
    },
  ],
  3: [
    {
      title: "Tu operación empieza ahora.",
      subtitle: "Acceso inmediato al centro de operaciones y a la administración de tu tienda.",
      badge: "Lanzamiento",
    },
    {
      title: "Atención al cliente sin interrupciones.",
      subtitle: "Bandeja unificada con seguimiento de alistamiento y despacho en vivo.",
      badge: "Operaciones 360°",
    },
    {
      title: "Analítica en vivo para escalar.",
      subtitle: "Métricas claras sobre ventas, rotación de productos y rendimiento.",
      badge: "Crecimiento",
    },
  ],
};

function AnimatedStepMessages({ step }: { step: number }) {
  const messages = STEP_MESSAGES[step] || STEP_MESSAGES[1];
  const [index, setIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    setIndex(0);
    setFadeState("in");
  }, [step]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFadeState("in");
      }, 350);
    }, 4500);

    return () => clearInterval(timer);
  }, [step, messages.length]);

  const currentMsg = messages[index] || messages[0];

  return (
    <div className="space-y-4 min-h-[160px] flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-all duration-300">
            {currentMsg.badge}
          </span>
        </div>

        <div
          className={cn(
            "space-y-2 transition-all duration-500 transform",
            fadeState === "in"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          <h2 className="max-w-sm text-[28px] font-black leading-[1.08] tracking-tight text-white sm:text-[36px]">
            {currentMsg.title}
          </h2>
          <p className="max-w-xs text-xs sm:text-sm leading-relaxed text-white/85">
            {currentMsg.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 pt-2">
        {messages.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFadeState("out");
              setTimeout(() => {
                setIndex(i);
                setFadeState("in");
              }, 250);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"
            )}
            aria-label={`Mensaje ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createBusiness } = useBusiness();
  const [step, setStep] = useState(1);

  // Step 1 — Store identity
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<BusinessType>("retail_store");
  const [selectedOfferModel, setSelectedOfferModel] = useState<OfferModel>("physical_products");

  // Step 2 — Capabilities
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>(["pedidos", "inventarios"]);
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const currentArchetype =
    BUSINESS_ARCHETYPES.find(a => a.id === selectedArchetype) || BUSINESS_ARCHETYPES[1];

  const canProceedStep1 = companyName.trim().length >= 2;

  const handleSelectArchetype = (type: BusinessType) => {
    setSelectedArchetype(type);
    const arch = BUSINESS_ARCHETYPES.find(a => a.id === type);
    if (arch) {
      setSelectedOfferModel(arch.defaultOfferModel);
      setSelectedModules(arch.recommendedModules);
    }
  };

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
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
          country,
          contactPhone: contactPhone.trim() || undefined,
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

  const locationLabel = city.trim() ? `${city.trim()}, ${country}` : country;
  const CurrentIcon = ARCHETYPE_ICONS[currentArchetype.iconKey] || Store;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased selection:bg-brand-500 selection:text-white dark:bg-gray-950 dark:text-gray-100">
      <PageMeta title="Configuración de Nueva Tienda — NECTO" description="Crea y configura el espacio operativo de tu negocio" />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-100 bg-white/90 px-5 backdrop-blur-md sm:px-10 dark:border-gray-800 dark:bg-gray-950/90">
        <div className="flex items-center gap-3">
          <NectoLogo size="xs" inline />
          <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-800" />
          <span className="hidden text-sm font-medium text-gray-400 sm:inline dark:text-gray-500">
            Nueva tienda
          </span>
        </div>
        {/* Right Header Controls: Search (⌘K), Theme Toggle & User Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalSearchButton />
          <ThemeToggle />
          <UserProfileDropdown />
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-1"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="grid w-full flex-1 grid-cols-1 lg:grid-cols-12">
        {/* ── Left: form ─────────────────────────────────────────────── */}
        <div className="flex flex-col justify-between px-5 py-10 sm:px-10 lg:col-span-7 lg:px-16 lg:py-14 dark:bg-[#0D0D10]">
          <div className="mx-auto w-full max-w-xl">
            {/* Stepper */}
            <div className="mb-10 flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2">
                {STEPS.map(s => {
                  const done = s.num < step;
                  const active = s.num === step;
                  const reachable = s.num < step || canProceedStep1;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      disabled={!reachable}
                      aria-label={s.label}
                      aria-current={active ? "step" : undefined}
                      onClick={() => reachable && setStep(s.num)}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        active
                          ? "bg-brand-500"
                          : done
                          ? "bg-brand-500/40"
                          : "bg-gray-200 dark:bg-gray-800",
                        reachable ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {step}/{STEPS.length}
              </span>
            </div>

            {/* ─── STEP 1 ─────────────────────────────────────────────── */}
            {step === 1 && (
              <div key="s1" className="animate-in space-y-10 fade-in slide-in-from-bottom-1 duration-300">
                <div className="space-y-3">
                  <Eyebrow>Paso 1 — Identidad</Eyebrow>
                  <h1 className="text-[34px] font-black leading-[1.08] tracking-tight text-secondary-600 sm:text-[40px] dark:text-white">
                    Configura tu tienda
                  </h1>
                  <p className="max-w-md text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
                    Define lo esencial. Necto prepara el catálogo, las existencias y los canales según tu modelo.
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-2.5">
                  <label htmlFor="store-name" className="text-[13px] font-semibold text-gray-900 dark:text-gray-200">
                    Nombre comercial
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="store-name"
                      type="text"
                      required
                      autoFocus
                      placeholder="Milano Store, Ferretería Central, Burger House…"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className={cn(inputClass, "pl-11 font-semibold")}
                    />
                  </div>
                </div>

                {/* Business type */}
                <div className="space-y-3.5">
                  <label className="text-[13px] font-semibold text-gray-900 dark:text-gray-200">
                    ¿Qué tipo de negocio es?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {MACRO_GROUPS.map(group => {
                      const isActive = currentArchetype.category === group.id;
                      const Icon = group.icon;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          aria-pressed={isActive}
                          title={group.label}
                          onClick={() => handleSelectArchetype(group.defaultType)}
                          className={cn(
                            "flex cursor-pointer flex-col items-start gap-3 rounded-2xl p-3.5 text-left transition-all",
                            isActive
                              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                              : "bg-gray-50 text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400")} />
                          <span className="text-[13px] font-bold leading-tight">{group.short}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Specialty chips */}
                  {(() => {
                    const specialties = BUSINESS_ARCHETYPES.filter(a => a.category === currentArchetype.category);
                    if (specialties.length <= 1) return null;
                    return (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {specialties.map(sub => {
                          const isActive = selectedArchetype === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => handleSelectArchetype(sub.id)}
                              className={cn(
                                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                                isActive
                                  ? "bg-brand-50 text-brand-600 ring-1 ring-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400"
                                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                              )}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Offer model */}
                <div className="space-y-3.5">
                  <label className="text-[13px] font-semibold text-gray-900 dark:text-gray-200">
                    ¿Qué comercializas?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {OFFER_MODELS.map(om => {
                      const isActive = selectedOfferModel === om.id;
                      const Icon = om.icon;
                      return (
                        <button
                          key={om.id}
                          type="button"
                          aria-pressed={isActive}
                          title={om.title}
                          onClick={() => setSelectedOfferModel(om.id)}
                          className={cn(
                            "flex cursor-pointer flex-col items-start gap-3 rounded-2xl p-3.5 text-left transition-all",
                            isActive
                              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                              : "bg-gray-50 text-gray-900 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400")} />
                          <span className="text-[13px] font-bold leading-tight">{om.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Capacidades */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <Eyebrow>Paso 2 · Capacidades</Eyebrow>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                    Capacidades y Módulos
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    Activa los módulos que necesitas hoy. Podrás cambiar esta configuración cuando quieras.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MODULE_DEFINITIONS.map(mod => {
                    const isSelected = selectedModules.includes(mod.id);
                    const ModIcon = mod.icon;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleToggleModule(mod.id)}
                        className={cn(
                          "flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer select-none",
                          isSelected
                            ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 dark:border-brand-500/50 ring-2 ring-brand-500/20"
                            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors mt-0.5",
                            isSelected
                              ? "bg-brand-500 text-white"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          )}
                        >
                          <ModIcon className="h-4.5 w-4.5" />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {mod.title}
                            </span>
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                                isSelected
                                  ? "border-brand-500 bg-brand-500 text-white"
                                  : "border-gray-300 dark:border-gray-700"
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                            {mod.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Resumen */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <Eyebrow>Paso 3 · Lanzamiento</Eyebrow>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                    Resumen de configuración
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    Revisa los datos antes de crear tu espacio operativo.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-gray-200 p-6 space-y-6 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/25">
                        <CurrentIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {companyName.trim() || "Sin nombre"}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {locationLabel} · {currencyForCountry(country)}
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-gray-200 pt-6 sm:grid-cols-3 dark:border-gray-800">
                      {[
                        { label: "Arquetipo", value: currentArchetype.label },
                        { label: "Modelo de oferta", value: OFFER_MODEL_LABEL[selectedOfferModel] },
                        { label: "Contacto", value: contactPhone.trim() || "Por configurar" },
                      ].map(item => (
                        <div key={item.label} className="space-y-1">
                          <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            {item.label}
                          </dt>
                          <dd className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-800">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        Módulos a instalar
                      </span>
                      {selectedModules.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedModules.map(m => {
                            const def = MODULE_DEFINITIONS.find(d => d.id === m);
                            return (
                              <span
                                key={m}
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
                              >
                                {def?.shortTitle || m}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">
                          Tienda limpia — podrás activar módulos cuando quieras.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 p-5 sm:flex-row sm:items-center dark:border-gray-800">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                        <Smartphone className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white">Conectar WhatsApp</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isMetaConnected
                            ? "Canal vinculado. Ya recibes conversaciones y pedidos."
                            : "Vincúlalo ahora o actívalo después desde Ajustes."}
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
                      className="flex-none rounded-full px-5 py-2.5 text-xs font-bold"
                    >
                      {isMetaConnected ? "Vinculado" : "Conectar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="sticky bottom-0 z-20 mx-auto mt-12 flex w-full max-w-xl items-center justify-between bg-white/95 pt-6 pb-3 backdrop-blur-md dark:bg-[#0D0D10]/95">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-secondary-600 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/workspaces")}
                className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-secondary-600 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancelar
              </button>
            )}

            {step < 3 ? (
              <Button
                variant="primary"
                intent="onboarding.step.next"
                disabled={step === 1 && !canProceedStep1}
                onClick={() => setStep(step + 1)}
                className="rounded-full px-6 py-3 text-[13px] font-bold"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                intent="onboarding.step.finish"
                disabled={isDeploying}
                onClick={handleFinish}
                className="rounded-full px-7 py-3 text-[13px] font-bold"
              >
                {isDeploying ? "Creando tienda…" : "Entrar a mi tienda"}
                {!isDeploying && <Rocket className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: brand panel ─────────────────────────────────────── */}
        <div
          className={cn(
            "relative min-h-[420px] flex-col justify-between overflow-hidden bg-brand-500 dark:bg-[#190088] p-8 text-white sm:p-12 lg:col-span-5 lg:min-h-[560px] border-l border-transparent dark:border-indigo-900/50 transition-colors duration-300",
            step === 1 ? "flex" : "hidden lg:flex"
          )}
        >
          <InteractiveDotGrid dotGap={26} baseRadius={1.5} activeRadius={3.0} glowDistance={150} />

          {step === 1 ? (
            <div className="relative z-10 flex h-full animate-in flex-col justify-between fade-in duration-300">
              <img src="/images/logo/necto-full-white.svg" alt="Necto" className="h-7 w-auto" />

              <div className="space-y-6 my-auto">
                <AnimatedStepMessages step={1} />

                <div className="space-y-2 border-t border-white/25 pt-6">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                    Tu tienda
                  </span>
                  <p className="truncate text-[24px] font-black leading-tight tracking-tight">
                    {companyName.trim() || "Sin nombre todavía"}
                  </p>
                  <p className="text-sm font-medium text-white/85">
                    {currentArchetype.label} · {OFFER_MODEL_LABEL[selectedOfferModel]}
                  </p>
                  <p className="text-sm font-medium text-white/85">
                    {locationLabel} · {currencyForCountry(country)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-white/70 pt-4">
                <span>Necto OS · Plataforma de operaciones</span>
                <span className="font-mono">v3.0</span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex h-full animate-in flex-col justify-between fade-in duration-300">
              <div className="flex items-center justify-between">
                <img src="/images/logo/necto-full-white.svg" alt="Necto" className="h-6 w-auto" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                  {step === 2 ? "Capacidades" : "Lanzamiento"}
                </span>
              </div>

              <div className="my-auto">
                <AnimatedStepMessages step={step} />
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-white/70 pt-4">
                <span>grow together</span>
                <span className="font-mono">v3.0</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
