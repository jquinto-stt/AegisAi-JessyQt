import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessType } from "../context/BusinessContext";
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
  ShieldCheck,
  ChefHat,
  Smartphone,
  Flame,
  CheckCircle2,
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
  const [logoEmoji, setLogoEmoji] = useState("🍔");

  // Step 2: Channels
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const [slug, setSlug] = useState("");

  // Step 3: Specialty
  const [specialty, setSpecialty] = useState("Hamburguesas & Comidas Rápidas");

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
      logoEmoji,
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

  const emojiOptions = ["🍔", "🍕", "🍣", "🌮", "☕", "🥩", "🥗", "🍗", "🍦", "🍜"];

  const specialtyOptions = [
    { title: "Hamburguesas & Comidas Rápidas", icon: "🍔", desc: "Combos, papas, salsas, bebidas y carnes" },
    { title: "Pizzería & Empanadas", icon: "🍕", desc: "Masas, quesos, ingredientes y porciones" },
    { title: "Cafetería & Panadería", icon: "☕", desc: "Pastelería, desayunos, granos y panificados" },
    { title: "Sushi & Comida Asiática", icon: "🍣", desc: "Rolls, woks, pescados y complementos" },
    { title: "Gourmet & A la Carta", icon: "🥩", desc: "Cortes de carne, entradas, guarniciones y vinos" },
  ];

  const stepsList = [
    { num: 1, title: "Tipo & Identidad", subtitle: "Define el nombre y país" },
    { num: 2, title: "Canales & Agente IA", subtitle: "WhatsApp, Web y POS" },
    { num: 3, title: "Especialidad & Carta", subtitle: "Plantilla de cocina sugerida" },
    { num: 4, title: "Operación & Despacho", subtitle: "Tiempos de KDS y preparación" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#212121] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#190088] dark:border-[#FF3F1A] flex items-center justify-center shadow-xs select-none">
            <span className="font-black text-xl text-[#FF3F1A] tracking-tighter">N</span>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white">
              Necto
            </span>
            <span className="ml-2 text-xs text-zinc-400 font-mono">Workspace Setup</span>
          </div>
        </div>

        {businesses.length > 0 && (
          <button
            onClick={() => navigate("/workspaces")}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ← Volver a Mis Negocios
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Left Progress Column */}
        <div className="w-full md:w-72 flex-none space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3F1A]">
              Onboarding Guiado
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
              Configura tu Negocio
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Personalizaremos el tablero de operaciones y la cocina para tu tipo de negocio.
            </p>
          </div>

          {/* Stepper Vertical */}
          <div className="space-y-2 bg-white dark:bg-[#212121] p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
            {stepsList.map(s => {
              const isCurrent = step === s.num;
              const isPast = step > s.num;

              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                    isCurrent
                      ? "bg-orange-50/60 dark:bg-orange-950/30 text-zinc-900 dark:text-zinc-100 font-bold"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isPast
                        ? "bg-[#FF3F1A] text-white"
                        : isCurrent
                        ? "bg-orange-100 dark:bg-orange-900 text-[#FF3F1A] border-2 border-[#FF3F1A]"
                        : "bg-slate-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{s.title}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{s.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-3xl bg-zinc-900 text-white dark:bg-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#FF3F1A]">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Negocio SaaS</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Podrás crear y gestionar múltiples restaurantes o locales desde tu misma cuenta en cualquier momento.
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="flex-1 w-full bg-white dark:bg-[#212121] rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[520px]">
          {/* STEP 1: TIPO & IDENTIDAD */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  1. Tipo de Negocio & Identidad
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Selecciona la vertical operativa y los datos principales del establecimiento.
                </p>
              </div>

              {/* Business Type Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Selecciona la Vertical de Negocio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setBusinessType("restaurant_virtual")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      businessType === "restaurant_virtual"
                        ? "border-[#FF3F1A] bg-orange-50/40 dark:bg-orange-950/20 shadow-xs"
                        : "border-slate-200 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    <span className="text-3xl">🍔</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">Restaurante / Dark Kitchen</p>
                        <span className="text-[9px] bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded font-black font-mono">Activo</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Gestión de comandas, cocina KDS, escandallo de ingredientes y delivery.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800/60 opacity-40 flex items-start gap-3.5 cursor-not-allowed">
                    <span className="text-3xl">👗</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Retail & Tienda</p>
                        <span className="text-[9px] bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded font-mono">Próximamente</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Stock por tallas/colores, códigos de barra y ventas en mostrador.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Emoji */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Nombre del Restaurante / Marca *
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={logoEmoji}
                    onChange={e => setLogoEmoji(e.target.value)}
                    className="w-14 h-12 text-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-center cursor-pointer focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                  >
                    {emojiOptions.map(em => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Ej: La Birra Burger & Co."
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* City & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" /> Ubicación / Ciudad
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ej: Bogotá, Colombia"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" /> Moneda de Facturación
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer"
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
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  2. Canales de Venta & Asistente IA
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Activa los canales por donde tus clientes podrán realizar pedidos.
                </p>
              </div>

              <div className="space-y-3">
                {/* WhatsApp IA */}
                <div
                  onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    enableWhatsapp
                      ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20"
                      : "border-slate-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">WhatsApp con Asistente IA</p>
                        <span className="text-[9px] bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded font-black font-mono">Agente 24/7</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">Atiende clientes, procesa audio/texto y carga la comanda al tablero.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enableWhatsapp ? "bg-[#FF3F1A]" : "bg-slate-300 dark:bg-zinc-700"}`}>
                    {enableWhatsapp && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Web Direct Store */}
                <div
                  onClick={() => setEnableWeb(!enableWeb)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    enableWeb
                      ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20"
                      : "border-slate-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-bold">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Menú Web Directo</p>
                      <p className="text-[11px] text-zinc-400">Página propia para tus clientes sin comisiones de apps externas.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enableWeb ? "bg-[#FF3F1A]" : "bg-slate-300 dark:bg-zinc-700"}`}>
                    {enableWeb && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Subdomain Input */}
                {enableWeb && (
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Subdominio de tu Restaurante</label>
                    <div className="flex items-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <span>https://necto.app/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        placeholder="mi-restaurante"
                        className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 font-bold border-b border-zinc-300 dark:border-zinc-600 focus:border-[#FF3F1A] focus:outline-none pl-1"
                      />
                    </div>
                  </div>
                )}

                {/* POS Mostrador */}
                <div
                  onClick={() => setEnablePos(!enablePos)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    enablePos
                      ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-orange-950/20"
                      : "border-slate-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">POS Mostrador / Teléfono</p>
                      <p className="text-[11px] text-zinc-400">Toma manual ágil para cajeros y personal de salón.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white ${enablePos ? "bg-[#FF3F1A]" : "bg-slate-300 dark:bg-zinc-700"}`}>
                    {enablePos && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ESPECIALIDAD & CARTA */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  3. Especialidad Gastronómica
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Selecciona tu tipo de carta para pre-cargar categorías e insumos sugeridos.
                </p>
              </div>

              <div className="space-y-2.5">
                {specialtyOptions.map(opt => (
                  <div
                    key={opt.title}
                    onClick={() => setSpecialty(opt.title)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      specialty === opt.title
                        ? "border-[#FF3F1A] bg-orange-50/40 dark:bg-orange-950/30 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                        : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{opt.title}</p>
                        <p className="text-[10px] text-zinc-400">{opt.desc}</p>
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
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  4. Operación de Cocina & Tiempos KDS
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ajusta la velocidad estimada de preparación para tus clientes.
                </p>
              </div>

              {/* Kitchen Buffer Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span>Tiempo Base de Preparación</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setKitchenBufferMin(mins)}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        kitchenBufferMin === mins
                          ? "border-[#FF3F1A] bg-orange-50/40 dark:bg-orange-950/30 text-[#FF3F1A] font-black shadow-2xs"
                          : "border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold"
                      }`}
                    >
                      <p className="text-lg font-black">{mins} min</p>
                      <p className="text-[10px] opacity-70">Despacho estándar</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Resumen de Lanzamiento
                </span>
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl">{logoEmoji}</span>
                  <div>
                    <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                      {name || "Nuevo Restaurante"}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {specialty} • {city} • {currency}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 mt-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                className={`py-3 px-6 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  step === 1 && !name.trim()
                    ? "bg-slate-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-[#FF3F1A] hover:bg-[#e03413] text-white shadow-sm active:scale-95"
                }`}
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="py-3 px-7 rounded-2xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lanzar Workspace 🚀</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
