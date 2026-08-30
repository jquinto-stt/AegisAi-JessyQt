import React, { useState, useEffect } from "react";
import { useBusiness, BusinessInstance, BusinessIconKey, NectoModuleKey } from "../../context/BusinessContext";
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  MapPin,
  Coins,
  MessageSquare,
  Globe,
  ShoppingBag,
  Clock,
  Save,
  Users,
  Calendar,
  Bookmark,
  Package,
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
  const [activeModules, setActiveModules] = useState<NectoModuleKey[]>([
    "pedidos",
    "inventarios",
  ]);
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
      setActiveModules(business.activeModules || ["pedidos", "inventarios"]);
      setConfirmDelete(false);
    }
  }, [business, isOpen]);

  if (!isOpen || !business) return null;

  const handleToggleModule = (key: NectoModuleKey) => {
    setActiveModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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
      activeModules,
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

  const modulesList: Array<{
    id: NectoModuleKey;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "pedidos", title: "Pedidos", icon: ShoppingBag },
    { id: "inventarios", title: "Inventarios", icon: Package },
    { id: "referidos", title: "Referidos", icon: Users },
    { id: "reservas", title: "Reservas", icon: Bookmark },
    { id: "agendamiento", title: "Agendamiento", icon: Calendar },
    { id: "turnos", title: "Turnos", icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#0E0E10] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between flex-none">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E53E3E]">
              Parámetros de Sucursal
            </span>
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Ajustes de {business.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Identidad */}
          <div className="space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              01. Identidad & Sede
            </span>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre Comercial
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={iconKey}
                  onChange={e => setIconKey(e.target.value as any)}
                  className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none"
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
                  className="flex-1 px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Ubicación / Ciudad
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Moneda Base
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-zinc-400 cursor-pointer"
                >
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="ARS">ARS ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Módulos Activos (Figma Architecture) */}
          <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                02. Módulos Operativos Habilitados
              </span>
              <span className="text-[10px] font-mono text-[#E53E3E]">
                {activeModules.length} activos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {modulesList.map(mod => {
                const isSelected = activeModules.includes(mod.id);
                const Icon = mod.icon;

                return (
                  <div
                    key={mod.id}
                    onClick={() => handleToggleModule(mod.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "border-[#E53E3E] bg-[#FFF5F5] dark:bg-red-950/20 text-zinc-950 dark:text-zinc-50"
                        : "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-[#E53E3E] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold truncate">{mod.title}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? "border border-[#E53E3E] text-[#E53E3E]" : "border border-zinc-300"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canales */}
          <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              03. Canales de Entrada
            </span>

            <div className="space-y-2">
              <div
                onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  enableWhatsapp
                    ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                      WhatsApp Business IA
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      24/7
                    </span>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-white transition-colors ${
                    enableWhatsapp ? "bg-[#E53E3E]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  {enableWhatsapp && <Check className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => setEnableWeb(!enableWeb)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  enableWeb
                    ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                  Menú Web Directo
                </span>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-white transition-colors ${
                    enableWeb ? "bg-[#E53E3E]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  {enableWeb && <Check className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => setEnablePos(!enablePos)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  enablePos
                    ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                  Punto de Venta Mostrador (POS)
                </span>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-white transition-colors ${
                    enablePos ? "bg-[#E53E3E]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  {enablePos && <Check className="w-3 h-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* Zona de Peligro */}
          <div className="pt-4 border-t border-red-200/80 dark:border-red-950/60 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-red-500 font-bold">
              04. Zona de Peligro
            </span>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="py-2 px-3.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar sucursal</span>
              </button>
            ) : (
              <div className="p-4 bg-red-50/60 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 space-y-3">
                <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                  ¿Confirmas eliminar permanentemente "{business.name}"?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="py-1.5 px-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <span>Guardar Parámetros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
