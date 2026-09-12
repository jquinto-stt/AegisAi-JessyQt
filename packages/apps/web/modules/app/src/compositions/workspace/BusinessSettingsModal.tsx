import React, { useState, useEffect } from "react";
import {
  useBusiness,
  BusinessInstance,
  BusinessType,
  BotPersonality,
  SoundAlertKey,
} from "../../context/BusinessContext";
import {
  Check,
  ArrowRight,
  Store,
  UtensilsCrossed,
  MessageSquare,
  Globe,
  Camera,
  CreditCard,
  SlidersHorizontal,
  Upload,
  AlertTriangle,
  Smartphone,
  Bot,
  Volume2,
  Clock,
  Sparkles,
  UserCheck,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Headphones,
  FileText,
  CheckCircle2,
  ListChecks,
  Share2,
} from "lucide-react";
import { Button, Field, Toggle } from "@/elements";

export type SettingsTabKey =
  | "general"
  | "channels"
  | "whatsapp_bot"
  | "payments"
  | "branding"
  | "operations";

export const BusinessSettingsModal: React.FC<{
  business: BusinessInstance | null;
  isOpen: boolean;
  onClose: () => void;
  isCreateMode?: boolean;
  initialTab?: string;
}> = ({ business, isOpen, onClose, isCreateMode = false, initialTab = "general" }) => {
  const { updateBusiness, deleteBusiness, createBusiness, setUserAvatarUrl } = useBusiness();

  // Mapeo seguro de pestañas para no romper ningún enlace externo
  const resolveTab = (tab?: string): SettingsTabKey => {
    if (!tab) return "general";
    if (tab === "channels") return "channels";
    if (tab === "whatsapp_bot") return "whatsapp_bot";
    if (tab === "payments") return "payments";
    if (tab === "branding") return "branding";
    if (tab === "operations" || tab === "pedidos" || tab === "schedule" || tab === "advanced") return "operations";
    return "general";
  };

  const [activeTab, setActiveTab] = useState<SettingsTabKey>(resolveTab(initialTab));

  // 1. General & Ubicación
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant_virtual");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Horarios de Atención Semanal
  const [openingDays, setOpeningDays] = useState("Lunes a Sábado");
  const [openingHours, setOpeningHours] = useState("10:00 - 22:00");

  // Modalidades de servicio
  const [serviceDelivery, setServiceDelivery] = useState(true);
  const [serviceTakeaway, setServiceTakeaway] = useState(true);
  const [serviceDineIn, setServiceDineIn] = useState(false);

  // 2. Canales de Entrada
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const [isWhatsAppWidgetEnabled, setIsWhatsAppWidgetEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_widget_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // 3. Sub-navegación y Configuración del Asistente de WhatsApp IA (Capa de Inteligencia)
  const [botSubTab, setBotSubTab] = useState<
    "identity" | "knowledge" | "intents" | "orders_oms" | "handoff" | "hours" | "experience"
  >("identity");

  // 3.1 Identidad & Comportamiento
  const [botName, setBotName] = useState("Necto Bot");
  const [botTone, setBotTone] = useState<"cálido" | "profesional" | "ágil" | "técnico">("cálido");
  const [botPersonality, setBotPersonality] = useState<BotPersonality>("amigable");
  const [responseStyle, setResponseStyle] = useState<"claro" | "conciso" | "extenso">("conciso");
  const [emojiFrequency, setEmojiFrequency] = useState<"nunca" | "moderado" | "frecuente">("moderado");

  // 3.2 Conocimiento del Negocio
  const [knowsCatalog, setKnowsCatalog] = useState(true);
  const [knowsBusinessInfo, setKnowsBusinessInfo] = useState(true);
  const [knowsFaq, setKnowsFaq] = useState(true);
  const [knowsPolicies, setKnowsPolicies] = useState(true);
  const [knowsInventoryQuery, setKnowsInventoryQuery] = useState(true);

  // 3.3 Comportamiento Conversacional (Intenciones Soportadas)
  const [intentCatalog, setIntentCatalog] = useState(true);
  const [intentPrice, setIntentPrice] = useState(true);
  const [intentStock, setIntentStock] = useState(true);
  const [intentCreateOrder, setIntentCreateOrder] = useState(true);
  const [intentTrackOrder, setIntentTrackOrder] = useState(true);
  const [intentModifyOrder, setIntentModifyOrder] = useState(false);
  const [intentCancelOrder, setIntentCancelOrder] = useState(false);
  const [intentHoursLocation, setIntentHoursLocation] = useState(true);
  const [intentHumanAgent, setIntentHumanAgent] = useState(true);

  // 3.4 Reglas de Creación y Confirmación de Pedidos (Relación con el OMS)
  const [orderCreationMode, setOrderCreationMode] = useState<"auto_new" | "interactive_confirm" | "human_review">("interactive_confirm");
  const [isAutoConfirmOrders, setIsAutoConfirmOrders] = useState(true);
  const [autoConfirmMaxAmount, setAutoConfirmMaxAmount] = useState(100000);
  const [autoConfirmRequireStock, setAutoConfirmRequireStock] = useState(true);
  const [autoConfirmRequireCompleteData, setAutoConfirmRequireCompleteData] = useState(true);
  const [autoConfirmExcludeRestricted, setAutoConfirmExcludeRestricted] = useState(true);

  // 3.5 Handoff a Humano
  const [isHandoffEnabled, setIsHandoffEnabled] = useState(true);
  const [handoffToHumanMessage, setHandoffToHumanMessage] = useState(
    "Un asesor de nuestro equipo se comunicará contigo por este chat en breves minutos."
  );
  const [handoffTriggerUserRequest, setHandoffTriggerUserRequest] = useState(true);
  const [handoffTriggerUnhandled, setHandoffTriggerUnhandled] = useState(true);
  const [handoffTriggerUnhappy, setHandoffTriggerUnhappy] = useState(true);
  const [handoffTriggerOutOfStock, setHandoffTriggerOutOfStock] = useState(true);
  const [handoffTriggerHighAmount, setHandoffTriggerHighAmount] = useState(false);
  const [handoffTriggerRequiresAuth, setHandoffTriggerRequiresAuth] = useState(false);
  const [handoffTarget, setHandoffTarget] = useState<"general" | "sales" | "support" | "ops">("general");
  const [handoffBehavior, setHandoffBehavior] = useState<"pause_ia" | "assist_agent" | "resume_on_finish">("pause_ia");

  // 3.6 Horarios y Disponibilidad del Asistente
  const [isWelcomeEnabled, setIsWelcomeEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "¡Hola! Te damos la bienvenida a nuestro canal de WhatsApp. ¿En qué podemos asesorarte hoy?"
  );
  const [isClosedHoursEnabled, setIsClosedHoursEnabled] = useState(true);
  const [closedHoursMessage, setClosedHoursMessage] = useState(
    "En este momento nuestro equipo humano está fuera de horario. Nuestro asistente puede tomar tu pedido y será preparado a primera hora."
  );
  const [allowOrdersOutsideHours, setAllowOrdersOutsideHours] = useState(true);

  // 3.7 Experiencia Conversacional del Cliente
  const [expShowCatalogCards, setExpShowCatalogCards] = useState(true);
  const [expShowCategories, setExpShowCategories] = useState(true);
  const [expShowPictures, setExpShowPictures] = useState(true);
  const [expShowPrices, setExpShowPrices] = useState(true);
  const [expInlineCart, setExpInlineCart] = useState(true);
  const [expPreConfirmationSummary, setExpPreConfirmationSummary] = useState(true);

  const [isOrderConfirmedEnabled, setIsOrderConfirmedEnabled] = useState(true);
  const [orderConfirmedMessage, setOrderConfirmedMessage] = useState(
    "¡Tu orden ha sido confirmada con éxito y entra a preparación!"
  );
  const [isDelayAlertEnabled, setIsDelayAlertEnabled] = useState(true);
  const [delayAlertMinutes, setDelayAlertMinutes] = useState(15);

  // 4. Cuentas & Pagos
  const [nequiNumber, setNequiNumber] = useState("");
  const [daviplataNumber, setDaviplataNumber] = useState("");
  const [bancolombiaAccount, setBancolombiaAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNit, setAccountNit] = useState("");
  const [allowCashOnDelivery, setAllowCashOnDelivery] = useState(true);
  const [allowCardTerminal, setAllowCardTerminal] = useState(true);

  // 5. Marca & Identidad Visual
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#FF3F1A");
  const [soundAlert, setSoundAlert] = useState<SoundAlertKey>("bell");

  // 6. Operaciones & Sede
  const [isPreparacionEnabled, setIsPreparacionEnabled] = useState<boolean>(true);
  const [kitchenBufferMin, setKitchenBufferMin] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("Vacaciones o Mantenimiento");
  const [pauseMessage, setPauseMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Cargar datos al montar/abrir
  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveTab(initialTab));
    }

    if (business && isOpen) {
      setName(business.name || "");
      setSlug(business.slug || "");
      setBusinessType(business.businessType || "restaurant_virtual");
      setCurrency(business.currency || "COP");
      setCity(business.city || "");
      setCountry(business.country || "Colombia");
      setContactPhone(business.contactPhone || "");
      setContactEmail(business.contactEmail || "");

      // Canales de Entrada
      let initialWhatsapp = business.channels?.whatsapp ?? true;
      try {
        const savedWhatsapp = localStorage.getItem("necto_whatsapp_channel_enabled");
        if (savedWhatsapp !== null) initialWhatsapp = JSON.parse(savedWhatsapp);
      } catch (e) {}
      setEnableWhatsapp(initialWhatsapp);
      setEnableWeb(business.channels?.web ?? true);
      setEnablePos(business.channels?.pos ?? true);

      // Bot de WhatsApp & Reglas
      const botCfg = business.whatsappBotConfig;
      if (botCfg) {
        setBotPersonality(botCfg.botPersonality || "amigable");
        if (botCfg.botName) setBotName(botCfg.botName);
        if (botCfg.botTone) setBotTone(botCfg.botTone);
        if (botCfg.responseStyle) setResponseStyle(botCfg.responseStyle);
        if (botCfg.emojiFrequency) setEmojiFrequency(botCfg.emojiFrequency);

        // 2. Fuentes de Conocimiento
        if (botCfg.knowledgeSources) {
          setKnowsCatalog(botCfg.knowledgeSources.catalog ?? true);
          setKnowsBusinessInfo(botCfg.knowledgeSources.businessInfo ?? true);
          setKnowsFaq(botCfg.knowledgeSources.faq ?? true);
          setKnowsPolicies(botCfg.knowledgeSources.policies ?? true);
          setKnowsInventoryQuery(botCfg.knowledgeSources.inventoryQuery ?? true);
        }

        // 3. Intenciones
        if (botCfg.supportedIntents) {
          setIntentCatalog(botCfg.supportedIntents.catalog ?? true);
          setIntentPrice(botCfg.supportedIntents.price ?? true);
          setIntentStock(botCfg.supportedIntents.stock ?? true);
          setIntentCreateOrder(botCfg.supportedIntents.createOrder ?? true);
          setIntentTrackOrder(botCfg.supportedIntents.trackOrder ?? true);
          setIntentModifyOrder(botCfg.supportedIntents.modifyOrder ?? false);
          setIntentCancelOrder(botCfg.supportedIntents.cancelOrder ?? false);
          setIntentHoursLocation(botCfg.supportedIntents.hoursLocation ?? true);
          setIntentHumanAgent(botCfg.supportedIntents.humanAgent ?? true);
        }

        // 4. Reglas OMS
        if (botCfg.orderCreationMode) setOrderCreationMode(botCfg.orderCreationMode);
        if (botCfg.autoConfirmCriteria) {
          setAutoConfirmMaxAmount(botCfg.autoConfirmCriteria.maxAmount ?? 100000);
          setAutoConfirmRequireStock(botCfg.autoConfirmCriteria.requireStock ?? true);
          setAutoConfirmRequireCompleteData(botCfg.autoConfirmCriteria.requireCompleteData ?? true);
          setAutoConfirmExcludeRestricted(botCfg.autoConfirmCriteria.excludeRestricted ?? true);
        } else if (botCfg.autoConfirmMaxAmount) {
          setAutoConfirmMaxAmount(botCfg.autoConfirmMaxAmount);
        }

        // 5. Handoff
        if (botCfg.handoffTriggers) {
          setHandoffTriggerUserRequest(botCfg.handoffTriggers.userRequest ?? true);
          setHandoffTriggerUnhandled(botCfg.handoffTriggers.unhandledQuery ?? true);
          setHandoffTriggerUnhappy(botCfg.handoffTriggers.unhappyCustomer ?? true);
          setHandoffTriggerOutOfStock(botCfg.handoffTriggers.outOfStock ?? true);
          setHandoffTriggerHighAmount(botCfg.handoffTriggers.highAmount ?? false);
          setHandoffTriggerRequiresAuth(botCfg.handoffTriggers.requiresApproval ?? false);
        }
        if (botCfg.handoffTarget) setHandoffTarget(botCfg.handoffTarget);
        if (botCfg.handoffBehavior) setHandoffBehavior(botCfg.handoffBehavior);

        // 6. Horarios
        if (botCfg.allowOrdersOutsideHours !== undefined) {
          setAllowOrdersOutsideHours(botCfg.allowOrdersOutsideHours);
        }

        // 7. Experiencia
        if (botCfg.customerExperience) {
          setExpShowCatalogCards(botCfg.customerExperience.showCatalogCards ?? true);
          setExpShowCategories(botCfg.customerExperience.showCategories ?? true);
          setExpShowPictures(botCfg.customerExperience.showPictures ?? true);
          setExpShowPrices(botCfg.customerExperience.showPrices ?? true);
          setExpInlineCart(botCfg.customerExperience.inlineCart ?? true);
          setExpPreConfirmationSummary(botCfg.customerExperience.preConfirmationSummary ?? true);
        }

        setIsWelcomeEnabled(botCfg.isWelcomeEnabled ?? true);
        if (botCfg.welcomeMessage) setWelcomeMessage(botCfg.welcomeMessage);
        setIsClosedHoursEnabled(botCfg.isClosedHoursEnabled ?? true);
        if (botCfg.closedHoursMessage) setClosedHoursMessage(botCfg.closedHoursMessage);
        setIsHandoffEnabled(botCfg.isHandoffEnabled ?? true);
        if (botCfg.handoffToHumanMessage) setHandoffToHumanMessage(botCfg.handoffToHumanMessage);
        setIsOrderConfirmedEnabled(botCfg.isOrderConfirmedEnabled ?? true);
        if (botCfg.orderConfirmedMessage) setOrderConfirmedMessage(botCfg.orderConfirmedMessage);

        setIsAutoConfirmOrders(botCfg.isAutoConfirmOrders ?? true);
        setIsDelayAlertEnabled(botCfg.isDelayAlertEnabled ?? true);
        if (botCfg.delayAlertMinutes) setDelayAlertMinutes(botCfg.delayAlertMinutes);

        // Pagos
        setNequiNumber(botCfg.nequiNumber || "");
        setDaviplataNumber(botCfg.daviplataNumber || "");
        setBancolombiaAccount(botCfg.bancolombiaAccount || "");
        setAccountHolder(botCfg.accountHolder || "");
        setAccountNit(botCfg.accountNit || "");
        setAllowCashOnDelivery(botCfg.allowCashOnDelivery ?? true);
        setAllowCardTerminal(botCfg.allowCardTerminal ?? true);
      }

      // Marca
      setLogoUrl(business.logoUrl || "");
      setBannerUrl(business.bannerUrl || "");
      setBrandColor(business.brandColor || "#FF3F1A");
      setSoundAlert(business.soundAlert || "bell");

      // Operaciones
      setIsPreparacionEnabled(business.isPreparacionEnabled ?? true);
      setKitchenBufferMin(business.kitchenBufferMin ?? 20);
      setIsPaused(business.pauseConfig?.isPaused ?? false);
      setPauseReason(business.pauseConfig?.reason || "Vacaciones o Mantenimiento");
      setPauseMessage(business.pauseConfig?.autoReplyMessage || "");
      setConfirmDelete(false);
    }
  }, [business, isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setLogoUrl(res);
        setUserAvatarUrl(res);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (logoUrl) {
      setUserAvatarUrl(logoUrl);
    }

    const payload: Partial<BusinessInstance> = {
      name: name.trim(),
      slug: (slug.trim() || name.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      businessType,
      city: city.trim(),
      country: country.trim(),
      currency,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      logoUrl: logoUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      brandColor,
      soundAlert,
      kitchenBufferMin,
      isPreparacionEnabled,
      channels: {
        whatsapp: enableWhatsapp,
        web: enableWeb,
        pos: enablePos,
      },
      whatsappBotConfig: {
        ...business?.whatsappBotConfig,
        botName,
        botTone,
        botPersonality,
        responseStyle,
        emojiFrequency,
        knowledgeSources: {
          catalog: knowsCatalog,
          businessInfo: knowsBusinessInfo,
          faq: knowsFaq,
          policies: knowsPolicies,
          inventoryQuery: knowsInventoryQuery,
        },
        supportedIntents: {
          catalog: intentCatalog,
          price: intentPrice,
          stock: intentStock,
          createOrder: intentCreateOrder,
          trackOrder: intentTrackOrder,
          modifyOrder: intentModifyOrder,
          cancelOrder: intentCancelOrder,
          hoursLocation: intentHoursLocation,
          humanAgent: intentHumanAgent,
        },
        orderCreationMode,
        autoConfirmCriteria: {
          maxAmount: autoConfirmMaxAmount,
          requireStock: autoConfirmRequireStock,
          requireCompleteData: autoConfirmRequireCompleteData,
          excludeRestricted: autoConfirmExcludeRestricted,
        },
        handoffTriggers: {
          userRequest: handoffTriggerUserRequest,
          unhandledQuery: handoffTriggerUnhandled,
          unhappyCustomer: handoffTriggerUnhappy,
          outOfStock: handoffTriggerOutOfStock,
          highAmount: handoffTriggerHighAmount,
          requiresApproval: handoffTriggerRequiresAuth,
        },
        handoffTarget,
        handoffBehavior,
        allowOrdersOutsideHours,
        customerExperience: {
          showCatalogCards: expShowCatalogCards,
          showCategories: expShowCategories,
          showPictures: expShowPictures,
          showPrices: expShowPrices,
          inlineCart: expInlineCart,
          preConfirmationSummary: expPreConfirmationSummary,
        },
        isWelcomeEnabled,
        welcomeMessage,
        isClosedHoursEnabled,
        closedHoursMessage,
        isHandoffEnabled,
        handoffToHumanMessage,
        isOrderConfirmedEnabled,
        orderConfirmedMessage,
        isAutoConfirmOrders,
        autoConfirmMaxAmount,
        isDelayAlertEnabled,
        delayAlertMinutes,
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
        reason: pauseReason,
        autoReplyMessage: pauseMessage,
      },
    };

    if (business && business.id && business.id !== "new") {
      updateBusiness(business.id, payload);
    } else {
      createBusiness(payload as any);
    }

    onClose();
  };

  const handleDelete = () => {
    if (business?.id) {
      deleteBusiness(business.id);
    }
    onClose();
  };

  const configuredChannelsCount = (enableWhatsapp ? 1 : 0) + (enableWeb ? 1 : 0) + (enablePos ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col font-sans animate-fade-in overflow-hidden">
      {/* ── Header ── */}
      <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-6 flex items-center justify-between flex-none z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Volver</span>
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-800" />

          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            {business?.id ? "Configuración de Sede" : "Nueva Sede"}
          </h1>
          {business?.name && (
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {business.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 text-sm font-medium shadow-theme-xs transition-colors cursor-pointer disabled:bg-brand-300"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </header>

      {/* ── Layout ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] py-4 px-3 flex-none overflow-y-auto space-y-0.5">
          {[
            { id: "general" as const, label: "General", icon: Store },
            { id: "channels" as const, label: "Canales de Entrada", icon: MessageSquare },
            {
              id: "whatsapp_bot" as const,
              label: "Asistente WhatsApp IA",
              icon: Bot,
              badge: enableWhatsapp ? undefined : "Off",
            },
            { id: "payments" as const, label: "Pagos", icon: CreditCard },
            { id: "branding" as const, label: "Marca & Visual", icon: Camera },
            { id: "operations" as const, label: "Operaciones", icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between gap-2 text-sm ${
                  isActive
                    ? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-gray-200 font-medium"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] flex-none ${
                      isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400"
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 flex-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <form onSubmit={handleSave} className="max-w-2xl mx-auto py-8 px-6 space-y-8">

            {/* ── TAB 1: GENERAL & UBICACIÓN ── */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    General & Ubicación
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Identidad comercial, dirección física y modalidades de servicio de la sede.
                  </p>
                </div>

                {/* Tarjeta Identidad */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Identidad Comercial
                  </h3>

                  <Field
                    label="Nombre Comercial de la Sede"
                    labelStyle="bold"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Necto Gourmet — Sede Central"
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Enlace Web de la Tienda (Slug)
                    </label>
                    <div className="flex items-center px-3.5 py-2.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus-within:border-brand-500 transition-colors">
                      <span className="text-gray-400 select-none  text-xs">necto.app/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                        placeholder="mi-tienda"
                        className="flex-1 bg-transparent  font-bold text-gray-900 dark:text-white focus:outline-none ml-1 lowercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Modelo de Operación Principal
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "restaurant_virtual", label: "Gastronomía", desc: "Cocina & Mesa", icon: UtensilsCrossed },
                        { id: "retail_store", label: "Comercio & Retail", desc: "Stock & Mostrador", icon: Store },
                        { id: "services", label: "Servicios & Citas", desc: "Citas & Agenda", icon: SlidersHorizontal },
                      ].map((item) => {
                        const isSelected = businessType === item.id;
                        const Icon = item.icon;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setBusinessType(item.id as BusinessType)}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                              isSelected
                                ? "border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 ring-1 ring-brand-500"
                                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${isSelected ? "text-brand-600" : "text-gray-400"}`} />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{item.label}</span>
                            </div>
                            <span className="text-xs text-gray-500">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tarjeta Ubicación Física & Horarios */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Ubicación & Horarios de Atención
                  </h3>

                  <Field
                    label="Dirección Física Exacta"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej: Carrera 43A # 1-50, Local 201"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field
                      label="Ciudad"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Medellín, Bogotá..."
                    />
                    <Field
                      label="País"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Colombia"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-900 dark:text-white">
                        Moneda Operativa
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                      >
                        <option value="COP">COP ($ Pesos Colombianos)</option>
                        <option value="USD">USD ($ Dólares)</option>
                        <option value="MXN">MXN ($ Pesos Mexicanos)</option>
                        <option value="ARS">ARS ($ Pesos Argentinos)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Field
                      label="Días de Operación"
                      type="text"
                      value={openingDays}
                      onChange={(e) => setOpeningDays(e.target.value)}
                      placeholder="Ej: Lunes a Sábado"
                    />
                    <Field
                      label="Horario Habitual"
                      type="text"
                      value={openingHours}
                      onChange={(e) => setOpeningHours(e.target.value)}
                      placeholder="Ej: 11:00 - 22:00"
                    />
                  </div>

                  {/* Modalidades de Entrega */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Modalidades de Servicio Habilitadas
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Envíos a Domicilio</span>
                        <Toggle intent="service.delivery" checked={serviceDelivery} onChange={setServiceDelivery} />
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Retiro en Tienda</span>
                        <Toggle intent="service.takeaway" checked={serviceTakeaway} onChange={setServiceTakeaway} />
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Consumo en Mesa</span>
                        <Toggle intent="service.dinein" checked={serviceDineIn} onChange={setServiceDineIn} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: CANALES DE ENTRADA ── */}
            {activeTab === "channels" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Canales de Entrada de la Sede
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Puntos de captura desacoplados. Las órdenes entran por estos canales al OMS.
                    </p>
                  </div>
                  <span className="text-xs  font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 self-start sm:self-auto">
                    {configuredChannelsCount} de 3 habilitados
                  </span>
                </div>

                <div className="space-y-4">
                  {/* WhatsApp Business */}
                  <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-none mt-0.5">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              WhatsApp Business
                            </h3>
                            <span
                              className={`text-xs  font-bold px-2 py-0.5 rounded-full border ${
                                enableWhatsapp
                                  ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              {enableWhatsapp ? "Canal Activo" : "Canal Inactivo"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Recepción conversacional de pedidos para clientes vía WhatsApp.
                          </p>
                          <p className="text-xs text-gray-500 ">
                            Teléfono vinculado: <strong className="text-gray-700 dark:text-gray-300">{contactPhone || "Sin asignar"}</strong>
                          </p>
                        </div>
                      </div>

                      <Toggle
                        intent="business.channel.toggle"
                        checked={enableWhatsapp}
                        onChange={(val) => {
                          setEnableWhatsapp(val);
                          try {
                            localStorage.setItem("necto_whatsapp_channel_enabled", JSON.stringify(val));
                            window.dispatchEvent(
                              new CustomEvent("necto_whatsapp_config_changed", {
                                detail: { channelEnabled: val, widgetEnabled: isWhatsAppWidgetEnabled },
                              })
                            );
                          } catch (e) {}
                          if (business?.id && business.id !== "new") {
                            updateBusiness(business.id, {
                              channels: {
                                ...business.channels,
                                whatsapp: val,
                              },
                            });
                          }
                        }}
                      />
                    </div>

                    {enableWhatsapp && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Widget Flotante en Pantalla
                          </p>
                          <p className="text-xs text-gray-500">
                            Muestra un botón de chat flotante en la interfaz de la tienda.
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Toggle
                            intent="business.whatsapp.widget.toggle"
                            checked={isWhatsAppWidgetEnabled}
                            onChange={(val) => {
                              setIsWhatsAppWidgetEnabled(val);
                              try {
                                localStorage.setItem("necto_whatsapp_widget_enabled", JSON.stringify(val));
                                window.dispatchEvent(
                                  new CustomEvent("necto_whatsapp_config_changed", {
                                    detail: { channelEnabled: enableWhatsapp, widgetEnabled: val },
                                  })
                                );
                              } catch (e) {}
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tienda Web */}
                  <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center flex-none mt-0.5">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              Tienda Web & Catálogo en Línea
                            </h3>
                            <span
                              className={`text-xs  font-bold px-2 py-0.5 rounded-full border ${
                                enableWeb
                                  ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
                                  : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              {enableWeb ? "En Línea" : "Desactivada"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Catálogo interactivo con checkout directo para compradores en la web.
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs  text-gray-700 dark:text-gray-300">
                            <Globe className="w-3 h-3 text-blue-500" />
                            <span>necto.app/{slug || name.toLowerCase().replace(/\s+/g, "-")}</span>
                          </div>
                        </div>
                      </div>

                      <Toggle
                        intent="business.channel.toggle"
                        checked={enableWeb}
                        onChange={setEnableWeb}
                      />
                    </div>
                  </div>

                  {/* POS / Mostrador */}
                  <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-3 shadow-theme-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center flex-none mt-0.5">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              POS / Mostrador Presencial
                            </h3>
                            <span className="text-xs  font-bold px-2 py-0.5 rounded-full border text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                              {enablePos ? "Habilitado" : "Deshabilitado"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Toma directa de comandas en local físico o salón. Funciona de manera autónoma sin requerir canales externos.
                          </p>
                        </div>
                      </div>

                      <Toggle
                        intent="business.channel.toggle"
                        checked={enablePos}
                        onChange={setEnablePos}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: ASISTENTE DE WHATSAPP IA (CAPA DE INTELIGENCIA) ── */}
            {activeTab === "whatsapp_bot" && (
              <div className="space-y-6 animate-fade-in">
                {/* Header & Arquitectura */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Asistente de WhatsApp IA
                      </h2>
                      <span className="text-xs  font-bold px-2 py-0.5 rounded-full border text-brand-600 bg-brand-500/10 border-brand-500/20">
                        Capa de Inteligencia
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Inteligencia conversacional desacoplada. Interpreta chats en WhatsApp y canaliza pedidos estructurados hacia el OMS.
                    </p>
                  </div>

                  {/* Estado de Integración */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs  font-semibold px-2 py-0.5 rounded-md border ${
                        enableWhatsapp
                          ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                          : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {enableWhatsapp ? "Canal Vinculado" : "Canal Inactivo"}
                    </span>
                    <span
                      className={`text-xs  font-semibold px-2 py-0.5 rounded-md border ${
                        business?.activeModules?.includes("inventarios")
                          ? "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20"
                          : "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      {business?.activeModules?.includes("inventarios") ? "Stock Vivo Activo" : "Catálogo Base"}
                    </span>
                  </div>
                </div>

                {!enableWhatsapp ? (
                  <div className="p-8 sm:p-12 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 text-center max-w-xl mx-auto space-y-5 shadow-theme-xs my-6">
                    <div className="w-16 h-16 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <Bot className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs  font-bold border border-amber-200 dark:border-amber-800">
                        Canal WhatsApp Inactivo
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        El Asistente IA requiere que WhatsApp Business esté Activo
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                        El Asistente IA no puede operar con el canal apagado: es la <strong>capa de inteligencia</strong> sobre WhatsApp Business. Para calibrar su identidad, fuentes de conocimiento de catálogo, reglas de pedidos y handoff, activa primero el canal.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEnableWhatsapp(true);
                          try {
                            localStorage.setItem("necto_whatsapp_channel_enabled", JSON.stringify(true));
                            window.dispatchEvent(
                              new CustomEvent("necto_whatsapp_config_changed", {
                                detail: { channelEnabled: true, widgetEnabled: isWhatsAppWidgetEnabled },
                              })
                            );
                          } catch (e) {}
                          if (business?.id && business.id !== "new") {
                            updateBusiness(business.id, {
                              channels: {
                                ...business.channels,
                                whatsapp: true,
                              },
                            });
                          }
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-theme-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Activar Canal WhatsApp Business</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("channels")}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Ver Canales de Entrada
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-6 -mx-6">
                      {/* Bot sub-nav — vertical sidebar */}
                      <nav className="w-44 flex-none space-y-0.5">
                        {[
                          { id: "identity" as const, label: "Identidad", icon: Bot },
                          { id: "knowledge" as const, label: "Conocimiento", icon: BookOpen },
                          { id: "intents" as const, label: "Intenciones", icon: ListChecks },
                          { id: "orders_oms" as const, label: "Reglas OMS", icon: ShoppingBag },
                          { id: "handoff" as const, label: "Handoff", icon: Headphones },
                          { id: "hours" as const, label: "Horarios", icon: Clock },
                          { id: "experience" as const, label: "Experiencia", icon: Sparkles },
                        ].map((sub) => {
                          const Icon = sub.icon;
                          const isActive = botSubTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setBotSubTab(sub.id)}
                              className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors flex items-center gap-2.5 cursor-pointer ${
                                isActive
                                  ? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-gray-200 font-medium"
                              }`}
                            >
                              <Icon className={`w-4 h-4 flex-none ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400"}`} />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </nav>

                      {/* Bot content area */}
                      <div className="flex-1 min-w-0">

                {/* ── ÁREA 1: IDENTIDAD & COMPORTAMIENTO ── */}
                {botSubTab === "identity" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                          Identidad del Asistente & Tono de Respuesta
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Define el nombre, personalidad y el estilo con el que interactuará con tus compradores.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                          label="Nombre del Asistente"
                          type="text"
                          value={botName}
                          onChange={(e) => setBotName(e.target.value)}
                          placeholder="Ej: Sofía de Necto"
                        />

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            Tono de Atención
                          </label>
                          <select
                            value={botTone}
                            onChange={(e) => setBotTone(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                          >
                            <option value="cálido">Cálido y Cercano</option>
                            <option value="profesional">Profesional & Ejecutivo</option>
                            <option value="ágil">Ágil & Directo</option>
                            <option value="técnico">Técnico & Especializado</option>
                          </select>
                        </div>
                      </div>

                      {/* Personalidad */}
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-gray-900 dark:text-white">
                          Personalidad Base
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          {[
                            { id: "amigable" as BotPersonality, label: "Amigable", desc: "Empático y servicial" },
                            { id: "ejecutivo" as BotPersonality, label: "Ejecutivo", desc: "Sobrio y corporativo" },
                            { id: "chef" as BotPersonality, label: "Especialista", desc: "Experto en producto" },
                            { id: "dinamico" as BotPersonality, label: "Dinámico", desc: "Rápido y proactivo" },
                          ].map((item) => {
                            const isSelected = botPersonality === item.id;
                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => setBotPersonality(item.id)}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 ring-1 ring-brand-500"
                                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-white/[0.03]"
                                }`}
                              >
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{item.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Estilo & Emojis */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            Estilo & Extensión de Respuesta
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "conciso" as const, label: "Conciso", desc: "Respuestas cortas" },
                              { id: "claro" as const, label: "Claro", desc: "Balanceado" },
                              { id: "extenso" as const, label: "Extenso", desc: "Detallado" },
                            ].map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => setResponseStyle(s.id)}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                                  responseStyle === s.id
                                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-semibold"
                                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                                }`}
                              >
                                <span className="text-xs font-semibold leading-tight">{s.label}</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{s.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            Uso de Emojis
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "nunca" as const, label: "Nunca", desc: "0 emojis" },
                              { id: "moderado" as const, label: "Moderado", desc: "1-2 por mensaje" },
                              { id: "frecuente" as const, label: "Frecuente", desc: "Expresivo" },
                            ].map((e) => (
                              <button
                                type="button"
                                key={e.id}
                                onClick={() => setEmojiFrequency(e.id)}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                                  emojiFrequency === e.id
                                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-semibold"
                                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                                }`}
                              >
                                <span className="text-xs font-semibold leading-tight">{e.label}</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{e.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Saludo inicial */}
                      <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            Saludo de Bienvenida Inicial
                          </label>
                          <Toggle intent="bot.welcome" checked={isWelcomeEnabled} onChange={setIsWelcomeEnabled} />
                        </div>
                        {isWelcomeEnabled && (
                          <textarea
                            rows={2}
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 2: CONOCIMIENTO DEL NEGOCIO ── */}
                {botSubTab === "knowledge" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Explicación conceptual rigurosa */}
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-none mt-0.5" />
                      <div>
                        <p className="font-bold">Fuentes de Verdad Desacopladas</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          El asistente no memoriza respuestas al azar. Consulta las fuentes del negocio autorizadas en tiempo real. <strong>Inventario no es conocimiento estático del asistente:</strong> solo se consulta si el módulo de Inventario está instalado y activo en la sede.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                        Fuentes de Conocimiento Autorizadas
                      </h3>

                      {/* Catálogo de Productos */}
                      <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            Catálogo Oficial de Productos & Precios
                          </p>
                          <p className="text-xs text-gray-500">
                            Permite al asistente consultar nombres, precios vigentes, descripciones y fotos del catálogo de la sede.
                          </p>
                        </div>
                        <Toggle intent="bot.knows.catalog" checked={knowsCatalog} onChange={setKnowsCatalog} />
                      </div>

                      {/* Información Operativa */}
                      <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            Información del Negocio & Ubicación
                          </p>
                          <p className="text-xs text-gray-500">
                            Horarios de atención, dirección física, modalidades de entrega (domicilio/retiro) y métodos de pago aceptados.
                          </p>
                        </div>
                        <Toggle intent="bot.knows.business" checked={knowsBusinessInfo} onChange={setKnowsBusinessInfo} />
                      </div>

                      {/* FAQ */}
                      <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            Preguntas Frecuentes (FAQ)
                          </p>
                          <p className="text-xs text-gray-500">
                            Respuestas estándar sobre cobertura, tiempos estimados de preparación y canales de contacto.
                          </p>
                        </div>
                        <Toggle intent="bot.knows.faq" checked={knowsFaq} onChange={setKnowsFaq} />
                      </div>

                      {/* Políticas */}
                      <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            Políticas de Cambios, Devoluciones y Garantías
                          </p>
                          <p className="text-xs text-gray-500">
                            Condiciones oficiales para cancelaciones, devoluciones o reclamos antes y después del despacho.
                          </p>
                        </div>
                        <Toggle intent="bot.knows.policies" checked={knowsPolicies} onChange={setKnowsPolicies} />
                      </div>

                      {/* Consulta de Inventario en Tiempo Real (Condicionado al módulo) */}
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">
                                Consulta de Inventario & Stock en Tiempo Real
                              </p>
                              <span
                                className={`text-xs  font-bold px-2 py-0.5 rounded-full border ${
                                  business?.activeModules?.includes("inventarios")
                                    ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
                                    : "text-gray-500 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {business?.activeModules?.includes("inventarios") ? "Módulo Instalado" : "Módulo Inactivo"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {business?.activeModules?.includes("inventarios")
                                ? "El asistente valida existencias vivas en bodega antes de confirmar la disponibilidad de un producto al cliente."
                                : "El módulo Inventario no está instalado en esta sede. El asistente no fingirá stock real y responderá con base en el catálogo general."}
                            </p>
                          </div>
                          <Toggle
                            intent="bot.knows.inventory"
                            checked={knowsInventoryQuery && (business?.activeModules?.includes("inventarios") ?? false)}
                            onChange={(val) => {
                              if (business?.activeModules?.includes("inventarios")) {
                                setKnowsInventoryQuery(val);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 3: COMPORTAMIENTO CONVERSACIONAL (INTENCIONES) ── */}
                {botSubTab === "intents" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                          Intenciones Conversacionales Habilitadas
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Selecciona las acciones que el asistente tiene autorización de ejecutar de forma autónoma con el cliente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: "catalog", label: "Consultar Catálogo", desc: "Presentar productos y categorías", checked: intentCatalog, set: setIntentCatalog },
                          { id: "price", label: "Consultar Precio", desc: "Informar costos y promociones", checked: intentPrice, set: setIntentPrice },
                          { id: "stock", label: "Consultar Disponibilidad", desc: "Verificar stock en tiempo real", checked: intentStock, set: setIntentStock },
                          { id: "create", label: "Crear Pedido", desc: "Tomar y armar orden de compra", checked: intentCreateOrder, set: setIntentCreateOrder },
                          { id: "track", label: "Consultar Estado de Pedido", desc: "Rastrear orden en el OMS", checked: intentTrackOrder, set: setIntentTrackOrder },
                          { id: "modify", label: "Modificar Pedido", desc: "Agregar o remover ítems antes de cocina", checked: intentModifyOrder, set: setIntentModifyOrder },
                          { id: "cancel", label: "Cancelar Pedido", desc: "Solicitar baja de pedido", checked: intentCancelOrder, set: setIntentCancelOrder },
                          { id: "hours", label: "Horarios & Ubicación", desc: "Dirección, mapas y apertura", checked: intentHoursLocation, set: setIntentHoursLocation },
                          { id: "human", label: "Hablar con Asesor", desc: "Transferencia directa a humano", checked: intentHumanAgent, set: setIntentHumanAgent },
                        ].map((intent) => (
                          <label
                            key={intent.id}
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                              intent.checked
                                ? "border-brand-500/40 bg-brand-50/10 dark:bg-brand-950/10"
                                : "border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-80"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{intent.label}</p>
                              <p className="text-xs text-gray-500">{intent.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={intent.checked}
                              onChange={(e) => intent.set(e.target.checked)}
                              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 4: REGLAS DE CREACIÓN & CONFIRMACIÓN DE PEDIDOS (OMS) ── */}
                {botSubTab === "orders_oms" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Explicación de frontera OMS */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                      <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
                      <div>
                        <p className="font-bold">Frontera Desacoplada con el OMS</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          El asistente IA toma la conversación y la convierte en un pedido compatible con el OMS. El OMS recibe la comanda sin importar que su origen haya sido WhatsApp.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                        Comportamiento al Confirmar Pedido en Chat
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            id: "auto_new" as const,
                            title: "Crear como NUEVO",
                            desc: "Ingresa de inmediato a la bandeja del OMS sin confirmación intermedia.",
                          },
                          {
                            id: "interactive_confirm" as const,
                            title: "Confirmación Interactiva",
                            desc: "Muestra resumen completo y solicita aprobación explícita al comprador.",
                          },
                          {
                            id: "human_review" as const,
                            title: "Enviar a Revisión Humana",
                            desc: "Queda en borrador hasta que un operador humano valide el pedido.",
                          },
                        ].map((mode) => {
                          const isSelected = orderCreationMode === mode.id;
                          return (
                            <button
                              type="button"
                              key={mode.id}
                              onClick={() => setOrderCreationMode(mode.id)}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? "border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 ring-1 ring-brand-500"
                                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-white/[0.03]"
                              }`}
                            >
                              <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{mode.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{mode.desc}</p>
                              </div>
                              <span
                                className={`text-xs  font-bold mt-2 ${
                                  isSelected ? "text-brand-600" : "text-gray-400"
                                }`}
                              >
                                {isSelected ? "● Seleccionado" : "○ Elegir"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Auto-confirmación Avanzada */}
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Auto-Confirmación Inteligente Directa
                            </p>
                            <p className="text-xs text-gray-500">
                              Pasa la orden automáticamente a preparación si cumple con las condiciones operacionales fijadas.
                            </p>
                          </div>
                          <Toggle intent="bot.autoconfirm" checked={isAutoConfirmOrders} onChange={setIsAutoConfirmOrders} />
                        </div>

                        {isAutoConfirmOrders && (
                          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 space-y-3">
                            <Field
                              label="Monto Máximo para Auto-confirmación ($)"
                              type="number"
                              value={autoConfirmMaxAmount}
                              onChange={(e) => setAutoConfirmMaxAmount(Number(e.target.value) || 0)}
                              placeholder="100000"
                            />

                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Condiciones obligatorias para auto-confirmar:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmRequireStock}
                                    onChange={(e) => setAutoConfirmRequireStock(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                  />
                                  <span>Requiere stock disponible confirmado</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmRequireCompleteData}
                                    onChange={(e) => setAutoConfirmRequireCompleteData(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                  />
                                  <span>Cliente con datos completos (dirección/teléfono)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmExcludeRestricted}
                                    onChange={(e) => setAutoConfirmExcludeRestricted(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                  />
                                  <span>Sin productos con preparación especial restringida</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 5: HANDOFF A HUMANO ── */}
                {botSubTab === "handoff" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                            Transferencia Automática a Asesor Humano (Handoff)
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Configura con precisión en qué momentos y bajo qué reglas el bot debe ceder el control del chat.
                          </p>
                        </div>
                        <Toggle intent="bot.handoff" checked={isHandoffEnabled} onChange={setIsHandoffEnabled} />
                      </div>

                      {isHandoffEnabled && (
                        <div className="space-y-4">
                          {/* Mensaje de traspaso */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-900 dark:text-white">
                              Mensaje de Transición al Cliente
                            </label>
                            <textarea
                              rows={2}
                              value={handoffToHumanMessage}
                              onChange={(e) => setHandoffToHumanMessage(e.target.value)}
                              className="w-full p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none"
                            />
                          </div>

                          {/* Disparadores */}
                          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-900 dark:text-white">
                              Disparadores Automáticos de Transferencia
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerUserRequest}
                                  onChange={(e) => setHandoffTriggerUserRequest(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>Cliente solicita asesor explícitamente</span>
                              </label>

                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerUnhandled}
                                  onChange={(e) => setHandoffTriggerUnhandled(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>IA no puede resolver la consulta</span>
                              </label>

                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerUnhappy}
                                  onChange={(e) => setHandoffTriggerUnhappy(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>Detección de reclamo o cliente insatisfecho</span>
                              </label>

                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerOutOfStock}
                                  onChange={(e) => setHandoffTriggerOutOfStock(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>Producto solicitado sin stock</span>
                              </label>

                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerHighAmount}
                                  onChange={(e) => setHandoffTriggerHighAmount(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>Pedido de alto monto especial</span>
                              </label>

                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={handoffTriggerRequiresAuth}
                                  onChange={(e) => setHandoffTriggerRequiresAuth(e.target.checked)}
                                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                />
                                <span>Solicitud requiere autorización administrativa</span>
                              </label>
                            </div>
                          </div>

                          {/* Destino y Comportamiento */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-900 dark:text-white">
                                Destino de la Transferencia
                              </label>
                              <select
                                value={handoffTarget}
                                onChange={(e) => setHandoffTarget(e.target.value as any)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                              >
                                <option value="general">Cualquier asesor disponible</option>
                                <option value="sales">Equipo de Ventas</option>
                                <option value="support">Servicio al Cliente & Soporte</option>
                                <option value="ops">Operaciones & Despacho</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-900 dark:text-white">
                                Comportamiento de la IA
                              </label>
                              <select
                                value={handoffBehavior}
                                onChange={(e) => setHandoffBehavior(e.target.value as any)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                              >
                                <option value="pause_ia">Pausar IA mientras atiende humano</option>
                                <option value="assist_agent">Modo Copiloto (IA asiste al asesor)</option>
                                <option value="resume_on_finish">Reanudar IA al cerrar la conversación</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── ÁREA 6: HORARIOS & DISPONIBILIDAD ── */}
                {botSubTab === "hours" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                          Horarios & Operación Autónoma
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Define cómo interactúa el bot fuera del horario habitual de la sede ({openingDays}, {openingHours}).
                        </p>
                      </div>

                      {/* ¿Recibir pedidos fuera de horario? */}
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            ¿Permitir tomar pedidos fuera de horario?
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Si está activo, el asistente tomará la orden y la dejará programada en el OMS para el próximo turno de apertura.
                          </p>
                        </div>
                        <Toggle
                          intent="bot.orders.outside.hours"
                          checked={allowOrdersOutsideHours}
                          onChange={setAllowOrdersOutsideHours}
                        />
                      </div>

                      {/* Mensaje Fuera de Horario */}
                      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            Respuesta Automática Fuera de Horario
                          </label>
                          <Toggle intent="bot.closed" checked={isClosedHoursEnabled} onChange={setIsClosedHoursEnabled} />
                        </div>
                        {isClosedHoursEnabled && (
                          <textarea
                            rows={3}
                            value={closedHoursMessage}
                            onChange={(e) => setClosedHoursMessage(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 7: EXPERIENCIA DEL CLIENTE ── */}
                {botSubTab === "experience" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                          Experiencia del Cliente en el Chat
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Controla cómo se despliega el catálogo interactivo y la confirmación visual de compra en WhatsApp.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Desplegar Catálogo Visual en Tarjetas
                            </p>
                            <p className="text-xs text-gray-500">
                              Envía carrusel o tarjetas interactivas de productos directamente en el chat.
                            </p>
                          </div>
                          <Toggle intent="exp.cards" checked={expShowCatalogCards} onChange={setExpShowCatalogCards} />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Mostrar Menú por Categorías
                            </p>
                            <p className="text-xs text-gray-500">
                              Agrupa los productos en botones rápidos de categorías.
                            </p>
                          </div>
                          <Toggle intent="exp.categories" checked={expShowCategories} onChange={setExpShowCategories} />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Incluir Fotos y Precios en Respuestas
                            </p>
                            <p className="text-xs text-gray-500">
                              Adjunta la fotografía y precio oficial de cada producto consultado.
                            </p>
                          </div>
                          <Toggle intent="exp.pictures" checked={expShowPictures} onChange={setExpShowPictures} />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Permitir Armar Carrito desde Conversación
                            </p>
                            <p className="text-xs text-gray-500">
                              El cliente puede sumar y restar ítems en el chat sin salir a enlaces externos.
                            </p>
                          </div>
                          <Toggle intent="exp.cart" checked={expInlineCart} onChange={setExpInlineCart} />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              Resumen Previo de Pedido con Desglose Completo
                            </p>
                            <p className="text-xs text-gray-500">
                              Antes de confirmar, envía un resumen con ítems, dirección, entrega, medio de pago y total exacto.
                            </p>
                          </div>
                          <Toggle intent="exp.summary" checked={expPreConfirmationSummary} onChange={setExpPreConfirmationSummary} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )}

            {/* ── TAB 4: CUENTAS & PAGOS ── */}
            {activeTab === "payments" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Cuentas & Métodos de Pago
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Datos donde tus clientes realizarán transferencias y métodos presenciales admitidos.
                  </p>
                </div>

                {/* Transferencias */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Transferencias Bancarias & Móviles
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Número Nequi"
                      type="text"
                      value={nequiNumber}
                      onChange={(e) => setNequiNumber(e.target.value)}
                      placeholder="Ej: 310 987 6543"
                    />
                    <Field
                      label="Número Daviplata"
                      type="text"
                      value={daviplataNumber}
                      onChange={(e) => setDaviplataNumber(e.target.value)}
                      placeholder="Ej: 310 987 6543"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <Field
                      label="Cuenta Bancolombia / Banco"
                      type="text"
                      value={bancolombiaAccount}
                      onChange={(e) => setBancolombiaAccount(e.target.value)}
                      placeholder="104-892134-55"
                    />
                    <Field
                      label="Titular de la Cuenta"
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Nombre o Razón Social"
                    />
                    <Field
                      label="NIT o Cédula"
                      type="text"
                      value={accountNit}
                      onChange={(e) => setAccountNit(e.target.value)}
                      placeholder="901.458.789-1"
                    />
                  </div>
                </div>

                {/* Cobro en Sede */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Cobro Presencial en Sede
                  </h3>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Pago en Efectivo Contra Entrega
                      </p>
                      <p className="text-xs text-gray-500">
                        Permite a los compradores abonar en efectivo al recibir el pedido.
                      </p>
                    </div>
                    <Toggle
                      intent="payment.cash.toggle"
                      checked={allowCashOnDelivery}
                      onChange={setAllowCashOnDelivery}
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Datáfono / Terminal de Tarjeta
                      </p>
                      <p className="text-xs text-gray-500">
                        Acepta cobro con tarjeta de crédito o débito presencial.
                      </p>
                    </div>
                    <Toggle
                      intent="payment.card.toggle"
                      checked={allowCardTerminal}
                      onChange={setAllowCardTerminal}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: MARCA & IDENTIDAD VISUAL ── */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Marca & Identidad Visual
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Logo, portada de tienda, colores distintivos y sonidos de alerta para la operación.
                  </p>
                </div>

                {/* Logo & Portada */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-6 shadow-theme-xs">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white   mb-3">
                      Logo de la Sede
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center flex-none">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo Sede" className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors cursor-pointer flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Logo</span>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>

                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoUrl("")}
                              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Recomendado: Imagen cuadrada de al menos 400x400 px.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Portada */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white   mb-3">
                      Portada / Banner de la Tienda Web
                    </h3>
                    <div className="space-y-3">
                      <div className="w-full h-32 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                        {bannerUrl ? (
                          <img src={bannerUrl} alt="Banner Sede" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">Sin portada configurada</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Cambiar Portada</span>
                          <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                        </label>
                        {bannerUrl && (
                          <button
                            type="button"
                            onClick={() => setBannerUrl("")}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            Quitar portada
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color & Sonido */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Color & Alerta Sonora de Comandas
                  </h3>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Color Distintivo de Marca
                    </label>
                    <div className="flex items-center gap-3">
                      {[
                        { name: "Naranja Necto", hex: "#FF3F1A" },
                        { name: "Azul Cobalto", hex: "#2563EB" },
                        { name: "Esmeralda", hex: "#059669" },
                        { name: "Violeta", hex: "#7C3AED" },
                        { name: "Grafito", hex: "#18181B" },
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBrandColor(c.hex)}
                          className={`w-9 h-9 rounded-xl cursor-pointer transition-transform flex items-center justify-center ${
                            brandColor === c.hex ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-105" : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {brandColor === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      ))}
                      <span className="text-xs  font-bold text-gray-600 dark:text-gray-400 ml-2">
                        {brandColor}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Sonido de Alerta de Nuevos Pedidos
                    </label>
                    <select
                      value={soundAlert}
                      onChange={(e) => setSoundAlert(e.target.value as any)}
                      className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                    >
                      <option value="bell">Campana Suave (Bell)</option>
                      <option value="chime">Timbre Dinámico (Chime)</option>
                      <option value="kitchen_ding">Timbre de Cocina / KDS (Ding)</option>
                      <option value="pos_beep">Bip de Caja / POS (Beep)</option>
                      <option value="mute">Silencioso (Mute)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: OPERACIONES & SEDE ── */}
            {activeTab === "operations" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Operaciones & Estado de Sede
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Flujo de órdenes, pausas programadas y acciones críticas de la sede.
                  </p>
                </div>

                {/* Preparación de Pedidos */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Flujo Operativo de Órdenes
                  </h3>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Etapa Intermedia de Preparación
                      </p>
                      <p className="text-xs text-gray-500">
                        Si está activa, las órdenes pasan a "En Preparación" antes de marcarse como Listas.
                      </p>
                    </div>
                    <Toggle
                      intent="orders.prep.toggle"
                      checked={isPreparacionEnabled}
                      onChange={setIsPreparacionEnabled}
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Field
                      label="Tiempo Estimado de Preparación / Buffer (Minutos)"
                      type="number"
                      value={kitchenBufferMin}
                      onChange={(e) => setKitchenBufferMin(Number(e.target.value) || 0)}
                      placeholder="20"
                    />
                  </div>
                </div>

                {/* Pausa / Vacaciones */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-4 shadow-theme-xs">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white  ">
                    Pausa Temporal / Modo Vacaciones
                  </h3>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Pausar Recepción de Pedidos
                      </p>
                      <p className="text-xs text-gray-500">
                        Suspende temporalmente el ingreso de nuevas compras desde la web o chat.
                      </p>
                    </div>
                    <Toggle
                      intent="business.pause.toggle"
                      checked={isPaused}
                      onChange={setIsPaused}
                    />
                  </div>

                  {isPaused && (
                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Field
                        label="Motivo de la Pausa"
                        type="text"
                        value={pauseReason}
                        onChange={(e) => setPauseReason(e.target.value)}
                        placeholder="Ej: Vacaciones colectivas / Mantenimiento de cocina"
                      />
                      <Field
                        label="Mensaje Automático para Clientes"
                        type="text"
                        value={pauseMessage}
                        onChange={(e) => setPauseMessage(e.target.value)}
                        placeholder="En este momento nos encontramos en pausa. Regresamos pronto."
                      />
                    </div>
                  )}
                </div>

                {/* Zona de Peligro */}
                <div className="p-6 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-400  ">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Zona de Peligro</span>
                  </div>

                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    Eliminar esta sede borrará sus órdenes locales, configuración y enlaces. Esta acción no se puede deshacer.
                  </p>

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-theme-xs transition-colors"
                    >
                      Eliminar esta Sede
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-rose-300 dark:border-rose-800 space-y-3">
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        ¿Confirmas que deseas eliminar permanentemente la sede "{name}"?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-theme-xs transition-colors"
                        >
                          Sí, eliminar definitivamente
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer transition-colors"
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
        </main>
      </div>
    </div>
  );
};
