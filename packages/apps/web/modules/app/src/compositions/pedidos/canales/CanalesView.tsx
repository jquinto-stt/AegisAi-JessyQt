import React, { useState } from "react";
import { useBusiness, BotPersonality } from "@/context/BusinessContext";
import {
  Smartphone,
  Globe,
  Store,
  Share2,
  Plus,
  CheckCircle2,
  Settings,
  X,
  MessageSquare,
  Bot,
  Zap,
  Sliders,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/elements";

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
    sampleGreeting: "Bienvenido a {storeName}. ¿Qué herramienta, medida o referencia técnica necesitas?",
  },
  {
    id: "agil",
    name: "Ágil",
    badge: "Rápido & Comercial",
    description: "Pensado para ventas flash, comida rápida, retail de alta rotación y domicilios express.",
    sampleGreeting: "¡Hola! Bienvenido a {storeName}. Escríbenos lo que deseas pedir y te confirmamos disponibilidad inmediata.",
  },
];

export const CanalesView: React.FC = () => {
  const { activeBusiness, updateBusiness } = useBusiness();
  const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Channels state with persistent WhatsApp activation
  const [channels, setChannels] = useState(() => {
    let whatsappActive = true;
    try {
      const saved = localStorage.getItem("necto_whatsapp_channel_enabled");
      if (saved !== null) whatsappActive = JSON.parse(saved);
      else if (activeBusiness?.channels?.whatsapp !== undefined) whatsappActive = activeBusiness.channels.whatsapp;
    } catch (e) {}

    return {
      whatsapp: whatsappActive,
      pos: activeBusiness?.channels?.pos ?? true,
      web: activeBusiness?.channels?.web ?? true,
      api: true,
    };
  });

  // Floating widget toggle state
  const [isWidgetEnabled, setIsWidgetEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_widget_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // WhatsApp Assistant Settings
  const storeName = activeBusiness?.name || "Mi Negocio";
  const [selectedTone, setSelectedTone] = useState<ChannelTone>("calido");
  const [greetingMessage, setGreetingMessage] = useState(
    activeBusiness?.whatsappBotConfig?.welcomeMessage ||
      `¡Hola! Bienvenido a ${storeName}. ¿Qué producto o pedido tienes para hoy?`
  );
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(
    activeBusiness?.whatsappBotConfig?.isAutoConfirmOrders ?? false
  );
  const [aiUpsellEnabled, setAiUpsellEnabled] = useState(
    activeBusiness?.whatsappBotConfig?.isAiUpsellEnabled ?? true
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveWhatsAppConfig = () => {
    if (activeBusiness) {
      updateBusiness(activeBusiness.id, {
        whatsappBotConfig: {
          welcomeMessage: greetingMessage,
          isAutoConfirmOrders: autoConfirmOrders,
          isAiUpsellEnabled: aiUpsellEnabled,
          personality: (selectedTone === "calido" ? "warm" : selectedTone === "profesional" ? "efficient" : "playful") as BotPersonality,
        },
      });
    }

    try {
      localStorage.setItem("necto_whatsapp_channel_enabled", JSON.stringify(channels.whatsapp));
      localStorage.setItem("necto_whatsapp_widget_enabled", JSON.stringify(isWidgetEnabled));
      window.dispatchEvent(
        new CustomEvent("necto_whatsapp_config_changed", {
          detail: { channelEnabled: channels.whatsapp, widgetEnabled: isWidgetEnabled },
        })
      );
    } catch (e) {}

    setSelectedChannelForConfig(null);
    showToast("Configuración del canal WhatsApp y widget actualizada correctamente.");
  };

  const handleSelectTone = (tone: ToneOption) => {
    setSelectedTone(tone.id);
    setGreetingMessage(tone.sampleGreeting.replace("{storeName}", storeName));
  };

  const toggleChannel = (key: keyof typeof channels) => {
    const nextVal = !channels[key];
    setChannels(prev => ({ ...prev, [key]: nextVal }));

    if (key === "whatsapp") {
      try {
        localStorage.setItem("necto_whatsapp_channel_enabled", JSON.stringify(nextVal));
        window.dispatchEvent(
          new CustomEvent("necto_whatsapp_config_changed", {
            detail: { channelEnabled: nextVal, widgetEnabled: isWidgetEnabled },
          })
        );
      } catch (e) {}
    }

    showToast(`Canal ${key.toUpperCase()} ${nextVal ? "activado" : "desactivado"}.`);
  };

  const handleToggleWidget = (enabled: boolean) => {
    setIsWidgetEnabled(enabled);
    try {
      localStorage.setItem("necto_whatsapp_widget_enabled", JSON.stringify(enabled));
      window.dispatchEvent(
        new CustomEvent("necto_whatsapp_config_changed", {
          detail: { channelEnabled: channels.whatsapp, widgetEnabled: enabled },
        })
      );
    } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Single Authoritative Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Canales de Venta
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra los canales donde recibes pedidos, asistentes de WhatsApp e integraciones
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar canal</span>
        </button>
      </div>

      {/* Grid of Connected Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. WhatsApp Business */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    WhatsApp Business
                  </h3>
                  <p className="text-xs text-gray-400">
                    Recepción conversacional con asistente IA opcional
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  channels.whatsapp
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                }`}
              >
                {channels.whatsapp ? "Conectado" : "Pausado"}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Número asociado:</span>
                <span className="font-mono font-medium">+57 310 892 4410</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Tono del asistente:</span>
                <span className="font-medium capitalize">{selectedTone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Auto-confirmación:</span>
                <span className="font-medium">
                  {autoConfirmOrders ? "Activa con inventario" : "Manual por operador"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Widget flotante en pantalla:</span>
                <span className={`font-semibold ${isWidgetEnabled && channels.whatsapp ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                  {isWidgetEnabled && channels.whatsapp ? "Visible en pantalla" : "Oculto"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedChannelForConfig("whatsapp")}
                className="flex-1 cursor-pointer font-medium"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Configurar Canal & Widget
              </Button>
              <Button
                size="sm"
                variant={channels.whatsapp ? "outline" : "primary"}
                onClick={() => toggleChannel("whatsapp")}
                className="cursor-pointer"
              >
                {channels.whatsapp ? "Desactivar" : "Activar"}
              </Button>
            </div>
            {channels.whatsapp && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("necto_navigate_pedidos", {
                      detail: { section: "conversaciones" },
                    })
                  );
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800/50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir Módulo de Chats WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Tienda Web / Online */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Tienda Web / Catálogo Online
                  </h3>
                  <p className="text-xs text-gray-400">
                    Catálogo público sincronizado en tiempo real
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  channels.web
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                }`}
              >
                {channels.web ? "Activo" : "Pausado"}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Enlace público:</span>
                <span className="font-mono text-brand-500 hover:underline cursor-pointer">
                  necto.app/{storeName.toLowerCase().replace(/\s+/g, "-")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Pasarela de pago:</span>
                <span className="font-medium">Wompi / Bold / Contra entrega</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Sincronización de stock:</span>
                <span className="font-medium">Automática desde Inventario</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => showToast("Ajustes de catálogo web abiertos")}
              className="flex-1 cursor-pointer font-medium"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configurar Tienda Web
            </Button>
            <Button
              size="sm"
              variant={channels.web ? "outline" : "primary"}
              onClick={() => toggleChannel("web")}
              className="cursor-pointer"
            >
              {channels.web ? "Desactivar" : "Activar"}
            </Button>
          </div>
        </div>

        {/* 3. Ingreso Manual / Mostrador POS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Ingreso Manual & Mostrador
                  </h3>
                  <p className="text-xs text-gray-400">
                    Creación directa de órdenes desde el tablero operativo
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                Siempre Activo
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Modalidad:</span>
                <span className="font-medium">Caja física / Llamada telefónica</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Impresión de comanda:</span>
                <span className="font-medium">Ticket térmico 80mm</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Atajo rápido:</span>
                <span className="font-mono text-gray-500">Botón [+ Nueva Orden]</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => showToast("Opciones de venta en mostrador configuradas")}
              className="w-full cursor-pointer font-medium"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Opciones de Mostrador
            </Button>
          </div>
        </div>

        {/* 4. API Externa & Integraciones */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    API Externa & Webhooks
                  </h3>
                  <p className="text-xs text-gray-400">
                    Conexión con ERPs, apps móviles o marketplaces externos
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                Disponible
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Clave API:</span>
                <span className="font-mono text-gray-500">necto_live_k98...f1</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Webhook de eventos:</span>
                <span className="font-mono text-gray-500">order.created, order.ready</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Documentación:</span>
                <span className="font-medium text-brand-500 hover:underline cursor-pointer">
                  Ver especificación OpenAPI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => showToast("Clave API copiada al portapapeles")}
              className="w-full cursor-pointer font-medium"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Gestionar Claves API
            </Button>
          </div>
        </div>
      </div>

      {/* Modal: Configurar WhatsApp */}
      {selectedChannelForConfig === "whatsapp" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Configurar Asistente WhatsApp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChannelForConfig(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tono de Comunicación
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map(tone => (
                  <div
                    key={tone.id}
                    onClick={() => handleSelectTone(tone)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                      selectedTone === tone.id
                        ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-500/10"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                        {tone.name}
                      </span>
                      {selectedTone === tone.id && (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                      {tone.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Greeting Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mensaje de Bienvenida Automático
              </label>
              <textarea
                value={greetingMessage}
                onChange={e => setGreetingMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60">
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Canal WhatsApp Activo
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Habilita la recepción de chats y acceso directo desde el menú lateral de la tienda
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={channels.whatsapp}
                  onChange={e => {
                    const checked = e.target.checked;
                    setChannels(prev => ({ ...prev, whatsapp: checked }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60">
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Widget Flotante en Pantalla
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Muestra el botón flotante arrastrable de WhatsApp para chatear rápidamente
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isWidgetEnabled}
                  onChange={e => handleToggleWidget(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Auto-confirmación de órdenes
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Acepta el pedido automáticamente si hay existencias en inventario
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoConfirmOrders}
                  onChange={e => setAutoConfirmOrders(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Sugerencias de productos (Upselling)
                  </span>
                  <p className="text-[11px] text-gray-400">
                    El asistente sugiere productos complementarios al cliente
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={aiUpsellEnabled}
                  onChange={e => setAiUpsellEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChannelForConfig(null)}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveWhatsAppConfig}
                className="cursor-pointer font-medium"
              >
                Guardar Configuración
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Canal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Conectar Nuevo Canal
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "Instagram Direct", desc: "Vende directamente en chats de Instagram", available: true },
                { name: "MercadoLibre", desc: "Sincroniza pedidos de tu tienda MercadoLibre", available: true },
                { name: "Rappi / Domicilios", desc: "Integración de repartos y marketplaces", available: false },
                { name: "Shopify / WooCommerce", desc: "Sincroniza órdenes desde tu tienda virtual", available: true },
              ].map(opt => (
                <div
                  key={opt.name}
                  onClick={() => {
                    setShowAddModal(false);
                    showToast(`Integración con ${opt.name} iniciada.`);
                  }}
                  className="p-3 rounded-xl border border-gray-200 hover:border-brand-500 dark:border-gray-800 dark:hover:border-brand-500 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-semibold text-xs text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                      {opt.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {opt.available ? "Conectar" : "Próximamente"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="cursor-pointer"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
