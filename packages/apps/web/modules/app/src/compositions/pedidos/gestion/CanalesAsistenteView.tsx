import React, { useState } from "react";
import { useBusiness, BotPersonality } from "@/context/BusinessContext";
import {
  Smartphone,
  Store,
  Globe,
  Bot,
  Sparkles,
  CheckCircle2,
  Check,
  MessageSquare,
  Send,
  Save,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Zap,
  Sliders,
  CheckCheck,
} from "lucide-react";
import { Button, Input, Label, Textarea } from "@/elements";

type ChannelTone = "calido" | "profesional" | "tecnico" | "agil";

interface ToneOption {
  id: ChannelTone;
  name: string;
  badge: string;
  description: string;
  sampleGreeting: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: "calido",
    name: "Cálido",
    badge: "Cercano & Cordial",
    description: "Ideal para boutiques, calzado, moda, cafeterías y negocios de trato familiar.",
    sampleGreeting: "¡Hola! Bienvenido a {storeName}. ¿Qué estilo o producto te gustaría ver hoy?",
  },
  {
    id: "profesional",
    name: "Profesional",
    badge: "Formal & Sobrio",
    description: "Diseñado para distribuidoras B2B, consultorías, droguerías y despachos corporativos.",
    sampleGreeting: "Estimado cliente, bienvenido a {storeName}. Indíquenos su requerimiento para asistirle.",
  },
  {
    id: "tecnico",
    name: "Técnico",
    badge: "Preciso & Exacto",
    description: "Recomendado para ferreterías, repuestos automotrices, insumos industriales y tecnología.",
    sampleGreeting: "Bienvenido a {storeName}. ¿Qué herramienta, medida o referencia técnica necesitas para tu obra?",
  },
  {
    id: "agil",
    name: "Ágil",
    badge: "Rápido & Comercial",
    description: "Pensado para ventas flash, comida rápida, retail de alta rotación y domicilios express.",
    sampleGreeting: "¡Hola! Bienvenido a {storeName}. Escríbenos lo que deseas pedir y te confirmamos disponibilidad inmediata.",
  },
];

export const CanalesAsistenteView: React.FC = () => {
  const { activeBusiness, updateBusiness } = useBusiness();

  // Active channels
  const [channels, setChannels] = useState({
    whatsapp: activeBusiness?.channels?.whatsapp ?? true,
    pos: activeBusiness?.channels?.pos ?? true,
    web: activeBusiness?.channels?.web ?? false,
  });

  // Bot Identity & Tone
  const [botName, setBotName] = useState(
    activeBusiness?.whatsappBotConfig?.welcomeMessage
      ? "Asistente Virtual"
      : activeBusiness?.businessType === "hardware_store"
      ? "Asesor Ferretero"
      : activeBusiness?.businessType === "fashion_footwear"
      ? "Asesora Camila"
      : "Asistente Virtual"
  );

  const [selectedTone, setSelectedTone] = useState<ChannelTone>("tecnico");

  const [greetingMessage, setGreetingMessage] = useState(
    activeBusiness?.whatsappBotConfig?.welcomeMessage ||
      "¡Hola! Bienvenido a {storeName}. ¿Qué producto o requerimiento tienes hoy?"
  );

  const [autoConfirmOrders, setAutoConfirmOrders] = useState(
    activeBusiness?.whatsappBotConfig?.isAutoConfirmOrders ?? false
  );

  const [captureDeliveryAddress, setCaptureDeliveryAddress] = useState(true);
  const [aiUpsellEnabled, setAiUpsellEnabled] = useState(
    activeBusiness?.whatsappBotConfig?.isAiUpsellEnabled ?? true
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  const isWhatsAppConnected = activeBusiness?.setupProgress?.whatsappConnected ?? false;
  const storeName = activeBusiness?.name || "Mi Tienda";

  const handleSelectTone = (tone: ToneOption) => {
    setSelectedTone(tone.id);
    const newGreeting = tone.sampleGreeting.replace("{storeName}", storeName);
    setGreetingMessage(newGreeting);
  };

  const handleToggleChannel = (key: "whatsapp" | "pos" | "web") => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSimulateWhatsAppConnect = () => {
    if (!activeBusiness) return;
    setIsConnectingWhatsApp(true);
    setTimeout(() => {
      setIsConnectingWhatsApp(false);
      updateBusiness(activeBusiness.id, {
        setupProgress: {
          whatsappConnected: true,
          menuConfigured: activeBusiness.setupProgress?.menuConfigured ?? false,
          kitchenConfigured: activeBusiness.setupProgress?.kitchenConfigured ?? false,
          teamInvited: activeBusiness.setupProgress?.teamInvited ?? false,
        },
      });
    }, 600);
  };

  const handleSaveChanges = () => {
    if (!activeBusiness) return;
    updateBusiness(activeBusiness.id, {
      channels: {
        whatsapp: channels.whatsapp,
        pos: channels.pos,
        web: channels.web,
      },
      whatsappBotConfig: {
        ...activeBusiness.whatsappBotConfig,
        welcomeMessage: greetingMessage,
        isWelcomeEnabled: true,
        isAutoConfirmOrders: autoConfirmOrders,
        isAiUpsellEnabled: aiUpsellEnabled,
      },
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const resolvedPreviewText = greetingMessage
    .replace("{storeName}", storeName)
    .replace("{negocio}", storeName);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-[#FF3F1A] text-xs font-mono font-bold uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuración Interna · Módulo Pedidos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Canales de Entrada & Asistente Virtual
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Calibra los canales que inyectan pedidos a tu tablero Kanban y define el nombre, tono y personalidad con la que responderá tu bot oficial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveChanges}
            variant="primary"
            className="py-2.5 px-6 rounded-xl text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03412] text-white shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>¡Cambios Guardados!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Configuración</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Settings (Left) vs Live WhatsApp Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Canales de Entrada Activos */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                <span>1. Canales de Entrada para este Negocio</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Habilitados en Pedidos</span>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Business Channel */}
              <div
                onClick={() => handleToggleChannel("whatsapp")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  channels.whatsapp
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-none">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        WhatsApp Business Oficial
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.2 rounded-full">
                        Chat Bot
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Toma de pedidos, cotizaciones y atención 24/7 por mensaje directo.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-none ${
                    channels.whatsapp
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {channels.whatsapp && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Status sub-banner for WhatsApp number */}
              {channels.whatsapp && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isWhatsAppConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                      {isWhatsAppConnected
                        ? `Línea oficial conectada: +57 (300) 123-4567`
                        : "Línea WhatsApp sin vincular a la tienda"}
                    </span>
                  </div>

                  {!isWhatsAppConnected ? (
                    <button
                      type="button"
                      onClick={handleSimulateWhatsAppConnect}
                      disabled={isConnectingWhatsApp}
                      className="py-1 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex-none"
                    >
                      {isConnectingWhatsApp ? "Vinculando..." : "Vincular Línea"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Oficial Activa</span>
                    </span>
                  )}
                </div>
              )}

              {/* Mostrador / POS Channel */}
              <div
                onClick={() => handleToggleChannel("pos")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  channels.pos
                    ? "border-brand-500/40 bg-brand-500/5 dark:bg-brand-950/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center flex-none">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Venta Mostrador & Punto de Venta (POS)
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Creación directa de tickets por el cajero o ventas telefónicas.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-none ${
                    channels.pos
                      ? "bg-brand-500 border-brand-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {channels.pos && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Web Channel */}
              <div
                onClick={() => handleToggleChannel("web")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  channels.web
                    ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-950/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-none">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Tienda Web & Autoservicio
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Enlace público con catálogo interactivo y checkout directo.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-none ${
                    channels.web
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {channels.web && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Identidad del Asistente Virtual */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-orange-500" />
                <span>2. Identidad del Asistente Virtual de Ventas</span>
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Nombre del Asistente Comercial</Label>
                <Input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Ej. Asistente Virtual, Asesor Ferretero, Camila..."
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Este nombre se presentará al cliente al iniciar cada conversación por chat.
                </p>
              </div>

              {/* Tono de Atención */}
              <div className="space-y-2">
                <Label>Tono de Atención al Cliente</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TONE_OPTIONS.map((opt) => {
                    const isSelected = selectedTone === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectTone(opt)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "border-orange-500/50 bg-orange-500/5 dark:bg-orange-950/20 shadow-2xs"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-900 dark:text-white">
                            {opt.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mensaje de Bienvenida Editable */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Mensaje de Bienvenida Automático</Label>
                  <span className="text-[10px] font-mono text-zinc-400">Variables: {"{storeName}"}</span>
                </div>
                <Textarea
                  rows={3}
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Escribe el mensaje de saludo..."
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* 3. Reglas de Automatización Comercial */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>3. Reglas Operativas de Toma de Pedidos</span>
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captureDeliveryAddress}
                  onChange={(e) => setCaptureDeliveryAddress(e.target.checked)}
                  className="mt-0.5 rounded text-orange-500 focus:ring-orange-500"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    Captura automática de datos de entrega y dirección
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-snug block">
                    El asistente solicita barrio, dirección y notas de despacho al armar el borrador de compra.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiUpsellEnabled}
                  onChange={(e) => setAiUpsellEnabled(e.target.checked)}
                  className="mt-0.5 rounded text-orange-500 focus:ring-orange-500"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    Sugerencias de productos complementarios (Upselling)
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-snug block">
                    Sugerir artículos adicionales compatibles al momento de cotizar (ej. tornillos para taladros o salsas para combos).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfirmOrders}
                  onChange={(e) => setAutoConfirmOrders(e.target.checked)}
                  className="mt-0.5 rounded text-orange-500 focus:ring-orange-500"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    Auto-confirmar pedidos elegibles
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-snug block">
                    Inyectar directamente al alistamiento sin requerir confirmación manual de un operador.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Interactive Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden">
              {/* WhatsApp Mobile Top Bar */}
              <div className="px-5 py-4 bg-[#0B141A] border-b border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white shadow-xs">
                    {storeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{storeName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      En línea · Canal Oficial WhatsApp
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                  Vista Previa
                </span>
              </div>

              {/* Chat Canvas with Wallpaper */}
              <div className="p-5 min-h-[380px] bg-[#0B141A]/95 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] bg-[size:16px_16px] space-y-4 flex flex-col justify-end text-xs">
                {/* Bot Message Bubble */}
                <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-4 bg-[#202C33] text-zinc-100 space-y-2.5 shadow-md border border-zinc-700/30">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-700/50 pb-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      <span>{botName}</span>
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
                      Tono {selectedTone}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-100">
                    {resolvedPreviewText}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400 font-mono">
                    <span>10:45 AM</span>
                    <span className="flex items-center gap-0.5 text-sky-400">
                      <CheckCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Simulated Customer Answer */}
                <div className="max-w-[80%] self-end rounded-2xl rounded-tr-xs p-3 bg-[#005C4B] text-white space-y-1 shadow-md">
                  <p className="text-xs">
                    Hola, estoy buscando consultar precios y armar un pedido.
                  </p>
                  <span className="text-[9px] text-emerald-200/80 font-mono block text-right">
                    10:46 AM
                  </span>
                </div>

                {/* Simulated Bot Response */}
                <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-3.5 bg-[#202C33] text-zinc-100 space-y-2 shadow-md border border-zinc-700/30">
                  <p className="text-xs leading-relaxed">
                    ¡Con gusto! Tenemos nuestro catálogo activo con disponibilidad en tiempo real. Indícame qué productos deseas y te armo el borrador de tu orden.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>10:46 AM</span>
                    <span className="flex items-center gap-0.5 text-sky-400">
                      <CheckCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-[#202C33] border-t border-zinc-800 flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-[#2A3942] text-xs text-zinc-400">
                  Escribe un mensaje...
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Explanatory Note */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-orange-500" />
                <span>¿Por qué esta configuración vive aquí?</span>
              </span>
              <p className="text-[11px] leading-relaxed">
                La tienda conecta la línea telefónica (Capa 1). El módulo de Pedidos es quien define el <strong>asistente virtual</strong>, el <strong>tono de atención</strong> y el <strong>flujo de venta</strong> (Capa 3).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
