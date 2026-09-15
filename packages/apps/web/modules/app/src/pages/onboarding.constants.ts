import {
  Users,
  ShoppingBag,
  Calendar,
  Bookmark,
  Package,
  Clock,
  Utensils,
  Pill,
  Scissors,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { NectoModuleKey, BusinessType, OfferModel } from "../context/BusinessContext";

/* ── Module catalogue ──────────────────────────────────────────────── */

export interface ModuleConfig {
  id: NectoModuleKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
}

export const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    id: "pedidos",
    title: "Pedidos omnicanal",
    shortTitle: "Pedidos",
    description: "WhatsApp, web y mostrador en un solo flujo, con alistamiento en vivo.",
    icon: ShoppingBag,
  },
  {
    id: "inventarios",
    title: "Inventario y stock",
    shortTitle: "Inventario",
    description: "Existencias, kardex de movimientos, compras y alertas de reposición.",
    icon: Package,
  },
  {
    id: "turnos",
    title: "Turnos y horarios",
    shortTitle: "Turnos",
    description: "Rotación de personal, control de horarios y asignación por área.",
    icon: Clock,
  },
  {
    id: "reservas",
    title: "Reservas de espacios",
    shortTitle: "Reservas",
    description: "Asignación de mesas, boxes o salones según disponibilidad.",
    icon: Bookmark,
  },
  {
    id: "agendamiento",
    title: "Agendamiento y citas",
    shortTitle: "Agendamiento",
    description: "Calendario sincronizado con confirmación directa al cliente.",
    icon: Calendar,
  },
  {
    id: "referidos",
    title: "Fidelización y clientes",
    shortTitle: "Referidos",
    description: "Cupones, tracking de recompra y programa de referidos.",
    icon: Users,
  },
];

/* ── Business type selection ───────────────────────────────────────── */

export interface MacroGroup {
  id: "retail" | "gastronomy" | "services" | "health";
  label: string;
  short: string;
  icon: LucideIcon;
  defaultType: BusinessType;
}

export const MACRO_GROUPS: MacroGroup[] = [
  { id: "retail", label: "Retail y comercio", short: "Retail", icon: ShoppingBag, defaultType: "retail_store" },
  { id: "gastronomy", label: "Gastronomía", short: "Gastronomía", icon: Utensils, defaultType: "restaurant_virtual" },
  { id: "services", label: "Servicios y citas", short: "Servicios", icon: Scissors, defaultType: "services" },
  { id: "health", label: "Salud y bienestar", short: "Salud", icon: Pill, defaultType: "pharmacy_health" },
];

export const OFFER_MODELS: { id: OfferModel; title: string; short: string; icon: LucideIcon }[] = [
  { id: "physical_products", title: "Productos físicos", short: "Productos", icon: Package },
  { id: "prepared_products", title: "Preparados", short: "Preparados", icon: Utensils },
  { id: "services_appointments", title: "Servicios", short: "Servicios", icon: Calendar },
  { id: "hybrid", title: "Híbrido", short: "Híbrido", icon: Layers },
];

export const OFFER_MODEL_LABEL: Record<OfferModel, string> = {
  physical_products: "Productos físicos",
  prepared_products: "Preparados",
  services_appointments: "Servicios y citas",
  hybrid: "Modelo híbrido",
};

/* ── Wizard chrome ─────────────────────────────────────────────────── */

/**
 * Clave estable de cada paso. Los pasos **no** se indexan por número: el primer
 * paso sólo existe la primera vez (ver `wizardSteps`), así que un `Record` por
 * número haría que el paso 1 significara dos cosas distintas según el caso.
 */
export type WizardStepKey = "store" | "branch" | "location" | "operation" | "modules" | "whatsapp";

export interface WizardStep {
  num: number;
  key: WizardStepKey;
  label: string;
  /** Ámbito del dato que se pide: la tienda entera o una sucursal concreta. */
  scope: "store" | "branch";
}

/**
 * Pasos del wizard de **sucursal** (`/onboarding`).
 *
 * El paso "Tu tienda" sólo aparece cuando la tienda aún no existe (no hay
 * ninguna sucursal). Es la sucursal la que da de alta la tienda, así que hay que
 * tipificar el negocio una vez; a partir de la segunda, la identidad de la tienda
 * se hereda y el wizard pregunta **sólo** datos de la sucursal.
 *
 * Esa es la regla del modelo `Titular → Tienda → Sucursales`: "Crear sucursal"
 * configura una unidad operativa, no vuelve a registrar al propietario ni al
 * negocio.
 *
 * Los módulos tienen **paso propio** (antes iban dentro de "Operación") y la
 * conexión de WhatsApp Business cierra el flujo. Así el alta son **5 pasos** en
 * el caso normal, o **6** la primera vez, que es cuando hay que tipificar además
 * la tienda.
 */
export function wizardSteps(_storeNeeded?: boolean): WizardStep[] {
  const steps: { key: WizardStepKey; label: string; scope: "store" | "branch" }[] = [
    { key: "store", label: "Tipo de negocio", scope: "branch" },
    { key: "branch", label: "La sucursal", scope: "branch" },
    { key: "location", label: "Ubicación", scope: "branch" },
    { key: "operation", label: "Operación", scope: "branch" },
    { key: "modules", label: "Módulos de tienda", scope: "branch" },
    { key: "whatsapp", label: "WhatsApp Business", scope: "branch" },
  ];
  return steps.map((s, i) => ({ ...s, num: i + 1 }));
}

export const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500";

/* ── Rotating brand-panel copy ─────────────────────────────────────── */

export interface MessageItem {
  title: string;
  subtitle: string;
  badge: string;
}

export const STEP_MESSAGES: Record<WizardStepKey, MessageItem[]> = {
  store: [
    {
      title: "Cada sede con su propia identidad.",
      subtitle: "Define el tipo de negocio y el modelo comercial para esta sucursal.",
      badge: "Tipo de negocio",
    },
    {
      title: "Adaptado a tu modelo comercial.",
      subtitle: "Configuración nativa según tus productos, insumos y forma de venta.",
      badge: "A tu medida",
    },
    {
      title: "Operación independiente.",
      subtitle: "Cada sucursal gestiona sus propios módulos, inventario y canales de venta.",
      badge: "Estructura",
    },
  ],
  branch: [
    {
      title: "Cada sucursal, con su propio nombre.",
      subtitle: "El nombre, el código interno y el teléfono identifican esta unidad y su línea de atención.",
      badge: "Identidad de sede",
    },
    {
      title: "Sabes quién eres: no hay que repetirlo.",
      subtitle: "La titularidad ya está en tu cuenta. Aquí sólo configuras la unidad operativa.",
      badge: "Sin duplicados",
    },
    {
      title: "Crece sin límites.",
      subtitle: "Abre tantas sucursales como necesites: todas comparten catálogo y marca.",
      badge: "Expansión",
    },
  ],
  location: [
    {
      title: "Dónde te encuentran tus clientes.",
      subtitle: "Dirección, ciudad y email propios de esta sucursal.",
      badge: "Ubicación",
    },
    {
      title: "Cobertura clara por sede.",
      subtitle: "Cada sucursal declara su zona de operación y su dirección de entrega.",
      badge: "Cobertura",
    },
    {
      title: "Entregas sin ambigüedad.",
      subtitle: "Una dirección correcta acelera el alistamiento y la entrega.",
      badge: "Logística",
    },
  ],
  operation: [
    {
      title: "Tu operación empieza ahora.",
      subtitle: "Horarios y canales de atención de esta sucursal, listos para vender.",
      badge: "Operación",
    },
    {
      title: "Atención a tu ritmo.",
      subtitle: "Declara los días y el horario en que esta sede recibe a sus clientes.",
      badge: "Horarios",
    },
    {
      title: "Cada canal, en su sitio.",
      subtitle: "WhatsApp, tienda web y mostrador: enciende los que use esta sede.",
      badge: "Canales",
    },
  ],
  modules: [
    {
      title: "Enciende solo lo que necesitas hoy.",
      subtitle: "Pedidos, inventario, turnos… suma o quita módulos sin rehacer tu configuración.",
      badge: "Capacidades modulares",
    },
    {
      title: "Control en tiempo real de stock e insumos.",
      subtitle: "Alertas tempranas de reposición y recetas dinámicas integradas.",
      badge: "Inventario inteligente",
    },
    {
      title: "Crece módulo a módulo.",
      subtitle: "Empieza con lo esencial y activa el resto cuando tu operación lo pida.",
      badge: "Escalable",
    },
  ],
  whatsapp: [
    {
      title: "Tu tienda, atendiendo sola.",
      subtitle: "WhatsApp Business conecta los pedidos con el asistente IA y el motor de órdenes.",
      badge: "Canal principal",
    },
    {
      title: "Tus clientes ya están ahí.",
      subtitle: "Recibe pedidos conversacionales en el canal que usan todos los días.",
      badge: "WhatsApp Business",
    },
    {
      title: "Es opcional, y es importante.",
      subtitle: "Puedes continuar sin conectarlo y vincularlo más tarde desde Ajustes.",
      badge: "Opcional",
    },
  ],
};

/* ── Utils ─────────────────────────────────────────────────────────── */

/** Base market currency per country. Unknown countries fall back to USD. */
export function currencyForCountry(c: string): "COP" | "USD" | "MXN" | "ARS" {
  const map: Record<string, "COP" | "USD" | "MXN" | "ARS"> = {
    Colombia: "COP",
    México: "MXN",
    Argentina: "ARS",
  };
  return map[c] || "USD";
}

/** Turns a commercial name into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
