import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness, BusinessType, BusinessIconKey } from "../context/BusinessContext";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Flame,
  Coffee,
  ChefHat,
  MapPin,
  Coins,
  Clock,
  Building2,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { businesses, createBusiness } = useBusiness();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bogotá, Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [iconKey, setIconKey] = useState<BusinessIconKey>("utensils");

  // Channels
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const [slug, setSlug] = useState("");

  // Specialty & Kitchen
  const [specialty, setSpecialty] = useState("Hamburguesas & Grill");
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

  const handleFinish = () => {
    if (!name.trim()) return;

    createBusiness({
      name: name.trim(),
      slug: slug.trim() || `restaurante-${Date.now()}`,
      businessType: "restaurant_virtual",
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step === 1 && name.trim()) setStep(2);
      else if (step === 2) setStep(3);
      else if (step === 3) setStep(4);
      else if (step === 4) handleFinish();
    }
  };

  const specialtyList = [
    {
      id: "grill",
      name: "Hamburguesas & Grill",
      desc: "Combos rápidos, bebidas y papas",
      iconKey: "utensils" as BusinessIconKey,
    },
    {
      id: "pizza",
      name: "Pizzería & Pastas",
      desc: "Horno, masas y agregados",
      iconKey: "flame" as BusinessIconKey,
    },
    {
      id: "cafe",
      name: "Cafetería & Bakery",
      desc: "Cafés de origen, desayunos y panadería",
      iconKey: "coffee" as BusinessIconKey,
    },
    {
      id: "gourmet",
      name: "Cocina de Autor & Salón",
      desc: "Platos a la carta y maridajes",
      iconKey: "chef" as BusinessIconKey,
    },
  ];

  return (
    <div
      onKeyDown={handleKeyDown}
      className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#FF3F1A] selection:text-white antialiased"
    >
      {/* Top Hairline Progress */}
      <div className="w-full bg-zinc-200/80 dark:bg-zinc-800/80 h-0.5 fixed top-0 left-0 right-0 z-50">
        <div
          className="bg-[#FF3F1A] h-full transition-all duration-500 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="px-8 sm:px-16 py-6 flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm select-none tracking-tighter">
            N
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Necto Platform
          </span>
        </div>

        {businesses.length > 0 && (
          <button
            onClick={() => navigate("/workspaces")}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancelar y volver
          </button>
        )}
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-2xl w-full mx-auto">
        <div className="w-full space-y-8 animate-fade-in">
          {/* Step Meta Indicator */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#FF3F1A] tracking-wider">
              0{step} / 04
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">—</span>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
              {step === 1 && "Identidad & Datos Principales"}
              {step === 2 && "Canales de Venta"}
              {step === 3 && "Perfil Operativo"}
              {step === 4 && "Despliegue de Infraestructura"}
            </span>
          </div>

          {/* STEP 1: IDENTIDAD */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  ¿Cómo se llama tu restaurante o marca?
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                  Configura el nombre principal y la moneda con la que operarás.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="Ej. La Birra Bar & Grill"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full text-xl sm:text-2xl font-medium tracking-tight bg-transparent border-b-2 border-zinc-300 dark:border-zinc-700 focus:border-[#FF3F1A] dark:focus:border-[#FF3F1A] py-3 text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                      Ubicación / Ciudad
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Bogotá, Colombia"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                      Moneda Base
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer"
                    >
                      <option value="COP">Peso Colombiano (COP $)</option>
                      <option value="USD">Dólar Estadounidense (USD $)</option>
                      <option value="MXN">Peso Mexicano (MXN $)</option>
                      <option value="ARS">Peso Argentino (ARS $)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CANALES */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Canales de recepción de pedidos
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                  Activa las fuentes de entrada que sincronizarán comandas en tiempo real.
                </p>
              </div>

              <div className="space-y-3">
                {/* WhatsApp */}
                <div
                  onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    enableWhatsapp
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        WhatsApp Business con Asistente IA
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        24/7
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Toma pedidos por audio y texto y los inserta en el tablero de cocina.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white transition-colors ${
                      enableWhatsapp ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    {enableWhatsapp && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Web Store */}
                <div
                  onClick={() => setEnableWeb(!enableWeb)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    enableWeb
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Menú Web Directo
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Portal web propio con enlace directo para tus clientes.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white transition-colors ${
                      enableWeb ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    {enableWeb && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Slug Input */}
                {enableWeb && (
                  <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center text-xs font-mono text-zinc-500">
                    <span className="text-zinc-400">https://necto.app/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="tu-restaurante"
                      className="bg-transparent text-zinc-950 dark:text-zinc-50 font-semibold focus:outline-none flex-1 pl-0.5"
                    />
                  </div>
                )}

                {/* POS */}
                <div
                  onClick={() => setEnablePos(!enablePos)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    enablePos
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Punto de Venta Mostrador (POS)
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Terminal táctil para cajeros, llamadas y pedidos de salón.
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white transition-colors ${
                      enablePos ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    {enablePos && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ESPECIALIDAD & COCINA */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Operación de cocina & especialidad
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                  Configura la tipología de cocina y el tiempo estándar de preparación.
                </p>
              </div>

              {/* Specialty Grid */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                  Especialidad Gastronómica
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specialtyList.map(item => {
                    const isSelected = specialty === item.name;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSpecialty(item.name);
                          setIconKey(item.iconKey);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white dark:bg-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-xs"
                            : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen Buffer */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                  Tiempo Promedio de Elaboración (KDS)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setKitchenBufferMin(mins)}
                      className={`py-3.5 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        kitchenBufferMin === mins
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {mins} minutos
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: DESPLIEGUE */}
          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Listo para inicializar
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                  Resumen de la arquitectura del nuevo espacio de trabajo.
                </p>
              </div>

              {/* Architectural Provisioning Card */}
              <div className="p-6 rounded-2xl bg-zinc-950 text-zinc-100 border border-zinc-800 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">ORGANIZATION / WORKSPACE</span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Nombre:</span>
                    <span className="text-zinc-200 font-bold">{name || "Restaurante"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sede & Moneda:</span>
                    <span className="text-zinc-200">{city} ({currency})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Especialidad:</span>
                    <span className="text-zinc-200">{specialty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">KDS Buffer:</span>
                    <span className="text-zinc-200">{kitchenBufferMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Subdominio Web:</span>
                    <span className="text-[#FF3F1A]">necto.app/{slug || "restaurante"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-6 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                disabled={step === 1 && !name.trim()}
                onClick={() => setStep(s => s + 1)}
                className={`py-3.5 px-7 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                  step === 1 && !name.trim()
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white active:scale-98 shadow-sm"
                }`}
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="py-3.5 px-8 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <span>Inicializar Espacio de Trabajo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
