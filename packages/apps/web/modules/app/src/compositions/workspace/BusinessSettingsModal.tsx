import React, { useState, useEffect } from "react";
import {
  useBusiness,
  BusinessInstance,
  BusinessIconKey,
  NectoModuleKey,
  BusinessType,
  SoundAlertKey,
  ImageTransformConfig,
  WhatsAppBotConfig,
  BotPersonality,
  HolidayTheme,
  getBusinessSemantics,
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
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  RefreshCw,
  Bot,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Wallet,
  Banknote,
  QrCode,
  Zap,
  Gift,
  Heart,
  HelpCircle,
  AlertTriangle,
  Send,
  MessageCircle,
  Coins,
  Smile,
  ChefHat,
  Skull,
  TreePine,
  PartyPopper,
  Tag,
  Flame,
  CheckCheck,
  BadgeCheck,
  MessageSquareText,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { Button, Field, Select, Textarea, Badge, Toggle } from "@/elements";

const HOLIDAY_PRESETS: Record<
  HolidayTheme,
  { label: string; icon: React.ComponentType<{ className?: string }>; title: string; defaultMsg: string; accentColor: string; iconColor: string }
> = {
  none: {
    label: "Estándar (Sin Festividad)",
    icon: Sparkles,
    title: "Modo Habitual",
    defaultMsg: "",
    accentColor: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
    iconColor: "text-slate-500",
  },
  halloween: {
    label: "Halloween",
    icon: Skull,
    title: "Temporada de Terror & Promos",
    defaultMsg:
      "Bienvenido a {negocio}. En esta noche de Halloween tenemos promociones especiales y combos de temporada. ¿Deseas consultar nuestra carta?",
    accentColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    iconColor: "text-orange-500",
  },
  navidad: {
    label: "Navidad & Fiestas",
    icon: TreePine,
    title: "Temporada Navideña & Fin de Año",
    defaultMsg:
      "¡Felices Fiestas! En {negocio} preparamos lo mejor para compartir en familia. Escribe 'menú' para descubrir nuestros combos navideños y postres de temporada.",
    accentColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  ano_nuevo: {
    label: "Año Nuevo",
    icon: PartyPopper,
    title: "Bienvenida al Nuevo Año",
    defaultMsg:
      "¡Feliz Año Nuevo! En {negocio} te deseamos un año lleno de éxitos y buen sabor. ¿Qué deseas ordenar hoy para comenzar el año celebrando?",
    accentColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconColor: "text-amber-500",
  },
  black_friday: {
    label: "Black Friday / Sale",
    icon: Tag,
    title: "Descuentos & Ofertas Flash",
    defaultMsg:
      "¡Llegó el Black Friday a {negocio}! Aprovecha hasta 30% OFF en platos y combos seleccionados por tiempo limitado. Escribe 'promos' para ver las ofertas activas.",
    accentColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    iconColor: "text-rose-500",
  },
  san_valentin: {
    label: "Amor & Amistad / San Valentín",
    icon: Heart,
    title: "Especial Parejas & Amigos",
    defaultMsg:
      "Celebra el amor y la buena comida en {negocio}. Disfruta de nuestros combos para compartir en pareja o con amigos. ¿Deseas ver nuestra carta especial?",
    accentColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    iconColor: "text-pink-500",
  },
};

const BOT_PERSONALITY_OPTIONS: Array<{
  id: BotPersonality;
  title: string;
  tag: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}> = [
  {
    id: "amigable",
    title: "Amigable & Cálido",
    tag: "Recomendado",
    desc: "Tono cercano, educado y amable como un anfitrión acogedor.",
    icon: Smile,
    iconColor: "text-amber-500",
  },
  {
    id: "ejecutivo",
    title: "Ejecutivo & Rápido",
    tag: "Corporativo",
    desc: "Directo al grano, conciso, ideal para pedidos express y oficinistas.",
    icon: Zap,
    iconColor: "text-blue-500",
  },
  {
    id: "chef",
    title: "Chef de Autor",
    tag: "Gourmet",
    desc: "Explica ingredientes, maridajes sugeridos y detalles gastronómicos.",
    icon: ChefHat,
    iconColor: "text-emerald-500",
  },
  {
    id: "dinamico",
    title: "Dinámico & Juvenil",
    tag: "Casual",
    desc: "Tono relajado y enérgico, perfecto para hamburgueserías, pizzas y cafeterías.",
    icon: Flame,
    iconColor: "text-[#FF3F1A]",
  },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Colombia: [
    "Bogotá D.C.",
    "Medellín",
    "Cali",
    "Barranquilla",
    "Cartagena",
    "Bucaramanga",
    "Pereira",
    "Manizales",
    "Santa Marta",
    "Cúcuta",
    "Ibagué",
    "Pasto",
    "Villavicencio",
    "Envigado",
    "Rionegro",
    "Chía / Cota",
  ],
  México: [
    "Ciudad de México (CDMX)",
    "Guadalajara",
    "Monterrey",
    "Puebla",
    "Querétaro",
    "Cancún",
    "Mérida",
    "Tijuana",
    "León",
    "Zapopan",
    "Playa del Carmen",
  ],
  "Estados Unidos": [
    "Miami, FL",
    "Orlando, FL",
    "New York, NY",
    "Los Angeles, CA",
    "Houston, TX",
    "Chicago, IL",
    "Dallas, TX",
    "Austin, TX",
    "San Francisco, CA",
  ],
  España: [
    "Madrid",
    "Barcelona",
    "Valencia",
    "Sevilla",
    "Málaga",
    "Bilbao",
    "Zaragoza",
    "Palma de Mallorca",
    "Alicante",
  ],
  Argentina: [
    "Buenos Aires (CABA)",
    "Córdoba",
    "Rosario",
    "Mendoza",
    "La Plata",
    "Mar del Plata",
    "San Miguel de Tucumán",
    "Salta",
  ],
  Chile: [
    "Santiago",
    "Valparaíso",
    "Viña del Mar",
    "Concepción",
    "Antofagasta",
    "La Serena",
    "Temuco",
  ],
};

const USER_AVATAR_URL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

const InteractiveImageViewport: React.FC<{
  imageUrl: string;
  rotate: number;
  scale: number;
  posX: number;
  posY: number;
  onUpdate: (t: { rotate: number; scale: number; posX: number; posY: number }) => void;
  aspectRatio?: "square" | "panoramic";
  label?: string;
}> = ({ imageUrl, rotate, scale, posX, posY, onUpdate, aspectRatio = "square", label = "Imagen" }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewShape, setPreviewShape] = useState<"circle" | "square">(aspectRatio === "square" ? "circle" : "square");

  const dragStartRef = React.useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    containerWidth: number;
    containerHeight: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    containerWidth: 320,
    containerHeight: 320,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: posX,
      initialPosY: posY,
      containerWidth: rect.width || 320,
      containerHeight: rect.height || 320,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rawDeltaX = e.clientX - dragStartRef.current.startX;
    const rawDeltaY = e.clientY - dragStartRef.current.startY;

    const percentX = (rawDeltaX / dragStartRef.current.containerWidth) * 100;
    const percentY = (rawDeltaY / dragStartRef.current.containerHeight) * 100;

    const rad = (-rotate * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const projectedDeltaX = (percentX * cos - percentY * sin) / Math.max(0.2, scale);
    const projectedDeltaY = (percentX * sin + percentY * cos) / Math.max(0.2, scale);

    const newPosX = Math.max(-200, Math.min(200, Math.round(dragStartRef.current.initialPosX + projectedDeltaX)));
    const newPosY = Math.max(-200, Math.min(200, Math.round(dragStartRef.current.initialPosY + projectedDeltaY)));

    onUpdate({
      rotate,
      scale,
      posX: newPosX,
      posY: newPosY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.max(0.4, Math.min(3.5, Number((scale + delta).toFixed(2))));
    onUpdate({ rotate, scale: newScale, posX, posY });
  };

  return (
    <div className="space-y-4 select-none w-full">
      {/* Studio Canvas Area with Full Image Visibility & Aperture Mask */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-72 sm:h-84 rounded-3xl bg-[#090A0E] border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {/* Ambient Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* The Transformed Full Image (never cut off blindly) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <img
            src={imageUrl}
            alt={label}
            style={{
              transform: `rotate(${rotate}deg) scale(${scale}) translate(${posX}%, ${posY}%)`,
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
            className="pointer-events-none max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Center Viewfinder Aperture with Darkened Backdrop Shadow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] ring-2 ring-white/70 ${
              aspectRatio === "square"
                ? previewShape === "circle"
                  ? "w-48 h-48 sm:w-56 sm:h-56 rounded-full ring-4 ring-brand-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                  : "w-48 h-48 sm:w-56 sm:h-56 rounded-2xl ring-2 ring-white/90"
                : "w-[90%] sm:w-[85%] h-36 sm:h-44 rounded-2xl ring-2 ring-brand-500/90"
            }`}
          >
            {/* Crosshair guidelines */}
            <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-white absolute" />
              <div className="h-full w-[1px] bg-white absolute" />
            </div>
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <span className="font-mono text-[10px] text-zinc-200 bg-zinc-950/80 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm">
            Zoom {Math.round(scale * 100)}% · Giro {rotate}°
          </span>

          {aspectRatio === "square" && (
            <div className="flex items-center gap-1 bg-zinc-950/80 border border-white/10 p-0.5 rounded-full backdrop-blur-md pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewShape("circle");
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  previewShape === "circle" ? "bg-brand-500 text-white shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                Círculo
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewShape("square");
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  previewShape === "square" ? "bg-brand-500 text-white shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                Cuadrado
              </button>
            </div>
          )}
        </div>

        {/* Bottom Drag Helper */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-10">
          <span className="px-2.5 py-0.5 rounded-lg bg-zinc-950/70 backdrop-blur-md text-zinc-300 font-mono text-[9px]">
            {isDragging ? "Ajustando encuadre..." : "Arrastra libremente para centrar dentro del marco"}
          </span>
        </div>
      </div>

      {/* Luxury Minimalist Controls Deck */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
        {/* Zoom row */}
        <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-center gap-3">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <ZoomIn className="w-4 h-4 text-brand-500" />
            <span>Escala</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onUpdate({ rotate, scale: Math.max(0.5, Number((scale - 0.1).toFixed(2))), posX, posY })}
              className="w-7 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              -
            </button>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={scale}
              onChange={e => onUpdate({ rotate, scale: parseFloat(e.target.value), posX, posY })}
              className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <button
              type="button"
              onClick={() => onUpdate({ rotate, scale: Math.min(3.0, Number((scale + 0.1).toFixed(2))), posX, posY })}
              className="w-7 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              +
            </button>
          </div>
        </div>

        {/* Rotate row */}
        <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-center gap-3">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <RotateCw className="w-4 h-4 text-brand-500" />
            <span>Rotación</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onUpdate({ rotate: (rotate - 90) % 360, scale, posX, posY })}
              className="px-2 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              -90°
            </button>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotate > 180 ? rotate - 360 : rotate}
              onChange={e => onUpdate({ rotate: parseInt(e.target.value, 10), scale, posX, posY })}
              className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <button
              type="button"
              onClick={() => onUpdate({ rotate: (rotate + 90) % 360, scale, posX, posY })}
              className="px-2 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              +90°
            </button>
          </div>
        </div>

        {/* Quick presets row */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ rotate, scale: 1, posX: 0, posY: 0 })}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Move className="w-3.5 h-3.5 text-brand-500" />
              <span>Centrar Imagen</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onUpdate({ rotate: 0, scale: 1, posX: 0, posY: 0 });
            }}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
  isCreateMode?: boolean;
}> = ({ business, isOpen, onClose, isCreateMode = false }) => {
  const { updateBusiness, deleteBusiness, createBusiness, setUserAvatarUrl } = useBusiness();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    "general" | "branding" | "whatsapp_bot" | "payments" | "modules" | "channels" | "schedule" | "advanced"
  >("general");

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
  const [brandColor, setBrandColor] = useState("#FF3F1A");
  const [soundAlert, setSoundAlert] = useState<SoundAlertKey>("bell");

  // Branding States & Transforms
  const [logoUrl, setLogoUrl] = useState("");
  const [logoRotate, setLogoRotate] = useState(0);
  const [logoScale, setLogoScale] = useState(1);
  const [logoPosX, setLogoPosX] = useState(0);
  const [logoPosY, setLogoPosY] = useState(0);

  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerRotate, setBannerRotate] = useState(0);
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerPosX, setBannerPosX] = useState(0);
  const [bannerPosY, setBannerPosY] = useState(0);

  // WhatsApp Bot & Automated Messages States
  const [botName, setBotName] = useState("Asistente Virtual");
  const [botTone, setBotTone] = useState<"cálido" | "profesional" | "técnico" | "ágil">("cálido");
  const [isWelcomeEnabled, setIsWelcomeEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const [isClosedHoursEnabled, setIsClosedHoursEnabled] = useState(true);
  const [closedHoursMessage, setClosedHoursMessage] = useState("");

  const [isHandoffEnabled, setIsHandoffEnabled] = useState(true);
  const [handoffToHumanMessage, setHandoffToHumanMessage] = useState("");

  const [isOrderConfirmedEnabled, setIsOrderConfirmedEnabled] = useState(true);
  const [orderConfirmedMessage, setOrderConfirmedMessage] = useState("");

  // Bot AI Intelligence & Personality
  const [botPersonality, setBotPersonality] = useState<BotPersonality>("amigable");
  const [isAiUpsellEnabled, setIsAiUpsellEnabled] = useState(true);
  const [upsellMessage, setUpsellMessage] = useState(
    "¿Te gustaría agregar algún complemento o accesorio adicional antes de procesar tu orden?"
  );
  const [isAutoConfirmOrders, setIsAutoConfirmOrders] = useState(true);
  const [autoConfirmMaxAmount, setAutoConfirmMaxAmount] = useState(150000);
  const [isDelayAlertEnabled, setIsDelayAlertEnabled] = useState(true);
  const [delayAlertMinutes, setDelayAlertMinutes] = useState(15);

  // Holiday / Seasonal Profiles
  const [activeHolidayTheme, setActiveHolidayTheme] = useState<HolidayTheme>("none");
  const [isHolidayMessageEnabled, setIsHolidayMessageEnabled] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState("");

  // Payment Accounts & Methods States
  const [isPaymentInfoEnabled, setIsPaymentInfoEnabled] = useState(true);
  const [paymentInfoMessage, setPaymentInfoMessage] = useState("");
  const [nequiNumber, setNequiNumber] = useState("310 987 6543");
  const [daviplataNumber, setDaviplataNumber] = useState("310 987 6543");
  const [bancolombiaAccount, setBancolombiaAccount] = useState("104-892134-55");
  const [accountHolder, setAccountHolder] = useState("Necto Comercial S.A.S");
  const [accountNit, setAccountNit] = useState("901.458.789-1");
  const [allowCashOnDelivery, setAllowCashOnDelivery] = useState(true);
  const [allowCardTerminal, setAllowCardTerminal] = useState(true);

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

      setLogoUrl(business.logoUrl || USER_AVATAR_URL);
      setLogoRotate(business.logoTransform?.rotate || 0);
      setLogoScale(business.logoTransform?.scale || 1);
      setLogoPosX(business.logoTransform?.posX || 0);
      setLogoPosY(business.logoTransform?.posY || 0);

      setBannerUrl(business.bannerUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80");
      setBannerRotate(business.bannerTransform?.rotate || 0);
      setBannerScale(business.bannerTransform?.scale || 1);
      setBannerPosX(business.bannerTransform?.posX || 0);
      setBannerPosY(business.bannerTransform?.posY || 0);

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

      // Bot Defaults & Semantics
      const sem = getBusinessSemantics(business.businessType);
      const botCfg = business.whatsappBotConfig;

      // Extract botName & tone from botConfig if available
      const p = business.botConfig?.personality || "";
      if (p.includes("técnico")) setBotTone("técnico");
      else if (p.includes("profesional")) setBotTone("profesional");
      else if (p.includes("ágil")) setBotTone("ágil");
      else setBotTone("cálido");

      const matchName = p.split(" ")[0];
      if (matchName && matchName.toLowerCase() !== "asistente" && matchName.length > 1) {
        setBotName(matchName);
      } else {
        setBotName("Asistente Virtual");
      }

      setIsWelcomeEnabled(botCfg?.isWelcomeEnabled ?? true);
      setWelcomeMessage(
        business.botConfig?.greeting ||
          botCfg?.welcomeMessage ||
          (sem?.botGreetingTemplate
            ? sem.botGreetingTemplate.replace("{storeName}", business.name)
            : `¡Hola! Te damos la bienvenida a ${business.name}. ¿En qué podemos ayudarte hoy?`)
      );

      setIsClosedHoursEnabled(botCfg?.isClosedHoursEnabled ?? true);
      setClosedHoursMessage(
        botCfg?.closedHoursMessage ||
          `En este momento nos encontramos fuera de horario de atención. Nuestro horario habitual es de 8:00 AM a 7:00 PM. Déjanos tu mensaje y te responderemos a primera hora.`
      );

      setIsHandoffEnabled(botCfg?.isHandoffEnabled ?? true);
      setHandoffToHumanMessage(
        botCfg?.handoffToHumanMessage ||
          `He notificado al equipo de atención. Un asesor continuará la conversación contigo a la brevedad.`
      );

      setIsOrderConfirmedEnabled(botCfg?.isOrderConfirmedEnabled ?? true);
      setOrderConfirmedMessage(
        botCfg?.orderConfirmedMessage ||
          `¡Tu pedido #{numero_pedido} ha sido confirmado y está ${sem?.preparationVerb ? sem.preparationVerb.toLowerCase() : "en preparación"}! Te notificaremos cuando esté listo.`
      );

      // AI Bot Intelligence
      setBotPersonality(botCfg?.botPersonality || "amigable");
      setIsAiUpsellEnabled(botCfg?.isAiUpsellEnabled ?? true);
      setUpsellMessage(
        botCfg?.upsellMessage ||
          `¿Te gustaría acompañar tu pedido con una bebida refrescante o una porción extra por solo $4.500?`
      );
      setIsAutoConfirmOrders(botCfg?.isAutoConfirmOrders ?? true);
      setAutoConfirmMaxAmount(botCfg?.autoConfirmMaxAmount || 150000);
      setIsDelayAlertEnabled(botCfg?.isDelayAlertEnabled ?? true);
      setDelayAlertMinutes(botCfg?.delayAlertMinutes || 15);

      // Holiday Profiles
      setActiveHolidayTheme(botCfg?.activeHolidayTheme || "none");
      setIsHolidayMessageEnabled(botCfg?.isHolidayMessageEnabled ?? false);
      setHolidayMessage(
        botCfg?.holidayMessage ||
          (botCfg?.activeHolidayTheme && botCfg.activeHolidayTheme !== "none"
            ? HOLIDAY_PRESETS[botCfg.activeHolidayTheme]?.defaultMsg.replace("{negocio}", business.name)
            : "")
      );

      // Payments
      setIsPaymentInfoEnabled(botCfg?.isPaymentInfoEnabled ?? true);
      setNequiNumber(botCfg?.nequiNumber || "310 987 6543");
      setDaviplataNumber(botCfg?.daviplataNumber || "310 987 6543");
      setBancolombiaAccount(botCfg?.bancolombiaAccount || "104-892134-55");
      setAccountHolder(botCfg?.accountHolder || business.name);
      setAccountNit(botCfg?.accountNit || "901.458.789-1");
      setAllowCashOnDelivery(botCfg?.allowCashOnDelivery ?? true);
      setAllowCardTerminal(botCfg?.allowCardTerminal ?? true);
      setPaymentInfoMessage(
        botCfg?.paymentInfoMessage ||
          `*Cuentas Oficiales de Pago:*\n• Nequi / Daviplata: {nequi}\n• Bancolombia Ahorros: {bancolombia}\n• Titular: {titular}\n• NIT/C.C: {nit}\n\nEnvía la captura de tu comprobante por este chat para validar y activar tu pedido en cocina.`
      );

      setIsPaused(business.pauseConfig?.isPaused || false);
      setPauseStartDate(business.pauseConfig?.pauseStartDate || "");
      setPauseEndDate(business.pauseConfig?.pauseEndDate || "");
      setPauseReason(business.pauseConfig?.reason || "Vacaciones Colectivas");
      setPauseMessage(
        business.pauseConfig?.autoReplyMessage ||
          `Hola! ${business.name} se encuentra cerrado temporalmente por vacaciones. Volveremos a recibir pedidos pronto. Gracias por tu comprensión.`
      );
      setConfirmDelete(false);
    } else {
      // Create Mode Defaults
      setName("");
      setBusinessType("restaurant_virtual");
      setCity("Bogotá, Colombia");
      setCountry("Colombia");
      setCurrency("COP");
      setIconKey("utensils");
      setLogoUrl("");
      setLogoRotate(0);
      setLogoScale(1);
      setLogoPosX(0);
      setLogoPosY(0);
      setBannerUrl("");
      setBannerRotate(0);
      setBannerScale(1);
      setBannerPosX(0);
      setBannerPosY(0);
      setBrandColor("#FF3F1A");
      setSoundAlert("bell");
      setEnableWhatsapp(true);
      setEnableWeb(true);
      setEnablePos(true);
      setSlug("");
      setContactPhone("+57 300 123 4567");
      setContactEmail("contacto@negocio.com");
      setKitchenBufferMin(20);
      setActiveModules(["pedidos", "inventarios"]);
      setIsWelcomeEnabled(true);
      setWelcomeMessage("¡Hola! Te damos la bienvenida. ¿En qué podemos ayudarte hoy?");
      setIsPaymentInfoEnabled(true);
      setNequiNumber("310 987 6543");
      setBancolombiaAccount("104-892134-55");
      setAccountHolder("Necto Gourmet S.A.S");
      setIsClosedHoursEnabled(true);
      setClosedHoursMessage("En este momento nuestras cocinas están fuera de servicio.");
      setIsHandoffEnabled(true);
      setHandoffToHumanMessage("Un operador humano te responderá en este chat a la brevedad.");
      setIsOrderConfirmedEnabled(true);
      setOrderConfirmedMessage("¡Comanda confirmada e ingresada a cocina!");
      setIsPaused(false);
      setConfirmDelete(false);
    }
  }, [business, isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        setUserAvatarUrl(result);
        setLogoRotate(0);
        setLogoScale(1);
        setLogoPosX(0);
        setLogoPosY(0);
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
        setBannerRotate(0);
        setBannerScale(1);
        setBannerPosX(0);
        setBannerPosY(0);
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

    if (logoUrl) {
      setUserAvatarUrl(logoUrl);
    }

    const payload = {
      name: name.trim(),
      businessType,
      city: city.trim(),
      country,
      currency,
      iconKey,
      logoUrl: logoUrl.trim(),
      logoTransform: {
        rotate: logoRotate,
        scale: logoScale,
        posX: logoPosX,
        posY: logoPosY,
      },
      bannerUrl: bannerUrl.trim(),
      bannerTransform: {
        rotate: bannerRotate,
        scale: bannerScale,
        posX: bannerPosX,
        posY: bannerPosY,
      },
      brandColor,
      soundAlert,
      slug: (slug.trim() || name.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      kitchenBufferMin,
      activeModules,
      channels: {
        whatsapp: enableWhatsapp,
        web: enableWeb,
        pos: enablePos,
      },
      botConfig: {
        greeting: welcomeMessage,
        personality: `${botName} (${botTone})`,
        catalogCategories: business?.botConfig?.catalogCategories || ["General"],
      },
      whatsappBotConfig: {
        isWelcomeEnabled,
        welcomeMessage,
        isClosedHoursEnabled,
        closedHoursMessage,
        isHandoffEnabled,
        handoffToHumanMessage,
        isOrderConfirmedEnabled,
        orderConfirmedMessage,

        // Bot Personality & AI
        botPersonality,
        isAiUpsellEnabled,
        upsellMessage,
        isAutoConfirmOrders,
        autoConfirmMaxAmount,
        isDelayAlertEnabled,
        delayAlertMinutes,

        // Seasonal & Holiday Specials
        activeHolidayTheme,
        isHolidayMessageEnabled,
        holidayMessage,

        // Payments & Transfer Accounts
        isPaymentInfoEnabled,
        paymentInfoMessage,
        nequiNumber,
        daviplataNumber,
        bancolombiaAccount,
        accountHolder,
        accountNit,
        allowCashOnDelivery,
        allowCardTerminal,
      },
      pauseConfig: {
        isPaused,
        pauseStartDate,
        pauseEndDate,
        reason: pauseReason,
        autoReplyMessage: pauseMessage,
      },
      specialty: "Restaurante & Gastronomía",
      setupProgress: {
        whatsappConnected: enableWhatsapp,
        menuConfigured: true,
        kitchenConfigured: true,
        teamInvited: false,
      },
    };

    if (business && business.id && business.id !== "new") {
      updateBusiness(business.id, payload);
    } else {
      createBusiness(payload);
    }

    onClose();
  };

  const handleDelete = () => {
    if (business?.id) {
      deleteBusiness(business.id);
    }
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
      title: "Gestión de Pedidos & KDS",
      description: "Toma de comandas, pantalla KDS de cocina, estados en vivo y tickets.",
      badge: "Core Operativo",
      icon: ShoppingBag,
    },
    {
      id: "inventarios",
      title: "Control de Stock & Insumos",
      description: "Recetas técnicas, descuento automático por venta, auditorías y alertas de merma.",
      badge: "Logística",
      icon: Package,
    },
    {
      id: "turnos",
      title: "Turnos & Control de Caja",
      description: "Apertura/cierre de turnos, arqueos ciegos y control de flujo de efectivo.",
      badge: "Finanzas",
      icon: Clock,
    },
    {
      id: "reservas",
      title: "Reservas de Mesas & Zonas",
      description: "Asignación de mesas, control de aforo por franja horaria y confirmación.",
      badge: "Salón",
      icon: Users,
    },
    {
      id: "agendamiento",
      title: "Agendamiento & Citas",
      description: "Calendario para servicios, citas profesionales y eventos programados.",
      badge: "Servicios",
      icon: Calendar,
    },
    {
      id: "referidos",
      title: "Programa de Referidos & Lealtad",
      description: "Cupones dinámicos, acumulación de puntos por cliente y cashback.",
      badge: "Marketing",
      icon: Bookmark,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/65 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-5xl h-[90vh] max-h-[860px] rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/40 flex-none">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {business?.id ? "Configuración de Sede" : "Crear Nueva Franquicia / Sucursal"}
                </h2>
                {business?.name && (
                  <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    {business.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {business?.id
                  ? "Gestiona identidad, marca, WhatsApp IA, pasarelas de pago y ajustes operativos."
                  : "Registra una nueva marca o punto de venta para operar en tiempo real."}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            intent="business.settings.close"
            onClick={onClose}
            className="p-0 w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body Container with Sidebar and Main Panel */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Vertical Sub-Navigation */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800/80 p-3 bg-zinc-50/40 dark:bg-zinc-900/30 flex-none overflow-y-auto space-y-1.5">
            {[
              {
                id: "general",
                label: "General & Identidad",
                desc: "Nombre, moneda y datos",
                icon: Store,
              },
              {
                id: "branding",
                label: "Logo & Portada (Ángulo)",
                desc: "Zoom, rotación y encuadre",
                icon: Camera,
              },
              {
                id: "whatsapp_bot",
                label: "Bot de WhatsApp IA",
                desc: "Personalidad, flujos y festividades",
                icon: Bot,
              },
              {
                id: "payments",
                label: "Cuentas & Pagos",
                desc: "Nequi, Bancolombia y métodos",
                icon: CreditCard,
              },
              {
                id: "modules",
                label: "Módulos Operativos",
                desc: `${activeModules.length} activados`,
                icon: Layers,
              },
              {
                id: "channels",
                label: "Canales de Venta",
                desc: "WhatsApp, Web y POS",
                icon: MessageSquare,
              },
              {
                id: "schedule",
                label: "Pausa & Vacaciones",
                desc: isPaused ? "Cierre temporal activo" : "Operando normal",
                icon: Calendar,
              },
              {
                id: "advanced",
                label: "Operaciones & Peligro",
                desc: "Buffer y eliminación",
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
                  className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-start gap-3 group ${
                    isActive
                      ? "bg-brand-50/80 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 shadow-xs border border-brand-200/90 dark:border-brand-900/50 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none mt-0.5 transition-colors ${
                      isActive
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-tight truncate ${isActive ? "text-brand-700 dark:text-brand-300" : ""}`}>{tab.label}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-normal">
                      {tab.desc}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Right Main Content Area */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* TAB 1: GENERAL & IDENTITY */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Identidad Comercial & Ubicación
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Información visible en comprobantes de comanda, tickets impresos y el catálogo web para clientes.
                  </p>
                </div>

                {/* Card 1: Datos de Identidad & URL */}
                <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                    <Store className="w-4 h-4 text-brand-500" />
                    <span>Identificación de la Sede</span>
                  </div>

                  <Field
                    label="Nombre Comercial"
                    labelStyle="bold"
                    intent="business.name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Necto Gourmet — Sede Principal"
                  />

                  {/* Slug / Identificador de Tienda */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Enlace Web de la Tienda (Slug)
                    </label>
                    <div className="flex items-center px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-colors shadow-2xs">
                      <span className="text-zinc-400 select-none font-mono text-[11px]">necto.app/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                        placeholder="mi-restaurante"
                        className="flex-1 bg-transparent font-mono font-bold text-zinc-950 dark:text-white focus:outline-none ml-1 lowercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Modelo de Operación */}
                <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                    <Layers className="w-4 h-4 text-brand-500" />
                    <span>Modelo de Operación Principal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "restaurant_virtual", label: "Gastronomía", desc: "Cocina, KDS & Mesas", icon: UtensilsCrossed },
                      { id: "retail_store", label: "Comercio & Retail", desc: "Stock & Mostrador", icon: Store },
                      { id: "services", label: "Servicios & Citas", desc: "Agenda & Horas", icon: Calendar },
                    ].map(archetype => {
                      const isSelected = businessType === archetype.id;
                      const Icon = archetype.icon;
                      return (
                        <button
                          type="button"
                          key={archetype.id}
                          onClick={() => setBusinessType(archetype.id as BusinessType)}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected
                              ? "bg-brand-500 text-white border-brand-500 shadow-sm font-semibold"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-brand-500/40 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-brand-500"}`} />
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold block leading-tight">{archetype.label}</span>
                            <span className={`text-[10px] leading-tight block mt-0.5 ${isSelected ? "text-white/80" : "text-zinc-400"}`}>
                              {archetype.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card 3: Región y Moneda */}
                <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                    <Globe className="w-4 h-4 text-brand-500" />
                    <span>Ubicación & Parámetros Financieros</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="País de Operación"
                      labelStyle="bold"
                      intent="business.country"
                      value={country}
                      onChange={e => {
                        const newCountry = e.target.value;
                        setCountry(newCountry);
                        const firstCity = CITIES_BY_COUNTRY[newCountry]?.[0] || "";
                        setCity(firstCity ? `${firstCity}, ${newCountry}` : "");
                      }}
                      options={[
                        { value: "Colombia", label: "Colombia" },
                        { value: "México", label: "México" },
                        { value: "Estados Unidos", label: "Estados Unidos" },
                        { value: "España", label: "España" },
                        { value: "Argentina", label: "Argentina" },
                        { value: "Chile", label: "Chile" },
                      ]}
                    />

                    <Select
                      label="Ciudad / Zona de Cobertura"
                      labelStyle="bold"
                      intent="business.city"
                      value={city.split(",")[0].trim()}
                      onChange={e => {
                        const selectedCityName = e.target.value;
                        setCity(`${selectedCityName}, ${country}`);
                      }}
                      options={(CITIES_BY_COUNTRY[country] || ["Principal"]).map(cityName => ({
                        value: cityName,
                        label: cityName,
                      }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Select
                      label="Moneda Oficial"
                      labelStyle="bold"
                      intent="business.currency"
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      options={[
                        { value: "COP", label: "COP — Peso Colombiano ($)" },
                        { value: "USD", label: "USD — Dólar Americano ($)" },
                        { value: "MXN", label: "MXN — Peso Mexicano ($)" },
                        { value: "ARS", label: "ARS — Peso Argentino ($)" },
                      ]}
                    />

                    {/* Alarma Sonora de Pedido */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Alarma Sonora de Pedido
                        </label>
                        <button
                          type="button"
                          onClick={() => playOrderAlert(soundAlert)}
                          className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Probar sonido</span>
                        </button>
                      </div>

                      <Select
                        intent="business.sound"
                        value={soundAlert}
                        onChange={e => {
                          const newSound = e.target.value as SoundAlertKey;
                          setSoundAlert(newSound);
                          playOrderAlert(newSound);
                        }}
                        options={[
                          { value: "bell", label: "Campana Clásica (Bell)" },
                          { value: "kitchen_ding", label: "Ding de Cocina (Restaurant)" },
                          { value: "chime", label: "Chime Armónico (Suave)" },
                          { value: "pos_beep", label: "Bip de POS (Comercial)" },
                          { value: "mute", label: "Silencioso (Mute)" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 4: Contacto */}
                <div className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                    <Phone className="w-4 h-4 text-brand-500" />
                    <span>Canales de Contacto Directo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value.toLowerCase().trim())}
                        placeholder="contacto@restaurante.com"
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-2xs lowercase transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Teléfono Oficial
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value.replace(/[^0-9+\s()-]/g, ""))}
                          placeholder="+57 300 123 4567"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-2xs transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>Personalización de Logo & Portada</span>
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                      Controles de Encuadre en Vivo
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Modifica la rotación, el zoom y la posición de tus fotos para que calcen perfecto en tickets, comandas y la tienda digital.
                  </p>
                </div>

                {/* 1. Logotipo con Canvas Studio Táctil */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-2xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Store className="w-4 h-4 text-brand-500" />
                        <span>Logotipo / Isotipo de la Marca</span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Visible en la barra lateral, comandas, recibos y avatar principal de tu negocio.
                      </p>
                    </div>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("");
                          setLogoRotate(0);
                          setLogoScale(1);
                          setLogoPosX(0);
                          setLogoPosY(0);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoUrl ? "Reemplazar Archivo" : "Subir Logotipo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {logoUrl ? (
                      <div className="space-y-4">
                        <InteractiveImageViewport
                          imageUrl={logoUrl}
                          rotate={logoRotate}
                          scale={logoScale}
                          posX={logoPosX}
                          posY={logoPosY}
                          aspectRatio="square"
                          label="Logo"
                          onUpdate={t => {
                            setLogoRotate(t.rotate);
                            setLogoScale(t.scale);
                            setLogoPosX(t.posX);
                            setLogoPosY(t.posY);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-2xl bg-white dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
                        <Camera className="w-7 h-7 mb-1.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Sin Logotipo Cargado</span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Subí una imagen cuadrada o PNG para encuadrarla y rotarla en vivo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Banner de Portada con Canvas Studio Táctil */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-2xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-brand-500" />
                        <span>Banner de Portada Panorámico</span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Fondo panorámico que viste la cabecera de pedidos en vivo, menú digital y tarjetas de sucursal.
                      </p>
                    </div>

                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setBannerUrl("");
                          setBannerRotate(0);
                          setBannerScale(1);
                          setBannerPosX(0);
                          setBannerPosY(0);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Portada</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{bannerUrl ? "Reemplazar Foto de Portada" : "Subir Foto de Portada"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>

                    {bannerUrl ? (
                      <div className="space-y-4">
                        <InteractiveImageViewport
                          imageUrl={bannerUrl}
                          rotate={bannerRotate}
                          scale={bannerScale}
                          posX={bannerPosX}
                          posY={bannerPosY}
                          aspectRatio="panoramic"
                          label="Portada"
                          onUpdate={t => {
                            setBannerRotate(t.rotate);
                            setBannerScale(t.scale);
                            setBannerPosX(t.posX);
                            setBannerPosY(t.posY);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-2xl bg-white dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 text-center p-4">
                        <Camera className="w-7 h-7 mb-1.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Sin Imagen de Portada</span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Subí una foto panorámica para encuadrarla y rotarla en vivo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BOT DE WHATSAPP IA (Configuración Total, Flujos, IA y Festividades) */}
            {activeTab === "whatsapp_bot" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-500" />
                    <span>Configuración del Asistente de WhatsApp IA</span>
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      WhatsApp Business
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Personaliza el estilo de respuesta, flujos conversacionales, reglas de venta inteligente y campañas estacionales.
                  </p>
                </div>

                {/* SECCIÓN A: Identidad del Asistente Virtual & Vista Previa en Vivo */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-500" />
                        <span>Identidad del Asistente & Tono de Respuesta</span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Define el nombre y la personalidad con la que el bot atenderá a tus compradores en WhatsApp.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      Canal Activo
                    </span>
                  </div>

                  {/* Nombre y Tono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-brand-500" />
                        <span>Nombre del Asistente</span>
                      </label>
                      <input
                        type="text"
                        value={botName}
                        onChange={e => setBotName(e.target.value)}
                        placeholder="Ej. Asesor Virtual, Bot Ventas, Sofía"
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-brand-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />
                        <span>Tono de Atención</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "cálido", label: "Cálido", icon: Sparkles, desc: "Cercano y cordial" },
                          { id: "profesional", label: "Profesional", icon: ShieldCheck, desc: "Formal y sobrio" },
                          { id: "técnico", label: "Técnico", icon: Cpu, desc: "Preciso y exacto" },
                          { id: "ágil", label: "Ágil", icon: Zap, desc: "Rápido y comercial" },
                        ].map(t => {
                          const isToneActive = botTone === t.id;
                          const ToneIcon = t.icon;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setBotTone(t.id as any)}
                              className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isToneActive
                                  ? "bg-[#190088] text-white border-[#190088] shadow-xs"
                                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                              }`}
                            >
                              <ToneIcon className={`w-3.5 h-3.5 flex-none ${isToneActive ? "text-white" : "text-zinc-400"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold leading-none truncate">{t.label}</div>
                                <div className={`text-[9px] truncate mt-0.5 ${isToneActive ? "text-white/80" : "text-zinc-400"}`}>{t.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Live WhatsApp Chat Simulation Bubble */}
                  <div className="rounded-2xl bg-[#EFEAE2] dark:bg-[#0B141A] border border-zinc-300/80 dark:border-zinc-800/80 p-4 shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {name || "Mi Tienda"}
                            </span>
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 dark:text-emerald-500" />
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            En línea · Canal Oficial
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded bg-white/60 dark:bg-zinc-900/60 border border-zinc-300/50 dark:border-zinc-800">
                        Vista Previa en Vivo
                      </span>
                    </div>

                    <div className="max-w-[90%] bg-white dark:bg-[#1F2C34] rounded-2xl rounded-tl-none p-3.5 shadow-xs space-y-2 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        <Bot className="w-3 h-3" />
                        <span>{botName} · Tono {botTone}</span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-100 leading-relaxed font-normal">
                        {welcomeMessage}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pt-0.5">
                        <span>10:45 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                      </div>
                    </div>

                    {/* Quick action chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(business?.botConfig?.catalogCategories || ["Ver Catálogo", "Consultar Disponibilidad", "Hablar con un asesor"]).map((cat, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/90 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/80 dark:border-zinc-700 shadow-2xs"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{cat}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECCIÓN B: Perfiles de Festividades & Mensajes de Temporada */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-500" />
                        <span>Campañas de Festividades & Fechas Especiales</span>
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Temporada
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Activa saludos temáticos y promociones estacionales (Halloween, Navidad, Amor y Amistad).
                      </p>
                    </div>

                    <Toggle
                      intent="bot.holiday.toggle"
                      checked={isHolidayMessageEnabled}
                      onChange={setIsHolidayMessageEnabled}
                    />
                  </div>

                  {isHolidayMessageEnabled && (
                    <div className="space-y-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 animate-fade-in">
                      {/* Selector de Festividad */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Festividad Activa:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(Object.keys(HOLIDAY_PRESETS) as HolidayTheme[]).map(themeKey => {
                            if (themeKey === "none") return null;
                            const item = HOLIDAY_PRESETS[themeKey];
                            const isSelected = activeHolidayTheme === themeKey;
                            const Icon = item.icon;

                            return (
                              <button
                                key={themeKey}
                                type="button"
                                onClick={() => {
                                  setActiveHolidayTheme(themeKey);
                                  setHolidayMessage(item.defaultMsg.replace("{negocio}", name || "nuestro restaurante"));
                                }}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? "bg-brand-500 text-white border-brand-500 shadow-xs font-semibold"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-2xs"
                                }`}
                              >
                                <Icon className={`w-4 h-4 flex-none ${isSelected ? "text-white" : item.iconColor}`} />
                                <span className="text-xs font-bold truncate">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Editor del Mensaje Festivo */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <span>Mensaje Festivo del Bot:</span>
                            <span className="font-mono text-[10px] text-zinc-400">({"{negocio}"} se reemplaza auto)</span>
                          </label>
                          {activeHolidayTheme !== "none" && (
                            <button
                              type="button"
                              onClick={() =>
                                setHolidayMessage(
                                  HOLIDAY_PRESETS[activeHolidayTheme].defaultMsg.replace("{negocio}", name || "nuestro restaurante")
                                )
                              }
                              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Cargar plantilla</span>
                            </button>
                          )}
                        </div>
                        <Textarea
                          intent="bot.holiday.text"
                          rows={3}
                          value={holidayMessage}
                          onChange={e => setHolidayMessage(e.target.value)}
                          placeholder="Escribe el mensaje festivo que saludará a los comensales en esta temporada..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SECCIÓN C: Automatizaciones & Reglas IA */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Automatizaciones & Reglas de Cocina</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Flujos automatizados para agilizar la entrada de comandas y maximizar el ticket promedio.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Regla 1: Upselling IA */}
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>Sugerencias de Venta Cruzada (Upselling IA)</span>
                            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-semibold border border-purple-500/20">
                              IA Activa
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            El bot sugiere bebidas, guarniciones o postres antes de finalizar la comanda.
                          </p>
                        </div>
                        <Toggle
                          intent="bot.upsell.toggle"
                          checked={isAiUpsellEnabled}
                          onChange={setIsAiUpsellEnabled}
                        />
                      </div>

                      {isAiUpsellEnabled && (
                        <Textarea
                          intent="bot.upsell.text"
                          rows={2}
                          value={upsellMessage}
                          onChange={e => setUpsellMessage(e.target.value)}
                          placeholder="Pregunta de sugerencia de acompañamiento o adición..."
                        />
                      )}
                    </div>

                    {/* Regla 2: Auto-confirmación de pedidos */}
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>Auto-confirmación a Cocina con Stock 100%</span>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                              KDS Directo
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Envía de inmediato a cocina las comandas con ingredientes disponibles sin esperar confirmación manual del cajero.
                          </p>
                        </div>
                        <Toggle
                          intent="bot.autoconfirm.toggle"
                          checked={isAutoConfirmOrders}
                          onChange={setIsAutoConfirmOrders}
                        />
                      </div>

                      {isAutoConfirmOrders && (
                        <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex-none">
                            Monto Máximo para Auto-Aprobar:
                          </label>
                          <div className="flex items-center px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus-within:border-brand-500">
                            <input
                              type="number"
                              value={autoConfirmMaxAmount}
                              onChange={e => setAutoConfirmMaxAmount(Number(e.target.value))}
                              className="w-28 bg-transparent font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                              placeholder="150000"
                            />
                            <span className="text-[11px] text-zinc-400 font-mono font-bold ml-1">{currency}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Regla 3: Alerta temprana de demora */}
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Alerta Preventiva de Demora en Cocina (+{delayAlertMinutes} min)
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Notifica con empatía al cliente si la preparación toma más tiempo del previsto para reducir cancelaciones.
                          </p>
                        </div>
                        <Toggle
                          intent="bot.delay.toggle"
                          checked={isDelayAlertEnabled}
                          onChange={setIsDelayAlertEnabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN D: Flujos y Mensajes Básicos */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-brand-500" />
                      <span>Mensajes Conversacionales Estándar</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Textos automáticos para bienvenida, comanda recibida, local cerrado y derivación a operador humano.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* 1. Saludo / Bienvenida */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          1. Saludo Inicial & Bienvenida
                        </span>
                        <Toggle
                          intent="bot.welcome.toggle"
                          checked={isWelcomeEnabled}
                          onChange={setIsWelcomeEnabled}
                        />
                      </div>
                      {isWelcomeEnabled && (
                        <Textarea
                          intent="bot.welcome.text"
                          rows={3}
                          value={welcomeMessage}
                          onChange={e => setWelcomeMessage(e.target.value)}
                          placeholder="Mensaje de saludo inicial..."
                        />
                      )}
                    </div>

                    {/* 2. Confirmación de Pedido */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          2. Confirmación de Comanda en Cocina
                        </span>
                        <Toggle
                          intent="bot.confirmed.toggle"
                          checked={isOrderConfirmedEnabled}
                          onChange={setIsOrderConfirmedEnabled}
                        />
                      </div>
                      {isOrderConfirmedEnabled && (
                        <Textarea
                          intent="bot.confirmed.text"
                          rows={2}
                          value={orderConfirmedMessage}
                          onChange={e => setOrderConfirmedMessage(e.target.value)}
                          placeholder="Mensaje de comanda confirmada..."
                        />
                      )}
                    </div>

                    {/* 3. Fuera de Horario */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>3. Mensaje Fuera de Horario / Cocina Cerrada</span>
                        </span>
                        <Toggle
                          intent="bot.closed.toggle"
                          checked={isClosedHoursEnabled}
                          onChange={setIsClosedHoursEnabled}
                        />
                      </div>
                      {isClosedHoursEnabled && (
                        <Textarea
                          intent="bot.closed.text"
                          rows={2}
                          value={closedHoursMessage}
                          onChange={e => setClosedHoursMessage(e.target.value)}
                          placeholder="Mensaje de local cerrado..."
                        />
                      )}
                    </div>

                    {/* 4. Derivación a Humano */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          4. Derivación a Operador Humano en Vivo
                        </span>
                        <Toggle
                          intent="bot.handoff.toggle"
                          checked={isHandoffEnabled}
                          onChange={setIsHandoffEnabled}
                        />
                      </div>
                      {isHandoffEnabled && (
                        <Textarea
                          intent="bot.handoff.text"
                          rows={2}
                          value={handoffToHumanMessage}
                          onChange={e => setHandoffToHumanMessage(e.target.value)}
                          placeholder="Mensaje de derivación a humano..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CUENTAS & MÉTODOS DE PAGO (Nequi, Bancolombia, QR, Efectivo y Datáfono) */}
            {activeTab === "payments" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <span>Cuentas Bancarias & Métodos de Pago</span>
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Cobranza
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Configura las cuentas oficiales de transferencia (Nequi, Bancolombia, Daviplata), pagos contra entrega y plantilla de cobro automático.
                  </p>
                </div>

                {/* 1. Transferencias Móviles & Digitales */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-500" />
                        <span>Transferencias Digitales (Nequi, Daviplata, Bancolombia)</span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Cuentas que el bot enviará a los clientes para transferencias y llaves QR.
                      </p>
                    </div>

                    <Toggle
                      intent="bot.payment.toggle"
                      checked={isPaymentInfoEnabled}
                      onChange={setIsPaymentInfoEnabled}
                    />
                  </div>

                  {isPaymentInfoEnabled && (
                    <div className="space-y-4 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                          label="Número Nequi"
                          labelStyle="bold"
                          intent="bot.nequi"
                          type="text"
                          value={nequiNumber}
                          onChange={e => setNequiNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                          placeholder="310 987 6543"
                        />
                        <Field
                          label="Número Daviplata"
                          labelStyle="bold"
                          intent="bot.daviplata"
                          type="text"
                          value={daviplataNumber}
                          onChange={e => setDaviplataNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                          placeholder="310 987 6543"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field
                          label="Cuenta Bancolombia"
                          labelStyle="bold"
                          intent="bot.bancolombia"
                          type="text"
                          value={bancolombiaAccount}
                          onChange={e => setBancolombiaAccount(e.target.value.replace(/[^0-9-\s]/g, ""))}
                          placeholder="104-892134-55"
                        />
                        <Field
                          label="Titular de la Cuenta"
                          labelStyle="bold"
                          intent="bot.holder"
                          type="text"
                          value={accountHolder}
                          onChange={e => setAccountHolder(e.target.value)}
                          placeholder="Necto Gourmet S.A.S"
                        />
                        <Field
                          label="NIT / Documento"
                          labelStyle="bold"
                          intent="bot.nit"
                          type="text"
                          value={accountNit}
                          onChange={e => setAccountNit(e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, ""))}
                          placeholder="901.458.789-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Métodos de Pago en Sitio / Contra Entrega */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-500" />
                      <span>Métodos de Pago Físicos & Contra Entrega</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Opciones disponibles para comensales que reciben pedidos a domicilio o pagan en mostrador.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>Efectivo Contra Entrega</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          El cliente paga al recibir el pedido.
                        </p>
                      </div>
                      <Toggle
                        intent="payment.cash.toggle"
                        checked={allowCashOnDelivery}
                        onChange={setAllowCashOnDelivery}
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                          <span>Datáfono Móvil en Domicilio</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          El domiciliario lleva datáfono para tarjeta.
                        </p>
                      </div>
                      <Toggle
                        intent="payment.pos.toggle"
                        checked={allowCardTerminal}
                        onChange={setAllowCardTerminal}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Plantilla de Instrucciones de Pago */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span>Mensaje de Cobro Automático en WhatsApp</span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Plantilla con etiquetas dinámicas que la IA enviará al seleccionar pago por transferencia.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentInfoMessage(
                          `*Cuentas Oficiales de Pago:*\n• Nequi / Daviplata: {nequi}\n• Bancolombia Ahorros: {bancolombia}\n• Titular: {titular}\n• NIT/C.C: {nit}\n\nEnvía la captura de tu comprobante por este chat para validar y activar tu pedido en cocina.`
                        )
                      }
                      className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Restablecer formato</span>
                    </button>
                  </div>

                  <Textarea
                    intent="bot.payment.text"
                    rows={4}
                    value={paymentInfoMessage}
                    onChange={e => setPaymentInfoMessage(e.target.value)}
                    placeholder="Instrucciones con {nequi}, {bancolombia}, {titular}, {nit}..."
                  />

                  {/* Vista Previa Interactiva */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vista Previa del Mensaje al Cliente:</span>
                    </span>
                    <div className="text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 shadow-2xs">
                      {paymentInfoMessage
                        .replace("{nequi}", nequiNumber)
                        .replace("{bancolombia}", bancolombiaAccount)
                        .replace("{titular}", accountHolder)
                        .replace("{nit}", accountNit)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MÓDULOS OPERATIVOS */}
            {activeTab === "modules" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Módulos Operativos de la Sede
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Activa o desactiva las capacidades del sistema según el modelo y ritmo de tu restaurante.
                  </p>
                </div>

                <div className="space-y-3">
                  {MODULE_ITEMS.map(mod => {
                    const isChecked = activeModules.includes(mod.id);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModule(mod.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isChecked
                            ? "bg-brand-50/80 dark:bg-brand-950/30 border-brand-500/80 dark:border-brand-500/60 shadow-xs ring-1 ring-brand-500/20"
                            : "bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${
                              isChecked
                                ? "bg-brand-500 text-white shadow-2xs"
                                : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {mod.title}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                {mod.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                              {mod.description}
                            </p>
                          </div>
                        </div>

                        <Toggle
                          intent="business.module.toggle"
                          checked={isChecked}
                          onChange={() => handleToggleModule(mod.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: CANALES DE VENTA */}
            {activeTab === "channels" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Canales de Venta & Captura de Pedidos
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Habilita las vías de acceso por donde pueden ingresar comandas y compras a tu negocio.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "whatsapp",
                      title: "WhatsApp con Asistente IA",
                      desc: "Toma de pedidos conversacional automatizada con IA en tiempo real.",
                      checked: enableWhatsapp,
                      setter: setEnableWhatsapp,
                      icon: MessageSquare,
                    },
                    {
                      id: "web",
                      title: "Menú Digital & Tienda Web",
                      desc: "Catálogo interactivo online responsive con carrito y checkout directo.",
                      checked: enableWeb,
                      setter: setEnableWeb,
                      icon: Globe,
                    },
                    {
                      id: "pos",
                      title: "Punto de Venta POS & Salón",
                      desc: "Comandas presenciales, control de mesas y cobro rápido en mostrador.",
                      checked: enablePos,
                      setter: setEnablePos,
                      icon: Store,
                    },
                  ].map(ch => {
                    const Icon = ch.icon;
                    return (
                      <div
                        key={ch.id}
                        className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4 shadow-2xs"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center flex-none">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {ch.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{ch.desc}</p>
                          </div>
                        </div>

                        <Toggle
                          intent="business.channel.toggle"
                          checked={ch.checked}
                          onChange={ch.setter}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: PAUSA & VACACIONES */}
            {activeTab === "schedule" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Pausa Temporal & Modo Vacaciones
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Suspende de inmediato la recepción de nuevos pedidos y responde con un mensaje cordial y automático.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Activar Cierre Temporal del Negocio
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Pausa el canal de WhatsApp y avisa en el catálogo digital web.
                      </p>
                    </div>

                    <Toggle
                      intent="business.pause.toggle"
                      checked={isPaused}
                      onChange={setIsPaused}
                    />
                  </div>

                  {isPaused && (
                    <div className="space-y-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Motivo del Cierre:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Vacaciones Colectivas",
                            "Mantenimiento en Cocina",
                            "Evento Privado",
                            "Feriado / Asueto",
                          ].map(opt => (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => {
                                setPauseReason(opt);
                                setPauseMessage(
                                  `Hola! ${name || "Nuestro local"} se encuentra en ${opt.toLowerCase()}. Volveremos a operar pronto. Gracias por tu comprensión.`
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                pauseReason === opt
                                  ? "bg-brand-500 text-white border-brand-500 font-semibold shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-brand-500/40 shadow-2xs"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Mensaje de Respuesta Automática:
                        </label>
                        <Textarea
                          intent="business.pause.message"
                          rows={3}
                          value={pauseMessage}
                          onChange={e => setPauseMessage(e.target.value)}
                          placeholder="Mensaje de vacaciones..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 8: OPERACIONES & PELIGRO */}
            {activeTab === "advanced" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Parámetros Operativos & Zona de Peligro
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Tiempos de alerta para KDS y eliminación permanente del espacio de trabajo.
                  </p>
                </div>

                {/* Kitchen Buffer */}
                <div className="p-6 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-500" />
                      <span>Tiempo Buffer Estándar en Cocina / KDS</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Margen estimado por comanda antes de disparar alerta sonora o visual de retraso operativo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={kitchenBufferMin}
                      onChange={e => setKitchenBufferMin(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500 shadow-2xs"
                    />
                    <span className="text-xs font-mono text-zinc-400 font-semibold">min</span>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-rose-200/80 dark:border-rose-950/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Zona de Eliminación Permanente
                    </h4>
                  </div>

                  {!confirmDelete ? (
                    <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                          Eliminar este espacio de trabajo
                        </p>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                          Se borrarán de forma irreversible los catálogos, pedidos y configuraciones asociadas a esta sede.
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        intent="business.delete.request"
                        onClick={() => setConfirmDelete(true)}
                        className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs flex-none cursor-pointer font-semibold shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Negocio</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-5 bg-rose-100/70 dark:bg-rose-950/60 rounded-2xl border border-rose-300 dark:border-rose-800 space-y-3 animate-fade-in">
                      <p className="text-xs font-bold text-rose-950 dark:text-rose-100">
                        ¿Confirmas eliminar definitivamente "{business?.name}"? Esta acción no se puede deshacer.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="accent"
                          intent="business.delete.confirm"
                          onClick={handleDelete}
                          className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer font-semibold shadow-xs"
                        >
                          Sí, eliminar negocio
                        </Button>
                        <Button
                          variant="outline"
                          intent="business.delete.cancel"
                          onClick={() => setConfirmDelete(false)}
                          className="py-2.5 px-4 rounded-xl bg-white dark:bg-zinc-800 text-xs cursor-pointer font-semibold border-zinc-300 dark:border-zinc-700"
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
        <div className="px-6 sm:px-8 py-4 bg-zinc-50/90 dark:bg-zinc-900/90 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between flex-none">
          <Button
            variant="ghost"
            intent="business.discard"
            onClick={onClose}
            className="py-2.5 px-5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
          >
            Descartar
          </Button>
          <Button
            variant="accent"
            intent="business.save"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer shadow-xs hover:shadow-sm transition-all active:scale-98 flex items-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
