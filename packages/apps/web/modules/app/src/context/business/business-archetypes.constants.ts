import type { ArchetypeDefinition } from "./types";

/** Static catalogue of the business archetypes offered during onboarding. */
export const BUSINESS_ARCHETYPES: ArchetypeDefinition[] = [
  // ─── 1. Gastronomía & F&B ──────────────────────────────────────────
  {
    id: "restaurant_virtual",
    label: "Restaurante a la mesa",
    category: "gastronomy",
    description: "Restaurantes con servicio a la mesa, menú por tiempos, platos fuertes y bebidas.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Entradas y tapas", "Platos fuertes", "Bebidas y vinos", "Postres de la casa"],
    iconKey: "utensils",
  },
  {
    id: "cafe_bakery",
    label: "Cafetería y pastelería",
    category: "gastronomy",
    description: "Cafeterías de especialidad, panaderías artesanales, repostería y desayunos.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Café de especialidad", "Panadería artesanal", "Pastelería y tortas", "Bebidas frías"],
    iconKey: "coffee",
  },
  {
    id: "fast_food",
    label: "Comidas rápidas y delivery",
    category: "gastronomy",
    description: "Hamburguesas, pizzas, dark kitchens y locales con foco en despacho ágil.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Combos y promociones", "Platos principales", "Acompañamientos", "Bebidas y gaseosas"],
    iconKey: "flame",
  },
  {
    id: "bar_brewery",
    label: "Bar y cervecería",
    category: "gastronomy",
    description: "Bares, cervecerías artesanales, gastropubs y coctelería nocturna.",
    defaultOfferModel: "prepared_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Cervezas artesanales", "Coctelería de autor", "Licores y botellas", "Snacks y picadas"],
    iconKey: "utensils",
  },

  // ─── 2. Retail y comercio ──────────────────────────────────────────
  {
    id: "retail_store",
    label: "Minimarket / general",
    category: "retail",
    description: "Comercio minorista, minimarkets, tiendas de barrio, papelerías y abarrotes.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Abarrotes y despensa", "Bebidas y snacks", "Aseo y hogar", "Varios"],
    iconKey: "store",
  },
  {
    id: "fashion_footwear",
    label: "Moda y calzado",
    category: "retail",
    description: "Boutiques, zapaterías, indumentaria y accesorios con variantes de talla y color.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Calzado casual", "Zapatillas deportivas", "Prendas superiores", "Accesorios"],
    iconKey: "shirt",
  },
  {
    id: "hardware_store",
    label: "Ferretería e insumos",
    category: "retail",
    description: "Ferreterías, materiales de obra, herramientas eléctricas y tornillería técnica.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Herramientas eléctricas", "Tornillería y fijaciones", "Pinturas y químicos", "Medición y trazado"],
    iconKey: "wrench",
  },
  {
    id: "tech_electronics",
    label: "Tecnología y gadgets",
    category: "retail",
    description: "Telefonía, repuestos de servicio técnico, cómputo, audio y gadgets.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Smartphones y tablets", "Cables y cargadores", "Audio y auriculares", "Repuestos"],
    iconKey: "laptop",
  },
  {
    id: "ecommerce_direct",
    label: "D2C / Marca digital",
    category: "retail",
    description: "Ventas por redes sociales y catálogo web con envíos locales y nacionales.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios", "referidos"],
    defaultCategories: ["Lanzamientos", "Más vendidos", "Colección básica", "Promociones"],
    iconKey: "shopping-bag",
  },

  // ─── 3. Servicios y citas ──────────────────────────────────────────
  {
    id: "services",
    label: "Barbería y peluquería",
    category: "services",
    description: "Barberías, salones de belleza, estética y cuidado personal con turnos.",
    defaultOfferModel: "services_appointments",
    recommendedModules: ["agendamiento", "turnos", "pedidos"],
    defaultCategories: ["Cortes y estilo", "Barba y afeitado", "Tratamientos capilares", "Estética y spa"],
    iconKey: "scissors",
  },
  {
    id: "technical_service",
    label: "Taller y servicio técnico",
    category: "services",
    description: "Talleres mecánicos, reparación de móviles, electrodomésticos y servicio técnico.",
    defaultOfferModel: "hybrid",
    recommendedModules: ["pedidos", "inventarios", "turnos"],
    defaultCategories: ["Diagnóstico y reparación", "Mantenimiento preventivo", "Repuestos y partes", "Mano de obra"],
    iconKey: "wrench",
  },
  {
    id: "consulting_appointments",
    label: "Consultoría y asesoría",
    category: "services",
    description: "Abogados, contadores, agencias, academias y consultoría por horas o sesiones.",
    defaultOfferModel: "services_appointments",
    recommendedModules: ["agendamiento", "pedidos"],
    defaultCategories: ["Sesiones de diagnóstico", "Consultoría mensual", "Auditoría y revisión", "Talleres y formación"],
    iconKey: "layers",
  },

  // ─── 4. Salud y bienestar ──────────────────────────────────────────
  {
    id: "pharmacy_health",
    label: "Droguería y farmacia",
    category: "health",
    description: "Droguerías, farmacias comunitarias, fórmulas médicas y medicamentos genéricos.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Medicamentos genéricos", "Cuidado personal", "Primeros auxilios", "Vitaminas"],
    iconKey: "pill",
  },
  {
    id: "nutrition_supplements",
    label: "Suplementos y nutrición",
    category: "health",
    description: "Proteínas, creatinas, vitaminas, aminoácidos y alimentación deportiva.",
    defaultOfferModel: "physical_products",
    recommendedModules: ["pedidos", "inventarios"],
    defaultCategories: ["Proteínas y creatinas", "Vitaminas y minerales", "Snacks saludables", "Accesorios fitness"],
    iconKey: "flame",
  },
  {
    id: "clinic_optics",
    label: "Óptica y clínica",
    category: "health",
    description: "Ópticas, monturas, lentes de contacto, consultorios y valoraciones de salud.",
    defaultOfferModel: "hybrid",
    recommendedModules: ["agendamiento", "pedidos", "inventarios"],
    defaultCategories: ["Consultas y exámenes", "Monturas y lentes", "Lentes de contacto", "Insumos y cuidados"],
    iconKey: "pill",
  },
];

/** Nombre visible de cada categoría del catálogo. Fuente única. */
export const ARCHETYPE_CATEGORY_LABELS: Record<ArchetypeDefinition["category"], string> = {
  gastronomy: "Gastronomía y alimentos",
  retail: "Retail y comercio",
  services: "Servicios y citas",
  health: "Salud y bienestar",
  custom: "Personalizado",
};

/**
 * Los arquetipos agrupados por categoría, listos para un `<select>` con
 * `<optgroup>`.
 *
 * Se **deriva** del catálogo para que ninguna superficie mantenga su propia
 * lista parcial: el modal de Ajustes ofrecía sólo tres arquetipos, así que una
 * sede de farmacia mostraba "Gastronomía" porque ninguna opción casaba con su
 * tipo real.
 */
export const ARCHETYPE_GROUPS: {
  category: ArchetypeDefinition["category"];
  label: string;
  archetypes: ArchetypeDefinition[];
}[] = (["gastronomy", "retail", "services", "health", "custom"] as const)
  .map(category => ({
    category,
    label: ARCHETYPE_CATEGORY_LABELS[category],
    archetypes: BUSINESS_ARCHETYPES.filter(a => a.category === category),
  }))
  .filter(group => group.archetypes.length > 0);
