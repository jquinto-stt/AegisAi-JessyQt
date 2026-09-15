import type { BusinessInstance, BotPersonality } from "../../../context/BusinessContext";

/* ── Business settings: payload builder ────────────────────────────────
 * Pure mapper from the modal's form values to the `Partial<BusinessInstance>`
 * written back to the store. Extracted so the shape of what we persist can be
 * read and tested in isolation, away from 100+ useState declarations.
 * ─────────────────────────────────────────────────────────────────── */

/** Every form field the modal collects, as a single flat object. */
export interface BusinessSettingsFormValues {
  name: string;
  slug: string;
  businessType: BusinessInstance["businessType"];
  currency: "COP" | "USD" | "MXN" | "ARS";
  city: string;
  country: string;
  // Sucursal: identidad y ubicación. `address`/`openingDays`/`openingHours` los
  // recogía el formulario desde siempre pero **no se persistían** (faltaban en el
  // payload), así que se perdían al guardar. Ahora viajan con el resto.
  code: string;
  address: string;
  openingDays: string;
  openingHours: string;
  contactPhone: string;
  contactEmail: string;
  // Channels
  enableWhatsapp: boolean;
  enableWeb: boolean;
  enablePos: boolean;
  // Bot identity
  botName: string;
  botTone: "cálido" | "profesional" | "ágil" | "técnico";
  botPersonality: BotPersonality;
  responseStyle: "claro" | "conciso" | "extenso";
  emojiFrequency: "nunca" | "moderado" | "frecuente";
  // Knowledge
  knowsCatalog: boolean;
  knowsBusinessInfo: boolean;
  knowsFaq: boolean;
  knowsPolicies: boolean;
  knowsInventoryQuery: boolean;
  // Intents
  intentCatalog: boolean;
  intentPrice: boolean;
  intentStock: boolean;
  intentCreateOrder: boolean;
  intentTrackOrder: boolean;
  intentModifyOrder: boolean;
  intentCancelOrder: boolean;
  intentHoursLocation: boolean;
  intentHumanAgent: boolean;
  // OMS
  orderCreationMode: "auto_new" | "interactive_confirm" | "human_review";
  isAutoConfirmOrders: boolean;
  autoConfirmMaxAmount: number;
  autoConfirmRequireStock: boolean;
  autoConfirmRequireCompleteData: boolean;
  autoConfirmExcludeRestricted: boolean;
  // Handoff
  isHandoffEnabled: boolean;
  handoffToHumanMessage: string;
  handoffTriggerUserRequest: boolean;
  handoffTriggerUnhandled: boolean;
  handoffTriggerUnhappy: boolean;
  handoffTriggerOutOfStock: boolean;
  handoffTriggerHighAmount: boolean;
  handoffTriggerRequiresAuth: boolean;
  handoffTarget: "general" | "sales" | "support" | "ops";
  handoffBehavior: "pause_ia" | "assist_agent" | "resume_on_finish";
  // Hours
  isWelcomeEnabled: boolean;
  welcomeMessage: string;
  isClosedHoursEnabled: boolean;
  closedHoursMessage: string;
  allowOrdersOutsideHours: boolean;
  // Experience
  expShowCatalogCards: boolean;
  expShowCategories: boolean;
  expShowPictures: boolean;
  expShowPrices: boolean;
  expInlineCart: boolean;
  expPreConfirmationSummary: boolean;
  isOrderConfirmedEnabled: boolean;
  orderConfirmedMessage: string;
  isDelayAlertEnabled: boolean;
  delayAlertMinutes: number;
  // Payments
  nequiNumber: string;
  daviplataNumber: string;
  bancolombiaAccount: string;
  accountHolder: string;
  accountNit: string;
  allowCashOnDelivery: boolean;
  allowCardTerminal: boolean;
  // Branding
  logoUrl: string;
  bannerUrl: string;
  logoTransform: BusinessInstance["logoTransform"];
  bannerTransform: BusinessInstance["bannerTransform"];
  brandColor: string;
  soundAlert: BusinessInstance["soundAlert"];
  // Operations
  isPreparacionEnabled: boolean;
  kitchenBufferMin: number;
  isPaused: boolean;
  pauseReason: string;
  pauseMessage: string;
}

/**
 * Builds the persistence payload. `existing` is merged into `assistantConfig` so
 * the fields this modal does not edit survive a save.
 */
export function buildBusinessPayload(
  v: BusinessSettingsFormValues,
  existing?: BusinessInstance | null
): Partial<BusinessInstance> {
  return {
    name: v.name.trim(),
    slug: (v.slug.trim() || v.name.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    businessType: v.businessType,
    code: v.code.trim(),
    address: v.address.trim(),
    openingDays: v.openingDays.trim(),
    openingHours: v.openingHours.trim(),
    city: v.city.trim(),
    country: v.country.trim(),
    currency: v.currency,
    contactPhone: v.contactPhone.trim(),
    contactEmail: v.contactEmail.trim(),
    logoUrl: v.logoUrl.trim(),
    bannerUrl: v.bannerUrl.trim(),
    logoTransform: v.logoTransform,
    bannerTransform: v.bannerTransform,
    brandColor: v.brandColor,
    soundAlert: v.soundAlert,
    kitchenBufferMin: v.kitchenBufferMin,
    isPreparacionEnabled: v.isPreparacionEnabled,
    channels: {
      whatsapp: v.enableWhatsapp,
      web: v.enableWeb,
      pos: v.enablePos,
    },
    assistantConfig: {
      ...existing?.assistantConfig,
      botName: v.botName,
      botTone: v.botTone,
      botPersonality: v.botPersonality,
      responseStyle: v.responseStyle,
      emojiFrequency: v.emojiFrequency,
      knowledgeSources: {
        catalog: v.knowsCatalog,
        businessInfo: v.knowsBusinessInfo,
        faq: v.knowsFaq,
        policies: v.knowsPolicies,
        inventoryQuery: v.knowsInventoryQuery,
      },
      supportedIntents: {
        catalog: v.intentCatalog,
        price: v.intentPrice,
        stock: v.intentStock,
        createOrder: v.intentCreateOrder,
        trackOrder: v.intentTrackOrder,
        modifyOrder: v.intentModifyOrder,
        cancelOrder: v.intentCancelOrder,
        hoursLocation: v.intentHoursLocation,
        humanAgent: v.intentHumanAgent,
      },
      orderCreationMode: v.orderCreationMode,
      autoConfirmCriteria: {
        maxAmount: v.autoConfirmMaxAmount,
        requireStock: v.autoConfirmRequireStock,
        requireCompleteData: v.autoConfirmRequireCompleteData,
        excludeRestricted: v.autoConfirmExcludeRestricted,
      },
      handoffTriggers: {
        userRequest: v.handoffTriggerUserRequest,
        unhandledQuery: v.handoffTriggerUnhandled,
        unhappyCustomer: v.handoffTriggerUnhappy,
        outOfStock: v.handoffTriggerOutOfStock,
        highAmount: v.handoffTriggerHighAmount,
        requiresApproval: v.handoffTriggerRequiresAuth,
      },
      handoffTarget: v.handoffTarget,
      handoffBehavior: v.handoffBehavior,
      allowOrdersOutsideHours: v.allowOrdersOutsideHours,
      customerExperience: {
        showCatalogCards: v.expShowCatalogCards,
        showCategories: v.expShowCategories,
        showPictures: v.expShowPictures,
        showPrices: v.expShowPrices,
        inlineCart: v.expInlineCart,
        preConfirmationSummary: v.expPreConfirmationSummary,
      },
      isWelcomeEnabled: v.isWelcomeEnabled,
      welcomeMessage: v.welcomeMessage,
      isClosedHoursEnabled: v.isClosedHoursEnabled,
      closedHoursMessage: v.closedHoursMessage,
      isHandoffEnabled: v.isHandoffEnabled,
      handoffToHumanMessage: v.handoffToHumanMessage,
      isOrderConfirmedEnabled: v.isOrderConfirmedEnabled,
      orderConfirmedMessage: v.orderConfirmedMessage,
      isAutoConfirmOrders: v.isAutoConfirmOrders,
      autoConfirmMaxAmount: v.autoConfirmMaxAmount,
      isDelayAlertEnabled: v.isDelayAlertEnabled,
      delayAlertMinutes: v.delayAlertMinutes,
      nequiNumber: v.nequiNumber,
      daviplataNumber: v.daviplataNumber,
      bancolombiaAccount: v.bancolombiaAccount,
      accountHolder: v.accountHolder,
      accountNit: v.accountNit,
      allowCashOnDelivery: v.allowCashOnDelivery,
      allowCardTerminal: v.allowCardTerminal,
    },
    pauseConfig: {
      isPaused: v.isPaused,
      reason: v.pauseReason,
      autoReplyMessage: v.pauseMessage,
    },
  };
}

/** Derives the display location, avoiding "Medellín, Colombia · Colombia". */
export function previewLocation(city: string, country: string): string {
  const cityPart = city.trim();
  const countryPart = country.trim();
  if (!cityPart && !countryPart) return "Ciudad · País";
  if (cityPart && countryPart && cityPart.toLowerCase().includes(countryPart.toLowerCase())) {
    return cityPart;
  }
  return [cityPart, countryPart].filter(Boolean).join(" · ");
}
