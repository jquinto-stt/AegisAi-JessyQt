/**
 * Domain: Pedidos (Business Profiles & Capabilities)
 * Define las capacidades ortogonales y los perfiles comerciales preconfigurados (presets).
 * Cada perfil provee catálogo, modalidades, alias de estados y plantillas de WhatsApp específicas.
 */

import type { FulfillmentType } from "./pedidos.domain.js";

// ── Capacidades Ortogonales ──────────────────────────────────────────────────

export type OrderCapability =
  | "variants"                 // Tallas, colores, dimensiones, SKU
  | "modifiers"                // Ingredientes, extras, opciones de preparación
  | "appointment_scheduling"   // Duración de servicio, asignación de profesional
  | "preparation_time"         // Estimación de tiempo de cocina/empaque
  | "table_service"            // Consumo en sitio / número de mesa
  | "local_delivery"           // Reparto local urbano (mensajero/moto propio)
  | "carrier_shipment"         // Envíos nacionales con transportadora/guía
  | "returns_refunds";         // Devoluciones y cambios de producto

export type BusinessProfileType = "food" | "fashion" | "services" | "general";

export interface ProfileProductItem {
  id: string;
  nombre: string;
  precio: number;
  variantesDisponibles?: string[];
}

export interface BusinessProfile {
  id: BusinessProfileType;
  name: string;
  description: string;
  icon: string;
  defaultCapabilities: OrderCapability[];
  supportedFulfillmentTypes: FulfillmentType[];
  defaultModalidades: ("retiro" | "domicilio" | "en_sitio")[];
  defaultAliasEstados: Partial<Record<"nuevo" | "confirmado" | "en_preparacion" | "listo" | "en_camino" | "entregado", string>>;
  defaultPlantillas: {
    recibido: string;
    confirmado: string;
    enPreparacion: string;
    listo: string;
    enCamino: string;
    entregado: string;
    cancelado: string;
  };
  sampleCatalog: ProfileProductItem[];
  labels: {
    itemSingular: string;
    itemPlural: string;
    preparationStage: string;
    fulfillmentStage: string;
    deliveryMethodPrompt: string;
  };
}

// ── Catálogo de Presets ──────────────────────────────────────────────────────

export const BUSINESS_PROFILES: Record<BusinessProfileType, BusinessProfile> = {
  food: {
    id: "food",
    name: "Alimentos y Bebidas",
    description: "Restaurantes, dark kitchens, cafés y panaderías con cocina o preparación inmediata.",
    icon: "🍔",
    defaultCapabilities: [
      "modifiers",
      "preparation_time",
      "local_delivery",
      "table_service",
    ],
    supportedFulfillmentTypes: ["pickup", "local_delivery", "service"],
    defaultModalidades: ["retiro", "domicilio", "en_sitio"],
    defaultAliasEstados: {
      en_preparacion: "En preparación",
      listo: "Listo",
      en_camino: "En camino",
    },
    defaultPlantillas: {
      recibido: "¡Recibimos tu pedido! Lo estamos revisando.",
      confirmado: "Tu pedido fue confirmado y pronto entra a cocina.",
      enPreparacion: "¡Manos a la obra! Estamos preparando tu comida.",
      listo: "Tu pedido está listo y empacado.",
      enCamino: "Tu pedido va en camino con el repartidor.",
      entregado: "¡Pedido entregado! Buen provecho y gracias por tu compra.",
      cancelado: "Tu pedido fue cancelado. Si tienes dudas, escríbenos.",
    },
    sampleCatalog: [
      { id: "cat-f1", nombre: "Combo Hamburguesa Clásica", precio: 25000 },
      { id: "cat-f2", nombre: "Papas Rústicas con Queso", precio: 12000 },
      { id: "cat-f3", nombre: "Bebida Gaseosa 350ml", precio: 4000 },
      { id: "cat-f4", nombre: "Postre Cheesecake de Frutos Rojos", precio: 9000 },
    ],
    labels: {
      itemSingular: "Platillo / Producto",
      itemPlural: "Platillos",
      preparationStage: "En cocina / preparación",
      fulfillmentStage: "En camino / Listo en mostrador",
      deliveryMethodPrompt: "¿Cómo deseas recibir tu comida?",
    },
  },

  fashion: {
    id: "fashion",
    name: "Ropa, Calzado y Accesorios",
    description: "Boutiques, tiendas de moda, calzado y confección con variantes de talla, color y envíos.",
    icon: "👕",
    defaultCapabilities: [
      "variants",
      "carrier_shipment",
      "returns_refunds",
      "local_delivery",
    ],
    supportedFulfillmentTypes: ["pickup", "shipment", "local_delivery"],
    defaultModalidades: ["retiro", "domicilio"], // No hay mesa en tiendas de ropa
    defaultAliasEstados: {
      en_preparacion: "Empacando pedido",
      listo: "Listo para despacho",
      en_camino: "Despachado (en guía)",
      entregado: "Entregado al cliente",
    },
    defaultPlantillas: {
      recibido: "¡Hola! Recibimos tu orden en nuestra tienda de moda.",
      confirmado: "Tu orden fue confirmada y pasó a inspección y empaque.",
      enPreparacion: "Estamos empacando tus prendas y preparando el rotulado.",
      listo: "Tus prendas están empacadas y listas para despacho.",
      enCamino: "¡Tus prendas van en camino con la transportadora! Te avisaremos al entregar.",
      entregado: "¡Prendas entregadas! Esperamos que disfrutes tu outfit.",
      cancelado: "Tu orden de prendas fue cancelada.",
    },
    sampleCatalog: [
      { id: "cat-cl1", nombre: "Camiseta Oversize Algodón 100%", precio: 45000, variantesDisponibles: ["S", "M", "L", "XL"] },
      { id: "cat-cl2", nombre: "Jean Mom Fit Tiro Alto", precio: 98000, variantesDisponibles: ["6", "8", "10", "12"] },
      { id: "cat-cl3", nombre: "Vestido Floral Silueta Midi", precio: 85000, variantesDisponibles: ["S", "M", "L"] },
      { id: "cat-cl4", nombre: "Chaqueta Denim Oversize Vintage", precio: 135000, variantesDisponibles: ["M", "L"] },
      { id: "cat-cl5", nombre: "Sneakers Urbanos Cuero Blanco", precio: 160000, variantesDisponibles: ["37", "38", "39", "40", "41"] },
    ],
    labels: {
      itemSingular: "Prenda / Artículo",
      itemPlural: "Prendas",
      preparationStage: "Empacando prendas",
      fulfillmentStage: "Despachado / Guía de courier",
      deliveryMethodPrompt: "¿Prefieres retiro en tienda o envío a domicilio?",
    },
  },

  services: {
    id: "services",
    name: "Servicios y Citas",
    description: "Profesionales, barberías, spas, consultorios y talleres con agendamiento.",
    icon: "🛠️",
    defaultCapabilities: [
      "appointment_scheduling",
    ],
    supportedFulfillmentTypes: ["service"],
    defaultModalidades: ["en_sitio", "domicilio"],
    defaultAliasEstados: {
      en_preparacion: "Cita programada",
      listo: "En sala de espera",
      en_camino: "En atención",
      entregado: "Servicio completado",
    },
    defaultPlantillas: {
      recibido: "Recibimos tu solicitud de servicio.",
      confirmado: "Tu cita fue confirmada en nuestra agenda.",
      enPreparacion: "Tu cita está programada en el horario acordado.",
      listo: "Te esperamos en recepción.",
      enCamino: "Tu servicio está en curso.",
      entregado: "¡Servicio finalizado con éxito! Gracias por tu confianza.",
      cancelado: "Tu cita fue cancelada.",
    },
    sampleCatalog: [
      { id: "cat-s1", nombre: "Corte y Perfilado de Barba", precio: 35000 },
      { id: "cat-s2", nombre: "Masaje Terapéutico Anti-estrés (60 min)", precio: 95000 },
      { id: "cat-s3", nombre: "Limpieza Facial Profunda con Hidratación", precio: 85000 },
      { id: "cat-s4", nombre: "Sesión de Consultoría Profesional (1h)", precio: 120000 },
    ],
    labels: {
      itemSingular: "Servicio",
      itemPlural: "Servicios",
      preparationStage: "Cita agendada",
      fulfillmentStage: "En atención",
      deliveryMethodPrompt: "¿La atención será en nuestro local o a domicilio?",
    },
  },

  general: {
    id: "general",
    name: "Comercio General / Retail",
    description: "Venta de productos físicos estándar, papelería, tecnología u hogar.",
    icon: "📦",
    defaultCapabilities: [
      "variants",
      "local_delivery",
      "carrier_shipment",
    ],
    supportedFulfillmentTypes: ["pickup", "local_delivery", "shipment"],
    defaultModalidades: ["retiro", "domicilio"],
    defaultAliasEstados: {
      en_preparacion: "Empacando",
      listo: "Listo para retiro",
      en_camino: "En camino",
      entregado: "Entregado",
    },
    defaultPlantillas: {
      recibido: "¡Recibimos tu pedido! Lo estamos procesando.",
      confirmado: "Tu pedido fue confirmado.",
      enPreparacion: "Estamos alistando tus productos.",
      listo: "Tu paquete está listo.",
      enCamino: "Tu pedido va en camino.",
      entregado: "¡Pedido entregado! Gracias por elegirnos.",
      cancelado: "Tu pedido fue cancelado.",
    },
    sampleCatalog: [
      { id: "cat-g1", nombre: "Auriculares Inalámbricos Bluetooth", precio: 89000 },
      { id: "cat-g2", nombre: "Lámpara de Escritorio LED Recargable", precio: 55000 },
      { id: "cat-g3", nombre: "Botella Térmica Inox 750ml", precio: 38000 },
    ],
    labels: {
      itemSingular: "Producto",
      itemPlural: "Productos",
      preparationStage: "Empacando productos",
      fulfillmentStage: "Despachado / En camino",
      deliveryMethodPrompt: "¿Cómo prefieres recibir tu compra?",
    },
  },
};

/** Comprueba de forma limpia y declarativa si una capacidad está activa */
export function hasCapability(
  activeCapabilities: OrderCapability[],
  capability: OrderCapability
): boolean {
  return activeCapabilities.includes(capability);
}
