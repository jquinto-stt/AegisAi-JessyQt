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
  Truck,
  Coins,
  PauseCircle,
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

              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <form onSubmit={handleSave} className="max-w-4xl mx-auto py-8 px-8 space-y-8">

            {/* ── TAB 1: GENERAL & UBICACIÓN ── */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    General & Ubicación
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Identidad comercial, dirección física y modalidades de servicio de la sede.
                  </p>
                </div>

                {/* Identidad Comercial */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Identidad Comercial
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Nombre público y modelo operativo principal de la sede.
                    </p>
                  </div>

                  <Field
                    label="Nombre Comercial de la Sede"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Necto Gourmet — Sede Central"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enlace Web de la Tienda (Slug)
                      </label>
                      <div className="flex items-center h-11 px-4 text-sm bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-theme-xs focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20 transition-all">
                        <span className="text-gray-400 select-none text-sm font-medium">necto.app/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                          placeholder="mi-tienda"
                          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none ml-1 lowercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Modelo de Operación Principal
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                        className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                      >
                        <option value="restaurant_virtual">Gastronomía (Cocina, Mesa & Domicilios)</option>
                        <option value="retail_store">Comercio & Retail (Stock & Mostrador)</option>
                        <option value="services">Servicios & Citas (Agenda & Atención)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ubicación Física & Horarios */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Ubicación & Horarios
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Dirección física, zona geográfica y horarios regulares de atención.
                    </p>
                  </div>

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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Moneda Operativa
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
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
                </div>

                {/* Modalidades de Servicio — Idéntico estándar visual de Canales de Entrada */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Modalidades de Servicio
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Define cómo pueden recibir o consumir los pedidos tus clientes.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 flex items-center justify-center flex-none mt-0.5">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Envíos a Domicilio
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Entrega directa con mensajería o delivery propio hasta la dirección del cliente.
                          </p>
                        </div>
                      </div>
                      <Toggle intent="service.delivery" checked={serviceDelivery} onChange={setServiceDelivery} />
                    </div>

                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center flex-none mt-0.5">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Retiro en Tienda / Takeaway
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            El cliente recoge su orden preparada directamente en el local físico.
                          </p>
                        </div>
                      </div>
                      <Toggle intent="service.takeaway" checked={serviceTakeaway} onChange={setServiceTakeaway} />
                    </div>

                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center flex-none mt-0.5">
                          <UtensilsCrossed className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Consumo en Mesa / Salón
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Atención presencial en mesas, mostrador o barra del establecimiento.
                          </p>
                        </div>
                      </div>
                      <Toggle intent="service.dinein" checked={serviceDineIn} onChange={setServiceDineIn} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: CANALES DE ENTRADA ── */}
            {activeTab === "channels" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Canales de Entrada
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Gestiona los medios por donde tus clientes envían pedidos a esta sede.
                  </p>
                </div>

                <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                  {/* WhatsApp Business */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center flex-none mt-0.5">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            WhatsApp Business
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Recepción de pedidos conversacionales asistidos por IA.
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Teléfono vinculado: <span className="text-gray-700 dark:text-gray-300 font-medium">{contactPhone || "Sin asignar"}</span>
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
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between sm:pl-13">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Widget Flotante de Chat
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Muestra un botón de chat flotante en la tienda web para abrir WhatsApp directamente.
                          </p>
                        </div>
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
                    )}
                  </div>

                  {/* Tienda Web */}
                  <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center flex-none mt-0.5">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Tienda Web & Catálogo en Línea
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Catálogo digital interactivo con carrito y checkout directo.
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
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

                  {/* POS / Mostrador */}
                  <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center flex-none mt-0.5">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Punto de Venta (POS) / Mostrador
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Toma de comandas y ventas presenciales en salón o caja registradora.
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
            )}

            {/* ── TAB 3: ASISTENTE DE WHATSAPP IA (CAPA DE INTELIGENCIA) ── */}
            {activeTab === "whatsapp_bot" && (
              <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Asistente de WhatsApp IA
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configura la personalidad, fuentes de información y reglas de atención conversacional.
                  </p>
                </div>

                {!enableWhatsapp ? (
                  <div className="p-8 sm:p-10 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 text-center max-w-lg mx-auto space-y-4 shadow-theme-xs my-8">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 flex items-center justify-center mx-auto">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        Activa WhatsApp Business para configurar el Asistente IA
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        El asistente opera sobre los mensajes de WhatsApp. Activa el canal para calibrar su identidad, catálogo y reglas de toma de pedidos.
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
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm shadow-theme-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Activar Canal WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("channels")}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors cursor-pointer"
                      >
                        Ver Canales
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {/* Segmented control bar superior */}
                      <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl overflow-x-auto">
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
                              className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                                isActive
                                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              }`}
                            >
                              <Icon className={`w-4 h-4 flex-none ${isActive ? "text-brand-500" : "text-gray-400"}`} />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* ── ÁREA 1: IDENTIDAD & COMPORTAMIENTO ── */}
                      {botSubTab === "identity" && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                            <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                Identidad & Tono de Respuesta
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Define el nombre y el estilo con el que interactuará con tus compradores.
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
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Tono de Atención
                                </label>
                                <select
                                  value={botTone}
                                  onChange={(e) => setBotTone(e.target.value as any)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                                >
                                  <option value="cálido">Cálido y Cercano</option>
                                  <option value="profesional">Profesional & Ejecutivo</option>
                                  <option value="ágil">Ágil & Directo</option>
                                  <option value="técnico">Técnico & Especializado</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Personalidad Base
                                </label>
                                <select
                                  value={botPersonality}
                                  onChange={(e) => setBotPersonality(e.target.value as BotPersonality)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                                >
                                  <option value="amigable">Amigable (Empático y servicial)</option>
                                  <option value="ejecutivo">Ejecutivo (Sobrio y formal)</option>
                                  <option value="chef">Especialista (Experto en la carta)</option>
                                  <option value="dinamico">Dinámico (Rápido y proactivo)</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Estilo de Respuesta
                                </label>
                                <select
                                  value={responseStyle}
                                  onChange={(e) => setResponseStyle(e.target.value as any)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                                >
                                  <option value="conciso">Conciso (Respuestas cortas)</option>
                                  <option value="claro">Claro (Balanceado)</option>
                                  <option value="extenso">Extenso (Detallado)</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Frecuencia de Emojis
                                </label>
                                <select
                                  value={emojiFrequency}
                                  onChange={(e) => setEmojiFrequency(e.target.value as any)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                                >
                                  <option value="nunca">Nunca (0 emojis)</option>
                                  <option value="moderado">Moderado (1-2 por mensaje)</option>
                                  <option value="frecuente">Frecuente (Expresivo)</option>
                                </select>
                              </div>
                            </div>

                            {/* Saludo inicial */}
                            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Saludo de Bienvenida Inicial
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Primer mensaje que envía el bot cuando un cliente escribe.
                                  </p>
                                </div>
                                <Toggle intent="bot.welcome" checked={isWelcomeEnabled} onChange={setIsWelcomeEnabled} />
                              </div>
                              {isWelcomeEnabled && (
                                <textarea
                                  rows={2}
                                  value={welcomeMessage}
                                  onChange={(e) => setWelcomeMessage(e.target.value)}
                                  className="w-full p-3.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                {/* ── ÁREA 2: CONOCIMIENTO DEL NEGOCIO ── */}
                {botSubTab === "knowledge" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      {/* Catálogo de Productos */}
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center flex-none mt-0.5">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Catálogo Oficial de Productos & Precios
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Permite al asistente consultar nombres, precios vigentes, descripciones y fotos de la sede.
                            </p>
                          </div>
                        </div>
                        <Toggle intent="bot.knows.catalog" checked={knowsCatalog} onChange={setKnowsCatalog} />
                      </div>

                      {/* Información Operativa */}
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center flex-none mt-0.5">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Información del Negocio & Ubicación
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Horarios de atención, dirección física, modalidades de entrega y métodos de pago aceptados.
                            </p>
                          </div>
                        </div>
                        <Toggle intent="bot.knows.business" checked={knowsBusinessInfo} onChange={setKnowsBusinessInfo} />
                      </div>

                      {/* FAQ */}
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center flex-none mt-0.5">
                            <HelpCircle className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Preguntas Frecuentes (FAQ)
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Respuestas estándar sobre cobertura, tiempos estimados de preparación y canales de contacto.
                            </p>
                          </div>
                        </div>
                        <Toggle intent="bot.knows.faq" checked={knowsFaq} onChange={setKnowsFaq} />
                      </div>

                      {/* Políticas */}
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center flex-none mt-0.5">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Políticas de Cambios y Garantías
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Condiciones oficiales para cancelaciones, devoluciones o reclamos de pedidos.
                            </p>
                          </div>
                        </div>
                        <Toggle intent="bot.knows.policies" checked={knowsPolicies} onChange={setKnowsPolicies} />
                      </div>

                      {/* Consulta de Inventario */}
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center flex-none mt-0.5">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Consulta de Inventario en Tiempo Real
                              </h3>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                                  business?.activeModules?.includes("inventarios")
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}
                              >
                                {business?.activeModules?.includes("inventarios") ? "Módulo Activo" : "Sin Módulo"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {business?.activeModules?.includes("inventarios")
                                ? "Valida existencias en bodega antes de confirmar la disponibilidad de un producto."
                                : "Requiere el módulo de Inventarios activo en esta sede."}
                            </p>
                          </div>
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
                )}

                {/* ── ÁREA 3: COMPORTAMIENTO CONVERSACIONAL (INTENCIONES) ── */}
                {botSubTab === "intents" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      {[
                        { id: "catalog", label: "Consultar Catálogo", desc: "Presentar productos y categorías", checked: intentCatalog, set: setIntentCatalog },
                        { id: "price", label: "Consultar Precios", desc: "Informar valores y promociones", checked: intentPrice, set: setIntentPrice },
                        { id: "stock", label: "Consultar Disponibilidad", desc: "Verificar existencias de productos", checked: intentStock, set: setIntentStock },
                        { id: "create", label: "Tomar Pedido", desc: "Armar orden de compra en el chat", checked: intentCreateOrder, set: setIntentCreateOrder },
                        { id: "track", label: "Estado del Pedido", desc: "Rastrear orden en curso en el OMS", checked: intentTrackOrder, set: setIntentTrackOrder },
                        { id: "modify", label: "Modificar Pedido", desc: "Ajustar ítems antes de preparación", checked: intentModifyOrder, set: setIntentModifyOrder },
                        { id: "cancel", label: "Cancelar Pedido", desc: "Solicitar cancelación de comanda", checked: intentCancelOrder, set: setIntentCancelOrder },
                        { id: "hours", label: "Horarios & Dirección", desc: "Informar apertura y ubicación física", checked: intentHoursLocation, set: setIntentHoursLocation },
                        { id: "human", label: "Transferir a Asesor", desc: "Pase directo a atención humana", checked: intentHumanAgent, set: setIntentHumanAgent },
                      ].map((intent) => (
                        <div key={intent.id} className="p-5 sm:p-6 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {intent.label}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {intent.desc}
                            </p>
                          </div>
                          <Toggle
                            intent={`bot.intent.${intent.id}`}
                            checked={intent.checked}
                            onChange={intent.set}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── ÁREA 4: REGLAS DE CREACIÓN & CONFIRMACIÓN DE PEDIDOS (OMS) ── */}
                {botSubTab === "orders_oms" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      <div className="p-5 sm:p-6 space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Modalidad de Entrada al OMS
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Define cómo ingresan al sistema de pedidos las órdenes pactadas en el chat.
                          </p>
                        </div>
                        <select
                          value={orderCreationMode}
                          onChange={(e) => setOrderCreationMode(e.target.value as any)}
                          className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                        >
                          <option value="auto_new">Crear como Nuevo (Ingresa de inmediato como comanda lista para confirmar)</option>
                          <option value="interactive_confirm">Confirmación en Chat (Envía desglose y solicita un 'Sí' explícito)</option>
                          <option value="human_review">Revisión Previa (Queda en borrador hasta validación de un operador humano)</option>
                        </select>
                      </div>

                      {/* Auto-confirmación */}
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Auto-Confirmación Directa
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Pasa la orden automáticamente a preparación si cumple los montos y stock requeridos.
                            </p>
                          </div>
                          <Toggle intent="bot.autoconfirm" checked={isAutoConfirmOrders} onChange={setIsAutoConfirmOrders} />
                        </div>

                        {isAutoConfirmOrders && (
                          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 space-y-4">
                            <Field
                              label="Monto Máximo para Auto-confirmación ($)"
                              type="number"
                              value={autoConfirmMaxAmount}
                              onChange={(e) => setAutoConfirmMaxAmount(Number(e.target.value) || 0)}
                              placeholder="100000"
                            />

                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Condiciones obligatorias para auto-confirmar:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmRequireStock}
                                    onChange={(e) => setAutoConfirmRequireStock(e.target.checked)}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 w-4 h-4"
                                  />
                                  <span>Requiere stock confirmado</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmRequireCompleteData}
                                    onChange={(e) => setAutoConfirmRequireCompleteData(e.target.checked)}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 w-4 h-4"
                                  />
                                  <span>Cliente con datos completos</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={autoConfirmExcludeRestricted}
                                    onChange={(e) => setAutoConfirmExcludeRestricted(e.target.checked)}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 w-4 h-4"
                                  />
                                  <span>Sin ítems con preparación restringida</span>
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
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Transferencia a Asesor Humano (Handoff)
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Configura en qué momentos y bajo qué reglas el bot debe ceder el control del chat a un asesor del equipo.
                            </p>
                          </div>
                          <Toggle intent="bot.handoff" checked={isHandoffEnabled} onChange={setIsHandoffEnabled} />
                        </div>

                        {isHandoffEnabled && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-5">
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mensaje de Transición al Cliente
                              </label>
                              <textarea
                                rows={2}
                                value={handoffToHumanMessage}
                                onChange={(e) => setHandoffToHumanMessage(e.target.value)}
                                className="w-full p-3.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none transition-all"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Destino de la Transferencia
                                </label>
                                <select
                                  value={handoffTarget}
                                  onChange={(e) => setHandoffTarget(e.target.value as any)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                                >
                                  <option value="general">Cualquier asesor disponible</option>
                                  <option value="sales">Equipo de Ventas</option>
                                  <option value="support">Servicio al Cliente & Soporte</option>
                                  <option value="ops">Operaciones & Despacho</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Comportamiento de la IA
                                </label>
                                <select
                                  value={handoffBehavior}
                                  onChange={(e) => setHandoffBehavior(e.target.value as any)}
                                  className="h-11 w-full px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
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
                  </div>
                )}

                {/* ── ÁREA 6: HORARIOS & DISPONIBILIDAD ── */}
                {botSubTab === "hours" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Permitir tomar pedidos fuera de horario
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Si está activo, el asistente tomará la orden y la dejará programada en el OMS para el próximo turno.
                          </p>
                        </div>
                        <Toggle
                          intent="bot.orders.outside.hours"
                          checked={allowOrdersOutsideHours}
                          onChange={setAllowOrdersOutsideHours}
                        />
                      </div>

                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Respuesta automática fuera de horario
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Mensaje que recibirá el cliente si contacta a la sede cuando se encuentra cerrada.
                            </p>
                          </div>
                          <Toggle intent="bot.closed" checked={isClosedHoursEnabled} onChange={setIsClosedHoursEnabled} />
                        </div>

                        {isClosedHoursEnabled && (
                          <textarea
                            rows={3}
                            value={closedHoursMessage}
                            onChange={(e) => setClosedHoursMessage(e.target.value)}
                            className="w-full p-3.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 resize-none placeholder:text-gray-400"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ÁREA 7: EXPERIENCIA DEL CLIENTE ── */}
                {botSubTab === "experience" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Desplegar catálogo visual en tarjetas
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Envía carrusel o tarjetas interactivas de productos directamente en el chat.
                          </p>
                        </div>
                        <Toggle intent="exp.cards" checked={expShowCatalogCards} onChange={setExpShowCatalogCards} />
                      </div>

                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Mostrar menú por categorías
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Agrupa los productos en botones rápidos de categorías.
                          </p>
                        </div>
                        <Toggle intent="exp.categories" checked={expShowCategories} onChange={setExpShowCategories} />
                      </div>

                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Incluir fotos y precios en respuestas
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Adjunta la fotografía y precio oficial de cada producto consultado.
                          </p>
                        </div>
                        <Toggle intent="exp.pictures" checked={expShowPictures} onChange={setExpShowPictures} />
                      </div>

                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Permitir armar carrito desde conversación
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            El cliente puede sumar y restar ítems en el chat sin salir a enlaces externos.
                          </p>
                        </div>
                        <Toggle intent="exp.cart" checked={expInlineCart} onChange={setExpInlineCart} />
                      </div>

                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Resumen previo de pedido con desglose completo
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Antes de confirmar, envía un resumen con ítems, dirección, entrega, medio de pago y total exacto.
                          </p>
                        </div>
                        <Toggle intent="exp.summary" checked={expPreConfirmationSummary} onChange={setExpPreConfirmationSummary} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

            {/* ── TAB 4: CUENTAS & PAGOS ── */}
            {activeTab === "payments" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Cuentas & Métodos de Pago
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Cuentas receptoras para transferencias de clientes y métodos de cobro presencial habilitados.
                  </p>
                </div>

                {/* Transferencias */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Transferencias Bancarias & Billeteras Digitales
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Información que se le compartirá al comprador en el canal de venta para transferir.
                    </p>
                  </div>

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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Cobro Presencial en Sede
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Métodos admitidos al entregar pedidos en mesa, mostrador o contra entrega.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center flex-none mt-0.5">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Pago en Efectivo Contra Entrega
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Permite a los compradores abonar en efectivo al momento de recibir su pedido.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        intent="payment.cash.toggle"
                        checked={allowCashOnDelivery}
                        onChange={setAllowCashOnDelivery}
                      />
                    </div>

                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center flex-none mt-0.5">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Datáfono / Terminal de Tarjeta
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Acepta cobro presencial con tarjeta de débito o crédito mediante terminal física.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        intent="payment.card.toggle"
                        checked={allowCardTerminal}
                        onChange={setAllowCardTerminal}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: MARCA & IDENTIDAD VISUAL ── */}
            {activeTab === "branding" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Marca & Identidad Visual
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Logo, portada de tienda, colores distintivos y sonidos de alerta para la operación.
                  </p>
                </div>

                {/* Logo & Portada */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-6 shadow-theme-xs">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
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
                          <label className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors cursor-pointer flex items-center gap-2 shadow-theme-xs">
                            <Upload className="w-4 h-4" />
                            <span>Subir Logo</span>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>

                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoUrl("")}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recomendado: Formato cuadrado de al menos 400x400 px (PNG, JPG o WebP).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Portada */}
                  <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                      Portada / Banner de la Tienda Web
                    </h3>
                    <div className="space-y-3">
                      <div className="w-full h-36 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                        {bannerUrl ? (
                          <img src={bannerUrl} alt="Banner Sede" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm text-gray-400">Sin portada configurada</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-2 border border-gray-300 dark:border-gray-700 shadow-theme-xs">
                          <Upload className="w-4 h-4" />
                          <span>Cambiar Portada</span>
                          <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                        </label>
                        {bannerUrl && (
                          <button
                            type="button"
                            onClick={() => setBannerUrl("")}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            Quitar portada
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color & Sonido */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 space-y-5 shadow-theme-xs">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Color Distintivo & Alertas
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Personalización de tono primario y timbre de avisos operativos.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Color de Marca
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
                          className={`w-9 h-9 rounded-lg cursor-pointer transition-transform flex items-center justify-center ${
                            brandColor === c.hex ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-105" : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {brandColor === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      ))}
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400 ml-2">
                        {brandColor}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sonido de Alerta de Nuevos Pedidos
                    </label>
                    <select
                      value={soundAlert}
                      onChange={(e) => setSoundAlert(e.target.value as any)}
                      className="h-11 w-full sm:w-72 px-3.5 py-2.5 rounded-lg bg-transparent dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
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
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Operaciones & Estado de Sede
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Flujo de órdenes, pausas programadas y acciones críticas de la sede.
                  </p>
                </div>

                {/* Preparación de Pedidos */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Flujo Operativo de Órdenes
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Configura el comportamiento del tablero de comandas y los tiempos de cocina.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center flex-none mt-0.5">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Etapa Intermedia de Preparación
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Si está activa, las órdenes pasan a "En Preparación" antes de marcarse como Listas para entrega.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        intent="orders.prep.toggle"
                        checked={isPreparacionEnabled}
                        onChange={setIsPreparacionEnabled}
                      />
                    </div>

                    <div className="p-5 sm:p-6">
                      <Field
                        label="Tiempo Estimado de Preparación / Buffer (Minutos)"
                        type="number"
                        value={kitchenBufferMin}
                        onChange={(e) => setKitchenBufferMin(Number(e.target.value) || 0)}
                        placeholder="20"
                      />
                    </div>
                  </div>
                </div>

                {/* Pausa / Vacaciones */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Pausa Temporal / Modo Vacaciones
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Suspende temporalmente el ingreso de nuevas compras desde la web o chat.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-xs overflow-hidden">
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center flex-none mt-0.5">
                          <PauseCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Pausar Recepción de Pedidos
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Al activarse, los clientes verán que la sede está en pausa y no podrán generar órdenes nuevas.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        intent="business.pause.toggle"
                        checked={isPaused}
                        onChange={setIsPaused}
                      />
                    </div>

                    {isPaused && (
                      <div className="p-5 sm:p-6 space-y-4">
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
                </div>

                {/* Zona de Peligro */}
                <div className="p-6 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-base font-semibold text-rose-800 dark:text-rose-300">
                      Zona de Peligro
                    </h3>
                  </div>

                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    Eliminar esta sede borrará sus órdenes locales, configuración y enlaces. Esta acción es irreversible.
                  </p>

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium cursor-pointer shadow-theme-xs transition-colors"
                    >
                      Eliminar esta Sede
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-900/60 space-y-3">
                      <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                        ¿Confirmas que deseas eliminar permanentemente la sede "{name}"?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium cursor-pointer shadow-theme-xs transition-colors"
                        >
                          Sí, eliminar definitivamente
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer transition-colors"
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
