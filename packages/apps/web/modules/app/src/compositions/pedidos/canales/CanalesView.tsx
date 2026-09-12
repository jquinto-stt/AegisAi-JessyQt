import React, { useState, useEffect } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { eventBus } from "@/infrastructure/eventBus";
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
  QrCode,
} from "lucide-react";
import { Button } from "@/elements";

export interface CanalesViewProps {
  onOpenSettings?: (tab?: string) => void;
}

export const CanalesView: React.FC<CanalesViewProps> = ({ onOpenSettings }) => {
  const { activeBusiness } = useBusiness();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Direct redirection to authoritative Business Settings tabs
  const handleOpenChannelsSettings = () => {
    if (onOpenSettings) {
      onOpenSettings("channels");
    } else {
      eventBus.publish("necto_open_settings", { tab: "channels" });
    }
  };

  const handleOpenWhatsAppBotSettings = () => {
    if (onOpenSettings) {
      onOpenSettings("whatsapp_bot");
    } else {
      eventBus.publish("necto_open_settings", { tab: "whatsapp_bot" });
    }
  };

  // WhatsApp connection state synced with authoritative storage & events
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean>(() => {
    try {
      return localStorage.getItem("necto_whatsapp_connected") === "true";
    } catch (e) {
      return false;
    }
  });

  // Channels activation state
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

  useEffect(() => {
    const handleConfigChange = () => {
      try {
        const savedConnected = localStorage.getItem("necto_whatsapp_connected") === "true";
        setIsWhatsAppConnected(savedConnected);

        const channelSaved = localStorage.getItem("necto_whatsapp_channel_enabled");
        if (channelSaved !== null) {
          setChannels(prev => ({ ...prev, whatsapp: JSON.parse(channelSaved) }));
        }

        const widgetSaved = localStorage.getItem("necto_whatsapp_widget_enabled");
        if (widgetSaved !== null) {
          setIsWidgetEnabled(JSON.parse(widgetSaved));
        }
      } catch (err) {}
    };

    window.addEventListener("necto_whatsapp_config_changed", handleConfigChange);
    return () => {
      window.removeEventListener("necto_whatsapp_config_changed", handleConfigChange);
    };
  }, []);

  const storeName = activeBusiness?.name || "Mi Negocio";

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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
                  isWhatsAppConnected && channels.whatsapp
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : isWhatsAppConnected
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                }`}
              >
                {isWhatsAppConnected && channels.whatsapp
                  ? "Conectado"
                  : isWhatsAppConnected
                  ? "Pausado"
                  : "Sin vincular"}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Estado de sesión:</span>
                <span className="font-medium">
                  {isWhatsAppConnected ? "Sesión activa (QR Vinculado)" : "Desconectado"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Tono del asistente:</span>
                <span className="font-medium capitalize">
                  {activeBusiness?.whatsappBotConfig?.personality
                    ? activeBusiness.whatsappBotConfig.personality === "warm"
                      ? "Cálido"
                      : activeBusiness.whatsappBotConfig.personality === "efficient"
                      ? "Profesional"
                      : "Ágil"
                    : "Cálido"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400">Auto-confirmación:</span>
                <span className="font-medium">
                  {activeBusiness?.whatsappBotConfig?.isAutoConfirmOrders
                    ? "Activa con inventario"
                    : "Manual por operador"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Widget flotante en pantalla:</span>
                <span
                  className={`font-semibold ${
                    isWidgetEnabled && channels.whatsapp && isWhatsAppConnected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400"
                  }`}
                >
                  {isWidgetEnabled && channels.whatsapp && isWhatsAppConnected
                    ? "Visible en pantalla"
                    : "Oculto"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            {!isWhatsAppConnected ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenChannelsSettings}
                  className="w-full cursor-pointer font-medium justify-center"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  Vincular WhatsApp (Escanear QR)
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenWhatsAppBotSettings}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Asistente IA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenChannelsSettings}
                    className="cursor-pointer font-medium"
                    title="Gestionar conexión QR en sede"
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1.5" />
                    QR
                  </Button>
                  <Button
                    size="sm"
                    variant={channels.whatsapp ? "outline" : "primary"}
                    onClick={() => toggleChannel("whatsapp")}
                    className="cursor-pointer"
                  >
                    {channels.whatsapp ? "Pausar" : "Activar"}
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
                    <span>Abrir Bandeja de Conversaciones</span>
                  </button>
                )}
              </>
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
