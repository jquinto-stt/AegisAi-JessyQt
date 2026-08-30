import React, { useState, useEffect } from "react";
import {
  useBusiness,
  BusinessInstance,
  BusinessIconKey,
  NectoModuleKey,
  BusinessType,
} from "../../context/BusinessContext";
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Building2,
  Store,
  UtensilsCrossed,
  Calendar,
  Layers,
  MessageSquare,
  Globe,
  ShoppingBag,
  Clock,
  Save,
  Users,
  Package,
  Bookmark,
  ShieldAlert,
  Sliders,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Coins,
  Cpu,
} from "lucide-react";

export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ business, isOpen, onClose }) => {
  const { updateBusiness, deleteBusiness } = useBusiness();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"general" | "modules" | "channels" | "advanced">("general");

  // General States
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant_virtual");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [iconKey, setIconKey] = useState<BusinessIconKey>("utensils");
  const [slug, setSlug] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Channels States
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);

  // Operations States
  const [kitchenBufferMin, setKitchenBufferMin] = useState(20);
  const [activeModules, setActiveModules] = useState<NectoModuleKey[]>([
    "pedidos",
    "inventarios",
  ]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Pause & Maintenance States
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartDate, setPauseStartDate] = useState("");
  const [pauseEndDate, setPauseEndDate] = useState("");
  const [pauseReason, setPauseReason] = useState("Vacaciones Colectivas");
  const [pauseMessage, setPauseMessage] = useState("");

  useEffect(() => {
    if (business) {
      setName(business.name);
      setBusinessType(business.businessType || "restaurant_virtual");
      setCity(business.city);
      setCountry(business.country || "Colombia");
      setCurrency(business.currency);
      setIconKey(business.iconKey);
      setEnableWhatsapp(business.channels.whatsapp);
      setEnableWeb(business.channels.web);
      setEnablePos(business.channels.pos);
      setSlug(business.slug || business.name.toLowerCase().replace(/\s+/g, "-"));
      setContactPhone(business.contactPhone || "+57 300 123 4567");
      setContactEmail(business.contactEmail || "contacto@negocio.com");
      setKitchenBufferMin(business.kitchenBufferMin || 20);
      setActiveModules(business.activeModules || ["pedidos", "inventarios"]);
      setIsPaused(business.pauseConfig?.isPaused || false);
      setPauseStartDate(business.pauseConfig?.pauseStartDate || "");
      setPauseEndDate(business.pauseConfig?.pauseEndDate || "");
      setPauseReason(business.pauseConfig?.reason || "Vacaciones Colectivas");
      setPauseMessage(
        business.pauseConfig?.autoReplyMessage ||
          `Hola! ${business.name} se encuentra cerrado temporalmente por vacaciones. Volveremos a recibir pedidos pronto. Gracias por tu comprensión.`
      );
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
      businessType,
      city: city.trim(),
      country,
      currency,
      iconKey,
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      kitchenBufferMin,
      activeModules,
      channels: {
        whatsapp: enableWhatsapp,
        web: enableWeb,
        pos: enablePos,
      },
      pauseConfig: {
        isPaused,
        pauseStartDate,
        pauseEndDate,
        reason: pauseReason,
        autoReplyMessage: pauseMessage,
      },
    });

    onClose();
  };

  const handleDelete = () => {
    deleteBusiness(business.id);
    onClose();
  };

  const MODULE_ITEMS: Array<{
    id: NectoModuleKey;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "pedidos",
      title: "Módulo Pedidos & KDS",
      description: "Comandas en vivo, estados en cocina, pantalla KDS y cobro en mostrador.",
      icon: ShoppingBag,
    },
    {
      id: "inventarios",
      title: "Control de Inventarios",
      description: "Escandallo, control de mermas, stock por SKU y recetas de platos.",
      icon: Package,
    },
    {
      id: "reservas",
      title: "Reservas de Mesas",
      description: "Aforo en vivo, asignación de mesas y confirmación vía WhatsApp.",
      icon: Bookmark,
    },
    {
      id: "agendamiento",
      title: "Agenda de Citas",
      description: "Reserva de horas, calendario de especialistas y sincronización con clientes.",
      icon: Calendar,
    },
    {
      id: "turnos",
      title: "Cuadrante de Turnos",
      description: "Horarios de personal, turnos rotativos y control de asistencia por sede.",
      icon: Clock,
    },
    {
      id: "referidos",
      title: "Fidelización & Referidos",
      description: "Cupones de descuento por recomendación y recompensas por cliente recurrente.",
      icon: Users,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#0E0E10] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-none bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold text-sm shadow-sm flex-none">
              {name ? name.charAt(0).toUpperCase() : "N"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-tight">
                  {name || "Configuración del Negocio"}
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {businessType === "retail_store"
                    ? "Retail"
                    : businessType === "services"
                    ? "Servicios"
                    : "Restaurante"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {city ? `${city}, ` : ""}{country} · {currency}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E0E10] text-xs font-semibold overflow-x-auto scrollbar-none">
          {[
            { id: "general", label: "General & Marca", icon: Store },
            { id: "modules", label: `Módulos (${activeModules.length})`, icon: Layers },
            { id: "channels", label: "Canales & WhatsApp", icon: MessageSquare },
            { id: "advanced", label: "Operaciones & Avanzado", icon: Sliders },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 rounded-t-xl border-b-2 font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-[#FF3F1A] text-[#FF3F1A] font-bold bg-zinc-50/50 dark:bg-zinc-900/50"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body with Tab Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* TAB 1: GENERAL & BRAND */}
          {activeTab === "general" && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Nombre Comercial de la Empresa / Sede
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: La Trattoria Gourmet"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-950 dark:text-white focus:outline-none focus:border-[#FF3F1A]"
                />
              </div>

              {/* Model Archetype Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Modelo de Negocio & Arquetipo Operativo
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "restaurant_virtual", label: "Gastronomía", icon: UtensilsCrossed },
                    { id: "retail_store", label: "Comercio & Retail", icon: Store },
                    { id: "services", label: "Servicios & Citas", icon: Calendar },
                  ].map(archetype => {
                    const isSelected = businessType === archetype.id;
                    const Icon = archetype.icon;
                    return (
                      <button
                        key={archetype.id}
                        type="button"
                        onClick={() => setBusinessType(archetype.id as BusinessType)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs font-bold"
                            : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[#FF3F1A]" />
                        <span className="text-xs">{archetype.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location, Country and Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    País
                  </label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-[#FF3F1A] cursor-pointer"
                  >
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="España">España</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Chile">Chile</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Ciudad / Sede
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ej: Bogotá, Chapinero"
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-[#FF3F1A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Moneda Operativa
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-[#FF3F1A] cursor-pointer"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="ARS">ARS ($)</option>
                  </select>
                </div>
              </div>

              {/* Subdomain & Direct Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Subdominio Necto Web
                  </label>
                  <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs">
                    <span className="font-mono text-zinc-400 select-none">necto.app/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="mi-negocio"
                      className="flex-1 bg-transparent font-mono font-bold text-zinc-950 dark:text-white focus:outline-none ml-1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Teléfono Oficial de Pedidos
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3.5 top-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-[#FF3F1A]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODULAR ARCHITECTURE */}
          {activeTab === "modules" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                    Servicios y Módulos Activos
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Habilita o desactiva módulos según las operaciones reales de esta sucursal.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#FF3F1A] bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 px-2.5 py-1 rounded-full">
                  {activeModules.length}/6 Habilitados
                </span>
              </div>

              <div className="space-y-2.5">
                {MODULE_ITEMS.map(mod => {
                  const isSelected = activeModules.includes(mod.id);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleModule(mod.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                          : "bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
                            isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-[#FF3F1A]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                            {mod.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-none transition-colors ${
                          isSelected
                            ? "bg-[#FF3F1A] text-white"
                            : "border border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CHANNELS & WHATSAPP */}
          {activeTab === "channels" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-none font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-950 dark:text-white">
                      Meta Cloud API (WhatsApp Oficial)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Webhook verificado y sincronizado para recepción de pedidos 24/7.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWhatsapp(!enableWhatsapp)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-none ${
                    enableWhatsapp ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      enableWhatsapp ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-none font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-950 dark:text-white">
                      Carta & Menú Web Directo (QR)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Portal web responsive para pedidos desde mesa o delivery directo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWeb(!enableWeb)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-none ${
                    enableWeb ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      enableWeb ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center flex-none font-bold">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-950 dark:text-white">
                      Terminal Punto de Venta (POS Mostrador)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Interfaz táctil rápida para facturación de caja y cobro presencial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnablePos(!enablePos)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-none ${
                    enablePos ? "bg-[#FF3F1A]" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      enablePos ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED & DANGER ZONE */}
          {activeTab === "advanced" && (
            <div className="space-y-6 animate-fade-in">
              {/* Scheduled Business Pause / Downtime Calendar Section */}
              <div className="space-y-4 p-5 rounded-3xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isPaused ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                        Estado de Apertura & Pausa Programada
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed">
                      Desactiva la recepción de pedidos temporalmente por vacaciones, mantenimiento o feriados con reapertura automática por calendario.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isPaused
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300"
                    }`}
                  >
                    <span>{isPaused ? "Pausa Activa" : "Negocio Abierto"}</span>
                  </button>
                </div>

                {/* Calendar Schedule Controls (Visible when pause is enabled) */}
                {isPaused && (
                  <div className="space-y-4 pt-4 border-t border-zinc-200/70 dark:border-zinc-800 animate-fade-in">
                    {/* Date Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#FF3F1A]" />
                          <span>Inicio de la Pausa (Cierre)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={pauseStartDate}
                          onChange={e => setPauseStartDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-950 dark:text-white font-medium focus:outline-none focus:border-[#FF3F1A]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Reapertura Automática</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={pauseEndDate}
                          onChange={e => setPauseEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-950 dark:text-white font-medium focus:outline-none focus:border-[#FF3F1A]"
                        />
                      </div>
                    </div>

                    {/* Quick Reasons Chips */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                        Motivo del Cierre Temporal
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Vacaciones Colectivas",
                          "Inventario & Mantenimiento",
                          "Feriado / Día No Laborable",
                          "Remodelación de Local",
                          "Emergencia Operativa",
                        ].map(reasonOption => (
                          <button
                            key={reasonOption}
                            type="button"
                            onClick={() => {
                              setPauseReason(reasonOption);
                              setPauseMessage(
                                `Hola! ${name || "Nuestro negocio"} se encuentra en ${reasonOption.toLowerCase()}. Volveremos a recibir pedidos el día ${
                                  pauseEndDate ? new Date(pauseEndDate).toLocaleDateString() : "indicado"
                                }. Gracias por tu comprensión.`
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                              pauseReason === reasonOption
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                            }`}
                          >
                            {reasonOption}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Auto-Reply Message */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                        <span>Mensaje de Respuesta Automática (WhatsApp & Web QR)</span>
                        <span className="text-[10px] font-mono text-zinc-400">Auto-Reply</span>
                      </label>
                      <textarea
                        rows={3}
                        value={pauseMessage}
                        onChange={e => setPauseMessage(e.target.value)}
                        placeholder="Mensaje que recibirán los clientes si intentan pedir durante la pausa..."
                        className="w-full p-3 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-950 dark:text-white font-medium focus:outline-none focus:border-[#FF3F1A] resize-none"
                      />
                    </div>

                    {/* Active Warning Banner */}
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-none" />
                      <span>
                        Durante la pausa, el catálogo web mostrará el aviso de cierre temporal y la fecha de reapertura sin recibir cobros.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Kitchen Buffer Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                  Tiempos & Rendimiento Operativo
                </h4>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Tiempo Buffer Estándar en Cocina / KDS
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Margen estimado por comanda antes de marcar alerta por demora.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={kitchenBufferMin}
                      onChange={e => setKitchenBufferMin(Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-center text-xs font-mono font-bold text-zinc-950 dark:text-white"
                    />
                    <span className="text-xs font-mono text-zinc-400">min</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-red-200/80 dark:border-red-950/60 space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                  <h5 className="text-xs font-bold uppercase tracking-wider">
                    Zona de Eliminación Permanente
                  </h5>
                </div>

                {!confirmDelete ? (
                  <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-red-900 dark:text-red-200">
                        Eliminar este espacio de trabajo
                      </p>
                      <p className="text-[11px] text-red-700/80 dark:text-red-400/80">
                        Se borrarán los catálogos, pedidos y registros contables vinculados.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Negocio</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-red-100/70 dark:bg-red-950/60 rounded-2xl border border-red-300 dark:border-red-800 space-y-3">
                    <p className="text-xs font-bold text-red-950 dark:text-red-100">
                      ¿Confirmas eliminar definitivamente "{business.name}"? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Sí, eliminar espacio
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="py-2 px-3.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-none">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-2 active:scale-98"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
};

