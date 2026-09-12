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
  UserCheck,
  ShoppingBag,
  MapPin,
  Calendar,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  FileText,
  CheckCircle2,
  ListChecks,
  Share2,
  Truck,
  Coins,
  PauseCircle,
  Plus,
  Trash2,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import { Button, Field, Toggle } from "@/elements";

export type SettingsTabKey =
  | "general"
  | "channels"
  | "whatsapp_bot"
  | "payments"
  | "branding"
  | "operations";

export interface CustomCapability {
  id: string;
  sourceId: "catalog" | "business" | "faq" | "policies" | "inventory" | "orders" | "human";
  label: string;
  desc?: string;
  instruction: string;
  enabled: boolean;
}

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

  // Conexión oficial de WhatsApp Business
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_connected");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [isConnectWhatsAppModalOpen, setIsConnectWhatsAppModalOpen] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [connectionMethod, setConnectionMethod] = useState<"qr" | "code">("qr");
  const [pairingPhoneInput, setPairingPhoneInput] = useState(contactPhone || "");
  const [isConnectingSim, setIsConnectingSim] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isConnectWhatsAppModalOpen && connectionMethod === "qr") {
      timer = setInterval(() => {
        setQrCountdown((prev) => (prev > 1 ? prev - 1 : 30));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConnectWhatsAppModalOpen, connectionMethod]);

  const handleConfirmWhatsAppConnection = () => {
    setIsConnectingSim(true);
    setTimeout(() => {
      setIsConnectingSim(false);
      setIsWhatsAppConnected(true);
      setEnableWhatsapp(true);
      try {
        localStorage.setItem("necto_whatsapp_connected", "true");
        localStorage.setItem("necto_whatsapp_channel_enabled", "true");
        window.dispatchEvent(
          new CustomEvent("necto_whatsapp_config_changed", {
            detail: { channelEnabled: true, widgetEnabled: isWhatsAppWidgetEnabled, isConnected: true },
          })
        );
      } catch (e) {}
      setIsConnectWhatsAppModalOpen(false);
    }, 1000);
  };

  const handleDisconnectWhatsApp = () => {
    setIsWhatsAppConnected(false);
    try {
      localStorage.setItem("necto_whatsapp_connected", "false");
      window.dispatchEvent(
        new CustomEvent("necto_whatsapp_config_changed", {
          detail: { channelEnabled: enableWhatsapp, widgetEnabled: isWhatsAppWidgetEnabled, isConnected: false },
        })
      );
    } catch (e) {}
  };

  // 3. Sub-navegación y Configuración del Asistente de WhatsApp IA (Capa de Inteligencia)
  const [botSubTab, setBotSubTab] = useState<
    "identity" | "knowledge" | "orders_oms" | "handoff" | "hours" | "experience"
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

  // Origen de datos por fuente de conocimiento
  const [catalogDataSource, setCatalogDataSource] = useState<"module_db" | "file" | "url">("module_db");
  const [faqDataSource, setFaqDataSource] = useState<"file" | "url" | "manual" | "none">("none");
  const [policiesDataSource, setPoliciesDataSource] = useState<"file" | "url" | "manual" | "none">("none");

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

  // Capacidades dinámicas personalizadas por fuente de conocimiento (Reglas / Directivas de prompt)
  const [customCapabilities, setCustomCapabilities] = useState<CustomCapability[]>(() => {
    try {
      const saved = localStorage.getItem("necto_custom_capabilities");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "cap_combo_sugerido",
        sourceId: "catalog",
        label: "Sugerir maridajes y combos",
        desc: "Ofrece guarnición o bebida sugerida al elegir plato fuerte",
        instruction: "Cuando el cliente elija un plato principal, sugiere automáticamente la bebida o combo recomendado con el valor promocional.",
        enabled: true,
      },
      {
        id: "cap_alergias",
        sourceId: "business",
        label: "Protocolo de alérgenos y celiaquía",
        desc: "Informa advertencias de ingredientes si el cliente lo consulta",
        instruction: "Si el cliente pregunta por ingredientes alérgenos, trazas de frutos secos o celiaquía, valida la ficha técnica y provee el contacto del responsable de cocina.",
        enabled: true,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("necto_custom_capabilities", JSON.stringify(customCapabilities));
    } catch (e) {}
  }, [customCapabilities]);

  // Estado del formulario inline para agregar capacidad
  const [addingCapSource, setAddingCapSource] = useState<string | null>(null);
  const [newCapLabel, setNewCapLabel] = useState("");
  const [newCapDesc, setNewCapDesc] = useState("");
  const [newCapInstruction, setNewCapInstruction] = useState("");

  const handleAddCustomCapability = (sourceId: any) => {
    if (!newCapLabel.trim()) return;
    const newCap: CustomCapability = {
      id: `custom_${Date.now()}`,
      sourceId,
      label: newCapLabel.trim(),
      desc: newCapDesc.trim() || "Regla conversacional personalizada",
      instruction: newCapInstruction.trim() || `Responder al cliente según directiva: ${newCapLabel.trim()}`,
      enabled: true,
    };
    setCustomCapabilities((prev) => [...prev, newCap]);
    setAddingCapSource(null);
    setNewCapLabel("");
    setNewCapDesc("");
    setNewCapInstruction("");
  };

  const handleToggleCustomCapability = (id: string) => {
    setCustomCapabilities((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleDeleteCustomCapability = (id: string) => {
    setCustomCapabilities((prev) => prev.filter((c) => c.id !== id));
  };

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

  const renderCustomCapabilities = (sourceId: CustomCapability["sourceId"]) => {
    const sourceCaps = customCapabilities.filter((c) => c.sourceId === sourceId);
    const isAdding = addingCapSource === sourceId;

    return (
      <div className="space-y-2.5 pt-2">
        {sourceCaps.length > 0 && (
          <div className="space-y-2">
            {sourceCaps.map((cap) => (
              <div
                key={cap.id}
                className="p-3.5 rounded-lg border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 flex items-start justify-between gap-3 transition-all"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cap.label}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      Personalizada
                    </span>
                  </div>
                  {cap.desc && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{cap.desc}</p>
                  )}
                  {cap.instruction && (
                    <div className="mt-1.5 p-2 rounded-md bg-white dark:bg-gray-900/90 border border-purple-100 dark:border-purple-900/50 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="font-semibold text-purple-700 dark:text-purple-300">Regla / Prompt IA: </span>
                      {cap.instruction}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-none pt-0.5">
                  <Toggle
                    intent={`bot.custom.${cap.id}`}
                    checked={cap.enabled}
                    onChange={() => handleToggleCustomCapability(cap.id)}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomCapability(cap.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Eliminar capacidad"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdding ? (
          <div className="p-4 rounded-xl border border-brand-300 dark:border-brand-700/60 bg-brand-50/30 dark:bg-brand-950/20 space-y-3 animate-fade-in shadow-theme-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
                Nueva Capacidad Personalizada
              </span>
              <button
                type="button"
                onClick={() => {
                  setAddingCapSource(null);
                  setNewCapLabel("");
                  setNewCapDesc("");
                  setNewCapInstruction("");
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Capacidad *
                </label>
                <input
                  type="text"
                  value={newCapLabel}
                  onChange={(e) => setNewCapLabel(e.target.value)}
                  placeholder="Ej: Recomendar postres y bebidas grandes"
                  className="w-full h-9 px-3 text-sm rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Descripción Corta
                </label>
                <input
                  type="text"
                  value={newCapDesc}
                  onChange={(e) => setNewCapDesc(e.target.value)}
                  placeholder="Ej: Ofrece sugerencias al momento de elegir el plato fuerte"
                  className="w-full h-9 px-3 text-sm rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Instrucción para el Asistente IA (Regla de Comportamiento) *
                </label>
                <textarea
                  rows={2}
                  value={newCapInstruction}
                  onChange={(e) => setNewCapInstruction(e.target.value)}
                  placeholder="Ej: Cuando el comprador elija un plato fuerte, sugiere amablemente agregar bebida grande por $1.500 adicionales."
                  className="w-full p-2.5 text-xs rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAddingCapSource(null);
                  setNewCapLabel("");
                  setNewCapDesc("");
                  setNewCapInstruction("");
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAddCustomCapability(sourceId)}
                disabled={!newCapLabel.trim()}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Guardar Capacidad
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAddingCapSource(sourceId);
              setNewCapLabel("");
              setNewCapDesc("");
              setNewCapInstruction("");
            }}
            className="w-full py-2.5 px-3 border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500 transition-colors" />
            <span>Agregar Capacidad Personalizada</span>
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

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
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center flex-none mt-0.5">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              WhatsApp Business
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Recepción de pedidos conversacionales asistidos por IA oficial.
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Teléfono vinculado:{" "}
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {contactPhone || "Sin asignar"}
                            </span>
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
                                detail: { channelEnabled: val, widgetEnabled: isWhatsAppWidgetEnabled, isConnected: isWhatsAppConnected },
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
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 sm:pl-13 space-y-4">
                        {/* Control de vinculación y salto a bot */}
                        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">
                              Estado de la sesión WhatsApp
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {isWhatsAppConnected
                                ? "La sesión está activa y sincronizada con el motor de pedidos."
                                : "Vincula tu teléfono para comenzar a recibir mensajes y órdenes."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {isWhatsAppConnected ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setIsConnectWhatsAppModalOpen(true)}
                                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-theme-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Reconectar QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDisconnectWhatsApp}
                                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                >
                                  Desvincular
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsConnectWhatsAppModalOpen(true)}
                                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-theme-xs transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <QrCode className="w-4 h-4" />
                                <span>Conectar WhatsApp</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setActiveTab("whatsapp_bot")}
                              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Configurar Asistente IA →</span>
                            </button>
                          </div>
                        </div>

                        {/* Widget flotante */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Widget Flotante de Chat
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                    detail: { channelEnabled: enableWhatsapp, widgetEnabled: val, isConnected: isWhatsAppConnected },
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
                          { id: "knowledge" as const, label: "Conocimiento & Capacidades", icon: BookOpen },
                          { id: "orders_oms" as const, label: "Reglas OMS", icon: ShoppingBag },
                          { id: "handoff" as const, label: "Handoff", icon: UserCheck },
                          { id: "hours" as const, label: "Horarios", icon: Clock },
                          { id: "experience" as const, label: "Experiencia", icon: SlidersHorizontal },
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

                {/* ── ÁREA 2: CONOCIMIENTO & CAPACIDADES ── */}
                {botSubTab === "knowledge" && (
                  <div className="space-y-5 animate-fade-in">

                    {/* ── Catálogo de Productos & Precios ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center flex-none mt-0.5">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Catálogo de Productos & Precios
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                  knowsCatalog
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${knowsCatalog ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  {knowsCatalog ? "Activo" : "Inactivo"}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                  {(intentCatalog ? 1 : 0) + (intentPrice ? 1 : 0) + customCapabilities.filter((c) => c.sourceId === "catalog" && c.enabled).length} / {2 + customCapabilities.filter((c) => c.sourceId === "catalog").length} capacidades activas
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Consulta de nombres, precios vigentes, descripciones y fotos de la sede.
                              </p>
                            </div>
                          </div>
                          <Toggle intent="bot.knows.catalog" checked={knowsCatalog} onChange={setKnowsCatalog} />
                        </div>

                        {knowsCatalog && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 sm:pl-13">
                            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-800 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                  Origen de datos
                                </label>
                                <select
                                  value={catalogDataSource}
                                  onChange={(e) => setCatalogDataSource(e.target.value as any)}
                                  className="h-9 px-3 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-500 focus:outline-hidden"
                                >
                                  <option value="module_db">Base de datos del módulo (automático)</option>
                                  <option value="file">Archivo subido (CSV / Excel)</option>
                                  <option value="url">URL externa (API / Endpoint)</option>
                                </select>
                              </div>

                              {catalogDataSource === "file" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Formatos soportados: CSV, XLSX, JSON</span>
                                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium shadow-theme-xs transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Subir Catálogo</span>
                                    <input type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" />
                                  </label>
                                </div>
                              )}

                              {catalogDataSource === "url" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800">
                                  <Field
                                    label="URL del endpoint"
                                    type="url"
                                    value=""
                                    onChange={() => {}}
                                    placeholder="https://api.mi-negocio.com/catalogo"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Capacidades del Catálogo
                                </p>
                              </div>

                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">Consultar catálogo completo</p>
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Presentar productos y categorías al cliente</p>
                                  </div>
                                  <Toggle intent="bot.intent.catalog" checked={intentCatalog} onChange={setIntentCatalog} />
                                </div>
                                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">Consultar precios y promociones</p>
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Informar valores vigentes al comprador</p>
                                  </div>
                                  <Toggle intent="bot.intent.price" checked={intentPrice} onChange={setIntentPrice} />
                                </div>
                              </div>

                              {renderCustomCapabilities("catalog")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Información del Negocio & Ubicación ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center flex-none mt-0.5">
                              <Store className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Información del Negocio & Ubicación
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                  knowsBusinessInfo
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${knowsBusinessInfo ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  {knowsBusinessInfo ? "Activo" : "Inactivo"}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                  {(intentHoursLocation ? 1 : 0) + customCapabilities.filter((c) => c.sourceId === "business" && c.enabled).length} / {1 + customCapabilities.filter((c) => c.sourceId === "business").length} capacidades activas
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Horarios, dirección física, modalidades de entrega y métodos de pago.
                              </p>
                            </div>
                          </div>
                          <Toggle intent="bot.knows.business" checked={knowsBusinessInfo} onChange={setKnowsBusinessInfo} />
                        </div>

                        {knowsBusinessInfo && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 sm:pl-13 space-y-4">
                            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Origen de datos
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Conectado a la configuración de la sede
                              </span>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades</p>
                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">Informar horarios y dirección</p>
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Apertura, ubicación física y zonas de cobertura</p>
                                  </div>
                                  <Toggle intent="bot.intent.hours" checked={intentHoursLocation} onChange={setIntentHoursLocation} />
                                </div>
                              </div>

                              {renderCustomCapabilities("business")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Preguntas Frecuentes (FAQ) ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center flex-none mt-0.5">
                              <HelpCircle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Preguntas Frecuentes (FAQ)
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                  knowsFaq
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${knowsFaq ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  {knowsFaq ? "Activo" : "Inactivo"}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                  {customCapabilities.filter((c) => c.sourceId === "faq" && c.enabled).length} / {Math.max(1, customCapabilities.filter((c) => c.sourceId === "faq").length)} capacidades
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Respuestas estándar sobre cobertura, tiempos de preparación y canales de contacto.
                              </p>
                            </div>
                          </div>
                          <Toggle intent="bot.knows.faq" checked={knowsFaq} onChange={setKnowsFaq} />
                        </div>

                        {knowsFaq && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 sm:pl-13">
                            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-800 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                  Origen de datos
                                </label>
                                <select
                                  value={faqDataSource}
                                  onChange={(e) => setFaqDataSource(e.target.value as any)}
                                  className="h-9 px-3 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-500 focus:outline-hidden"
                                >
                                  <option value="none">Sin configurar</option>
                                  <option value="file">Archivo subido (PDF / TXT / Excel)</option>
                                  <option value="url">URL externa</option>
                                  <option value="manual">Entrada manual</option>
                                </select>
                              </div>

                              {faqDataSource === "none" && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900/50">
                                  <p className="text-xs text-amber-800 dark:text-amber-300">
                                    Carga un archivo con preguntas y respuestas para que el bot responda con precisión.
                                  </p>
                                </div>
                              )}

                              {faqDataSource === "file" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">PDF, TXT, CSV, Excel</span>
                                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium shadow-theme-xs transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Subir Archivo FAQ</span>
                                    <input type="file" accept=".pdf,.txt,.csv,.xlsx,.xls" className="hidden" />
                                  </label>
                                </div>
                              )}

                              {faqDataSource === "url" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800">
                                  <Field
                                    label="URL del documento de FAQ"
                                    type="url"
                                    value=""
                                    onChange={() => {}}
                                    placeholder="https://mi-negocio.com/faq"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades</p>
                              {renderCustomCapabilities("faq")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Políticas de Cambios y Garantías ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center flex-none mt-0.5">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Políticas de Cambios y Garantías
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                  knowsPolicies
                                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                    : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${knowsPolicies ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  {knowsPolicies ? "Activo" : "Inactivo"}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                  {customCapabilities.filter((c) => c.sourceId === "policies" && c.enabled).length} / {Math.max(1, customCapabilities.filter((c) => c.sourceId === "policies").length)} capacidades
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Condiciones oficiales para cancelaciones, devoluciones o reclamos.
                              </p>
                            </div>
                          </div>
                          <Toggle intent="bot.knows.policies" checked={knowsPolicies} onChange={setKnowsPolicies} />
                        </div>

                        {knowsPolicies && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 sm:pl-13">
                            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-800 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                  Origen de datos
                                </label>
                                <select
                                  value={policiesDataSource}
                                  onChange={(e) => setPoliciesDataSource(e.target.value as any)}
                                  className="h-9 px-3 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-500 focus:outline-hidden"
                                >
                                  <option value="none">Sin configurar</option>
                                  <option value="file">Archivo subido (PDF / TXT)</option>
                                  <option value="url">URL externa</option>
                                  <option value="manual">Entrada manual</option>
                                </select>
                              </div>

                              {policiesDataSource === "none" && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900/50">
                                  <p className="text-xs text-amber-800 dark:text-amber-300">
                                    Carga las políticas para que el bot informe devoluciones o reclamos de acuerdo a tus términos.
                                  </p>
                                </div>
                              )}

                              {policiesDataSource === "file" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">PDF, TXT, DOCX</span>
                                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium shadow-theme-xs transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Subir Documento</span>
                                    <input type="file" accept=".pdf,.txt,.docx" className="hidden" />
                                  </label>
                                </div>
                              )}

                              {policiesDataSource === "url" && (
                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800">
                                  <Field
                                    label="URL del documento"
                                    type="url"
                                    value=""
                                    onChange={() => {}}
                                    placeholder="https://mi-negocio.com/politicas"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades</p>
                              {renderCustomCapabilities("policies")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Consulta de Inventario en Tiempo Real ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center flex-none mt-0.5">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Consulta de Inventario en Tiempo Real
                                </h3>
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                    business?.activeModules?.includes("inventarios")
                                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                      : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                  }`}
                                >
                                  {business?.activeModules?.includes("inventarios") ? "Módulo Activo" : "Sin Módulo"}
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                  {(intentStock ? 1 : 0) + customCapabilities.filter((c) => c.sourceId === "inventory" && c.enabled).length} / {1 + customCapabilities.filter((c) => c.sourceId === "inventory").length} capacidades activas
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {business?.activeModules?.includes("inventarios")
                                  ? "Valida existencias en bodega antes de confirmar disponibilidad."
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

                        {knowsInventoryQuery && business?.activeModules?.includes("inventarios") && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 sm:pl-13 space-y-4">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades</p>
                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">Consultar disponibilidad de productos</p>
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Verificar existencias antes de ofrecer un producto</p>
                                  </div>
                                  <Toggle intent="bot.intent.stock" checked={intentStock} onChange={setIntentStock} />
                                </div>
                              </div>

                              {renderCustomCapabilities("inventory")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Gestión de Pedidos (OMS) ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center flex-none mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Gestión de Pedidos (OMS)
                              </h3>
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Conectado al OMS
                              </span>
                              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                {(intentCreateOrder ? 1 : 0) + (intentTrackOrder ? 1 : 0) + (intentModifyOrder ? 1 : 0) + (intentCancelOrder ? 1 : 0) + customCapabilities.filter((c) => c.sourceId === "orders" && c.enabled).length} / {4 + customCapabilities.filter((c) => c.sourceId === "orders").length} capacidades activas
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Acciones operativas sobre órdenes de compra conectadas al sistema de pedidos.
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 sm:pl-13 space-y-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades Operativas</p>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                              {[
                                { intent: "bot.intent.create", label: "Tomar pedido", desc: "Armar orden de compra en el chat", checked: intentCreateOrder, set: setIntentCreateOrder },
                                { intent: "bot.intent.track", label: "Estado del pedido", desc: "Rastrear orden en curso en el OMS", checked: intentTrackOrder, set: setIntentTrackOrder },
                                { intent: "bot.intent.modify", label: "Modificar pedido", desc: "Ajustar ítems antes de preparación", checked: intentModifyOrder, set: setIntentModifyOrder },
                                { intent: "bot.intent.cancel", label: "Cancelar pedido", desc: "Solicitar cancelación de comanda", checked: intentCancelOrder, set: setIntentCancelOrder },
                              ].map((cap) => (
                                <div key={cap.intent} className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{cap.label}</p>
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{cap.desc}</p>
                                  </div>
                                  <Toggle intent={cap.intent} checked={cap.checked} onChange={cap.set} />
                                </div>
                              ))}
                            </div>

                            {renderCustomCapabilities("orders")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Atención Humana ── */}
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden transition-all">
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center flex-none mt-0.5">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Atención Humana
                              </h3>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                intentHumanAgent
                                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                  : "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${intentHumanAgent ? "bg-emerald-500" : "bg-gray-400"}`} />
                                {intentHumanAgent ? "Activo" : "Inactivo"}
                              </span>
                              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                                {(intentHumanAgent ? 1 : 0) + customCapabilities.filter((c) => c.sourceId === "human" && c.enabled).length} / {1 + customCapabilities.filter((c) => c.sourceId === "human").length} capacidades activas
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Transferencia directa a un asesor real cuando el bot no puede resolver la consulta.
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 sm:pl-13 space-y-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacidades</p>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-transparent">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Transferir a asesor humano</p>
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Nativa (Tool)</span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Pase directo a atención humana bajo demanda o por regla</p>
                                </div>
                                <Toggle intent="bot.intent.human" checked={intentHumanAgent} onChange={setIntentHumanAgent} />
                              </div>
                            </div>

                            {renderCustomCapabilities("human")}
                          </div>
                        </div>
                      </div>
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

      {/* ── MODAL VINCULAR WHATSAPP BUSINESS (QR & EMPAREJAMIENTO) ── */}
      {isConnectWhatsAppModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Vincular WhatsApp Business
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Conexión oficial para recepción de pedidos y bot conversacional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectWhatsAppModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de método: QR vs Código */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => setConnectionMethod("qr")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  connectionMethod === "qr"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Escanear Código QR
              </button>
              <button
                type="button"
                onClick={() => setConnectionMethod("code")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  connectionMethod === "code"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Vincular por Teléfono
              </button>
            </div>

            {connectionMethod === "qr" ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800">
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col items-center flex-none">
                  {/* Patrón SVG de código QR oficial de alta fidelidad */}
                  <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                    <rect width="100" height="100" fill="white" />
                    {/* Corners */}
                    <rect x="5" y="5" width="25" height="25" fill="#111827" rx="2" />
                    <rect x="9" y="9" width="17" height="17" fill="white" rx="1" />
                    <rect x="13" y="13" width="9" height="9" fill="#111827" />
                    <rect x="70" y="5" width="25" height="25" fill="#111827" rx="2" />
                    <rect x="74" y="9" width="17" height="17" fill="white" rx="1" />
                    <rect x="78" y="13" width="9" height="9" fill="#111827" />
                    <rect x="5" y="70" width="25" height="25" fill="#111827" rx="2" />
                    <rect x="9" y="74" width="17" height="17" fill="white" rx="1" />
                    <rect x="13" y="78" width="9" height="9" fill="#111827" />
                    {/* Pattern Matrix */}
                    <rect x="35" y="8" width="6" height="6" fill="#111827" />
                    <rect x="45" y="8" width="6" height="6" fill="#111827" />
                    <rect x="55" y="8" width="8" height="6" fill="#111827" />
                    <rect x="35" y="20" width="12" height="6" fill="#111827" />
                    <rect x="52" y="20" width="8" height="6" fill="#111827" />
                    <rect x="10" y="38" width="12" height="6" fill="#111827" />
                    <rect x="26" y="38" width="6" height="14" fill="#111827" />
                    <rect x="38" y="35" width="18" height="18" fill="#059669" rx="3" />
                    <rect x="62" y="38" width="14" height="6" fill="#111827" />
                    <rect x="80" y="38" width="12" height="6" fill="#111827" />
                    <rect x="35" y="60" width="8" height="12" fill="#111827" />
                    <rect x="48" y="58" width="14" height="6" fill="#111827" />
                    <rect x="68" y="58" width="10" height="16" fill="#111827" />
                    <rect x="84" y="60" width="8" height="8" fill="#111827" />
                    <rect x="35" y="78" width="16" height="6" fill="#111827" />
                    <rect x="56" y="78" width="8" height="12" fill="#111827" />
                    <rect x="70" y="80" width="22" height="6" fill="#111827" />
                  </svg>
                  <span className="text-[10px] text-gray-500 mt-2 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
                    Expira en {qrCountdown}s
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Instrucciones de Vinculación
                  </h4>
                  <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-300 list-decimal list-inside">
                    <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
                    <li>Toca <strong>Menú (⋮)</strong> o <strong>Ajustes</strong> y entra a <strong>Dispositivos vinculados</strong>.</li>
                    <li>Toca en <strong>Vincular un dispositivo</strong> y apunta tu cámara al código QR.</li>
                  </ol>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
                    Al escanearlo, tus pedidos y el Asistente IA quedarán conectados automáticamente a esta sede.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Ingresa el número con indicativo de país. Se enviará una solicitud de emparejamiento segura.
                </p>
                <Field
                  label="Número de WhatsApp Business"
                  type="tel"
                  value={pairingPhoneInput}
                  onChange={(e) => setPairingPhoneInput(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsConnectWhatsAppModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWhatsAppConnection}
                disabled={isConnectingSim}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-theme-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {isConnectingSim ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando sesión...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Vinculación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
