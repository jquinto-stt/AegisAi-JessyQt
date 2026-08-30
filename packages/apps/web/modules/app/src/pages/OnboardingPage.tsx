import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessType, BusinessIconKey } from "../context/BusinessContext";
import { BusinessIcon } from "../compositions/workspace/BusinessIcon";
import {
  Store,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Globe,
  ShoppingBag,
  Clock,
  MapPin,
  Coins,
  ChefHat,
  Flame,
  Coffee,
  UtensilsCrossed,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant_virtual");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bogotá, Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [iconKey, setIconKey] = useState<BusinessIconKey>("utensils");

  // Step 2: Channels
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const [slug, setSlug] = useState("");

  // Step 3: Specialty
  const [specialty, setSpecialty] = useState("Hamburguesas, Grill & Fast Food");

  // Step 4: Kitchen
  const [kitchenBufferMin, setKitchenBufferMin] = useState(20);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(autoSlug);
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createBusiness({
      name: name.trim(),
      slug: slug.trim() || `restaurante-${Date.now()}`,
      businessType,
      iconKey,
      currency,
      city,
      channels: {
        whatsapp: enableWhatsapp,
        web: enableWeb,
        pos: enablePos,
      },
      kitchenBufferMin,
      specialty,
    });

    navigate("/");
  };

  const iconOptions: Array<{ key: BusinessIconKey; label: string }> = [
    { key: "utensils", label: "Cocina / Grill" },
    { key: "flame", label: "Horno / Fuego" },
    { key: "coffee", label: "Café / Bakery" },
    { key: "chef", label: "Chef / Autor" },
    { key: "store", label: "Local / Mostrador" },
  ];

  const specialtyOptions = [
    {
      title: "Hamburguesas, Grill & Fast Food",
      iconKey: "utensils" as BusinessIconKey,
      desc: "Combos, salsas, bebidas, carnes y guarniciones rápidas",
    },
    {
      title: "Pizzería, Calzones & Empanadas",
      iconKey: "flame" as BusinessIconKey,
      desc: "Masas artesanales, porciones, agregados y bebidas",
    },
    {
      title: "Cafetería, Pastelería & Brunch",
      iconKey: "coffee" as BusinessIconKey,
      desc: "Cafés de especialidad, panificados, desayunos y repostería",
    },
    {
      title: "Restaurante A la Carta & Cocina de Autor",
      iconKey: "chef" as BusinessIconKey,
      desc: "Entradas, platos principales, maridajes y tiempos de salón",
    },
  ];

  const stepsList = [
    { num: 1, title: "Identidad & Moneda", subtitle: "Nombre y configuración regional" },
    { num: 2, title: "Canales de Venta & IA", subtitle: "WhatsApp, Tienda Web y POS" },
    { num: 3, title: "Especialidad Operativa", subtitle: "Plantilla de carta sugerida" },
    { num: 4, title: "Cocina & Tiempos KDS", subtitle: "Parámetros de despacho y comandas" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Minimal Header */}
      <header className="px-6 sm:px-10 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter shadow-2xs">
            N
          </div>
          <div>
            <span className="font-extrabold text-xs tracking-tight text-zinc-900 dark:text-white">
              Necto
            </span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs text-zinc-400 font-medium">Configuración de Negocio</span>
          </div>
        </div>

        {businesses.length > 0 && (
          <button
            onClick={() => navigate("/workspaces")}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Volver a Mis Negocios</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Left Progress Column */}
        <div className="w-full md:w-80 flex-none space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/60 text-[#FF3F1A] text-[10px] font-black uppercase tracking-wider font-mono">
              <Sparkles className="w-3 h-3" />
              <span>Nuevo Espacio</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
              Crear Negocio
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Configura el entorno de operaciones y sincroniza cocina, canales y catálogo.
            </p>
          </div>

          {/* Stepper Vertical */}
          <div className="space-y-1.5 bg-white dark:bg-[#18181B] p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
            {stepsList.map(s => {
              const isCurrent = step === s.num;
              const isPast = step > s.num;

              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                    isCurrent
                      ? "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-950 dark:text-zinc-50 font-bold"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                      isPast
                        ? "bg-[#FF3F1A] text-white shadow-2xs"
                        : isCurrent
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{s.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise Badge */}
          <div className="p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-900 text-zinc-200 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-white">
              <ShieldCheck className="w-4 h-4 text-[#FF3F1A]" />
              <span>Multi-Tenant Enterprise</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cada negocio cuenta con base de datos de stock, roles de cocina y enlaces de pedidos independientes.
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="flex-1 w-full bg-white dark:bg-[#18181B] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[540px]">
          {/* STEP 1: IDENTIDAD & MONEDA */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Paso 1 de 4
                </span>
                <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Identidad & Configuración Regional
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Establece el nombre comercial y los parámetros contables del negocio.
                </p>
              </div>

              {/* Vertical Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Vertical Operativa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setBusinessType("restaurant_virtual")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      businessType === "restaurant_virtual"
                        ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 shadow-2xs"
                        : "border-zinc-200 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center flex-none">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">Restaurante / Dark Kitchen</p>
                        <span className="text-[9px] bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded font-black font-mono">Activo</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        Tablero de pedidos, KDS de cocina, escandallos e impresiones térmicas.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 opacity-40 flex items-start gap-3.5 cursor-not-allowed">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center flex-none">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Retail & Comercio</p>
                        <span className="text-[9px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded font-mono">Próximamente</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        Inventario por tallas, SKU de códigos de barra y mostrador retail.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Icon Key */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Nombre Comercial & Distintivo *
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-none">
                    <select
                      value={iconKey}
                      onChange={e => setIconKey(e.target.value as any)}
                      className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                    >
                      {iconOptions.map(opt => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej: La Birra Burger & Grill"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* City & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" /> Ubicación / Ciudad
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ej: Bogotá, Colombia"
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" /> Moneda de Venta
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer"
                  >
                    <option value="COP">Peso Colombiano (COP $)</option>
                    <option value="USD">Dólar Estadounidense (USD $)</option>
                    <option value="MXN">Peso Mexicano (MXN $)</option>
                    <option value="ARS">Peso Argentino (ARS $)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CANALES & IA */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Paso 2 de 4
                </span>
                <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Canales de Captura & Agente IA
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Elige los canales de venta que sincronizarán pedidos con tu cocina.
                </p>
              </div>

              <div className="space-y-3">
                {/* WhatsApp IA */}
                <div
                  onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                    enableWhatsapp
                      ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">WhatsApp con Asistente IA</p>
                        <span className="text-[9px] bg-zinc-900 dark:bg-zinc-700 text-white px-1.5 py-0.2 rounded font-mono">Agente 24/7</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Interpreta audio/texto de clientes y monta el pedido con confirmación automática.
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enableWhatsapp ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                    {enableWhatsapp && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Web Direct Store */}
                <div
                  onClick={() => setEnableWeb(!enableWeb)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                    enableWeb
                      ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold">
                      <Globe className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">Menú Web Directo</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Tienda web propia con checkout directo sin comisiones externas.
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enableWeb ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                    {enableWeb && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Subdomain Input */}
                {enableWeb && (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase font-mono">Enlace Web del Negocio</label>
                    <div className="flex items-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <span>https://necto.app/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        placeholder="tu-marca"
                        className="flex-1 bg-transparent text-zinc-950 dark:text-zinc-50 font-bold border-b border-zinc-300 dark:border-zinc-600 focus:border-[#FF3F1A] focus:outline-none pl-1"
                      />
                    </div>
                  </div>
                )}

                {/* POS Mostrador */}
                <div
                  onClick={() => setEnablePos(!enablePos)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                    enablePos
                      ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">POS Mostrador & Teléfono</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Toma rápida de comandas en salón, caja o pedidos telefónicos.
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enablePos ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                    {enablePos && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ESPECIALIDAD */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Paso 3 de 4
                </span>
                <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Especialidad Operativa & Carta Base
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Selecciona la tipología de cocina para inicializar categorías e insumos sugeridos.
                </p>
              </div>

              <div className="space-y-2.5">
                {specialtyOptions.map(opt => (
                  <div
                    key={opt.title}
                    onClick={() => setSpecialty(opt.title)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                      specialty === opt.title
                        ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 text-zinc-950 dark:text-zinc-50 shadow-2xs"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                        <BusinessIcon iconKey={opt.iconKey} className="w-4 h-4 text-[#FF3F1A]" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">{opt.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    {specialty === opt.title && (
                      <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: COCINA & TIEMPOS */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Paso 4 de 4
                </span>
                <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Tiempos de Cocina & KDS
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Establece el tiempo estándar de despacho para clientes y repartidores.
                </p>
              </div>

              {/* Kitchen Buffer Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span>Tiempo Estándar de Preparación</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setKitchenBufferMin(mins)}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        kitchenBufferMin === mins
                          ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 text-[#FF3F1A] font-black shadow-2xs"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold"
                      }`}
                    >
                      <p className="text-lg font-black">{mins} min</p>
                      <p className="text-[10px] opacity-70">Despacho base</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Resumen de Despliegue
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center flex-none">
                    <BusinessIcon iconKey={iconKey} className="w-5 h-5 text-[#FF3F1A]" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-zinc-950 dark:text-zinc-50">
                      {name || "Nuevo Restaurante"}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {specialty} • {city} • {currency}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 mt-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                disabled={step === 1 && !name.trim()}
                onClick={() => setStep(s => s + 1)}
                className={`py-3 px-6 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  step === 1 && !name.trim()
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-[#FF3F1A] hover:bg-[#e03413] text-white shadow-2xs active:scale-95"
                }`}
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="py-3 px-7 rounded-2xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lanzar Workspace</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
