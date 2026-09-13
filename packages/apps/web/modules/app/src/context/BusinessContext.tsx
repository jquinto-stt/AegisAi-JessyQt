import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { eventBus } from "@/infrastructure/eventBus";

export type BusinessType =
  // Gastronomía
  | "restaurant_virtual"
  | "cafe_bakery"
  | "fast_food"
  | "bar_brewery"
  // Retail & Comercio
  | "retail_store"
  | "fashion_footwear"
  | "hardware_store"
  | "tech_electronics"
  | "ecommerce_direct"
  // Servicios & Citas
  | "services"
  | "technical_service"
  | "consulting_appointments"
  // Salud & Bienestar
  | "pharmacy_health"
  | "nutrition_supplements"
  | "clinic_optics";

export type OfferModel =
  | "physical_products"
  | "prepared_products"
  | "services_appointments"
  | "hybrid";

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

export const BUSINESS_ARCHETYPES: ArchetypeDefinition[] = [
  // ─── 1. Gastronomía & F&B ──────────────────────────────────────────
  {
    id: "restaurant_virtual",
    label: "Restaurante a la Mesa",
    category: "gastronomy",
    description: "Restaurantes con servicio a la mesa, menú por tiempos, platos fuertes y bebidas.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Entradas & Tapas", "Platos Fuertes", "Bebidas & Vinos", "Postres de la Casa"],
    iconKey: "utensils",
  },
  {
    id: "cafe_bakery",
    label: "Cafetería & Pastelería",
    category: "gastronomy",
    description: "Cafeterías de especialidad, panaderías artesanales, repostería y desayunos.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Café de Especialidad", "Panadería Artesanal", "Pastelería & Tortas", "Bebidas Frías"],
    iconKey: "coffee",
  },
  {
    id: "fast_food",
    label: "Comidas Rápidas & Delivery",
    category: "gastronomy",
    description: "Hamburguesas, pizzas, dark kitchens y locales con foco en despacho ágil.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Combos & Promociones", "Platos Principales", "Acompañamientos", "Bebidas & Gaseosas"],
    iconKey: "flame",
  },
  {
    id: "bar_brewery",
    label: "Bar & Cervecería",
    category: "gastronomy",
    description: "Bares, cervecerías artesanales, gastropubs y coctelería nocturna.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Cervezas Artesanales", "Coctelería de Autor", "Licores & Botellas", "Snacks & Picadas"],
    iconKey: "utensils",
  },

  // ─── 2. Retail & Comercio ──────────────────────────────────────────
  {
    id: "retail_store",
    label: "Minimarket / General",
    category: "retail",
    description: "Comercio minorista, minimarkets, tiendas de barrio, papelerías y abarrotes.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Abarrotes & Despensa", "Bebidas & Snacks", "Aseo & Hogar", "Varios"],
    iconKey: "store",
  },
  {
    id: "fashion_footwear",
    label: "Moda & Calzado",
    category: "retail",
    description: "Boutiques, zapaterías, indumentaria y accesorios con variantes de talla y color.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Calzado Casual", "Zapatillas Deportivas", "Prendas Superiores", "Accesorios"],
    iconKey: "shirt",
  },
  {
    id: "hardware_store",
    label: "Ferretería & Insumos",
    category: "retail",
    description: "Ferreterías, materiales de obra, herramientas eléctricas y tornillería técnica.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Herramientas Eléctricas", "Tornillería & Fijaciones", "Pinturas & Químicos", "Medición & Trazado"],
    iconKey: "wrench",
  },
  {
    id: "tech_electronics",
    label: "Tecnología & Gadgets",
    category: "retail",
    description: "Telefonía, repuestos de servicio técnico, cómputo, audio y gadgets.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Smartphones & Tablets", "Cables & Cargadores", "Audio & Auriculares", "Repuestos"],
    iconKey: "laptop",
  },
  {
    id: "ecommerce_direct",
    label: "D2C / Marca Digital",
    category: "retail",
    description: "Ventas por redes sociales y catálogo web con envíos locales y nacionales.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios", "referidos"],
    defaultCategories: ["Lanzamientos", "Más Vendidos", "Colección Básica", "Promociones"],
    iconKey: "shopping-bag",
  },

  // ─── 3. Servicios & Citas ──────────────────────────────────────────
  {
    id: "services",
    label: "Barbería & Peluquería",
    category: "services",
    description: "Barberías, salones de belleza, estética y cuidado personal con turnos.",
    defaultOfferModel: "services_appointments",
    recommendedModules: ["agendamiento", "turnos", "pedidos"],
    defaultCategories: ["Cortes & Estilo", "Barba & Afeitado", "Tratamientos Capilares", "Estética & Spa"],
    iconKey: "scissors",
  },
  {
    id: "technical_service",
    label: "Taller & Servicio Técnico",
    category: "services",
    description: "Talleres mecánicos, reparación de móviles, electrodomésticos y servicio técnico.",
    defaultOfferModel: "hybrid",
    recommendedModules: ["pedidos", "inventarios", "turnos"],
    defaultCategories: ["Diagnóstico & Reparación", "Mantenimiento Preventivo", "Repuestos & Partes", "Mano de Obra"],
    iconKey: "wrench",
  },
  {
    id: "consulting_appointments",
    label: "Consultoría & Asesoría",
    category: "services",
    description: "Abogados, contadores, agencias, academias y consultoría por horas o sesiones.",
    defaultOfferModel: "services_appointments",
    recommendedModules: ["agendamiento", "pedidos"],
    defaultCategories: ["Sesiones de Diagnóstico", "Consultoría Mensual", "Auditoría & Revisión", "Talleres & Formación"],
    iconKey: "layers",
  },

  // ─── 4. Salud & Bienestar ──────────────────────────────────────────
  {
    id: "pharmacy_health",
    label: "Droguería & Farmacia",
    category: "health",
    description: "Droguerías, farmacias comunitarias, fórmulas médicas y medicamentos genéricos.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Medicamentos Genéricos", "Cuidado Personal", "Primeros Auxilios", "Vitaminas"],
    iconKey: "pill",
  },
  {
    id: "nutrition_supplements",
    label: "Suplementos & Nutrición",
    category: "health",
    description: "Proteínas, creatinas, vitaminas, aminoácidos y alimentación deportiva.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Proteínas & Creatinas", "Vitaminas & Minerales", "Snacks Saludables", "Accesorios Fitness"],
    iconKey: "flame",
  },
  {
    id: "clinic_optics",
    label: "Óptica & Clínica",
    category: "health",
    description: "Ópticas, monturas, lentes de contacto, consultorios y valoraciones de salud.",
    defaultOfferModel: "hybrid",
    recommendedModules: ["agendamiento", "pedidos", "inventarios"],
    defaultCategories: ["Consultas & Exámenes", "Monturas & Lentes", "Lentes de Contacto", "Insumos & Cuidados"],
    iconKey: "pill",
  },
];

export type NectoModuleKey =
  | "referidos"
  | "pedidos"
  | "agendamiento"
  | "reservas"
  | "inventarios"
  | "turnos";

export interface BusinessChannelConfig {
  whatsapp: boolean;
  web: boolean;
  pos: boolean;
}

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

export interface BusinessScheduledPause {
  isPaused: boolean;
  pauseStartDate?: string;
  pauseEndDate?: string;
  reason?: string;
  autoReplyMessage?: string;
}

export interface BusinessSetupProgress {
  whatsappConnected: boolean;
  menuConfigured: boolean;
  kitchenConfigured: boolean;
  teamInvited: boolean;
}

export type UserWorkspaceRole = "owner" | "manager" | "staff";
export type SoundAlertKey = "bell" | "chime" | "kitchen_ding" | "pos_beep" | "mute";


export interface ImageTransformConfig {
  scale: number;    // 0.5 to 3
  rotate: number;   // -180 to 180 degrees
  posX: number;     // -100 to 100 percentage offset
  posY: number;     // -100 to 100 percentage offset
}

export type BotPersonality = "amigable" | "ejecutivo" | "chef" | "dinamico";
export type HolidayTheme = "none" | "halloween" | "navidad" | "ano_nuevo" | "black_friday" | "san_valentin";

export interface WhatsAppBotConfig {
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
  contactPhone?: string;
  contactEmail?: string;
  channels: BusinessChannelConfig;
  kitchenBufferMin: number;
  specialty?: string;
  activeModules: NectoModuleKey[];
  pauseConfig?: BusinessScheduledPause;
  setupProgress?: BusinessSetupProgress;
  whatsappBotConfig?: WhatsAppBotConfig;
  botConfig?: {
    greeting: string;
    personality: string;
    catalogCategories: string[];
  };
  isPreparacionEnabled?: boolean;
  createdAt: string;
}



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

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  badgeColor: "rose" | "blue" | "amber" | "emerald" | "purple" | "zinc";
  isSystem?: boolean;
  permissions: RolePermissions;
}

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

export function getBusinessSemantics(businessType?: BusinessType): BusinessSemanticConfig {
  switch (businessType) {
    case "fashion_footwear":
      return {
        orderSingle: "Pedido de Calzado / Moda",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Mesa de Empaque & Despacho",
        stationShortName: "Empaque & Envíos",
        stationNoun: "Estación de Empaque & Despacho",
        stationAction: "Preparar Calzado para Envío",
        preparationVerb: "En Empaque & Alistamiento",
        readyVerb: "Listo para Envío",
        deliveredVerb: "Entregados / Despachados",
        catalogItem: "Calzado / Prenda",
        tableOrChannel: "Canal de Venta",
        itemModifiers: "Talla, Color & Material",
        fulfillmentAgent: "Asesor de Empaque",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué estilo o talla de calzado estás buscando hoy?",
        botPersona: "asesor de calzado y moda atento a tallas, estilos y disponibilidad",
      };
    case "hardware_store":
      return {
        orderSingle: "Pedido Ferretero",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Bodega de Picking & Despacho",
        stationShortName: "Bodega & Despacho",
        stationNoun: "Estación de Picking & Despacho",
        stationAction: "Alistar Materiales",
        preparationVerb: "En Picking de Bodega",
        readyVerb: "Listo para Entrega",
        deliveredVerb: "Despachados / Facturados",
        catalogItem: "Herramienta / Material",
        tableOrChannel: "Canal de Venta",
        itemModifiers: "Medida, Calibre & Marca",
        fulfillmentAgent: "Bodeguero / Despachador",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué herramienta o material necesitas para tu obra?",
        botPersona: "asesor técnico ferretero conocedor de especificaciones, medidas y herramientas",
      };
    case "pharmacy_health":
      return {
        orderSingle: "Orden Médica / Pedido",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Dispensario & Despacho Express",
        stationShortName: "Dispensario & Envío",
        stationNoun: "Estación de Dispensario",
        stationAction: "Dispensar Medicamentos",
        preparationVerb: "En Dispensación & Empaque",
        readyVerb: "Listo para Domicilio",
        deliveredVerb: "Entregados a Paciente",
        catalogItem: "Medicamento / Producto",
        tableOrChannel: "Canal de Atención",
        itemModifiers: "Presentación & Laboratorio",
        fulfillmentAgent: "Regente de Farmacia",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿En qué medicamento o producto de cuidado personal podemos ayudarte hoy?",
        botPersona: "asistente farmacéutico atento, confiable y rápido en despacho de fórmulas",
      };
    case "tech_electronics":
      return {
        orderSingle: "Orden Tecnológica",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Control de Calidad & Despacho",
        stationShortName: "Alistamiento Técnico",
        stationNoun: "Estación de Alistamiento Técnico",
        stationAction: "Verificar & Empacar",
        preparationVerb: "En Control & Empaque",
        readyVerb: "Listo para Envío",
        deliveredVerb: "Despachados / Garantizados",
        catalogItem: "Dispositivo / Componente",
        tableOrChannel: "Canal de Venta",
        itemModifiers: "Capacidad, Color & Garantía",
        fulfillmentAgent: "Técnico de Despacho",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué dispositivo, repuesto o accesorio estás buscando?",
        botPersona: "asesor tecnológico enfocado en compatibilidad, garantías y especificaciones",
      };
    case "retail_store":
    case "ecommerce_direct":
      return {
        orderSingle: "Pedido de Venta",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Picking, Empaque & Despacho",
        stationShortName: "Picking & Despacho",
        stationNoun: "Estación de Picking & Despacho",
        stationAction: "Preparar para Envío",
        preparationVerb: "En Picking & Preparación",
        readyVerb: "Listo para Despacho",
        deliveredVerb: "Despachados / Entregados",
        catalogItem: "Producto / SKU",
        tableOrChannel: "Canal de Venta",
        itemModifiers: "Variantes (Talla, Color)",
        fulfillmentAgent: "Bodeguero / Despachador",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué producto necesitas hoy?",
        botPersona: "asesor de ventas y despacho servicial y experto en catálogo de productos",
      };
    case "cafe_bakery":
      return {
        orderSingle: "Orden de Cafetería",
        orderPlural: "Órdenes",
        orderNoun: "Orden",
        orderNounPlural: "Órdenes",
        stationName: "Barra de Café & Horno",
        stationShortName: "Barra & Café",
        stationNoun: "Barra de Despacho",
        stationAction: "Preparar Bebidas & Panes",
        preparationVerb: "En Barra & Calentado",
        readyVerb: "Listo en Barra",
        deliveredVerb: "Entregado a Cliente",
        catalogItem: "Bebida / Horneado",
        tableOrChannel: "Mesa / Barra / Para Llevar",
        itemModifiers: "Tipo de Leche & Adiciones",
        fulfillmentAgent: "Barista / Panadero",
        requiresKitchenDisplay: true,
        requiresTableNumber: true,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Te provoca un buen café o algo de panadería?",
        botPersona: "barista apasionado, amable y conocedor de recetas y notas de café",
      };
    case "fast_food":
      return {
        orderSingle: "Comanda Express",
        orderPlural: "Comandas",
        orderNoun: "Comanda",
        orderNounPlural: "Comandas",
        stationName: "Línea de Armado & Freidoras",
        stationShortName: "Cocina Rápida",
        stationNoun: "Línea de Armado",
        stationAction: "Armar & Despachar",
        preparationVerb: "En Plancha & Freidora",
        readyVerb: "Listo para Empaque",
        deliveredVerb: "Despachado / Enviado",
        catalogItem: "Combo / Entrada",
        tableOrChannel: "Mesa / Mostrador / Domicilio",
        itemModifiers: "Salsas & Acompañamientos",
        fulfillmentAgent: "Cocinero Express",
        requiresKitchenDisplay: true,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué combo te preparamos hoy?",
        botPersona: "ágil, entusiasta, enfocado en promociones y tiempos de entrega rápidos",
      };
    case "bar_brewery":
      return {
        orderSingle: "Ticket de Barra",
        orderPlural: "Tickets",
        orderNoun: "Ticket",
        orderNounPlural: "Tickets",
        stationName: "Barra & Grifos de Cerveza",
        stationShortName: "Barra Principal",
        stationNoun: "Estación de Coctelería",
        stationAction: "Servir Tragos & Pintas",
        preparationVerb: "En Coctelera & Servido",
        readyVerb: "Listo en Barra",
        deliveredVerb: "Servido en Mesa",
        catalogItem: "Trago / Cerveza",
        tableOrChannel: "Mesa / Barra",
        itemModifiers: "Hielo, Mezclador & Marca",
        fulfillmentAgent: "Bartender",
        requiresKitchenDisplay: true,
        requiresTableNumber: true,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué pinta o cóctel te servimos hoy?",
        botPersona: "bartender conocedor de cócteles de autor y cervezas artesanales",
      };
    case "technical_service":
      return {
        orderSingle: "Orden de Servicio",
        orderPlural: "Órdenes de Trabajo",
        orderNoun: "Orden Técnica",
        orderNounPlural: "Órdenes Técnicas",
        stationName: "Banco de Diagnóstico & Trabajo",
        stationShortName: "Mesa Técnica",
        stationNoun: "Banco de Trabajo Técnico",
        stationAction: "Reparar & Probar",
        preparationVerb: "En Reparación / Mantenimiento",
        readyVerb: "Reparación Finalizada",
        deliveredVerb: "Entregado a Propietario",
        catalogItem: "Servicio / Repuesto",
        tableOrChannel: "Canal de Recepción",
        itemModifiers: "Falla Reportada & Repuestos",
        fulfillmentAgent: "Técnico Especialista",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido al centro de servicio de {storeName}. ¿Qué equipo o vehículo deseas revisar?",
        botPersona: "técnico especializado, analítico, enfocado en diagnósticos claros y presupuestos",
      };
    case "consulting_appointments":
      return {
        orderSingle: "Sesión / Asesoría",
        orderPlural: "Sesiones Agendadas",
        orderNoun: "Sesión",
        orderNounPlural: "Sesiones",
        stationName: "Sala de Sesiones & Consultoría",
        stationShortName: "Sala de Consultoría",
        stationNoun: "Agenda de Sesiones",
        stationAction: "Iniciar Sesión",
        preparationVerb: "Sesión en Curso",
        readyVerb: "Confirmada / Esperando Hora",
        deliveredVerb: "Sesión Completada",
        catalogItem: "Asesoría / Consultoría",
        tableOrChannel: "Canal Virtual / Presencial",
        itemModifiers: "Modalidad & Temática",
        fulfillmentAgent: "Consultor / Asesor",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿En qué área o fecha deseas programar tu asesoría?",
        botPersona: "consultor profesional, puntual, formal y orientado a objetivos",
      };
    case "nutrition_supplements":
      return {
        orderSingle: "Pedido Nutricional",
        orderPlural: "Pedidos",
        orderNoun: "Pedido",
        orderNounPlural: "Pedidos",
        stationName: "Bodega de Suplementos & Empaque",
        stationShortName: "Despacho Fitness",
        stationNoun: "Estación de Picking Fitness",
        stationAction: "Alistar Suplementos",
        preparationVerb: "En Alistamiento",
        readyVerb: "Listo para Envío",
        deliveredVerb: "Entregados",
        catalogItem: "Suplemento / Proteína",
        tableOrChannel: "Canal de Venta",
        itemModifiers: "Sabor, Peso & Marca",
        fulfillmentAgent: "Asesor Fitness",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Cuál es tu meta deportiva para asesorarte con los mejores suplementos?",
        botPersona: "asesor nutricional y fitness motivador, conocedor de suplementación y objetivos",
      };
    case "clinic_optics":
      return {
        orderSingle: "Valoración / Orden Clínica",
        orderPlural: "Órdenes Clínicas",
        orderNoun: "Orden Clínica",
        orderNounPlural: "Órdenes Clínicas",
        stationName: "Consultorio & Laboratorio Óptico",
        stationShortName: "Consultorio",
        stationNoun: "Consultorio de Valoración",
        stationAction: "Realizar Valoración",
        preparationVerb: "En Fabricación / Consulta",
        readyVerb: "Listo para Entrega",
        deliveredVerb: "Entregado a Paciente",
        catalogItem: "Consulta / Montura",
        tableOrChannel: "Consultorio / Mostrador",
        itemModifiers: "Fórmula & Tratamiento de Lente",
        fulfillmentAgent: "Optómetra / Especialista",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Deseas agendar tu valoración visual o cotizar lentes y monturas?",
        botPersona: "asistente clínico empático, cuidadoso de la salud visual y la puntualidad",
      };
    case "services":
      return {
        orderSingle: "Cita / Servicio",
        orderPlural: "Citas & Turnos",
        orderNoun: "Cita",
        orderNounPlural: "Citas",
        stationName: "Cuadrante de Atención",
        stationShortName: "Atención & Turnos",
        stationNoun: "Cuadrante de Atención & Citas",
        stationAction: "Iniciar Atención",
        preparationVerb: "En Atención",
        readyVerb: "Listo para Atención",
        deliveredVerb: "Atendidos / Finalizados",
        catalogItem: "Servicio / Tratamiento",
        tableOrChannel: "Box / Cabina / Puesto",
        itemModifiers: "Detalles / Duración",
        fulfillmentAgent: "Especialista / Profesional",
        requiresKitchenDisplay: false,
        requiresTableNumber: false,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué servicio deseas agendar hoy?",
        botPersona: "recepcionista y gestor de turnos cordial y organizado",
      };
    case "restaurant_virtual":
    default:
      return {
        orderSingle: "Comanda / Pedido",
        orderPlural: "Comandas",
        orderNoun: "Comanda",
        orderNounPlural: "Comandas",
        stationName: "Cocina & Despacho (KDS)",
        stationShortName: "KDS Cocina",
        stationNoun: "KDS Cocina & Estaciones",
        stationAction: "Iniciar Preparación",
        preparationVerb: "En Cocina / Preparación",
        readyVerb: "Listo para Servir",
        deliveredVerb: "Entregados / Servidos",
        catalogItem: "Plato / Menú",
        tableOrChannel: "Mesa / Salón / Canal",
        itemModifiers: "Modificadores / Salsas",
        fulfillmentAgent: "Cocinero / Chef",
        requiresKitchenDisplay: true,
        requiresTableNumber: true,
        botGreetingTemplate: "¡Hola! Bienvenido a {storeName}. ¿Qué menú te preparamos hoy?",
        botPersona: "anfitrión gastronómico entusiasta y atento a términos de cocción y salsas",
      };
  }
}

export function getDefaultRolesForArchetype(businessType?: BusinessType): RolePermission[] {
  if (
    businessType === "retail_store" ||
    businessType === "ecommerce_direct" ||
    businessType === "fashion_footwear" ||
    businessType === "hardware_store" ||
    businessType === "tech_electronics" ||
    businessType === "nutrition_supplements"
  ) {
    return [
      {
        id: "role-owner",
        name: "Dueño / Propietario",
        description: "Acceso total irrestricto a analítica, finanzas, canales, catálogo y configuración.",
        badgeColor: "rose",
        isSystem: true,
        permissions: {
          canViewBandeja: true,
          canCreateOrders: true,
          canViewKDS: true,
          canDispatchKDS: true,
          canViewCatalogo: true,
          canEditCatalogo: true,
          canViewInsumos: true,
          canEditInsumos: true,
          canViewAnalitica: true,
          canViewHistorial: true,
          canViewAutomatizaciones: true,
          canViewTurnos: true,
          canManageRoles: true,
        },
      },
      {
        id: "role-admin",
        name: "Gerente de Tienda",
        description: "Gestión integral de operaciones de venta, inventario, precios y despacho.",
        badgeColor: "blue",
        isSystem: true,
        permissions: {
          canViewBandeja: true,
          canCreateOrders: true,
          canViewKDS: true,
          canDispatchKDS: true,
          canViewCatalogo: true,
          canEditCatalogo: true,
          canViewInsumos: true,
          canEditInsumos: true,
          canViewAnalitica: true,
          canViewHistorial: true,
          canViewAutomatizaciones: true,
          canViewTurnos: true,
          canManageRoles: true,
        },
      },
      {
        id: "role-sales",
        name: "Asesor de Ventas & WhatsApp",
        description: "Atención de clientes en chat de WhatsApp, cotizaciones y creación de pedidos.",
        badgeColor: "emerald",
        isSystem: true,
        permissions: {
          canViewBandeja: true,
          canCreateOrders: true,
          canViewKDS: false,
          canDispatchKDS: false,
          canViewCatalogo: true,
          canEditCatalogo: false,
          canViewInsumos: false,
          canEditInsumos: false,
          canViewAnalitica: false,
          canViewHistorial: true,
          canViewAutomatizaciones: false,
          canViewTurnos: false,
          canManageRoles: false,
        },
      },
      {
        id: "role-fulfillment",
        name: "Despachador & Bodeguero",
        description: "Recepción de órdenes confirmadas, picking de estantería, embalaje y emisión de guías.",
        badgeColor: "amber",
        isSystem: true,
        permissions: {
          canViewBandeja: false,
          canCreateOrders: false,
          canViewKDS: true,
          canDispatchKDS: true,
          canViewCatalogo: true,
          canEditCatalogo: false,
          canViewInsumos: true,
          canEditInsumos: false,
          canViewAnalitica: false,
          canViewHistorial: false,
          canViewAutomatizaciones: false,
          canViewTurnos: false,
          canManageRoles: false,
        },
      },
      {
        id: "role-inventory",
        name: "Jefe de Almacén & Kardex",
        description: "Entradas y salidas de mercancía, traslados entre bodegas y auditoría de existencias.",
        badgeColor: "purple",
        isSystem: true,
        permissions: {
          canViewBandeja: false,
          canCreateOrders: false,
          canViewKDS: false,
          canDispatchKDS: false,
          canViewCatalogo: true,
          canEditCatalogo: true,
          canViewInsumos: true,
          canEditInsumos: true,
          canViewAnalitica: false,
          canViewHistorial: false,
          canViewAutomatizaciones: false,
          canViewTurnos: false,
          canManageRoles: false,
        },
      },
    ];
  }

  if (
    businessType === "services" ||
    businessType === "technical_service" ||
    businessType === "consulting_appointments" ||
    businessType === "clinic_optics" ||
    businessType === "pharmacy_health"
  ) {
    return [
      {
        id: "role-owner",
        name: "Director / Dueño",
        description: "Acceso total a finanzas, citas, especialistas y configuración global.",
        badgeColor: "rose",
        isSystem: true,
        permissions: {
          canViewBandeja: true,
          canCreateOrders: true,
          canViewKDS: true,
          canDispatchKDS: true,
          canViewCatalogo: true,
          canEditCatalogo: true,
          canViewInsumos: true,
          canEditInsumos: true,
          canViewAnalitica: true,
          canViewHistorial: true,
          canViewAutomatizaciones: true,
          canViewTurnos: true,
          canManageRoles: true,
        },
      },
      {
        id: "role-receptionist",
        name: "Recepción & Citas WhatsApp",
        description: "Agendamiento de citas, cobro de servicios y recordatorios automáticos.",
        badgeColor: "blue",
        isSystem: true,
        permissions: {
          canViewBandeja: true,
          canCreateOrders: true,
          canViewKDS: false,
          canDispatchKDS: false,
          canViewCatalogo: true,
          canEditCatalogo: false,
          canViewInsumos: false,
          canEditInsumos: false,
          canViewAnalitica: false,
          canViewHistorial: true,
          canViewAutomatizaciones: false,
          canViewTurnos: true,
          canManageRoles: false,
        },
      },
      {
        id: "role-specialist",
        name: "Especialista / Profesional",
        description: "Visualización de su agenda diaria de citas, check-in y consumos de atención.",
        badgeColor: "emerald",
        isSystem: true,
        permissions: {
          canViewBandeja: false,
          canCreateOrders: false,
          canViewKDS: true,
          canDispatchKDS: true,
          canViewCatalogo: false,
          canEditCatalogo: false,
          canViewInsumos: true,
          canEditInsumos: false,
          canViewAnalitica: false,
          canViewHistorial: false,
          canViewAutomatizaciones: false,
          canViewTurnos: false,
          canManageRoles: false,
        },
      },
    ];
  }

  return INITIAL_ROLES;
}

export const INITIAL_ROLES: RolePermission[] = [
  {
    id: "role-owner",
    name: "Dueño / Propietario",
    description: "Acceso total irrestricto a todas las funciones financieras, operativas, roles y configuración.",
    badgeColor: "rose",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: true,
      canViewTurnos: true,
      canManageRoles: true,
    },
  },
  {
    id: "role-admin",
    name: "Administrador de Tienda",
    description: "Gerente contratado para la gestión integral de la tienda: administración de comandas, catálogo, stock, personal, turnos y configuración operativa.",
    badgeColor: "blue",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: true,
      canViewTurnos: true,
      canManageRoles: true,
    },
  },
  {
    id: "role-cook",
    name: "Cocinero / KDS Chef",
    description: "Visualización y despacho táctil de tickets en Pantalla KDS Cocina sin acceso a finanzas.",
    badgeColor: "amber",
    isSystem: true,
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: false,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "role-waiter",
    name: "Mesero / Cajero POS",
    description: "Recepción de comandas, cobro en salón y emisión de tickets en Bandeja Unificada.",
    badgeColor: "emerald",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "role-inventory",
    name: "Encargado de Insumos & Stock",
    description: "Control de materias primas, escandallos, recetas y registro de inventario.",
    badgeColor: "purple",
    isSystem: true,
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
];

interface BusinessContextType {
  businesses: BusinessInstance[];
  activeBusiness: BusinessInstance;
  activeBusinessId: string;
  semantics: BusinessSemanticConfig;
  userRole: UserWorkspaceRole;
  roles: RolePermission[];
  activeRoleId: string;
  activeRole: RolePermission;
  setActiveRoleId: (roleId: string) => void;
  createRole: (role: Omit<RolePermission, "id">) => RolePermission;
  updateRole: (roleId: string, updates: Partial<RolePermission>) => void;
  deleteRole: (roleId: string) => void;
  canAccess: (permission: keyof RolePermissions) => boolean;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleModule: (businessId: string, moduleKey: NectoModuleKey) => void;
  createBusiness: (data: Omit<BusinessInstance, "id" | "createdAt">) => BusinessInstance;
  switchBusiness: (id: string) => void;
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
  deleteBusiness: (id: string) => void;
  storePace: "rapida" | "habitual" | "demorada";
  setStorePace: (pace: "rapida" | "habitual" | "demorada") => void;
  userAvatarUrl: string;
  setUserAvatarUrl: (url: string) => void;
}

const DEFAULT_BUSINESS: BusinessInstance = {
  id: "biz-necto-ferreteria",
  name: "Ferretería & Suministros La Tuerca",
  slug: "ferreteria-la-tuerca",
  businessType: "retail_store",
  iconKey: "store",
  logoUrl: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=150&auto=format&fit=crop&q=80",
  currency: "COP",
  city: "Medellín, Colombia",
  channels: {
    whatsapp: true,
    web: true,
    pos: true,
  },
  // Required by BusinessInstance. Non-restaurant default is 10, matching the
  // convention OnboardingPage uses (restaurant_virtual -> 20, otherwise -> 10).
  kitchenBufferMin: 10,
  specialty: "Materiales, Tornillería & Herramientas",
  activeModules: ["pedidos", "inventarios", "referidos"],
  setupProgress: {
    whatsappConnected: true,
    menuConfigured: true,
    kitchenConfigured: true,
    teamInvited: false,
  },
  createdAt: new Date().toISOString(),
};

const SECONDARY_BUSINESS: BusinessInstance = {
  id: "biz-necto-central",
  name: "Burger House — Sede Gourmet",
  slug: "burger-house-gourmet",
  businessType: "restaurant_virtual",
  iconKey: "flame",
  logoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  currency: "COP",
  city: "Bogotá, Colombia",
  channels: {
    whatsapp: true,
    web: true,
    pos: true,
  },
  kitchenBufferMin: 20,
  specialty: "Hamburguesas Artesanales & Comidas Rápidas",
  activeModules: ["pedidos", "inventarios", "referidos"],
  setupProgress: {
    whatsappConnected: true,
    menuConfigured: true,
    kitchenConfigured: true,
    teamInvited: false,
  },
  createdAt: new Date(Date.now() - 86400000).toISOString(),
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>(() => {
    try {
      const saved = localStorage.getItem("necto_businesses");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => ({
            ...b,
            activeModules: Array.isArray(b.activeModules) ? b.activeModules : ["pedidos", "inventarios", "referidos"],
            setupProgress: b.setupProgress || {
              whatsappConnected: true,
              menuConfigured: true,
              kitchenConfigured: false,
              teamInvited: false,
            },
          }));
        }
      }
    } catch (e) {
      console.warn("Error reading businesses from storage", e);
    }
    return [DEFAULT_BUSINESS, SECONDARY_BUSINESS];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_business_id");
      if (saved && saved !== "GLOBAL_OVERVIEW") return saved;
    } catch (e) {}
    return DEFAULT_BUSINESS.id;
  });

  const [userRole] = useState<UserWorkspaceRole>("owner");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [storePace, setStorePaceState] = useState<"rapida" | "habitual" | "demorada">(() => {
    try {
      const saved = localStorage.getItem("necto_store_pace");
      if (saved === "rapida" || saved === "habitual" || saved === "demorada") return saved;
    } catch (e) {}
    return "habitual";
  });

  const setStorePace = (pace: "rapida" | "habitual" | "demorada") => {
    setStorePaceState(pace);
    try {
      localStorage.setItem("necto_store_pace", pace);
      eventBus.publish("necto_store_pace_changed", { mode: pace });
    } catch (e) {}
  };

  useEffect(() => {
    const unsub = eventBus.subscribe("necto_store_pace_changed", (payload) => {
      if (payload.mode && (payload.mode === "rapida" || payload.mode === "habitual" || payload.mode === "demorada")) {
        setStorePaceState(payload.mode);
      }
    });
    return () => unsub();
  }, []);

  // Global Keyboard listener for Command Palette (Ctrl+K or Cmd+K)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("necto_businesses", JSON.stringify(businesses));
    } catch (e) {}
  }, [businesses]);

  useEffect(() => {
    try {
      if (activeBusinessId && activeBusinessId !== "GLOBAL_OVERVIEW") {
        localStorage.setItem("necto_active_business_id", activeBusinessId);
      }
    } catch (e) {}
  }, [activeBusinessId]);

  const activeBusiness =
    businesses.find(b => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESS;

  const semantics = useMemo(
    () => getBusinessSemantics(activeBusiness?.businessType),
    [activeBusiness?.businessType]
  );

  const toggleModule = (businessId: string, moduleKey: NectoModuleKey) => {
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== businessId) return b;
        const current = b.activeModules || [];
        const updated = current.includes(moduleKey)
          ? current.filter(m => m !== moduleKey)
          : [...current, moduleKey];
        return { ...b, activeModules: updated };
      })
    );
  };

  const createBusiness = (data: Omit<BusinessInstance, "id" | "createdAt">): BusinessInstance => {
    const sem = getBusinessSemantics(data.businessType);
    const archetype = BUSINESS_ARCHETYPES.find(a => a.id === data.businessType);
    const resolvedOfferModel =
      data.offerModel ||
      archetype?.defaultOfferModel ||
      (data.businessType === "restaurant_virtual" ? "prepared_products" : "physical_products");

    const newBiz: BusinessInstance = {
      ...data,
      id: `biz-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      offerModel: resolvedOfferModel,
      activeModules:
        Array.isArray(data.activeModules)
          ? data.activeModules
          : (archetype?.recommendedModules || ["pedidos", "inventarios"]),
      botConfig: data.botConfig || {
        greeting: sem?.botGreetingTemplate
          ? sem.botGreetingTemplate.replace("{storeName}", data.name)
          : `¡Hola! Bienvenido a ${data.name}.`,
        personality: sem?.botPersona || "asistente virtual",
        catalogCategories:
          archetype?.defaultCategories ||
          (data.businessType === "restaurant_virtual"
            ? ["Platos Fuertes", "Acompañamientos", "Bebidas", "Postres"]
            : ["Abarrotes", "Bebidas", "Varios"]),
      },
      setupProgress: {
        whatsappConnected: data.channels?.whatsapp || false,
        menuConfigured: false,
        kitchenConfigured: false,
        teamInvited: false,
      },
      createdAt: new Date().toISOString(),
    };

    setBusinesses(prev => [newBiz, ...prev]);
    setActiveBusinessId(newBiz.id);
    const newRoles = getDefaultRolesForArchetype(newBiz.businessType);
    setRoles(newRoles);
    setActiveRoleId(newRoles[0]?.id || "role-owner");
    return newBiz;
  };

  const switchBusiness = (id: string) => {
    const target = businesses.find(b => b.id === id);
    if (target) {
      setActiveBusinessId(id);
      const targetRoles = getDefaultRolesForArchetype(target.businessType);
      setRoles(targetRoles);
      setActiveRoleId(targetRoles[0]?.id || "role-owner");
    }
  };

  const updateBusiness = (id: string, updates: Partial<BusinessInstance>) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const deleteBusiness = (id: string) => {
    setBusinesses(prev => {
      const filtered = prev.filter(b => b.id !== id);
      if (filtered.length === 0) {
        return [DEFAULT_BUSINESS];
      }
      if (activeBusinessId === id) {
        setActiveBusinessId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Roles & Permissions state

  const [roles, setRoles] = useState<RolePermission[]>(() => {
    try {
      const saved = localStorage.getItem("necto_custom_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((role: RolePermission) => {
            const systemRole = INITIAL_ROLES.find(r => r.id === role.id);
            if (systemRole) {
              return {
                ...systemRole,
                ...role,
                permissions: {
                  ...systemRole.permissions,
                  ...(role.permissions || {}),
                },
              };
            }
            return role;
          });
        }
      }
    } catch (e) {}
    return INITIAL_ROLES;
  });

  const [activeRoleId, setActiveRoleIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_role_id");
      if (saved) return saved;
    } catch (e) {}
    return "role-owner";
  });

  const setActiveRoleId = (roleId: string) => {
    setActiveRoleIdState(roleId);
    try {
      localStorage.setItem("necto_active_role_id", roleId);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      localStorage.setItem("necto_custom_roles", JSON.stringify(roles));
    } catch (e) {}
  }, [roles]);

  const activeRole: RolePermission =
    roles.find(r => r.id === activeRoleId) || roles[0] || INITIAL_ROLES[0];

  const createRole = (newRoleData: Omit<RolePermission, "id">): RolePermission => {
    const newRole: RolePermission = {
      ...newRoleData,
      id: `role-custom-${Date.now()}`,
    };
    setRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateRole = (roleId: string, updates: Partial<RolePermission>) => {
    setRoles(prev =>
      prev.map(r => (r.id === roleId ? { ...r, ...updates, permissions: { ...r.permissions, ...(updates.permissions || {}) } } : r))
    );
  };

  const deleteRole = (roleId: string) => {
    setRoles(prev => {
      const filtered = prev.filter(r => r.id !== roleId || r.isSystem);
      return filtered;
    });
    if (activeRoleId === roleId) {
      setActiveRoleId("role-owner");
    }
  };

  const canAccess = (permission: keyof RolePermissions): boolean => {
    if (!activeRole || !activeRole.permissions) return true;
    if (activeRole.id === "role-owner") return true;
    return !!activeRole.permissions[permission];
  };

  const [userAvatarUrl, setUserAvatarUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem("necto_user_avatar") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    } catch (e) {
      return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    }
  });

  const setUserAvatarUrl = (url: string) => {
    setUserAvatarUrlState(url);
    try {
      localStorage.setItem("necto_user_avatar", url);
    } catch (e) {}
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId,
        semantics,
        userRole,
        roles,
        activeRoleId,
        activeRole,
        setActiveRoleId,
        createRole,
        updateRole,
        deleteRole,
        canAccess,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleModule,
        createBusiness,
        switchBusiness,
        updateBusiness,
        deleteBusiness,
        storePace,
        setStorePace,
        userAvatarUrl,
        setUserAvatarUrl,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );


};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

