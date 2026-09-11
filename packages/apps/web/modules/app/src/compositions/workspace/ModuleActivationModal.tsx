import React, { useState } from "react";
import {
  NectoModuleKey,
  BusinessInstance,
  useBusiness,
} from "../../context/BusinessContext";
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
  AlertCircle,
  FileSpreadsheet,
  Building,
  Layers,
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
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);
  const [whatsAppConnected, setWhatsAppConnected] = useState(
    business.setupProgress?.whatsappConnected ?? false
  );

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

  const handleSimulateWhatsAppConnect = () => {
    setIsConnectingWhatsApp(true);
    setTimeout(() => {
      setWhatsAppConnected(true);
      setIsConnectingWhatsApp(false);
      updateBusiness(business.id, {
        setupProgress: {
          whatsappConnected: true,
          menuConfigured: business.setupProgress?.menuConfigured ?? false,
          kitchenConfigured: business.setupProgress?.kitchenConfigured ?? false,
          teamInvited: business.setupProgress?.teamInvited ?? false,
        },
      });
    }, 600);
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
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center flex-none">
              {moduleKey === "pedidos" && <ShoppingBag className="w-6 h-6" />}
              {moduleKey === "inventarios" && <Package className="w-6 h-6" />}
              {moduleKey === "turnos" && <Clock className="w-6 h-6" />}
              {moduleKey === "reservas" && <Users className="w-6 h-6" />}
              {moduleKey === "agendamiento" && <Calendar className="w-6 h-6" />}
              {moduleKey === "referidos" && <Sparkles className="w-6 h-6" />}
            </div>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <span>Onboarding Contextual</span>
                <span>·</span>
                <span>No Bloqueante</span>
              </div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                {moduleKey === "pedidos" && "Configura cómo recibirás tus pedidos"}
                {moduleKey === "inventarios" && "Configura tu inventario & stock"}
                {moduleKey === "turnos" && "Configura tu módulo de turnos & caja"}
                {moduleKey === "reservas" && "Configura tu módulo de reservas"}
                {moduleKey === "agendamiento" && "Configura tu agenda de citas"}
                {moduleKey === "referidos" && "Configura tu programa de fidelización"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* ─── CASE: PEDIDOS ────────────────────────────────────────── */}
          {moduleKey === "pedidos" && (
            <div className="space-y-5">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                El módulo de <strong>Pedidos (OMS)</strong> puede recibir órdenes desde diferentes vías de entrada. Selecciona los canales iniciales que utilizará tu negocio:
              </p>

              <div className="space-y-2.5">
                {/* Channel: WhatsApp Business */}
                <div
                  onClick={() => handleToggleChannel("whatsapp")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.whatsapp
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-2xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.whatsapp
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {selectedChannels.whatsapp && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp Business Oficial</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Recepción de órdenes por chat asistido con respuestas y cotizaciones comerciales.
                    </p>

                    {/* WhatsApp Connection Sub-card if checked */}
                    {selectedChannels.whatsapp && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              whatsAppConnected ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[11px]">
                            {whatsAppConnected
                              ? "Línea WhatsApp vinculada y lista"
                              : "Línea pendiente de vincular"}
                          </span>
                        </div>

                        {!whatsAppConnected ? (
                          <button
                            type="button"
                            onClick={handleSimulateWhatsAppConnect}
                            disabled={isConnectingWhatsApp}
                            className="py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex-none flex items-center gap-1"
                          >
                            <span>{isConnectingWhatsApp ? "Vinculando..." : "Conectar WhatsApp"}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
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
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.pos
                      ? "border-brand-500/40 bg-brand-500/5 dark:bg-brand-950/20 shadow-2xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.pos
                        ? "bg-brand-500 border-brand-500 text-white"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {selectedChannels.pos && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <span>Ingreso Manual / Venta Mostrador (POS)</span>
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Creación de pedidos directos en caja, pedidos telefónicos o ventas en tienda física.
                    </p>
                  </div>
                </div>

                {/* Channel: Tienda Web */}
                <div
                  onClick={() => handleToggleChannel("web")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedChannels.web
                      ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-950/20 shadow-2xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      selectedChannels.web
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {selectedChannels.web && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Portal Web & Catálogo de Autoservicio</span>
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Página web con carrito y checkout para que los clientes compren de forma autónoma.
                    </p>
                  </div>
                </div>
              </div>

              {/* Guiding Info Callout */}
              <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-none mt-0.5" />
                <span className="leading-relaxed text-[11px]">
                  <strong>Independencia total:</strong> No es obligatorio conectar WhatsApp ahora. Puedes avanzar sin conectar y el módulo de Pedidos quedará listo para operar manualmente.
                </span>
              </div>
            </div>
          )}

          {/* ─── CASE: INVENTARIOS ────────────────────────────────────── */}
          {moduleKey === "inventarios" && (
            <div className="space-y-5">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                El módulo de <strong>Inventario & Control de Stock</strong> administrará existencias, kardex y bodegas de forma independiente:
              </p>

              {/* Step 1: Carga Inicial */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block font-mono uppercase tracking-wider text-[11px]">
                  1. Carga inicial de productos
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setInventoryLoadType("zero")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      inventoryLoadType === "zero"
                        ? "border-brand-500/50 bg-brand-500/5 dark:bg-brand-950/20 shadow-2xs"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          inventoryLoadType === "zero"
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {inventoryLoadType === "zero" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Empezar desde cero
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Crea productos manualmente según ingresen compras o existencias.
                    </p>
                  </div>

                  <div
                    onClick={() => setInventoryLoadType("import")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      inventoryLoadType === "import"
                        ? "border-brand-500/50 bg-brand-500/5 dark:bg-brand-950/20 shadow-2xs"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          inventoryLoadType === "import"
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {inventoryLoadType === "import" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Importar Excel / CSV
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Sube tu catálogo de existencias masivamente en un clic.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Estructura de Bodegas */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block font-mono uppercase tracking-wider text-[11px]">
                  2. Estructura de ubicaciones
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setWarehouseMode("single")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      warehouseMode === "single"
                        ? "border-brand-500/50 bg-brand-500/5 dark:bg-brand-950/20"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Bodega única / Local
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Control simple de existencias en tu punto principal.
                    </p>
                  </div>

                  <div
                    onClick={() => setWarehouseMode("multi")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      warehouseMode === "multi"
                        ? "border-brand-500/50 bg-brand-500/5 dark:bg-brand-950/20"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Múltiples bodegas
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
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
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Estás a punto de habilitar la capacidad de{" "}
                <strong className="text-zinc-900 dark:text-white uppercase">{moduleKey}</strong> en{" "}
                <strong>{business.name}</strong>.
              </p>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Módulo Plug & Play Listo</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Se montará en tu barra lateral y podrás calibrar sus parámetros específicos en cualquier momento desde su propia pestaña de configuración.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkipAndActivate}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Continuar sin configurar ahora
          </button>

          <button
            type="button"
            onClick={handleSaveAndActivate}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03412] text-white shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Activar Módulo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
