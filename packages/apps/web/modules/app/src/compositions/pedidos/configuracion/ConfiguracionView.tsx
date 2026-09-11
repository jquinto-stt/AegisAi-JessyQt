import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import {
  GitMerge,
  Package,
  CheckCircle2,
  Truck,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Sliders,
  Check,
} from "lucide-react";
import { Button } from "@/elements";

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
    showToast("Configuración del módulo Pedidos guardada exitosamente.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Configuración de Pedidos
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Personaliza el ciclo de vida de las órdenes, etapas operacionales, validación de stock y notificaciones.
        </p>

        {/* Tab Switcher */}
        <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
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
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-gray-900 shadow-theme-xs font-semibold dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Flujo y Estados */}
      {activeTab === "flujo" && (
        <div className="space-y-5">
          {/* Visual Lifecycle Pipeline */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Ciclo de Vida de las Órdenes
            </h3>
            <p className="text-xs text-gray-400">
              Representación visual del flujo operativo que seguirán los pedidos en tu tienda:
            </p>

            <div className="flex flex-wrap items-center gap-2 py-3">
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                1. Nuevo
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                2. Confirmado
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              {isPreparacionEnabled ? (
                <span className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  3. Preparación (Activa)
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-100 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 line-through">
                  Preparación (Omitida)
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {isPreparacionEnabled ? "4. Listo" : "3. Listo"}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {isPreparacionEnabled ? "5. Entregado" : "4. Entregado"}
              </span>
            </div>
          </div>

          {/* Toggle: Capacidad de Preparación */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-500" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Capacidad Operacional de Preparación
                  </h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
                  Si tu negocio alista físicamente productos, ensambla, empaca, cocina o prepara artículos antes de despacharlos, mantén esta capacidad habilitada.
                  Al desactivarla, las órdenes confirmadas pasan directo a "Listo" y la sección se retira de la barra de navegación para no sobrecargar el menú.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-none">
                <input
                  type="checkbox"
                  checked={isPreparacionEnabled}
                  onChange={e => {
                    setIsPreparacionEnabled(e.target.checked);
                    showToast(
                      e.target.checked
                        ? "Capacidad de Preparación habilitada en el módulo."
                        : "Capacidad de Preparación deshabilitada."
                    );
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Preparación */}
      {activeTab === "preparacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Parámetros de Preparación & Alistamiento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tiempo estimado estándar (minutos):
              </label>
              <input
                type="number"
                value={defaultPrepMinutes}
                onChange={e => setDefaultPrepMinutes(Number(e.target.value))}
                min={5}
                max={120}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Tiempo base asignado a cada orden al ingresar a preparación.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tolerancia antes de alerta de demora (minutos):
              </label>
              <input
                type="number"
                value={delayThresholdMinutes}
                onChange={e => setDelayThresholdMinutes(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Margen adicional tras el cual la tarjeta se resalta en rojo.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Exigir verificación completa de artículos
                </span>
                <p className="text-[11px] text-gray-400">
                  Recomienda marcar todos los checkboxes de la comanda antes de habilitar el botón "Marcar como listo".
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireAllItemsChecked}
                onChange={e => setRequireAllItemsChecked(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={handleSave} className="cursor-pointer font-medium">
              Guardar Parámetros
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Confirmación */}
      {activeTab === "confirmacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Reglas de Confirmación de Pedidos
          </h3>

          <div className="space-y-3">
            <label
              onClick={() => setAutoConfirmStock(true)}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                autoConfirmStock
                  ? "border-brand-500 bg-brand-50/30 dark:border-brand-500 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <input
                type="radio"
                name="confirmMode"
                checked={autoConfirmStock}
                onChange={() => setAutoConfirmStock(true)}
                className="mt-0.5 text-brand-500"
              />
              <div>
                <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                  Confirmación Automática con Validación de Inventario (Recomendada)
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  El sistema valida disponibilidad en el módulo Inventario en tiempo real. Si hay stock suficiente,
                  reserva las unidades y confirma el pedido de inmediato, reduciendo el tiempo de espera del cliente.
                </p>
              </div>
            </label>

            <label
              onClick={() => setAutoConfirmStock(false)}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                !autoConfirmStock
                  ? "border-brand-500 bg-brand-50/30 dark:border-brand-500 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <input
                type="radio"
                name="confirmMode"
                checked={!autoConfirmStock}
                onChange={() => setAutoConfirmStock(false)}
                className="mt-0.5 text-brand-500"
              />
              <div>
                <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                  Confirmación Manual por Operador
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Todos los pedidos nuevos permanecen en la columna "Nuevo" hasta que un miembro del equipo
                  los revise y presione el botón de confirmar.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={handleSave} className="cursor-pointer font-medium">
              Guardar Reglas de Confirmación
            </Button>
          </div>
        </div>
      )}

      {/* Tab 4: Entrega */}
      {activeTab === "entrega" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Métodos de Entrega Habilitados
          </h3>

          <div className="space-y-3">
            {[
              {
                id: "pickup" as const,
                title: "Retiro en Tienda / Mostrador",
                desc: "El cliente recoge su orden en el local físico sin costo de envío.",
              },
              {
                id: "localDelivery" as const,
                title: "Domicilio Urbano / Mensajería Propia",
                desc: "Entrega mediante motorizados locales o mensajería express urbana.",
              },
              {
                id: "nationalCourier" as const,
                title: "Envíos Nacionales con Transportadora",
                desc: "Despacho con guías de Coordinadora, Servientrega, Envía o Interrapidísimo.",
              },
            ].map(method => (
              <label
                key={method.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer"
              >
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                    {method.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">{method.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={deliveryMethods[method.id]}
                  onChange={e =>
                    setDeliveryMethods(prev => ({ ...prev, [method.id]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={handleSave} className="cursor-pointer font-medium">
              Guardar Métodos de Entrega
            </Button>
          </div>
        </div>
      )}

      {/* Tab 5: Comunicación */}
      {activeTab === "comunicacion" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Notificaciones Automáticas al Cliente
          </h3>
          <p className="text-xs text-gray-400">
            Mensajes enviados al WhatsApp o celular del cliente conforme su orden avanza en el ciclo:
          </p>

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
                title: "Notificación de Pedido Listo para Retiro o Despacho",
                sample: "¡Tu pedido #1042 está listo! Puedes recogerlo o ya va en camino.",
              },
              {
                id: "onDelivered" as const,
                title: "Notificación de Pedido Entregado",
                sample: "Tu pedido #1042 ha sido entregado. ¡Gracias por tu compra!",
              },
            ].map(notif => (
              <label
                key={notif.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer"
              >
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                    {notif.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 italic mt-0.5">"{notif.sample}"</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications[notif.id]}
                  onChange={e =>
                    setNotifications(prev => ({ ...prev, [notif.id]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={handleSave} className="cursor-pointer font-medium">
              Guardar Reglas de Comunicación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
