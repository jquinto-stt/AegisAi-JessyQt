import { useState, useEffect } from "react";
import { eventBus } from "@/infrastructure/eventBus";
import {
  isChannelConnected,
  isDemoConnection,
  useBusiness,
  whatsappConnection,
} from "../../../../context/BusinessContext";
import type {
  BusinessInstance,
  BotPersonality,
  ImageTransformConfig,
  SoundAlertKey,
} from "../../../../context/BusinessContext";
import {
  DEFAULT_OPENING_DAYS,
  DEFAULT_OPENING_HOURS,
} from "../../../../context/BusinessContext";
import {
  DEFAULT_TRANSFORM,
  DEFAULT_CUSTOM_CAPABILITIES,
  resolveTab,
  type SettingsTabKey,
  type CustomCapability,
  type BotSubTab,
} from "../business-settings.constants";
import type { BusinessSettingsFormValues } from "../business-settings.utils";

/* ── Business settings: form facade hook ───────────────────────────────
 * Owns every piece of state the settings modal used to declare inline
 * (104 useState across 6 tabs). Tabs receive this object as a single
 * `form` prop, so adding a field never changes a prop signature.
 * ─────────────────────────────────────────────────────────────────── */

export function useBusinessSettingsForm(
  business: BusinessInstance | null,
  isOpen: boolean,
  initialTab: string
) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(resolveTab(initialTab));

  // 1. General & Ubicación
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessType, setBusinessType] = useState<BusinessInstance["businessType"]>("restaurant_virtual");
  const [currency, setCurrency] = useState<"COP" | "USD" | "MXN" | "ARS">("COP");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [openingDays, setOpeningDays] = useState(DEFAULT_OPENING_DAYS);
  const [openingHours, setOpeningHours] = useState(DEFAULT_OPENING_HOURS);
  const [serviceDelivery, setServiceDelivery] = useState(true);
  const [serviceTakeaway, setServiceTakeaway] = useState(true);
  const [serviceDineIn, setServiceDineIn] = useState(false);

  // 2. Canales de entrada
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enablePos, setEnablePos] = useState(true);
  const { setChannelConnection, disconnectChannel } = useBusiness();

  const [isWhatsAppWidgetEnabled, setIsWhatsAppWidgetEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_whatsapp_widget_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  /**
   * Estado de la conexión de WhatsApp, **derivado del registro de la tienda**.
   *
   * Antes se leía de la clave global `necto_whatsapp_connected`, con valor por
   * defecto `true`: la conexión era del navegador —dos tiendas compartían el
   * mismo "conectado"— y una tienda nueva nacía conectada sin haber autorizado
   * nada. Ahora la única fuente es `business.channelConnections`.
   */
  const isWhatsAppConnected = isChannelConnected(business, "whatsapp");
  /** ¿Es una demostración y no una autorización real de Meta? */
  const isWhatsAppDemo = isDemoConnection(business, "whatsapp");
  /** Referencias no secretas de la conexión (número visible, WABA…). */
  const whatsappRefs = whatsappConnection(business);

  /*
    Retirado `isConnectWhatsAppModalOpen`. El panel de conexión ya no vive en un
    sub-modal —está empotrado en Canales de entrada—, así que el booleano que
    gobernaba su visibilidad no tenía lector: dejarlo sería estado muerto que
    sugiere una UI que ya no existe.
  */
  const [isConnectingSim, setIsConnectingSim] = useState(false);
  /*
    Retirados `qrCountdown`, `connectionMethod` y `pairingPhoneInput`: eran el
    estado del vínculo por **dispositivos** (QR y código de emparejamiento), que
    no es el mecanismo de la integración con Meta. Sin esa UI no queda nada que
    cuenten, y dejar estado sin lector es deuda que confunde a quien lea después.
  */

  /**
   * Conectar WhatsApp desde Ajustes → Canales escribe la **misma** conexión que
   * el asistente y el modal de módulos: `channelConnections` de la tienda.
   *
   * ⚠️ Sin backend no hay autorización real de Meta —Embedded Signup necesita el
   * servidor que intercambia el código por un token—, así que la conexión queda
   * marcada como **demostración** para que la UI pueda decirlo en pantalla en
   * lugar de aparentar una integración que no existe.
   */
  const handleConfirmWhatsAppConnection = () => {
    if (!business) return;
    setIsConnectingSim(true);
    setTimeout(() => {
      setIsConnectingSim(false);
      setChannelConnection(business.id, {
        type: "whatsapp",
        status: "connected",
        displayPhoneNumber: contactPhone || undefined,
        connectedAt: new Date().toISOString(),
        metadata: { demo: true },
      });
      eventBus.publish("necto_notification_created", {
        title: "WhatsApp vinculado",
        desc: `La sesión de ${contactPhone || "tu teléfono"} quedó activa. Ya recibes mensajes y órdenes por este canal.`,
        type: "system",
        sourceKey: "whatsapp_connection",
      });
    }, 1800);
  };

  const handleDisconnectWhatsApp = () => {
    if (!business) return;
    disconnectChannel(business.id, "whatsapp");
    eventBus.publish("necto_notification_created", {
      title: "WhatsApp desvinculado",
      desc: "La sesión se cerró. No entrarán mensajes nuevos hasta que vuelvas a vincular el canal.",
      type: "alert",
      sourceKey: "whatsapp_connection",
    });
  };

  // 3. Asistente de WhatsApp IA
  const [botSubTab, setBotSubTab] = useState<BotSubTab>("identity");
  const [botName, setBotName] = useState("Necto Bot");
  const [botTone, setBotTone] = useState<"cálido" | "profesional" | "ágil" | "técnico">("cálido");
  const [botPersonality, setBotPersonality] = useState<BotPersonality>("amigable");
  const [responseStyle, setResponseStyle] = useState<"claro" | "conciso" | "extenso">("conciso");
  const [emojiFrequency, setEmojiFrequency] = useState<"nunca" | "moderado" | "frecuente">("moderado");

  const [knowsCatalog, setKnowsCatalog] = useState(true);
  const [knowsBusinessInfo, setKnowsBusinessInfo] = useState(true);
  const [knowsFaq, setKnowsFaq] = useState(true);
  const [knowsPolicies, setKnowsPolicies] = useState(true);
  const [knowsInventoryQuery, setKnowsInventoryQuery] = useState(true);

  const [catalogDataSource, setCatalogDataSource] = useState<"module_db" | "file" | "url">("module_db");
  const [faqDataSource, setFaqDataSource] = useState<"file" | "url" | "manual" | "none">("none");
  const [policiesDataSource, setPoliciesDataSource] = useState<"file" | "url" | "manual" | "none">("none");

  const [intentCatalog, setIntentCatalog] = useState(true);
  const [intentPrice, setIntentPrice] = useState(true);
  const [intentStock, setIntentStock] = useState(true);
  const [intentCreateOrder, setIntentCreateOrder] = useState(true);
  const [intentTrackOrder, setIntentTrackOrder] = useState(true);
  const [intentModifyOrder, setIntentModifyOrder] = useState(false);
  const [intentCancelOrder, setIntentCancelOrder] = useState(false);
  const [intentHoursLocation, setIntentHoursLocation] = useState(true);
  const [intentHumanAgent, setIntentHumanAgent] = useState(true);

  const [customCapabilities, setCustomCapabilities] = useState<CustomCapability[]>(() => {
    try {
      const saved = localStorage.getItem("necto_custom_capabilities");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CUSTOM_CAPABILITIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("necto_custom_capabilities", JSON.stringify(customCapabilities));
    } catch (e) {}
  }, [customCapabilities]);

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
      instruction:
        newCapInstruction.trim() || `Responder al cliente según directiva: ${newCapLabel.trim()}`,
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

  const handleCancelAddCapability = () => {
    setAddingCapSource(null);
    setNewCapLabel("");
    setNewCapDesc("");
    setNewCapInstruction("");
  };

  const handleDeleteCustomCapability = (id: string) => {
    setCustomCapabilities((prev) => prev.filter((c) => c.id !== id));
  };

  const [orderCreationMode, setOrderCreationMode] = useState<
    "auto_new" | "interactive_confirm" | "human_review"
  >("interactive_confirm");
  const [isAutoConfirmOrders, setIsAutoConfirmOrders] = useState(true);
  const [autoConfirmMaxAmount, setAutoConfirmMaxAmount] = useState(100000);
  const [autoConfirmRequireStock, setAutoConfirmRequireStock] = useState(true);
  const [autoConfirmRequireCompleteData, setAutoConfirmRequireCompleteData] = useState(true);
  const [autoConfirmExcludeRestricted, setAutoConfirmExcludeRestricted] = useState(true);

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
  const [handoffBehavior, setHandoffBehavior] = useState<
    "pause_ia" | "assist_agent" | "resume_on_finish"
  >("pause_ia");

  const [isWelcomeEnabled, setIsWelcomeEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "¡Hola! Te damos la bienvenida a nuestro canal de WhatsApp. ¿En qué podemos asesorarte hoy?"
  );
  const [isClosedHoursEnabled, setIsClosedHoursEnabled] = useState(true);
  const [closedHoursMessage, setClosedHoursMessage] = useState(
    "En este momento nuestro equipo humano está fuera de horario. Nuestro asistente puede tomar tu pedido y será preparado a primera hora."
  );
  const [allowOrdersOutsideHours, setAllowOrdersOutsideHours] = useState(true);

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
  const [logoTransform, setLogoTransform] = useState<ImageTransformConfig>(DEFAULT_TRANSFORM);
  const [bannerTransform, setBannerTransform] = useState<ImageTransformConfig>(DEFAULT_TRANSFORM);
  const [brandColor, setBrandColor] = useState("#FF3F1A");
  const [soundAlert, setSoundAlert] = useState<SoundAlertKey>("bell");

  // 6. Operaciones & Sede
  const [isPreparacionEnabled, setIsPreparacionEnabled] = useState<boolean>(true);
  const [kitchenBufferMin, setKitchenBufferMin] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("Vacaciones o Mantenimiento");
  const [pauseMessage, setPauseMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hydration on open
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
      setCode(business.code || "");
      setAddress(business.address || "");
      setOpeningDays(business.openingDays || DEFAULT_OPENING_DAYS);
      setOpeningHours(business.openingHours || DEFAULT_OPENING_HOURS);
      setContactPhone(business.contactPhone || "");
      setContactEmail(business.contactEmail || "");

      // El canal encendido es un dato **de la tienda** (`channels.whatsapp`).
      // Antes se sobreescribía con la clave global `necto_whatsapp_channel_enabled`,
      // así que apagar WhatsApp en una tienda lo apagaba en todas las del navegador.
      setEnableWhatsapp(business.channels?.whatsapp ?? true);
      setEnableWeb(business.channels?.web ?? true);
      setEnablePos(business.channels?.pos ?? true);

      const botCfg = business.assistantConfig;
      if (botCfg) {
        setBotPersonality(botCfg.botPersonality || "amigable");
        if (botCfg.botName) setBotName(botCfg.botName);
        if (botCfg.botTone) setBotTone(botCfg.botTone);
        if (botCfg.responseStyle) setResponseStyle(botCfg.responseStyle);
        if (botCfg.emojiFrequency) setEmojiFrequency(botCfg.emojiFrequency);

        if (botCfg.knowledgeSources) {
          setKnowsCatalog(botCfg.knowledgeSources.catalog ?? true);
          setKnowsBusinessInfo(botCfg.knowledgeSources.businessInfo ?? true);
          setKnowsFaq(botCfg.knowledgeSources.faq ?? true);
          setKnowsPolicies(botCfg.knowledgeSources.policies ?? true);
          setKnowsInventoryQuery(botCfg.knowledgeSources.inventoryQuery ?? true);
        }

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

        if (botCfg.orderCreationMode) setOrderCreationMode(botCfg.orderCreationMode);
        if (botCfg.autoConfirmCriteria) {
          setAutoConfirmMaxAmount(botCfg.autoConfirmCriteria.maxAmount ?? 100000);
          setAutoConfirmRequireStock(botCfg.autoConfirmCriteria.requireStock ?? true);
          setAutoConfirmRequireCompleteData(botCfg.autoConfirmCriteria.requireCompleteData ?? true);
          setAutoConfirmExcludeRestricted(botCfg.autoConfirmCriteria.excludeRestricted ?? true);
        } else if (botCfg.autoConfirmMaxAmount) {
          setAutoConfirmMaxAmount(botCfg.autoConfirmMaxAmount);
        }

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

        if (botCfg.allowOrdersOutsideHours !== undefined) {
          setAllowOrdersOutsideHours(botCfg.allowOrdersOutsideHours);
        }

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

        setNequiNumber(botCfg.nequiNumber || "");
        setDaviplataNumber(botCfg.daviplataNumber || "");
        setBancolombiaAccount(botCfg.bancolombiaAccount || "");
        setAccountHolder(botCfg.accountHolder || "");
        setAccountNit(botCfg.accountNit || "");
        setAllowCashOnDelivery(botCfg.allowCashOnDelivery ?? true);
        setAllowCardTerminal(botCfg.allowCardTerminal ?? true);
      }

      setLogoUrl(business.logoUrl || "");
      setBannerUrl(business.bannerUrl || "");
      setLogoTransform(business.logoTransform || DEFAULT_TRANSFORM);
      setBannerTransform(business.bannerTransform || DEFAULT_TRANSFORM);
      setBrandColor(business.brandColor || "#FF3F1A");
      setSoundAlert(business.soundAlert || "bell");

      setIsPreparacionEnabled(business.isPreparacionEnabled ?? true);
      setKitchenBufferMin(business.kitchenBufferMin ?? 20);
      setIsPaused(business.pauseConfig?.isPaused ?? false);
      setPauseReason(business.pauseConfig?.reason || "Vacaciones o Mantenimiento");
      setPauseMessage(business.pauseConfig?.autoReplyMessage || "");
      setConfirmDelete(false);
    }
  }, [business, isOpen, initialTab]);

  /** Snapshot of every persisted field, ready for buildBusinessPayload(). */
  const toFormValues = (): BusinessSettingsFormValues => ({
    name, slug, businessType, currency, city, country, contactPhone, contactEmail,
    code, address, openingDays, openingHours,
    enableWhatsapp, enableWeb, enablePos,
    botName, botTone, botPersonality, responseStyle, emojiFrequency,
    knowsCatalog, knowsBusinessInfo, knowsFaq, knowsPolicies, knowsInventoryQuery,
    intentCatalog, intentPrice, intentStock, intentCreateOrder, intentTrackOrder,
    intentModifyOrder, intentCancelOrder, intentHoursLocation, intentHumanAgent,
    orderCreationMode, isAutoConfirmOrders, autoConfirmMaxAmount, autoConfirmRequireStock,
    autoConfirmRequireCompleteData, autoConfirmExcludeRestricted,
    isHandoffEnabled, handoffToHumanMessage, handoffTriggerUserRequest, handoffTriggerUnhandled,
    handoffTriggerUnhappy, handoffTriggerOutOfStock, handoffTriggerHighAmount,
    handoffTriggerRequiresAuth, handoffTarget, handoffBehavior,
    isWelcomeEnabled, welcomeMessage, isClosedHoursEnabled, closedHoursMessage,
    allowOrdersOutsideHours, expShowCatalogCards, expShowCategories, expShowPictures,
    expShowPrices, expInlineCart, expPreConfirmationSummary, isOrderConfirmedEnabled,
    orderConfirmedMessage, isDelayAlertEnabled, delayAlertMinutes,
    nequiNumber, daviplataNumber, bancolombiaAccount, accountHolder, accountNit,
    allowCashOnDelivery, allowCardTerminal,
    logoUrl, bannerUrl, logoTransform, bannerTransform, brandColor, soundAlert,
    isPreparacionEnabled, kitchenBufferMin, isPaused, pauseReason, pauseMessage,
  });

  return {
    activeTab, setActiveTab,
    // 1
    name, setName, slug, setSlug, businessType, setBusinessType, currency, setCurrency,
    city, setCity, country, setCountry, address, setAddress, contactPhone, setContactPhone,
    code, setCode,
    contactEmail, setContactEmail, openingDays, setOpeningDays, openingHours, setOpeningHours,
    serviceDelivery, setServiceDelivery, serviceTakeaway, setServiceTakeaway,
    serviceDineIn, setServiceDineIn,
    // 2
    enableWhatsapp, setEnableWhatsapp, enableWeb, setEnableWeb, enablePos, setEnablePos,
    isWhatsAppWidgetEnabled, setIsWhatsAppWidgetEnabled, isWhatsAppConnected,
    /** ¿La conexión es una demostración (sin autorización real de Meta)? */
    isWhatsAppDemo,
    /** Referencias no secretas de la conexión: número visible, WABA, enrutado. */
    whatsappRefs,
    isConnectingSim, handleConfirmWhatsAppConnection,
    handleDisconnectWhatsApp,
    // 3
    botSubTab, setBotSubTab, botName, setBotName, botTone, setBotTone, botPersonality,
    setBotPersonality, responseStyle, setResponseStyle, emojiFrequency, setEmojiFrequency,
    knowsCatalog, setKnowsCatalog, knowsBusinessInfo, setKnowsBusinessInfo, knowsFaq, setKnowsFaq,
    knowsPolicies, setKnowsPolicies, knowsInventoryQuery, setKnowsInventoryQuery,
    catalogDataSource, setCatalogDataSource, faqDataSource, setFaqDataSource,
    policiesDataSource, setPoliciesDataSource,
    intentCatalog, setIntentCatalog, intentPrice, setIntentPrice, intentStock, setIntentStock,
    intentCreateOrder, setIntentCreateOrder, intentTrackOrder, setIntentTrackOrder,
    intentModifyOrder, setIntentModifyOrder, intentCancelOrder, setIntentCancelOrder,
    intentHoursLocation, setIntentHoursLocation, intentHumanAgent, setIntentHumanAgent,
    customCapabilities, addingCapSource, setAddingCapSource, newCapLabel, setNewCapLabel,
    newCapDesc, setNewCapDesc, newCapInstruction, setNewCapInstruction,
    handleAddCustomCapability, handleToggleCustomCapability, handleDeleteCustomCapability,
    handleCancelAddCapability,
    orderCreationMode, setOrderCreationMode, isAutoConfirmOrders, setIsAutoConfirmOrders,
    autoConfirmMaxAmount, setAutoConfirmMaxAmount, autoConfirmRequireStock,
    setAutoConfirmRequireStock, autoConfirmRequireCompleteData, setAutoConfirmRequireCompleteData,
    autoConfirmExcludeRestricted, setAutoConfirmExcludeRestricted,
    isHandoffEnabled, setIsHandoffEnabled, handoffToHumanMessage, setHandoffToHumanMessage,
    handoffTriggerUserRequest, setHandoffTriggerUserRequest, handoffTriggerUnhandled,
    setHandoffTriggerUnhandled, handoffTriggerUnhappy, setHandoffTriggerUnhappy,
    handoffTriggerOutOfStock, setHandoffTriggerOutOfStock, handoffTriggerHighAmount,
    setHandoffTriggerHighAmount, handoffTriggerRequiresAuth, setHandoffTriggerRequiresAuth,
    handoffTarget, setHandoffTarget, handoffBehavior, setHandoffBehavior,
    isWelcomeEnabled, setIsWelcomeEnabled, welcomeMessage, setWelcomeMessage,
    isClosedHoursEnabled, setIsClosedHoursEnabled, closedHoursMessage, setClosedHoursMessage,
    allowOrdersOutsideHours, setAllowOrdersOutsideHours,
    expShowCatalogCards, setExpShowCatalogCards, expShowCategories, setExpShowCategories,
    expShowPictures, setExpShowPictures, expShowPrices, setExpShowPrices,
    expInlineCart, setExpInlineCart, expPreConfirmationSummary, setExpPreConfirmationSummary,
    isOrderConfirmedEnabled, setIsOrderConfirmedEnabled, orderConfirmedMessage,
    setOrderConfirmedMessage, isDelayAlertEnabled, setIsDelayAlertEnabled,
    delayAlertMinutes, setDelayAlertMinutes,
    // 4
    nequiNumber, setNequiNumber, daviplataNumber, setDaviplataNumber, bancolombiaAccount,
    setBancolombiaAccount, accountHolder, setAccountHolder, accountNit, setAccountNit,
    allowCashOnDelivery, setAllowCashOnDelivery, allowCardTerminal, setAllowCardTerminal,
    // 5
    logoUrl, setLogoUrl, bannerUrl, setBannerUrl, logoTransform, setLogoTransform,
    bannerTransform, setBannerTransform, brandColor, setBrandColor, soundAlert, setSoundAlert,
    // 6
    isPreparacionEnabled, setIsPreparacionEnabled, kitchenBufferMin, setKitchenBufferMin,
    isPaused, setIsPaused, pauseReason, setPauseReason, pauseMessage, setPauseMessage,
    confirmDelete, setConfirmDelete,
    // util
    toFormValues,
  };
}

export type BusinessSettingsForm = ReturnType<typeof useBusinessSettingsForm>;

/**
 * The object actually handed to each tab. The shell augments the hook's return
 * with the upload handlers (which need `setUserAvatarUrl` from the business
 * context) and the derived preview location, so tabs stay pure presentational.
 */
export interface BusinessSettingsTabForm extends BusinessSettingsForm {
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewLocation: string;
  /** The instance being edited (null = creating a new location). */
  business: BusinessInstance | null;
  /** Persists a partial update straight to the store (used by inline actions). */
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
  /** Deletes the current location after the destructive confirmation. */
  handleDelete: () => void;
}
