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
} from "lucide-react";
import { Button, Field, Select, Textarea, Badge, Toggle } from "@/elements";

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
  const [dragMode, setDragMode] = useState<"pan" | "rotate" | null>(null);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");

  const dragStartRef = React.useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    initialRotate: number;
    centerX: number;
    centerY: number;
    startAngle: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    initialRotate: 0,
    centerX: 0,
    centerY: 0,
    startAngle: 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: "pan" | "rotate") => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: posX,
      initialPosY: posY,
      initialRotate: rotate,
      centerX,
      centerY,
      startAngle,
    };
    setIsDragging(true);
    setDragMode(mode);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragMode) return;

    if (dragMode === "pan") {
      const deltaX = (e.clientX - dragStartRef.current.startX) / (scale * 1.2);
      const deltaY = (e.clientY - dragStartRef.current.startY) / (scale * 1.2);
      onUpdate({
        rotate,
        scale,
        posX: Math.max(-250, Math.min(250, Math.round(dragStartRef.current.initialPosX + deltaX))),
        posY: Math.max(-250, Math.min(250, Math.round(dragStartRef.current.initialPosY + deltaY))),
      });
    } else if (dragMode === "rotate") {
      const currentAngle =
        Math.atan2(e.clientY - dragStartRef.current.centerY, e.clientX - dragStartRef.current.centerX) *
        (180 / Math.PI);
      const angleDelta = currentAngle - dragStartRef.current.startAngle;
      const newRotate = Math.round((dragStartRef.current.initialRotate + angleDelta) % 360);
      onUpdate({
        rotate: newRotate,
        scale,
        posX,
        posY,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setDragMode(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0025;
    const newScale = Math.max(0.1, Math.min(6, Number((scale + delta).toFixed(2))));
    onUpdate({ rotate, scale: newScale, posX, posY });
  };

  return (
    <div className="space-y-4 select-none w-full">
      {/* High-End Studio Viewport Frame */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={e => handlePointerDown(e, "pan")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative overflow-hidden rounded-3xl bg-[#090A0D] border-2 border-zinc-800 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-all ${
          aspectRatio === "square"
            ? "w-full sm:w-[360px] h-[320px] sm:h-[360px] mx-auto"
            : "w-full h-64 sm:h-80 md:h-[360px]"
        }`}
      >
        {/* Subtle radial studio light ambient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_0%,transparent_70%)] pointer-events-none" />

        {/* The Image being transformed */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <img
            src={imageUrl}
            alt={label}
            style={{
              transform: `translate(${posX}%, ${posY}%) rotate(${rotate}deg) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            className={`pointer-events-none transition-all shadow-xl ${
              fitMode === "contain"
                ? "max-w-full max-h-full object-contain"
                : "w-full h-full object-cover"
            }`}
            draggable={false}
          />
        </div>

        {/* Viewfinder Reticles & Golden Ratio Grid */}
        <div className="absolute inset-4 pointer-events-none rounded-2xl border border-white/15">
          {/* 4 Precision L-Shaped Corner Marks */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#FF3F1A]" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#FF3F1A]" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#FF3F1A]" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#FF3F1A]" />

          {/* Precision 3x3 Grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-15">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>

          {/* Center Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white" />
          </div>
        </div>

        {/* Top HUD: Status Bar */}
        <div className="absolute top-3 left-3 right-14 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-white font-mono text-[11px] font-bold shadow-lg">
            <span className="text-[#FF3F1A]">{rotate}°</span>
            <span className="text-zinc-500">·</span>
            <span>{scale.toFixed(2)}x</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 text-[10px]">({posX}%, {posY}%)</span>
          </div>

          <span className="px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 hidden sm:inline shadow-lg">
            {fitMode === "contain" ? "Ajuste Completo" : "Llenado Total"}
          </span>
        </div>

        {/* Interactive Rotation Dial Handle (Top-Right Precision Knob) */}
        <div
          onPointerDown={e => handlePointerDown(e, "rotate")}
          className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-zinc-900/90 text-white border-2 border-[#FF3F1A] shadow-2xl backdrop-blur-md flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-all z-20 group"
          title="Arrastra con el mouse para rotar libremente en 360°"
        >
          <RotateCw className="w-5 h-5 text-[#FF3F1A] group-hover:rotate-45 transition-transform" />
        </div>

        {/* Bottom Floating Canvas Guide */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center pointer-events-none text-[10px] font-mono text-zinc-400 z-10">
          <span className="px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 shadow-lg">
            Arrastra sobre la imagen para mover · Rueda para zoom · Pomo para girar
          </span>
        </div>
      </div>

      {/* Luxury Studio Floating Micro-Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* Fit / Cover toggle */}
          <button
            type="button"
            onClick={() => {
              const next = fitMode === "contain" ? "cover" : "contain";
              setFitMode(next);
              onUpdate({ rotate, scale: 1, posX: 0, posY: 0 });
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Alternar entre ver la imagen completa sin recortar o llenar el recuadro"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{fitMode === "contain" ? "Llenar Marco" : "Ver Completa"}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdate({ rotate: (rotate - 90) % 360, scale, posX, posY })}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Girar 90° antihorario"
          >
            <RotateCcw className="w-3.5 h-3.5" /> -90°
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ rotate: (rotate + 90) % 360, scale, posX, posY })}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Girar 90° horario"
          >
            <RotateCw className="w-3.5 h-3.5" /> +90°
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate({ rotate, scale: Math.max(0.1, Number((scale - 0.2).toFixed(2))), posX, posY })}
            className="p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Alejar zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ rotate, scale: Math.min(6, Number((scale + 0.2).toFixed(2))), posX, posY })}
            className="p-1.5 px-2.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Acercar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ rotate: 0, scale: 1, posX: 0, posY: 0 })}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Restablecer posición, escala y ángulo"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
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
  const { updateBusiness, deleteBusiness, createBusiness } = useBusiness();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    "general" | "branding" | "whatsapp_bot" | "modules" | "channels" | "schedule" | "advanced"
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
  const [isWelcomeEnabled, setIsWelcomeEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const [isPaymentInfoEnabled, setIsPaymentInfoEnabled] = useState(true);
  const [paymentInfoMessage, setPaymentInfoMessage] = useState("");
  const [nequiNumber, setNequiNumber] = useState("310 987 6543");
  const [bancolombiaAccount, setBancolombiaAccount] = useState("104-892134-55");
  const [accountHolder, setAccountHolder] = useState("Necto Gourmet S.A.S");

  const [isClosedHoursEnabled, setIsClosedHoursEnabled] = useState(true);
  const [closedHoursMessage, setClosedHoursMessage] = useState("");

  const [isHandoffEnabled, setIsHandoffEnabled] = useState(true);
  const [handoffToHumanMessage, setHandoffToHumanMessage] = useState("");

  const [isOrderConfirmedEnabled, setIsOrderConfirmedEnabled] = useState(true);
  const [orderConfirmedMessage, setOrderConfirmedMessage] = useState("");

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
      setLogoRotate(business.logoTransform?.rotate || 0);
      setLogoScale(business.logoTransform?.scale || 1);
      setLogoPosX(business.logoTransform?.posX || 0);
      setLogoPosY(business.logoTransform?.posY || 0);

      setBannerUrl(business.bannerUrl || "");
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

      // Bot Defaults
      const botCfg = business.whatsappBotConfig;
      setIsWelcomeEnabled(botCfg?.isWelcomeEnabled ?? true);
      setWelcomeMessage(
        botCfg?.welcomeMessage ||
          `¡Hola! Te damos la bienvenida a ${business.name}. ¿En qué podemos ayudarte hoy? Escribe "menú" para ver nuestra carta o envíanos tu pedido directamente.`
      );

      setIsPaymentInfoEnabled(botCfg?.isPaymentInfoEnabled ?? true);
      setNequiNumber(botCfg?.nequiNumber || "310 987 6543");
      setBancolombiaAccount(botCfg?.bancolombiaAccount || "104-892134-55");
      setAccountHolder(botCfg?.accountHolder || business.name);
      setPaymentInfoMessage(
        botCfg?.paymentInfoMessage ||
          `*Cuentas Oficiales de Pago:*\n• Nequi / Daviplata: {nequi}\n• Bancolombia Ahorros: {bancolombia}\n• Titular: {titular}\n\nEnvía la captura de tu comprobante por este canal para validar los fondos y activar tu pedido en cocina.`
      );

      setIsClosedHoursEnabled(botCfg?.isClosedHoursEnabled ?? true);
      setClosedHoursMessage(
        botCfg?.closedHoursMessage ||
          `En este momento nuestras cocinas están fuera de servicio. Nuestro horario habitual es de 11:30 AM a 11:00 PM. Déjanos tu mensaje y te responderemos a primera hora.`
      );

      setIsHandoffEnabled(botCfg?.isHandoffEnabled ?? true);
      setHandoffToHumanMessage(
        botCfg?.handoffToHumanMessage ||
          `He notificado al Administrador de turno. Un operador humano te responderá en este chat a la brevedad.`
      );

      setIsOrderConfirmedEnabled(botCfg?.isOrderConfirmedEnabled ?? true);
      setOrderConfirmedMessage(
        botCfg?.orderConfirmedMessage ||
          `¡Comanda #{numero_pedido} confirmada e ingresada a cocina! Tiempo estimado de preparación y entrega: 25 a 35 minutos. ¡Muchas gracias por tu compra!`
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
        setLogoUrl(reader.result as string);
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
      whatsappBotConfig: {
        isWelcomeEnabled,
        welcomeMessage,
        isPaymentInfoEnabled,
        paymentInfoMessage,
        nequiNumber,
        bancolombiaAccount,
        accountHolder,
        isClosedHoursEnabled,
        closedHoursMessage,
        isHandoffEnabled,
        handoffToHumanMessage,
        isOrderConfirmedEnabled,
        orderConfirmedMessage,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-[#190088]/5 via-[#EFE6D3]/20 to-transparent dark:from-[#190088]/20 dark:via-zinc-900/50 dark:to-zinc-900/50 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#190088] text-white flex items-center justify-center shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#190088] dark:text-[#EFE6D3] flex items-center gap-2">
                <span>{business?.id ? "Configuración de Sede" : "Crear Nueva Franquicia / Sucursal"}</span>
                {business?.name && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#190088]/10 dark:bg-[#190088]/30 text-[#190088] dark:text-blue-200 border border-[#190088]/20">
                    {business.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {business?.id
                  ? "Ajusta la marca, imágenes, respuestas automáticas de WhatsApp y parámetros operativos."
                  : "Registra una nueva marca o punto de venta para operar en tiempo real."}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            intent="business.settings.close"
            onClick={onClose}
            className="p-0 w-9 h-9 rounded-2xl text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body Container with Sidebar and Main Panel */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Vertical Sub-Navigation */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800/80 p-3 sm:p-4 bg-zinc-50/40 dark:bg-zinc-900/40 flex-none overflow-y-auto space-y-1">
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
                label: "Bot WhatsApp & Pagos",
                desc: "Respuestas, Nequi y QR",
                icon: Bot,
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
                  className={`w-full p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-2.5 group ${
                    isActive
                      ? "bg-[#190088]/10 dark:bg-[#190088]/25 text-[#190088] dark:text-blue-200 shadow-xs border border-[#190088]/30 dark:border-[#190088]/50 font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 hover:text-[#190088] dark:hover:text-blue-300 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-none mt-0.5 transition-colors ${
                      isActive
                        ? "bg-[#190088] text-white shadow-2xs"
                        : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 group-hover:text-[#190088] dark:group-hover:text-blue-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight truncate ${isActive ? "text-[#190088] dark:text-blue-200" : ""}`}>{tab.label}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-normal">
                      {tab.desc}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Right Main Content Area */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* TAB 1: GENERAL & IDENTITY */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3]">
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
                    placeholder="Ej: Necto Gourmet — Sede Principal"
                  />

                  {/* Modelo de Operación */}
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
                                ? "bg-[#190088] text-white border-[#190088] shadow-sm font-bold"
                                : "bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#190088]/40"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? "text-[#FF3F1A]" : "text-[#190088] dark:text-blue-400"}`} />
                            <span className="text-xs font-bold leading-tight">{archetype.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-zinc-400"}`}>
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
                      onChange={e => {
                        const newCountry = e.target.value;
                        setCountry(newCountry);
                        const countryCities = CITIES_BY_COUNTRY[newCountry] || [];
                        if (countryCities.length > 0 && !countryCities.includes(city)) {
                          setCity(countryCities[0]);
                        }
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
                      label="Ciudad / Zona"
                      intent="business.city"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      options={(() => {
                        const currentCities = CITIES_BY_COUNTRY[country] || CITIES_BY_COUNTRY["Colombia"] || [];
                        const list = (city && !currentCities.includes(city))
                          ? [city, ...currentCities]
                          : currentCities;
                        return list.map(c => ({ value: c, label: c }));
                      })()}
                    />

                    <Select
                      label="Moneda Base"
                      intent="business.currency"
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      options={[
                        { value: "COP", label: "COP ($ Colombia)" },
                        { value: "USD", label: "USD ($ Dólares)" },
                        { value: "MXN", label: "MXN ($ México)" },
                        { value: "ARS", label: "ARS ($ Argentina)" },
                      ]}
                    />
                  </div>

                  {/* Slug y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Identificador / Slug URL
                      </label>
                      <div className="flex items-center px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:border-[#FF3F1A]">
                        <span className="text-zinc-400 select-none">necto.app/</span>
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

            {/* TAB 2: BRANDING, LOGO & PORTADA (Con controles de Ángulo, Zoom y Posición) */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3] flex items-center gap-2">
                    <span>Personalización de Logo & Portada</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#190088]/10 text-[#190088] dark:bg-[#190088]/30 dark:text-blue-200 border border-[#190088]/20">
                      Controles de Ángulo & Encuadre
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Modifica la rotación, el zoom y la posición de tus fotos para que se acomoden exactamente como querés.
                  </p>
                </div>

                {/* 1. Logotipo con Canvas Studio Táctil */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 space-y-5 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#FF3F1A]" />
                        <span>Logotipo / Isotipo de la Marca</span>
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Visible en la barra lateral, comandas, recibos y avatar principal de tu negocio.
                      </p>
                    </div>

                    {logoUrl && (
                      <Button
                        variant="ghost"
                        intent="business.logo.remove"
                        onClick={() => {
                          setLogoUrl("");
                          setLogoRotate(0);
                          setLogoScale(1);
                          setLogoPosX(0);
                          setLogoPosY(0);
                        }}
                        className="p-0 text-xs text-red-500 hover:text-red-700 hover:bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#190088] text-white text-xs font-bold hover:bg-[#14006e] transition-all cursor-pointer shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoUrl ? "Reemplazar Imagen de Logo" : "Subir Logotipo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {logoUrl ? (
                      <div className="p-5 bg-zinc-50 dark:bg-[#0E0F12] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 space-y-4">
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
                      <div className="w-full h-44 rounded-3xl bg-zinc-50 dark:bg-[#0E0F12] border-2 border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
                        <Camera className="w-8 h-8 mb-1.5" />
                        <span className="text-xs font-bold">Sin Logotipo Cargado</span>
                        <span className="text-[11px] text-zinc-500 mt-0.5">Subí una imagen cuadrada o PNG para encuadrarla en el visor</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Banner de Portada con Canvas Studio Táctil */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-zinc-800/90 space-y-5 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#FF3F1A]" />
                        <span>Banner de Portada Panorámico</span>
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Fondo panorámico que viste la cabecera de pedidos en vivo, menú digital y tarjetas de sucursal.
                      </p>
                    </div>

                    {bannerUrl && (
                      <Button
                        variant="ghost"
                        intent="business.banner.remove"
                        onClick={() => {
                          setBannerUrl("");
                          setBannerRotate(0);
                          setBannerScale(1);
                          setBannerPosX(0);
                          setBannerPosY(0);
                        }}
                        className="p-0 text-xs text-red-500 hover:text-red-700 hover:bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Portada</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#190088] text-white text-xs font-bold hover:bg-[#14006e] transition-all cursor-pointer shadow-xs">
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
                      <div className="p-5 bg-zinc-50 dark:bg-[#0E0F12] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 space-y-4">
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
                      <div className="w-full h-44 rounded-3xl bg-zinc-50 dark:bg-[#0E0F12] border-2 border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 text-center p-4">
                        <Camera className="w-8 h-8 mb-1.5" />
                        <span className="text-xs font-bold">Sin Imagen de Portada</span>
                        <span className="text-[11px] text-zinc-500 mt-0.5">Subí una foto panorámica para encuadrarla y rotarla en vivo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BOT DE WHATSAPP & MENSAJES AUTOMÁTICOS */}
            {activeTab === "whatsapp_bot" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3] flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#00A884]" />
                    <span>Mensajes Automáticos del Bot de WhatsApp</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configura las respuestas automáticas, cuentas de transferencia (Nequi / Bancolombia) y mensajes fuera de horario.
                  </p>
                </div>

                {/* 1. Mensaje de Bienvenida */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>1. Saludo Inicial / Bienvenida</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.2 rounded-full font-bold">
                          Al escribir por primera vez
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        El bot saluda automáticamente y ofrece las opciones del menú.
                      </p>
                    </div>

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

                {/* 2. Cuentas de Transferencia & Pago (Nequi / Bancolombia / QR) */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <span>2. Datos de Transferencia & Pagos (Nequi / Bancolombia)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Información bancaria que el bot envía cuando el cliente pide pagar por transferencia o QR.
                      </p>
                    </div>

                    <Toggle
                      intent="bot.payment.toggle"
                      checked={isPaymentInfoEnabled}
                      onChange={setIsPaymentInfoEnabled}
                    />
                  </div>

                  {isPaymentInfoEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field
                          label="Número Nequi / Daviplata"
                          labelStyle="bold"
                          intent="bot.nequi"
                          type="text"
                          value={nequiNumber}
                          onChange={e => setNequiNumber(e.target.value)}
                          placeholder="310 987 6543"
                        />
                        <Field
                          label="Cuenta Bancolombia"
                          labelStyle="bold"
                          intent="bot.bancolombia"
                          type="text"
                          value={bancolombiaAccount}
                          onChange={e => setBancolombiaAccount(e.target.value)}
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
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          Mensaje que enviará el Bot:
                        </label>
                        <Textarea
                          intent="bot.payment.text"
                          rows={4}
                          value={paymentInfoMessage}
                          onChange={e => setPaymentInfoMessage(e.target.value)}
                          placeholder="Mensaje con las instrucciones de pago..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Fuera de Horario */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>3. Mensaje Fuera de Horario / Local Cerrado</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Se envía automáticamente cuando un comensal escribe fuera del horario de cocina.
                      </p>
                    </div>

                    <Toggle
                      intent="bot.closed.toggle"
                      checked={isClosedHoursEnabled}
                      onChange={setIsClosedHoursEnabled}
                    />
                  </div>

                  {isClosedHoursEnabled && (
                    <Textarea
                      intent="bot.closed.text"
                      rows={3}
                      value={closedHoursMessage}
                      onChange={e => setClosedHoursMessage(e.target.value)}
                      placeholder="Mensaje de local cerrado..."
                    />
                  )}
                </div>

                {/* 4. Derivación a Humano */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>4. Notificación de Derivación a Operador Humano</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Avisa al cliente que su caso fue transferido a un administrador en vivo.
                      </p>
                    </div>

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
                      placeholder="Mensaje de derivación..."
                    />
                  )}
                </div>

                {/* 5. Confirmación de Pedido y Despacho a Cocina */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>5. Confirmación de Pedido Ingresado a Cocina</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Mensaje enviado al comensal cuando el ticket entra al KDS.
                      </p>
                    </div>

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
              </div>
            )}

            {/* TAB 4: MÓDULOS OPERATIVOS */}
            {activeTab === "modules" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3]">
                    Módulos Operativos de la Sede
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Activa o desactiva las capacidades del sistema según el modelo de tu restaurante.
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
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isChecked
                            ? "bg-[#190088]/5 dark:bg-[#190088]/20 border-[#190088] dark:border-[#190088]/70 shadow-xs"
                            : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${
                              isChecked
                                ? "bg-[#190088] text-white shadow-2xs"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {mod.title}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                {mod.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
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

            {/* TAB 5: CANALES DE VENTA */}
            {activeTab === "channels" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3]">
                    Canales de Venta & Captura de Pedidos
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Habilita por dónde pueden ingresar comandas a tu cocina.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "whatsapp",
                      title: "WhatsApp con Asistente IA",
                      desc: "Toma de pedidos conversacional automatizada.",
                      checked: enableWhatsapp,
                      setter: setEnableWhatsapp,
                      icon: MessageSquare,
                    },
                    {
                      id: "web",
                      title: "Menú Digital & Tienda Web",
                      desc: "Catálogo interactivo online con carrito de compras.",
                      checked: enableWeb,
                      setter: setEnableWeb,
                      icon: Globe,
                    },
                    {
                      id: "pos",
                      title: "Punto de Venta POS & Salón",
                      desc: "Comandas presenciales y cobro en mostrador.",
                      checked: enablePos,
                      setter: setEnablePos,
                      icon: Store,
                    },
                  ].map(ch => {
                    const Icon = ch.icon;
                    return (
                      <div
                        key={ch.id}
                        className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[#FF3F1A]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {ch.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{ch.desc}</p>
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

            {/* TAB 6: PAUSA & VACACIONES */}
            {activeTab === "schedule" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3]">
                    Pausa Temporal & Modo Vacaciones
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Suspende la recepción de nuevos pedidos y responde con un mensaje cordial.
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Activar Cierre Temporal del Negocio
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Pausa el canal de WhatsApp y el catálogo digital.
                      </p>
                    </div>

                    <Toggle
                      intent="business.pause.toggle"
                      checked={isPaused}
                      onChange={setIsPaused}
                    />
                  </div>

                  {isPaused && (
                    <div className="space-y-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Motivo del Cierre
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Vacaciones Colectivas",
                            "Mantenimiento en Cocina",
                            "Evento Privado",
                            "Feriado / Asueto",
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
                                  ? "bg-[#190088] text-white border-[#190088] font-bold shadow-2xs"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-[#190088]/40"
                              }`}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Mensaje de Respuesta Automática
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

            {/* TAB 7: OPERACIONES & PELIGRO */}
            {activeTab === "advanced" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#190088] dark:text-[#EFE6D3]">
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
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-300">
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
                        className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-xs flex-none cursor-pointer"
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
                          className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-xs cursor-pointer"
                        >
                          Sí, eliminar negocio
                        </Button>
                        <Button
                          variant="outline"
                          intent="business.delete.cancel"
                          onClick={() => setConfirmDelete(false)}
                          className="py-2.5 px-4 bg-white dark:bg-zinc-800 text-xs cursor-pointer"
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
            className="py-2.5 px-5 text-xs cursor-pointer"
          >
            Descartar
          </Button>
          <Button
            variant="accent"
            intent="business.save"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-2xl text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold cursor-pointer shadow-md"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
