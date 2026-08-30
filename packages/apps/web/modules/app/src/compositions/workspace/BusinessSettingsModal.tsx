import React, { useState, useEffect } from "react";
import { useBusiness, BusinessInstance, BusinessIconKey } from "../../context/BusinessContext";
import { BusinessIcon } from "./BusinessIcon";
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Store,
  MapPin,
  Coins,
  MessageSquare,
  Globe,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Save,
} from "lucide-react";

export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ business, isOpen, onClose }) => {
  const { updateBusiness, deleteBusiness } = useBusiness();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [iconKey, setIconKey] = useState<BusinessIconKey>("utensils");
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const [slug, setSlug] = useState("");
  const [kitchenBufferMin, setKitchenBufferMin] = useState(20);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setCity(business.city);
      setCurrency(business.currency);
      setIconKey(business.iconKey);
      setEnableWhatsapp(business.channels.whatsapp);
      setEnableWeb(business.channels.web);
      setEnablePos(business.channels.pos);
      setSlug(business.slug);
      setKitchenBufferMin(business.kitchenBufferMin);
      setConfirmDelete(false);
    }
  }, [business, isOpen]);

  if (!isOpen || !business) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateBusiness(business.id, {
      name: name.trim(),
      city: city.trim(),
      currency,
      iconKey,
      slug: slug.trim(),
      kitchenBufferMin,
      channels: {
        whatsapp: enableWhatsapp,
        web: enableWeb,
        pos: enablePos,
      },
    });

    onClose();
  };

  const handleDelete = () => {
    deleteBusiness(business.id);
    onClose();
  };

  const iconOptions: Array<{ key: BusinessIconKey; label: string }> = [
    { key: "utensils", label: "Cocina / Grill" },
    { key: "flame", label: "Horno / Fuego" },
    { key: "coffee", label: "Café / Bakery" },
    { key: "chef", label: "Chef / Autor" },
    { key: "store", label: "Local / Mostrador" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
              <BusinessIcon iconKey={iconKey} className="w-5 h-5 text-[#FF3F1A]" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950 dark:text-zinc-50 tracking-tight">
                Ajustes de Negocio
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Configuración aislada de {business.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Identidad */}
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Identidad Comercial
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Nombre del Negocio
              </label>
              <div className="flex items-center gap-2.5">
                <select
                  value={iconKey}
                  onChange={e => setIconKey(e.target.value as any)}
                  className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                >
                  {iconOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-950 dark:text-zinc-50 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" /> Ubicación / Ciudad
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-[#FF3F1A]" /> Moneda Local
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer"
                >
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="ARS">ARS ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Canales */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Canales de Venta
            </h4>

            <div className="space-y-2">
              <div
                onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  enableWhatsapp
                    ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50">WhatsApp con Asistente IA</p>
                    <p className="text-[10px] text-zinc-400">Atiende y monta pedidos automáticamente</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${enableWhatsapp ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                  {enableWhatsapp && <Check className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => setEnableWeb(!enableWeb)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  enableWeb
                    ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50">Menú Web Directo</p>
                    <p className="text-[10px] text-zinc-400">necto.app/{slug || "tu-negocio"}</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${enableWeb ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                  {enableWeb && <Check className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => setEnablePos(!enablePos)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  enablePos
                    ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50">POS Mostrador & Teléfono</p>
                    <p className="text-[10px] text-zinc-400">Toma de pedidos manual en caja</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${enablePos ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                  {enablePos && <Check className="w-3 h-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* Cocina */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Cocina & Despacho
            </h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" /> Tiempo Promedio de Elaboración
              </label>
              <div className="flex items-center gap-2">
                {[15, 20, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setKitchenBufferMin(mins)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      kitchenBufferMin === mins
                        ? "border-[#FF3F1A] bg-orange-50/20 dark:bg-orange-950/20 text-[#FF3F1A] font-black"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zona de Peligro */}
          <div className="pt-4 border-t border-red-100 dark:border-red-950/40 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-red-500 font-mono flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Zona de Peligro
            </h4>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar este negocio</span>
              </button>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 space-y-2">
                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                  ¿Estás seguro de eliminar "{business.name}"?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
                  >
                    Confirmar Eliminación
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="py-1.5 px-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 px-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Ajustes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
