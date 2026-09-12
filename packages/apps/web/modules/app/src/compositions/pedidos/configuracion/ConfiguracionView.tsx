import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  GitMerge,
  Package,
  CheckCircle2,
  Truck,
  MessageSquare,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/elements";
import Switch from "@/elements/form/switch/Switch";

type ConfigSection = "flujo" | "preparacion" | "confirmacion" | "entrega" | "comunicacion";

export const ConfiguracionView: React.FC = () => {
  const { isPreparacionEnabled, setIsPreparacionEnabled } = usePedidos();
  const [activeTab, setActiveTab] = useState<ConfigSection>("flujo");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [autoConfirmStock, setAutoConfirmStock] = useState(true);
  const [defaultPrepMinutes, setDefaultPrepMinutes] = useState(25);
  const [delayThresholdMinutes, setDelayThresholdMinutes] = useState(15);
  const [requireAllItemsChecked, setRequireAllItemsChecked] = useState(true);

  // Delivery methods
  const [deliveryMethods, setDeliveryMethods] = useState({
    pickup: true,
    localDelivery: true,
    nationalCourier: true,
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    onConfirmed: true,
    onPreparing: true,
    onReady: true,
    onDelivered: true,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSave = () => {
    showToast("Configuración guardada exitosamente.");
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Single Authoritative Page Header (Repo-prueba-master Pattern) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Configuración de Pedidos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personaliza el ciclo de vida de las órdenes, etapas operacionales y reglas del negocio
          </p>
        </div>
      </div>

      {/* ── Clean Tab Switcher ── */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { id: "flujo" as ConfigSection, label: "Flujo y Estados", icon: GitMerge },
          { id: "preparacion" as ConfigSection, label: "Preparación", icon: Package },
          { id: "confirmacion" as ConfigSection, label: "Confirmación", icon: CheckCircle2 },
          { id: "entrega" as ConfigSection, label: "Entrega", icon: Truck },
          { id: "comunicacion" as ConfigSection, label: "Comunicación", icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Flujo y Estados */}
      {activeTab === "flujo" && (
        <div className="space-y-5">
          {/* Visual Lifecycle Pipeline Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                Ciclo de Vida de las Órdenes
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Representación visual del flujo operativo que siguen las órdenes en tu negocio:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 py-2">
              <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                1. Nuevo
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                2. Confirmado
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              {isPreparacionEnabled ? (
                <span className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  3. Preparación (Activa)
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-100 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 line-through">
                  Preparación (Omitida)
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {isPreparacionEnabled ? "4. Listo" : "3. Listo"}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {isPreparacionEnabled ? "5. Entregado" : "4. Entregado"}
              </span>
            </div>
          </div>

          {/* Toggle: Capacidad de Preparación */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-500" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                    Capacidad de Preparación y Alistamiento
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                  Si tu negocio alista, empaca, ensambla o prepara productos físicamente antes de la entrega, mantén esta capacidad habilitada. Si vendes productos de entrega inmediata, desactívala para simplificar el flujo y ocultar la sección del menú.
                </p>
              </div>

              <Switch
                checked={isPreparacionEnabled}
                onChange={checked => {
                  setIsPreparacionEnabled(checked);
                  showToast(
                    checked
                      ? "Capacidad de Preparación habilitada."
                      : "Capacidad de Preparación deshabilitada."
                  );
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Preparación */}
      {activeTab === "preparacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Tiempos y Verificación de Preparación
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ajusta los tiempos de alistamiento y controles de calidad de las órdenes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Tiempo estándar estimado (minutos):
              </label>
              <input
                type="number"
                value={defaultPrepMinutes}
                onChange={e => setDefaultPrepMinutes(Number(e.target.value))}
                min={5}
                max={120}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tiempo base asignado a cada orden en preparación.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Umbral de demora (minutos):
              </label>
              <input
                type="number"
                value={delayThresholdMinutes}
                onChange={e => setDelayThresholdMinutes(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Margen tras el cual el pedido se resalta con alerta de demora.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Exigir verificación completa de artículos
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 max-w-lg">
                Recomienda marcar todos los productos de la orden antes de permitir marcarla como lista.
              </p>
            </div>
            <Switch
              checked={requireAllItemsChecked}
              onChange={checked => setRequireAllItemsChecked(checked)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
            >
              Guardar Parámetros
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Confirmación */}
      {activeTab === "confirmacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Reglas de Confirmación de Pedidos
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Define si las órdenes entrantes se confirman automáticamente con validación de inventario
            </p>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setAutoConfirmStock(true)}
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                autoConfirmStock
                  ? "border-brand-500 bg-brand-50/20 dark:border-brand-500 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="confirmMode"
                checked={autoConfirmStock}
                onChange={() => setAutoConfirmStock(true)}
                className="mt-1 text-brand-500 cursor-pointer"
              />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Confirmación Automática con Validación de Inventario (Recomendada)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  El sistema valida disponibilidad en el módulo de Inventario en tiempo real. Si hay stock suficiente, reserva las existencias y confirma el pedido inmediatamente.
                </p>
              </div>
            </div>

            <div
              onClick={() => setAutoConfirmStock(false)}
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                !autoConfirmStock
                  ? "border-brand-500 bg-brand-50/20 dark:border-brand-500 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="confirmMode"
                checked={!autoConfirmStock}
                onChange={() => setAutoConfirmStock(false)}
                className="mt-1 text-brand-500 cursor-pointer"
              />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Confirmación Manual por Operador
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Las órdenes nuevas permanecen en la columna "Nuevos" hasta que un operador humano las revise y apruebe manualmente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
            >
              Guardar Reglas
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Entrega */}
      {activeTab === "entrega" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Métodos de Entrega Habilitados
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configura los tipos de entrega que tus clientes pueden seleccionar
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "pickup" as const,
                title: "Retiro en Tienda / Mostrador",
                desc: "El cliente recoge su orden personalmente en el local físico sin costo.",
              },
              {
                id: "localDelivery" as const,
                title: "Domicilio Urbano / Mensajería Propia",
                desc: "Entrega mediante repartidores o mensajería express urbana.",
              },
              {
                id: "nationalCourier" as const,
                title: "Envíos Nacionales con Transportadora",
                desc: "Despacho con guías de transporte nacional.",
              },
            ].map(method => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {method.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">{method.desc}</p>
                </div>
                <Switch
                  checked={deliveryMethods[method.id]}
                  onChange={checked =>
                    setDeliveryMethods(prev => ({ ...prev, [method.id]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
            >
              Guardar Métodos de Entrega
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Comunicación */}
      {activeTab === "comunicacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Notificaciones al Cliente
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Mensajes automáticos enviados por WhatsApp conforme avanza el estado de la orden
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "onConfirmed" as const,
                title: "Notificación de Pedido Confirmado",
                sample: "Tu pedido #1042 ha sido confirmado y agendado con éxito.",
              },
              {
                id: "onPreparing" as const,
                title: "Notificación de Pedido en Preparación",
                sample: "Estamos alistando tu pedido #1042 con el mayor cuidado.",
              },
              {
                id: "onReady" as const,
                title: "Notificación de Pedido Listo",
                sample: "¡Tu pedido #1042 está listo! Puedes recogerlo o ya va en camino.",
              },
              {
                id: "onDelivered" as const,
                title: "Notificación de Pedido Entregado",
                sample: "Tu pedido #1042 ha sido entregado. ¡Gracias por tu compra!",
              },
            ].map(notif => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-gray-400 italic mt-0.5">"{notif.sample}"</p>
                </div>
                <Switch
                  checked={notifications[notif.id]}
                  onChange={checked =>
                    setNotifications(prev => ({ ...prev, [notif.id]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-theme-xs cursor-pointer"
            >
              Guardar Notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
