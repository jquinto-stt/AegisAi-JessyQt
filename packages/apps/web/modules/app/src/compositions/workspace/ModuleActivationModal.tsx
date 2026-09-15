import React, { useState } from "react";
import {
  NectoModuleKey,
  BusinessInstance,
  isChannelConnected,
  useBusiness,
} from "../../context/BusinessContext";
import { Badge, Button } from "@/elements";
import {
  X,
  Check,
  ShoppingBag,
  Package,
  Clock,
  Users,
  Calendar,
  Sparkles,
  Smartphone,
  Globe,
  Store,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
} from "lucide-react";

interface ModuleActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleKey: NectoModuleKey | null;
  business: BusinessInstance;
  onConfirm: () => void;
}

export const ModuleActivationModal: React.FC<ModuleActivationModalProps> = ({
  isOpen,
  onClose,
  moduleKey,
  business,
  onConfirm,
}) => {
  const { updateBusiness } = useBusiness();

  // Pedidos channel state
  const [selectedChannels, setSelectedChannels] = useState({
    whatsapp: business.channels?.whatsapp ?? true,
    web: business.channels?.web ?? false,
    pos: business.channels?.pos ?? true,
    api: false,
  });

  /**
   * Estado de la conexión, **derivado del registro de la tienda** y no de un
   * estado local. Antes se leía `setupProgress.whatsappConnected`, que era una
   * marca aparte y podía discrepar de la conexión real.
   *
   * Se muestra para que el operador sepa si el canal está listo, pero **no se
   * conecta desde aquí**: la conexión es de la tienda, no del módulo.
   */
  const whatsAppConnected = isChannelConnected(business, "whatsapp");

  // Inventarios state
  const [inventoryLoadType, setInventoryLoadType] = useState<"import" | "zero">("zero");
  const [warehouseMode, setWarehouseMode] = useState<"single" | "multi">("single");

  if (!isOpen || !moduleKey) return null;

  const handleToggleChannel = (channel: keyof typeof selectedChannels) => {
    setSelectedChannels((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const handleSaveAndActivate = () => {
    if (moduleKey === "pedidos") {
      updateBusiness(business.id, {
        channels: {
          whatsapp: selectedChannels.whatsapp,
          web: selectedChannels.web,
          pos: selectedChannels.pos,
        },
      });
    }
    onConfirm();
    onClose();
  };

  const handleSkipAndActivate = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-theme-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[10.5px] bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center flex-none">
              {moduleKey === "pedidos" && <ShoppingBag className="w-6 h-6" />}
              {moduleKey === "inventarios" && <Package className="w-6 h-6" />}
              {moduleKey === "turnos" && <Clock className="w-6 h-6" />}
              {moduleKey === "reservas" && <Users className="w-6 h-6" />}
              {moduleKey === "agendamiento" && <Calendar className="w-6 h-6" />}
              {moduleKey === "referidos" && <Sparkles className="w-6 h-6" />}
            </div>
            <div className="space-y-0.5">
              {/* Micro-etiqueta del catálogo (`Badge`, variante light/light).
                  El chip estaba escrito a mano y es, literalmente, un badge:
                  etiqueta compacta en línea. Cada diferencia con la base del
                  catálogo se neutraliza por `className` — el `px`, el `gap`,
                  el color y el peso —; el `uppercase`/`tracking-wider` los
                  aporta la pantalla, porque son voz tipográfica del producto
                  y no del componente. */}
              <Badge
                variant="light"
                color="light"
                size="xs"
                intent="workspace.moduleActivation.guidedTag"
                className="gap-1.5 px-2.5 font-bold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <span>Configuración guiada</span>
                <span>·</span>
                <span>No Bloqueante</span>
              </Badge>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {moduleKey === "pedidos" && "Configura cómo recibirás tus pedidos"}
                {moduleKey === "inventarios" && "Configura tu inventario y stock"}
                {moduleKey === "turnos" && "Configura tu módulo de turnos y caja"}
                {moduleKey === "reservas" && "Configura tu módulo de reservas"}
                {moduleKey === "agendamiento" && "Configura tu agenda de citas"}
                {moduleKey === "referidos" && "Configura tu programa de fidelización"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-theme-sm">
          {/* ─── CASE: PEDIDOS ────────────────────────────────────────── */}
          {moduleKey === "pedidos" && (
            <div className="space-y-5">
              <p className="text-theme-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                El módulo de <strong>Pedidos</strong> puede recibir órdenes desde diferentes vías de entrada. Selecciona los canales iniciales que utilizará tu negocio:
              </p>

              <div className="space-y-2.5">
                {/* Channel: WhatsApp Business */}
                <div
                  onClick={() => handleToggleChannel("whatsapp")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.whatsapp
                      ? "border-brand-500/40 bg-brand-50 dark:bg-brand-950/20"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.whatsapp
                        ? "bg-brand-500 border-brand-500 text-white"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {selectedChannels.whatsapp && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-theme-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-brand-500" />
                        <span>WhatsApp Business oficial</span>
                      </span>
                      <span className="text-theme-xs font-bold bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300 px-2 py-0.5 rounded-full border border-accent-300 dark:border-accent-800">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Recepción de órdenes por chat asistido con respuestas y cotizaciones comerciales.
                    </p>

                    {/* WhatsApp Connection Sub-card if checked */}
                    {selectedChannels.whatsapp && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 text-theme-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              whatsAppConnected ? "bg-success-500" : "bg-warning-500"
                            }`}
                          />
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-theme-xs">
                            {whatsAppConnected
                              ? "Línea WhatsApp vinculada y lista"
                              : "Línea pendiente de vincular"}
                          </span>
                        </div>

                        {!whatsAppConnected ? (
                          /*
                            Aquí **no** se conecta.

                            La conexión de un canal es infraestructura de la tienda,
                            no una capacidad de este módulo. Conectándola desde el
                            alta de Pedidos, un cliente que sólo usa Inventarios no
                            la encontraría aquí y el canal parecería pertenecer a
                            Pedidos — justo lo que hay que evitar. Se dice dónde
                            vive y se deja el estado a la vista.
                          */
                          <span className="text-theme-xs font-semibold text-gray-500 dark:text-gray-400 text-right flex-none">
                            Se conecta en Canales de entrada
                          </span>
                        ) : (
                          <span className="text-theme-xs text-success-600 dark:text-success-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Conectado</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Channel: Ingreso Manual / Mostrador */}
                <div
                  onClick={() => handleToggleChannel("pos")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.pos
                      ? "border-brand-500/40 bg-brand-50 dark:bg-brand-950/20"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.pos
                        ? "bg-brand-500 border-brand-500 text-white"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {selectedChannels.pos && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-brand-500" />
                      <span>Ingreso manual / venta mostrador (POS)</span>
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Creación de pedidos directos en caja, pedidos telefónicos o ventas en tienda física.
                    </p>
                  </div>
                </div>

                {/* Channel: Tienda Web */}
                <div
                  onClick={() => handleToggleChannel("web")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.web
                      ? "border-brand-500/40 bg-brand-50 dark:bg-brand-950/20"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.web
                        ? "bg-brand-500 border-brand-500 text-white"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {selectedChannels.web && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-brand-500" />
                      <span>Portal web y catálogo de autoservicio</span>
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Página web con carrito y pago para que tus clientes compren de forma autónoma.
                    </p>
                  </div>
                </div>
              </div>

              {/* Guiding Info Callout */}
              <div className="p-3.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-theme-xs text-gray-600 dark:text-gray-400 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-brand-500 flex-none mt-0.5" />
                <span className="leading-relaxed text-theme-xs">
                  <strong>Independencia total:</strong> No es obligatorio conectar WhatsApp ahora. Puedes avanzar sin conectar y el módulo de Pedidos quedará listo para operar manualmente.
                </span>
              </div>
            </div>
          )}

          {/* ─── CASE: INVENTARIOS ────────────────────────────────────── */}
          {moduleKey === "inventarios" && (
            <div className="space-y-5">
              <p className="text-theme-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                El módulo de <strong>Inventario y control de stock</strong> administrará existencias, kardex y bodegas de forma independiente:
              </p>

              {/* Step 1: Carga Inicial */}
              <div className="space-y-2">
                <span className="text-theme-xs font-bold text-gray-900 dark:text-white block uppercase tracking-wider">
                  1. Carga inicial de productos
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setInventoryLoadType("zero")}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      inventoryLoadType === "zero"
                        ? "border-brand-500/50 bg-brand-50 dark:bg-brand-950/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          inventoryLoadType === "zero"
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {inventoryLoadType === "zero" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white block">
                      Empezar desde cero
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Crea productos manualmente según ingresen compras o existencias.
                    </p>
                  </div>

                  <div
                    onClick={() => setInventoryLoadType("import")}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      inventoryLoadType === "import"
                        ? "border-brand-500/50 bg-brand-50 dark:bg-brand-950/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          inventoryLoadType === "import"
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {inventoryLoadType === "import" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white block">
                      Importar Excel / CSV
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Sube tu catálogo de existencias masivamente en un clic.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Estructura de Bodegas */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-theme-xs font-bold text-gray-900 dark:text-white block uppercase tracking-wider">
                  2. Estructura de ubicaciones
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setWarehouseMode("single")}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      warehouseMode === "single"
                        ? "border-brand-500/50 bg-brand-50 dark:bg-brand-950/20"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white block">
                      Bodega única / local
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Control simple de existencias en tu punto principal.
                    </p>
                  </div>

                  <div
                    onClick={() => setWarehouseMode("multi")}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      warehouseMode === "multi"
                        ? "border-brand-500/50 bg-brand-50 dark:bg-brand-950/20"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <span className="font-bold text-theme-xs text-gray-900 dark:text-white block">
                      Múltiples bodegas
                    </span>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">
                      Centros de distribución, trastiendas o sucursales.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── CASE: OTROS MÓDULOS ──────────────────────────────────── */}
          {moduleKey !== "pedidos" && moduleKey !== "inventarios" && (
            <div className="space-y-4">
              <p className="text-theme-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Estás a punto de habilitar la capacidad de{" "}
                <strong className="text-gray-900 dark:text-white uppercase">{moduleKey}</strong> en{" "}
                <strong>{business.name}</strong>.
              </p>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 text-theme-xs font-bold text-gray-800 dark:text-gray-200">
                  <ShieldCheck className="w-4 h-4 text-success-500" />
                  <span>Módulo listo para usar</span>
                </div>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Se montará en tu barra lateral y podrás ajustar sus opciones en cualquier momento desde su propia pestaña de configuración.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Las dos acciones del pie son `Button` del catálogo. El `className`
              conserva la forma de píldora y la densidad del pie: `rounded-full`
              gana a `rounded-lg`, `h-auto` devuelve la altura natural (la base
              `md` fija `h-10`), y `py`/`px`/`text` reponen lo que la pantalla ya
              tenía. En la primaria la flecha pasa a `endIcon`.

              ⚠️ Queda UNA diferencia medida, y es deliberada: la primaria del
              catálogo trae `shadow-theme-xs` y aquí no había sombra. Medido en
              el navegador, son `0 1px 2px rgba(16,24,40,0.05)` — un pixel al 5%.
              NO se neutraliza con `shadow-none`: las utilidades propias
              `*-theme-*` no están registradas en el grupo `shadow` de
              `tailwind-merge`, así que sobreviven a cualquier `shadow-*` del
              `className` (al revés que `p-5 sm:p-5`, que sí gana porque el
              padding es un grupo estándar). Se acepta la sombra del catálogo en
              vez de forzar un `!important` por un pixel que no se ve. */}
          <Button
            variant="ghost"
            intent="workspace.moduleActivation.skip"
            onClick={handleSkipAndActivate}
            className="w-full sm:w-auto h-auto rounded-full py-2.5 px-4 text-theme-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800"
          >
            Continuar sin configurar ahora
          </Button>

          <Button
            intent="workspace.moduleActivation.confirm"
            onClick={handleSaveAndActivate}
            endIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto h-auto rounded-full py-2.5 px-6 text-theme-xs font-bold gap-1.5"
          >
            Activar módulo
          </Button>
        </div>
      </div>
    </div>
  );
};
