import React, { useState, useEffect } from "react";
import {
  useBusiness,
  BusinessInstance,
  BusinessIconKey,
  NectoModuleKey,
  BusinessType,
  SoundAlertKey,
} from "../../context/BusinessContext";
import { playOrderAlert } from "../../utils/audioAlerts";
import {
  X,
  Check,
  Trash2,
  Store,
  UtensilsCrossed,
  Calendar,
  Layers,
  MessageSquare,
  Globe,
  ShoppingBag,
  Clock,
  Users,
  Package,
  Bookmark,
  ShieldAlert,
  Phone,
  Info,
  SlidersHorizontal,
  Upload,
  Camera,
  Palette,
  Volume2,
  Play,
  VolumeX,
} from "lucide-react";
import { Button, Field, Select, Textarea, Badge, Toggle } from "@/elements";



export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ business, isOpen, onClose }) => {
  const { updateBusiness, deleteBusiness } = useBusiness();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "modules" | "channels" | "schedule" | "advanced">("general");

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
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#FF3F1A");
  const [soundAlert, setSoundAlert] = useState<SoundAlertKey>("bell");

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
      setLogoUrl(business.logoUrl || "");
      setBannerUrl(business.bannerUrl || "");
      setBrandColor(business.brandColor || "#FF3F1A");
      setSoundAlert(business.soundAlert || "bell");
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      logoUrl: logoUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      brandColor,
      soundAlert,
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
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "pedidos",
      title: "Comandas & Cocina KDS",
      description: "Tablero kanban en tiempo real, pantallas táctiles de preparación y despacho.",
      badge: "Core Operativo",
      icon: ShoppingBag,
    },
    {
      id: "inventarios",
      title: "Control de Inventarios & Stock",
      description: "Control de materias primas por SKU, escandallo, recetas y alertas de stock bajo.",
      badge: "Gestión",
      icon: Package,
    },
    {
      id: "reservas",
      title: "Reservas de Mesas & Aforo",
      description: "Planificador visual de sala, control de ocupación y confirmación automática.",
      badge: "Salón",
      icon: Bookmark,
    },
    {
      id: "agendamiento",
      title: "Agenda de Citas & Horas",
      description: "Calendario de profesionales y sincronización con citas de clientes.",
      badge: "Servicios",
      icon: Calendar,
    },
    {
      id: "turnos",
      title: "Cuadrante de Personal & Turnos",
      description: "Asignación de turnos semanales, rotación de equipo y control horario.",
      badge: "RRHH",
      icon: Clock,
    },
    {
      id: "referidos",
      title: "Fidelización & Recompensas",
      description: "Puntos por compra recurrente y cupones de descuento automáticos.",
      badge: "Marketing",
      icon: Users,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans antialiased selection:bg-[#FF3F1A] selection:text-white">
      <div className="bg-white dark:bg-[#121215] rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] max-h-[860px]">
        {/* Top Executive Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between flex-none bg-zinc-50/60 dark:bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3F1A] text-white flex items-center justify-center font-extrabold text-lg shadow-sm flex-none">
              {name ? name.charAt(0).toUpperCase() : "N"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  {name || "Configuración del Negocio"}
                </h2>
                <Badge variant="neutral" intent="business.type">
                  {businessType === "retail_store"
                    ? "Retail"
                    : businessType === "services"
                    ? "Servicios"
                    : "Restaurante"}
                </Badge>
                {isPaused && (
                  <Badge variant="warning" intent="business.paused" className="normal-case">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pausa Activa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{city ? `${city}, ` : ""}{country}</span>
                <span>·</span>
                <span className="font-mono font-bold">{currency}</span>
                <span>·</span>
                <span className="font-mono text-zinc-400">ID: {business.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            intent="business.close"
            onClick={onClose}
            className="w-10 h-10 p-0 rounded-2xl text-zinc-400"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 2-Column Suite Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div className="w-64 sm:w-72 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-[#0E0E10]/40 p-4 flex flex-col justify-between flex-none overflow-y-auto">
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 px-3 py-1">
                Ajustes de Sede
              </p>

              {[
                {
                  id: "general",
                  label: "General & Identidad",
                  desc: "Nombre, moneda y ubicación",
                  icon: Store,
                },
                {
                  id: "branding",
                  label: "Logo & Portada",
                  desc: logoUrl || bannerUrl ? "Personalizado" : "Sin personalizar",
                  icon: Camera,
                },
                {
                  id: "modules",
                  label: `Módulos Operativos`,
                  desc: `${activeModules.length} de 6 activados`,
                  icon: Layers,
                },
                {
                  id: "channels",
                  label: "Canales de Venta",
                  desc: "WhatsApp, Menú Web y POS",
                  icon: MessageSquare,
                },
                {
                  id: "schedule",
                  label: "Pausa & Vacaciones",
                  desc: isPaused ? "Cierre temporal activo" : "Negocio en operación",
                  icon: Calendar,
                },
                {
                  id: "advanced",
                  label: "Operaciones & Peligro",
                  desc: "Buffer y eliminación de sede",
                  icon: SlidersHorizontal,
                },
              ].map(tab => {

                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    intent="business.settings.tab"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 group ${
                      isActive
                        ? "bg-white dark:bg-zinc-800/90 text-zinc-950 dark:text-white shadow-xs border border-zinc-200/90 dark:border-zinc-700/80 font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 hover:text-zinc-950 dark:hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none mt-0.5 transition-colors ${
                        isActive
                          ? "bg-[#FF3F1A] text-white"
                          : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight truncate">{tab.label}</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-normal">
                        {tab.desc}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Quick Helper Banner */}
            <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 mt-4">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1">
                <Info className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Gestión Multi-Sede</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Cada local mantiene sus propios catálogos, pedidos y personal independientes.
              </p>
            </div>
          </div>

          {/* Right Main Content Area */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* TAB 1: GENERAL & IDENTITY */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Identidad Comercial & Ubicación
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Información visible en comprobantes de comanda, tickets y catálogo digital.
                  </p>
                </div>

                <div className="space-y-4">
                  <Field
                    label="Nombre de la Sede o Restaurante"
                    labelStyle="bold"
                    intent="business.name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Burger House — Sede Principal"
                  />

                  {/* Arquetipo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Modelo de Operación
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "restaurant_virtual", label: "Gastronomía", desc: "Cocina, KDS & Mesas", icon: UtensilsCrossed },
                        { id: "retail_store", label: "Comercio & Retail", desc: "Stock & Mostrador", icon: Store },
                        { id: "services", label: "Servicios & Citas", desc: "Agenda & Horas", icon: Calendar },
                      ].map(archetype => {
                        const isSelected = businessType === archetype.id;
                        const Icon = archetype.icon;
                        return (
                          <Button
                            key={archetype.id}
                            variant="ghost"
                            intent="business.archetype.select"
                            onClick={() => setBusinessType(archetype.id as BusinessType)}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                              isSelected
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-sm font-bold"
                                : "bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                            }`}
                          >
                            <Icon className="w-4 h-4 text-[#FF3F1A]" />
                            <span className="text-xs font-bold leading-tight">{archetype.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>
                              {archetype.desc}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* País, Ciudad y Moneda */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <Select
                      label="País"
                      intent="business.country"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      options={[
                        { value: "Colombia", label: "Colombia" },
                        { value: "México", label: "México" },
                        { value: "Estados Unidos", label: "Estados Unidos" },
                        { value: "España", label: "España" },
                        { value: "Argentina", label: "Argentina" },
                        { value: "Chile", label: "Chile" },
                      ]}
                    />

                    <Field
                      label="Ciudad / Zona"
                      labelStyle="bold"
                      intent="business.city"
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Ej: Bogotá, Chapinero"
                    />

                    <Select
                      label="Moneda Base"
                      intent="business.currency"
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      options={[
                        { value: "COP", label: "COP ($ Pesos)" },
                        { value: "USD", label: "USD ($ Dólares)" },
                        { value: "MXN", label: "MXN ($ Pesos MX)" },
                        { value: "ARS", label: "ARS ($ Pesos AR)" },
                      ]}
                    />
                  </div>

                  {/* Subdominio y Contacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Slug del Menú Web
                      </label>
                      <div className="flex items-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs">
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
                        Teléfono Oficial
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          placeholder="+57 300 123 4567"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-[#FF3F1A]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING & MEDIA */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Personalización de Marca & Portada
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Estas imágenes se reflejarán en las tarjetas del Hub, selector de locales y en el banner operativo de pedidos.
                  </p>
                </div>

                {/* 1. Logotipo / Avatar de la Franquicia */}
                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                        Logotipo / Isotipo del Negocio
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Se muestra en la cabecera, selector de sucursales y tarjetas de franquicia.
                      </p>
                    </div>

                    {logoUrl && (
                      <Button
                        variant="ghost"
                        intent="business.logo.remove"
                        onClick={() => setLogoUrl("")}
                        className="p-0 text-xs text-red-500 hover:text-red-700 hover:bg-transparent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Logo</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Avatar Preview */}
                    <div className="w-20 h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-none relative shadow-sm">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-400">
                          <Camera className="w-6 h-6" />
                          <span className="text-[9px] font-bold mt-1">Sin Logo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-xs">
                        <Upload className="w-4 h-4" />
                        <span>Subir Imagen de Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-zinc-400">
                        Formatos PNG, JPG, WebP o SVG (Recomendado 512x512 px)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Banner de Portada Operativa (Reemplazo del Mosaico Necto) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                        Banner de Portada del Local (Personaliza el Mosaico)
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Fondo panorámico que sustituye el mosaico estándar en el banner de pedidos y en las tarjetas del Hub.
                      </p>
                    </div>

                    {bannerUrl && (
                      <Button
                        variant="ghost"
                        intent="business.banner.remove"
                        onClick={() => setBannerUrl("")}
                        className="p-0 text-xs text-red-500 hover:text-red-700 hover:bg-transparent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Portada</span>
                      </Button>
                    )}
                  </div>

                  {/* Banner Preview */}
                  <div className="w-full h-40 rounded-2xl bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden flex items-center justify-center">
                    {bannerUrl ? (
                      <>
                        <img src={bannerUrl} alt="Portada" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center p-6">
                          <span className="text-white text-xs font-bold px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/20">
                            Vista Previa de Banner
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                        <Camera className="w-7 h-7 mb-1.5" />
                        <span className="text-xs font-bold">Sin Imagen de Portada</span>
                        <span className="text-[11px] text-zinc-500 mt-0.5">Se mostrará el mosaico Necto por defecto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-xs">
                      <Upload className="w-4 h-4" />
                      <span>Subir Foto de Portada</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Recomendado 1920x600 px o panorámica
                    </span>
                  </div>
                </div>

                {/* 3. Color Primario de Marca (Brand Color Accent) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#FF3F1A]" />
                        <span>Color de Acento de la Franquicia</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Aplica en botones, estados y destaques de tu menú digital y comandas.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <span
                        className="w-4 h-4 rounded-full shadow-2xs flex-none"
                        style={{ backgroundColor: brandColor }}
                      />
                      <span className="font-mono text-xs font-bold uppercase text-zinc-800 dark:text-zinc-200">
                        {brandColor}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2.5 items-center">
                      {[
                        { color: "#FF3F1A", name: "Necto Flame" },
                        { color: "#10B981", name: "Esmeralda" },
                        { color: "#2563EB", name: "Azul Real" },
                        { color: "#7C3AED", name: "Púrpura" },
                        { color: "#F59E0B", name: "Ámbar" },
                        { color: "#EC4899", name: "Magenta" },
                        { color: "#0D9488", name: "Teal" },
                        { color: "#18181B", name: "Titanio" },
                      ].map(preset => (
                        <Button
                          key={preset.color}
                          variant="ghost"
                          intent="business.brandcolor.select"
                          onClick={() => setBrandColor(preset.color)}
                          className={`p-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-2xs relative ${
                            brandColor.toLowerCase() === preset.color.toLowerCase()
                              ? "ring-2 ring-offset-2 ring-[#FF3F1A] dark:ring-offset-zinc-900 scale-110"
                              : "hover:scale-105 opacity-85 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        >
                          {brandColor.toLowerCase() === preset.color.toLowerCase() && (
                            <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                          )}
                        </Button>
                      ))}

                      {/* Custom Native Color Picker */}
                      <label
                        className="w-9 h-9 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors relative"
                        title="Seleccionar color personalizado"
                      >
                        <input
                          type="color"
                          value={brandColor}
                          onChange={e => setBrandColor(e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <Palette className="w-4 h-4 text-zinc-400" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Sonidos de Notificación de Comanda por Sede */}
                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-[#FF3F1A]" />
                        <span>Alerta Sonora de Comandas (Cocina & KDS)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Tono que sonará en el navegador cuando ingrese una comanda nueva.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        id: "bell",
                        title: "Timbre de Recepción (Ding-Dong)",
                        desc: "Dos tonos armónicos suaves y claros",
                        icon: Volume2,
                      },
                      {
                        id: "chime",
                        title: "Campana Armónica (3 Notas)",
                        desc: "Secuencia ascendente elegante",
                        icon: Volume2,
                      },
                      {
                        id: "kitchen_ding",
                        title: "Timbre Metálico KDS",
                        desc: "Golpe agudo de cocina de alto impacto",
                        icon: Volume2,
                      },
                      {
                        id: "pos_beep",
                        title: "Doble Bip de Mostrador POS",
                        desc: "Bip digital rápido para cajas",
                        icon: Volume2,
                      },
                      {
                        id: "mute",
                        title: "Silencioso",
                        desc: "Sin sonido (solo alertas visuales)",
                        icon: VolumeX,
                      },
                    ].map(opt => {
                      const isSelected = soundAlert === opt.id;
                      const Icon = opt.icon;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSoundAlert(opt.id as SoundAlertKey);
                            playOrderAlert(opt.id as SoundAlertKey);
                          }}
                          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-white dark:bg-zinc-800/90 border-zinc-950 dark:border-zinc-100 shadow-xs font-bold"
                              : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                                {opt.title}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-normal">
                                {opt.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-none">
                            {opt.id !== "mute" && (
                              <Button
                                variant="ghost"
                                intent="business.sound.test"
                                onClick={e => {
                                  e.stopPropagation();
                                  playOrderAlert(opt.id as SoundAlertKey);
                                }}
                                className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                title="Reproducir muestra de sonido"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span className="hidden sm:inline">Probar</span>
                              </Button>
                            )}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-[#FF3F1A] text-white"
                                  : "border border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}


            {/* TAB 3: MODULES & CAPABILITIES */}
            {activeTab === "modules" && (

              <div className="space-y-5 animate-fade-in max-w-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      Módulos & Capacidades Operativas
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Activa únicamente las herramientas que este local necesita en su operación diaria.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FF3F1A] bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 px-3 py-1 rounded-full">
                    {activeModules.length}/6 Activados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MODULE_ITEMS.map(mod => {
                    const isSelected = activeModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "bg-zinc-50/90 dark:bg-zinc-900/70 border-zinc-900 dark:border-zinc-100 shadow-xs"
                            : "bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${
                              isSelected
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Icon className="w-5 h-5 text-[#FF3F1A]" />
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                            {mod.badge}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-zinc-950 dark:text-white">
                            {mod.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <span className={`text-[11px] font-bold ${isSelected ? "text-[#FF3F1A]" : "text-zinc-400"}`}>
                            {isSelected ? "Módulo Habilitado" : "Desactivado"}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#FF3F1A] text-white"
                                : "border border-zinc-300 dark:border-zinc-700"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CHANNELS & SALES */}
            {activeTab === "channels" && (
              <div className="space-y-5 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Canales de Recepción de Pedidos
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Habilita o pausa temporalmente la entrada de comandas por canal.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* WhatsApp */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-none font-bold">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                          WhatsApp Business API
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Recepción automática de comandas con IA, confirmación y cobro por chat.
                        </p>
                      </div>
                    </div>

                    <Toggle
                      checked={enableWhatsapp}
                      onCheckedChange={setEnableWhatsapp}
                      intent="business.channel.whatsapp"
                      ariaLabel="Activar canal WhatsApp"
                    />
                  </div>

                  {/* Web QR */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-none font-bold">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                          Catálogo Digital & Pedidos Web QR
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Portal online para pedidos desde mesa o servicio de domicilio propio.
                        </p>
                      </div>
                    </div>

                    <Toggle
                      checked={enableWeb}
                      onCheckedChange={setEnableWeb}
                      intent="business.channel.web"
                      ariaLabel="Activar canal Web"
                    />
                  </div>

                  {/* POS Mostrador */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center flex-none font-bold">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                          Punto de Venta (POS Mostrador & Caja)
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Interfaz táctil rápida para meseros y cajeros presenciales.
                        </p>
                      </div>
                    </div>

                    <Toggle
                      checked={enablePos}
                      onCheckedChange={setEnablePos}
                      intent="business.channel.pos"
                      ariaLabel="Activar canal POS"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SCHEDULE & PAUSE */}
            {activeTab === "schedule" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Pausa Operativa & Modo Vacaciones
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Programa cierres temporales con mensaje automático para clientes en WhatsApp y Web.
                  </p>
                </div>

                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                          Estado Operativo de la Sede
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {isPaused ? "Actualmente cerrada temporalmente para nuevos pedidos." : "Abierto y recibiendo pedidos normalmente."}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      intent="business.pause.toggle"
                      onClick={() => setIsPaused(!isPaused)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isPaused
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300"
                      }`}
                    >
                      {isPaused ? "Pausa Activa" : "Pausar Local"}
                    </Button>
                  </div>

                  {isPaused && (
                    <div className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#FF3F1A]" />
                            <span>Fecha Inicio Cierre</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={pauseStartDate}
                            onChange={e => setPauseStartDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-950 dark:text-white font-medium focus:outline-none focus:border-[#FF3F1A]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Reapertura Automática</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={pauseEndDate}
                            onChange={e => setPauseEndDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-950 dark:text-white font-medium focus:outline-none focus:border-[#FF3F1A]"
                          />
                        </div>
                      </div>

                      {/* Motivos rápidos */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Motivo del Cierre
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Vacaciones Colectivas",
                            "Inventario & Mantenimiento",
                            "Feriado / Día Festivo",
                            "Remodelación de Local",
                          ].map(opt => (
                            <Button
                              key={opt}
                              variant="ghost"
                              intent="business.pause.reason"
                              onClick={() => {
                                setPauseReason(opt);
                                setPauseMessage(
                                  `Hola! ${name || "Nuestro local"} se encuentra en ${opt.toLowerCase()}. Volveremos a operar pronto. Gracias por tu comprensión.`
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                pauseReason === opt
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold shadow-2xs"
                                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                              }`}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Mensaje de auto-reply */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>Mensaje de Respuesta Automática</span>
                          <span className="text-[10px] font-mono text-zinc-400">WhatsApp & Web</span>
                        </label>
                        <Textarea
                          intent="business.pause.message"
                          rows={3}
                          value={pauseMessage}
                          onChange={e => setPauseMessage(e.target.value)}
                          placeholder="Mensaje que recibirán los clientes si intentan pedir durante la pausa..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: ADVANCED & DANGER ZONE */}
            {activeTab === "advanced" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Parámetros Operativos & Peligro
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Tiempos de alerta en cocina y eliminación permanente de la sucursal.
                  </p>
                </div>

                {/* Kitchen Buffer */}
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Tiempo Buffer Estándar en Cocina / KDS
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Margen estimado por comanda antes de marcar alerta por retraso operativo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={kitchenBufferMin}
                      onChange={e => setKitchenBufferMin(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-center text-xs font-mono font-bold text-zinc-950 dark:text-white focus:outline-none focus:border-[#FF3F1A]"
                    />
                    <span className="text-xs font-mono text-zinc-400">min</span>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-red-200/80 dark:border-red-950/60 space-y-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Zona de Eliminación Permanente
                    </h4>
                  </div>

                  {!confirmDelete ? (
                    <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-red-900 dark:text-red-200">
                          Eliminar este espacio de trabajo
                        </p>
                        <p className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5">
                          Se borrarán de forma irreversible los catálogos, pedidos y configuraciones asociadas.
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        intent="business.delete.request"
                        onClick={() => setConfirmDelete(true)}
                        className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-xs flex-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Negocio</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-5 bg-red-100/70 dark:bg-red-950/60 rounded-2xl border border-red-300 dark:border-red-800 space-y-3">
                      <p className="text-xs font-bold text-red-950 dark:text-red-100">
                        ¿Confirmas eliminar definitivamente "{business.name}"? Esta acción no se puede deshacer.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="accent"
                          intent="business.delete.confirm"
                          onClick={handleDelete}
                          className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-xs"
                        >
                          Sí, eliminar negocio
                        </Button>
                        <Button
                          variant="outline"
                          intent="business.delete.cancel"
                          onClick={() => setConfirmDelete(false)}
                          className="py-2.5 px-4 bg-white dark:bg-zinc-800 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 sm:px-8 py-4 bg-zinc-50/80 dark:bg-zinc-900/90 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between flex-none">
          <Button
            variant="ghost"
            intent="business.discard"
            onClick={onClose}
            className="py-2.5 px-5 text-xs"
          >
            Descartar
          </Button>
          <Button
            variant="accent"
            intent="business.save"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-2xl text-xs"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
