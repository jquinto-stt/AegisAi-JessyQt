/* ── Business taxonomy ─────────────────────────────────────────────── */

export type BusinessType =
  // Gastronomía
  | "restaurant_virtual"
  | "cafe_bakery"
  | "fast_food"
  | "bar_brewery"
  // Retail y comercio
  | "retail_store"
  | "fashion_footwear"
  | "hardware_store"
  | "tech_electronics"
  | "ecommerce_direct"
  // Servicios y citas
  | "services"
  | "technical_service"
  | "consulting_appointments"
  // Salud y bienestar
  | "pharmacy_health"
  | "nutrition_supplements"
  | "clinic_optics";

export type OfferModel =
  | "physical_products"
  | "prepared_products"
  | "services_appointments"
  | "hybrid";

export type NectoModuleKey =
  | "referidos"
  | "pedidos"
  | "agendamiento"
  | "reservas"
  | "inventarios"
  | "turnos";

export type BusinessIconKey =
  | "utensils"
  | "flame"
  | "coffee"
  | "store"
  | "chef"
  | "layers"
  | "shirt"
  | "wrench"
  | "pill"
  | "laptop"
  | "scissors"
  | "shopping-bag";

export type SoundAlertKey = "bell" | "chime" | "kitchen_ding" | "pos_beep" | "mute";
export type BotPersonality = "amigable" | "ejecutivo" | "chef" | "dinamico";
export type HolidayTheme = "none" | "halloween" | "navidad" | "ano_nuevo" | "black_friday" | "san_valentin";

/* ── Archetype ─────────────────────────────────────────────────────── */

export interface ArchetypeDefinition {
  id: BusinessType;
  label: string;
  category: "gastronomy" | "retail" | "services" | "health" | "custom";
  description: string;
  defaultOfferModel: OfferModel;
  recommendedModules: NectoModuleKey[];
  defaultCategories: string[];
  iconKey: BusinessIconKey;
}

/* ── Business configuration ────────────────────────────────────────── */

export interface BusinessChannelConfig {
  whatsapp: boolean;
  web: boolean;
  pos: boolean;
}

export interface BusinessScheduledPause {
  isPaused: boolean;
  pauseStartDate?: string;
  pauseEndDate?: string;
  reason?: string;
  autoReplyMessage?: string;
}

/* ── Canales y sus conexiones ──────────────────────────────────────── */

/**
 * Canales por los que una tienda puede atender. WhatsApp es **uno más**: el
 * modelo admite web, POS e Instagram sin cambiar de forma, y por eso la conexión
 * no se llama `WhatsAppConnection` sino `ChannelConnection` con un `type`.
 */
export type ChannelType = "whatsapp" | "web" | "pos";

/**
 * Estado de la conexión de un canal.
 *
 * `not_connected` es el estado **real** de una tienda recién creada: no hay
 * conexión hasta que alguien la autoriza, y eso no se puede suponer. Antes el
 * modelo arrancaba en "conectado", así que una tienda nueva nacía recibiendo
 * pedidos por un canal que nunca se vinculó.
 */
export type ChannelConnectionStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "error";

export interface ChannelConnectionMetadata {
  /** ¿Hay ventana de chat flotante en la tienda web? (ajuste del canal) */
  widgetEnabled?: boolean;
  /**
   * La conexión es una **demostración**, no una autorización real de Meta.
   * Existe para que la UI pueda decirlo en pantalla en lugar de aparentar una
   * integración que todavía no está hecha.
   */
  demo?: boolean;
  /** Último error de conexión, para poder contarlo en la UI. */
  lastError?: string;
}

/**
 * Conexión de una tienda con un canal.
 *
 * ⚠️ Guarda **sólo referencias no secretas**. Los tokens de Meta viven en el
 * backend (secret manager): el navegador nunca los lee ni los escribe. Por eso
 * aquí no hay `accessToken` ni `appSecret`, y **no debe añadirse ninguno**.
 * `phoneNumberId` es la clave con la que el backend enruta cada webhook a su
 * tienda; sin ella, un mensaje entrante no se puede atribuir a nadie.
 */
export interface ChannelConnection {
  /**
   * Tienda a la que pertenece la conexión.
   *
   * ⚠️ Hoy la conexión vive dentro de `BusinessInstance.channelConnections`, así
   * que esto es redundante **dentro del navegador** — y aun así se guarda: el
   * registro tiene que poder vivir **fuera** de su contenedor. El backend enruta
   * cada webhook por `phoneNumberId` y necesita saber de quién es ese número sin
   * recorrer todas las tiendas; un registro que sólo se entiende dentro de su
   * tienda no sirve para eso.
   *
   * Lo **estampa el escritor** (`setChannelConnection`), nunca quien llama: así no
   * puede discrepar del contenedor.
   */
  businessId: string;
  type: ChannelType;
  status: ChannelConnectionStatus;
  /** Identificador de la cuenta de negocio de WhatsApp (WABA). */
  wabaId?: string;
  /** Identificador del número en Meta. Clave de enrutado de los webhooks. */
  phoneNumberId?: string;
  /** Número visible que atiende el canal. */
  displayPhoneNumber?: string;
  connectedAt?: string;
  metadata?: ChannelConnectionMetadata;
}

export interface BusinessSetupProgress {
  menuConfigured: boolean;
  kitchenConfigured: boolean;
  teamInvited: boolean;
}

export interface ImageTransformConfig {
  scale: number;    // 0.5 to 3
  rotate: number;   // -180 to 180 degrees
  posX: number;     // -100 to 100 percentage offset
  posY: number;     // -100 to 100 percentage offset
}

/**
 * Configuración del **asistente** de la tienda.
 *
 * ⚠️ El asistente es una **capacidad de la tienda**, no de un canal. WhatsApp es
 * hoy el transporte por el que conversa —y por eso la conexión con Meta vive en
 * `ChannelConnection`—, pero la personalidad, el conocimiento y las reglas son del
 * negocio: el mismo asistente atiende la web o el POS sin cambiar de forma.
 * Antes este tipo se llamaba `WhatsAppBotConfig`, así que el asistente parecía
 * propiedad de WhatsApp y no se podía sumar otro canal sin duplicarlo.
 *
 * Los campos internos conservan el prefijo `bot*` (`botName`, `botPersonality`…):
 * es el vocabulario del asistente dentro del código, y el copy que ve el usuario
 * dice "asistente" en todas partes.
 */
export interface AssistantConfig {
  welcomeMessage?: string;
  isWelcomeEnabled?: boolean;
  paymentInfoMessage?: string;
  isPaymentInfoEnabled?: boolean;
  closedHoursMessage?: string;
  isClosedHoursEnabled?: boolean;
  handoffToHumanMessage?: string;
  isHandoffEnabled?: boolean;
  orderConfirmedMessage?: string;
  isOrderConfirmedEnabled?: boolean;

  // AI & Personality
  botPersonality?: BotPersonality;
  botName?: string;
  botTone?: "cálido" | "profesional" | "ágil" | "técnico";
  responseStyle?: "claro" | "conciso" | "extenso";
  emojiFrequency?: "nunca" | "moderado" | "frecuente";
  isAiUpsellEnabled?: boolean;
  upsellMessage?: string;
  isAutoConfirmOrders?: boolean;
  autoConfirmMaxAmount?: number;
  delayAlertMinutes?: number;
  isDelayAlertEnabled?: boolean;

  // 2. Fuentes de Conocimiento del Asistente
  knowledgeSources?: {
    catalog: boolean;
    businessInfo: boolean;
    faq: boolean;
    policies: boolean;
    inventoryQuery: boolean;
  };

  // 3. Intenciones Soportadas
  supportedIntents?: {
    catalog: boolean;
    price: boolean;
    stock: boolean;
    createOrder: boolean;
    trackOrder: boolean;
    modifyOrder: boolean;
    cancelOrder: boolean;
    hoursLocation: boolean;
    humanAgent: boolean;
  };

  // 4. Reglas Creación & Confirmación OMS
  orderCreationMode?: "auto_new" | "interactive_confirm" | "human_review";
  autoConfirmCriteria?: {
    maxAmount: number;
    requireStock: boolean;
    requireCompleteData: boolean;
    excludeRestricted: boolean;
  };

  // 5. Handoff a Humano
  handoffTriggers?: {
    userRequest: boolean;
    unhandledQuery: boolean;
    unhappyCustomer: boolean;
    outOfStock: boolean;
    highAmount: boolean;
    requiresApproval: boolean;
  };
  handoffTarget?: "general" | "sales" | "support" | "ops";
  handoffBehavior?: "pause_ia" | "assist_agent" | "resume_on_finish";

  // 6. Horarios y Disponibilidad del Asistente
  allowOrdersOutsideHours?: boolean;

  // 7. Experiencia Conversacional del Cliente
  customerExperience?: {
    showCatalogCards: boolean;
    showCategories: boolean;
    showPictures: boolean;
    showPrices: boolean;
    inlineCart: boolean;
    preConfirmationSummary: boolean;
  };

  // Holiday / Seasonal Profiles
  activeHolidayTheme?: HolidayTheme;
  isHolidayMessageEnabled?: boolean;
  holidayMessage?: string;

  // Payment Accounts & Methods
  nequiNumber?: string;
  daviplataNumber?: string;
  bancolombiaAccount?: string;
  accountHolder?: string;
  accountNit?: string;
  allowCashOnDelivery?: boolean;
  allowCardTerminal?: boolean;
  paymentInstructions?: string;
}

/**
 * Identidad de la **tienda** (el negocio), no de una sucursal.
 *
 * El modelo es `Usuario/Titular → es propietario de → Tienda → contiene → Sucursales`.
 * Estos campos describen al negocio entero: son iguales en todas sus sucursales y
 * se definen **una sola vez**, cuando la tienda nace con su primera sucursal.
 * Por eso no viven en el wizard de sucursal: se heredan.
 *
 * ⚠️ Siguen almacenados en cada `BusinessInstance` (una copia por sucursal) porque
 * el almacén no tiene una entidad "tienda" aparte; la separación de ámbitos se
 * garantiza en el flujo de alta, que sólo pregunta estos campos la primera vez.
 * Unificar el almacén en dos colecciones es un refactor mayor, no un arreglo.
 */
export interface StoreIdentity {
  businessType: BusinessType;
  offerModel: OfferModel;
  iconKey: BusinessIconKey;
  currency: "COP" | "USD" | "MXN" | "ARS";
  country: string;
}

/**
 * Una **sucursal**: una unidad operativa de la tienda.
 *
 * Los campos de identidad de la tienda (`businessType`, `offerModel`, `iconKey`,
 * `currency`, `specialty`) y los de marca (`logoUrl`, `bannerUrl`, `brandColor`)
 * son de ámbito de tienda; el resto es de ámbito de sucursal.
 */
export interface BusinessInstance {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  offerModel?: OfferModel;
  iconKey: BusinessIconKey;
  logoUrl?: string;
  logoTransform?: ImageTransformConfig;
  bannerUrl?: string;
  bannerTransform?: ImageTransformConfig;
  brandColor?: string;
  soundAlert?: SoundAlertKey;
  currency: "COP" | "USD" | "MXN" | "ARS";
  city: string;
  country?: string;
  /** Código interno de la sucursal (p. ej. "SUC-01"). Identifica la unidad en reportes y pedidos. */
  code?: string;
  /** Dirección física de la sucursal. */
  address?: string;
  /** Días de operación declarados (texto libre: "Lunes a sábado"). */
  openingDays?: string;
  /** Horario habitual declarado (texto libre: "10:00 - 22:00"). */
  openingHours?: string;
  contactPhone?: string;
  contactEmail?: string;
  channels: BusinessChannelConfig;
  /**
   * Conexiones con los canales de la tienda. Puede estar vacío: una tienda sin
   * ninguna conexión es un estado válido y frecuente.
   *
   * El estado es **de la tienda**, no del navegador. Antes vivía en una clave
   * global de `localStorage` (`necto_whatsapp_connected`) con valor por defecto
   * `true`, así que dos tiendas compartían el mismo "conectado" y una tienda
   * nueva nacía conectada.
   */
  channelConnections: ChannelConnection[];
  kitchenBufferMin: number;
  specialty?: string;
  activeModules: NectoModuleKey[];
  pauseConfig?: BusinessScheduledPause;
  setupProgress?: BusinessSetupProgress;
  /**
   * Configuración del asistente de la tienda (capacidad del negocio, no del
   * canal). El campo se llamaba `whatsappBotConfig`; `useBusinesses` lo migra al
   * cargar para que una tienda guardada antes no pierda su asistente.
   */
  assistantConfig?: AssistantConfig;
  isPreparacionEnabled?: boolean;
  createdAt: string;
}

/* ── Roles & permissions ───────────────────────────────────────────── */

export interface RolePermissions {
  canViewBandeja: boolean;
  canCreateOrders: boolean;
  canViewKDS: boolean;
  canDispatchKDS: boolean;
  canViewCatalogo: boolean;
  canEditCatalogo: boolean;
  canViewInsumos: boolean;
  canEditInsumos: boolean;
  canViewAnalitica: boolean;
  canViewHistorial: boolean;
  canViewAutomatizaciones: boolean;
  canViewTurnos: boolean;
  canManageRoles: boolean;
}

/**
 * Rol del titular con su matriz de capacidades. Hoy el catálogo tiene un único
 * miembro (`CLIENT_ADMIN_ROLE`): se mantiene como interfaz porque la matriz la
 * consumen los paneles de permisos y el shell.
 */
export interface RolePermission {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
}

/* ── Semantics (tenant vocabulary) ─────────────────────────────────── */

export interface BusinessSemanticConfig {
  orderSingle: string;
  orderPlural: string;
  orderNoun: string;
  orderNounPlural: string;
  stationName: string;
  stationShortName: string;
  stationNoun: string;
  stationAction: string;
  preparationVerb: string;
  readyVerb: string;
  deliveredVerb: string;
  catalogItem: string;
  tableOrChannel: string;
  itemModifiers: string;
  fulfillmentAgent: string;
  requiresKitchenDisplay: boolean;
  requiresTableNumber: boolean;
  botGreetingTemplate: string;
  botPersona: string;
}

/**
 * Datos con los que nace una sucursal.
 *
 * ⚠️ Las conexiones entran **sin** `businessId`: el id de la tienda lo genera el
 * dominio al crearla, así que quien llama construye la lista antes de que exista.
 * Se estampa al crear la tienda, que es el único momento en que ya se conoce.
 */
export type NewBusinessInput = Omit<
  BusinessInstance,
  "id" | "createdAt" | "channelConnections"
> & {
  channelConnections?: Omit<ChannelConnection, "businessId">[];
};

/* ── Context contract ──────────────────────────────────────────────── */

export interface BusinessContextType {
  businesses: BusinessInstance[];
  /** `null` mientras la cuenta no tenga ninguna sede creada. */
  activeBusiness: BusinessInstance | null;
  activeBusinessId: string;
  /**
   * Identidad de la tienda (ámbito de toda la red). `null` mientras no exista
   * ninguna sucursal: la primera es la que da de alta la tienda, así que hasta
   * entonces el wizard tiene que preguntarla.
   */
  storeIdentity: StoreIdentity | null;
  semantics: BusinessSemanticConfig;
  activeRole: RolePermission;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleModule: (businessId: string, moduleKey: NectoModuleKey) => void;
  createBusiness: (data: NewBusinessInput) => BusinessInstance;
  switchBusiness: (id: string) => void;
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
  /**
   * Registra la conexión de un canal en una tienda.
   *
   * Es el **único camino de escritura** del estado de conexión: antes lo
   * escribían tres sitios distintos (una clave global de `localStorage`,
   * `setupProgress` y el estado local del formulario) y podían discrepar.
   */
  setChannelConnection: (
    businessId: string,
    connection: Omit<ChannelConnection, "businessId">
  ) => void;
  /** Desconecta un canal y descarta sus referencias de Meta (quedan revocadas). */
  disconnectChannel: (businessId: string, type: ChannelType) => void;
  /**
   * Actualiza un dato de ámbito **tienda** (identidad del negocio) en **todas**
   * las sucursales: es lo que impide que la red se bifurque al editarlo en una
   * sola sede.
   */
  updateStoreIdentity: (patch: Partial<StoreIdentity>) => void;
  deleteBusiness: (id: string) => void;
}
