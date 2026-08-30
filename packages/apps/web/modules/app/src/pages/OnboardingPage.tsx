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
  Smartphone,
  Bot,
  Send,
  Printer,
  Sliders,
  CheckCircle2,
  Wand2,
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
  const [specialty, setSpecialty] = useState("Hamburguesas & Carnes a la Parrilla");

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

  // Quick Smart Presets
  const applySmartPreset = (preset: {
    name: string;
    specialty: string;
    icon: BusinessIconKey;
    mins: number;
  }) => {
    setName(preset.name);
    handleNameChange(preset.name);
    setSpecialty(preset.specialty);
    setIconKey(preset.icon);
    setKitchenBufferMin(preset.mins);
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
      title: "Hamburguesas & Carnes a la Parrilla",
      iconKey: "utensils" as BusinessIconKey,
      desc: "Combos, salsas, papas rústicas, bebidas y carnes smash",
      suggestedName: "Smash & Co. Burger Bar",
    },
    {
      title: "Pizzería Artesanal & Horno de Leña",
      iconKey: "flame" as BusinessIconKey,
      desc: "Masas madre, calzones, porciones y bebidas",
      suggestedName: "Don Giovanni Pizza & Forno",
    },
    {
      title: "Cafetería de Especialidad & Bakery",
      iconKey: "coffee" as BusinessIconKey,
      desc: "Cafés de origen, desayunos, brunch y pastelería fina",
      suggestedName: "Atelier Café & Tostadores",
    },
    {
      title: "Cocina de Autor & Platos A la Carta",
      iconKey: "chef" as BusinessIconKey,
      desc: "Entradas gourmet, principales, maridajes y comandas de salón",
      suggestedName: "Cava & Fuego Restaurante",
    },
  ];

  const stepsList = [
    { num: 1, title: "Identidad & Moneda", desc: "Datos de la marca" },
    { num: 2, title: "Canales & Agente IA", desc: "WhatsApp y Web" },
    { num: 3, title: "Especialidad & Carta", desc: "Recetas e insumos" },
    { num: 4, title: "Cocina & Despacho", desc: "Tiempos de KDS" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased">
      {/* Top Minimal Navigation Bar */}
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
            <span className="text-xs text-zinc-400 font-medium">Configuración Guiada de Negocio</span>
          </div>
        </div>

        {businesses.length > 0 && (
          <button
            onClick={() => navigate("/workspaces")}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Mis Negocios</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Left Interactive Wizard Form (60% width on Desktop) */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Step Pills */}
          <div className="grid grid-cols-4 gap-2">
            {stepsList.map(s => {
              const isCurrent = step === s.num;
              const isPast = step > s.num;

              return (
                <div
                  key={s.num}
                  onClick={() => isPast && setStep(s.num)}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    isPast ? "cursor-pointer" : ""
                  } ${
                    isCurrent
                      ? "bg-white dark:bg-[#18181B] border-[#FF3F1A] shadow-2xs"
                      : isPast
                      ? "bg-white/60 dark:bg-[#18181B]/60 border-zinc-200 dark:border-zinc-800"
                      : "bg-transparent border-transparent opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                        isPast
                          ? "bg-[#FF3F1A] text-white"
                          : isCurrent
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3" /> : s.num}
                    </div>
                    <p className="text-xs font-black truncate hidden sm:block">{s.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[480px]">
            {/* STEP 1: IDENTIDAD & MONEDA */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                      Paso 1 de 4
                    </span>
                    <h2 className="text-xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5">
                      Identidad & Ubicación
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Nombre comercial, icono y parámetros contables.
                    </p>
                  </div>

                  {/* AI Quick Generator */}
                  <div className="dropdown relative">
                    <button
                      type="button"
                      onClick={() =>
                        applySmartPreset({
                          name: "La Fabbrica Pizza & Pasta",
                          specialty: "Pizzería Artesanal & Horno de Leña",
                          icon: "flame",
                          mins: 15,
                        })
                      }
                      className="py-1.5 px-3 rounded-xl border border-orange-200/80 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/30 text-[#FF3F1A] text-[11px] font-black hover:bg-orange-100/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Autocompletar con plantilla inteligente"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Ejemplo Inteligente</span>
                    </button>
                  </div>
                </div>

                {/* Vertical Selection Card */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Tipo de Establecimiento
                  </label>
                  <div className="p-4 rounded-2xl border-2 border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-orange-200 dark:border-orange-900/60 text-[#FF3F1A] flex items-center justify-center flex-none">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">Restaurante / Dark Kitchen</p>
                          <span className="text-[9px] bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded font-black font-mono">Activo</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Tablero de pedidos, KDS de cocina, escandallos e impresión de comandas.
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none shadow-2xs">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Name & Icon Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Nombre del Restaurante / Marca *
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-none">
                      <select
                        value={iconKey}
                        onChange={e => setIconKey(e.target.value as any)}
                        className="px-3 py-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
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
                      placeholder="Ej: Smash & Co. Burger Bar"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                      className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-black text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
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
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" /> Moneda de Venta
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer"
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
                  <h2 className="text-xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5">
                    Canales de Venta & Agente IA
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sincronización omnicanal de pedidos directamente a cocina.
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
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold flex-none">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">WhatsApp con Asistente IA</p>
                          <span className="text-[9px] bg-zinc-900 dark:bg-zinc-700 text-white px-1.5 py-0.2 rounded font-mono">Agente 24/7</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Atiende consultas, audios y pedidos de clientes automáticamente.
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
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold flex-none">
                        <Globe className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">Menú Web Directo</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Página de delivery y recogida propia sin comisiones de apps externas.
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enableWeb ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                      {enableWeb && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Subdomain Input */}
                  {enableWeb && (
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase font-mono">Enlace Web de tu Menú</label>
                      <div className="flex items-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        <span>https://necto.app/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={e => setSlug(e.target.value)}
                          placeholder="mi-restaurante"
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
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center font-bold flex-none">
                        <ShoppingBag className="w-5 h-5 text-zinc-300" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">POS Mostrador & Teléfono</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Toma rápida de comandas en caja y pedidos por llamada telefónica.
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
                  <h2 className="text-xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5">
                    Especialidad Operativa & Carta
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inicializaremos las categorías, escandallos e insumos base correspondientes.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {specialtyOptions.map(opt => (
                    <div
                      key={opt.title}
                      onClick={() => {
                        setSpecialty(opt.title);
                        setIconKey(opt.iconKey);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                        specialty === opt.title
                          ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 text-zinc-950 dark:text-zinc-50 shadow-2xs"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-none">
                          <BusinessIcon iconKey={opt.iconKey} className="w-5 h-5 text-[#FF3F1A]" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-950 dark:text-zinc-50">{opt.title}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      {specialty === opt.title && (
                        <div className="w-5 h-5 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center flex-none shadow-2xs">
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
                  <h2 className="text-xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5">
                    Cocina KDS & Tiempos de Despacho
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Establece el colchón de tiempo estándar para la promesa de entrega.
                  </p>
                </div>

                {/* Kitchen Buffer Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" />
                    <span>Tiempo Base de Elaboración en Cocina</span>
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
                        <p className="text-xl font-black">{mins} min</p>
                        <p className="text-[10px] opacity-70 mt-0.5">Promesa de despacho</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                    Resumen de Configuración
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

            {/* Navigation Action Buttons */}
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
                  <span>Siguiente Paso</span>
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
        </div>

        {/* Right Live Simulator / Intelligent Preview (40% width on Desktop) */}
        <div className="w-full lg:w-96 flex-none space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Live Workspace Preview
            </span>
            <span className="text-[10px] text-[#FF3F1A] font-bold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A] animate-pulse" /> Tiempo Real
            </span>
          </div>

          {/* Card 1: Live Digital Identity Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-white flex items-center justify-center flex-none shadow-2xs">
                  <BusinessIcon iconKey={iconKey} className="w-5 h-5 text-[#FF3F1A]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-zinc-950 dark:text-zinc-50 truncate">
                    {name || "Nombre del Restaurante"}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {city || "Ciudad, País"}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-black font-mono">
                {currency}
              </span>
            </div>

            {/* Live URL Pill */}
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 truncate">
                <Globe className="w-3.5 h-3.5 text-blue-500 flex-none" />
                <span className="truncate">necto.app/{slug || "tu-negocio"}</span>
              </div>
              <span className="text-[9px] text-emerald-600 font-bold flex-none">SSL</span>
            </div>
          </div>

          {/* Card 2: WhatsApp IA Interactive Simulator */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                  Agente IA WhatsApp
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">En Línea</span>
            </div>

            {/* Chat Messages */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 max-w-[85%] rounded-tl-xs">
                <p className="text-[11px]">
                  Hola, quiero pedir 2 platos de la carta para despacho a domicilio.
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FF3F1A]/10 text-zinc-900 dark:text-zinc-100 border border-[#FF3F1A]/20 max-w-[90%] ml-auto rounded-tr-xs space-y-1">
                <p className="text-[11px] font-bold">
                  ¡Hola! Bienvenido a <span className="text-[#FF3F1A]">{name || "nuestro local"}</span>.
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Especialidad: {specialty}. Tiempo estimado: {kitchenBufferMin} min.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Kitchen KDS Ticket Preview */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-2.5 font-mono">
            <div className="flex items-center justify-between text-[11px] border-b border-dashed border-zinc-200 dark:border-zinc-700 pb-2">
              <span className="font-bold flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                <Printer className="w-3.5 h-3.5 text-[#FF3F1A]" /> TICKET #1042
              </span>
              <span className="text-zinc-400 text-[10px]">KDS COCINA</span>
            </div>
            <div className="text-[11px] space-y-1 text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>1x Combo Especial</span>
                <span className="font-bold">LISTO</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Tiempo de despacho:</span>
                <span className="text-[#FF3F1A] font-bold">{kitchenBufferMin} min</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
