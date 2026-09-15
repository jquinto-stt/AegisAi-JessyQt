import type { ElementType } from "react";
import {
  Store,
  MessageSquare,
  Bot,
  CreditCard,
  Camera,
  SlidersHorizontal,
  BookOpen,
  ShoppingBag,
  UserCheck,
  Clock,
} from "lucide-react";
import type { ImageTransformConfig, NectoModuleKey } from "../../../context/BusinessContext";

/* ── Business settings: static catalogues & shared presentation helpers ──
 * Everything here is pure: no React state, no side effects. Keeping the
 * tab list and the image-framing defaults out of the modal means the modal
 * itself only owns behaviour.
 * ─────────────────────────────────────────────────────────────────── */

export type SettingsTabKey =
  | "general"
  | "channels"
  | "assistant"
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

/** Un origen de capacidades. Ver `CAPABILITY_SOURCES`. */
export type CapabilitySourceId = CustomCapability["sourceId"];

/**
 * Los **tres ejes** que `sourceId` mezclaba en un solo enumerado.
 *
 * - `store` — contenido que ya vive en la sede (catálogo, FAQ, políticas).
 * - `module` — un módulo **contratado** por la sede (inventario, pedidos).
 * - `attention` — comportamiento del asistente (pasar a un asesor).
 */
export type CapabilitySourceAxis = "store" | "module" | "attention";

export interface CapabilitySourceDef {
  axis: CapabilitySourceAxis;
  /**
   * Módulo que la sede debe tener activo. `null` = no depende de ningún módulo.
   * Sólo los orígenes de eje `module` lo llevan.
   */
  module: NectoModuleKey | null;
  /** Qué decir cuando falta el módulo. */
  missingModuleHint?: string;
}

/**
 * Catálogo de orígenes de capacidades del asistente.
 *
 * ⚠️ `sourceId` nació como una **lista plana de siete orígenes** y ahí convivían
 * cosas que no son lo mismo: contenido de la tienda, módulos contratados y
 * comportamiento del asistente. Al no distinguirlos, la pestaña se leía como una
 * configuración general y no como la suma de lo que la sede tiene contratado.
 *
 * ⚠️ **No renombra los valores.** `sourceId` está **persistido** dentro de cada
 * capacidad guardada: cambiar `"inventory"` por `"inventarios"` dejaría huérfanas
 * las capacidades que ya existen. Lo que se declara aquí es de qué eje viene cada
 * uno y qué módulo exige — el valor guardado se respeta.
 */
export const CAPABILITY_SOURCES: Record<CapabilitySourceId, CapabilitySourceDef> = {
  catalog: { axis: "store", module: null },
  business: { axis: "store", module: null },
  faq: { axis: "store", module: null },
  policies: { axis: "store", module: null },
  human: { axis: "attention", module: null },
  inventory: {
    axis: "module",
    module: "inventarios",
    missingModuleHint: "Requiere el módulo de Inventarios activo en esta sede.",
  },
  orders: {
    axis: "module",
    module: "pedidos",
    missingModuleHint: "Requiere el módulo de Pedidos activo en esta sede.",
  },
};

/** El módulo que exige un origen, o `null` si no depende de ninguno. */
export const sourceModuleOf = (sourceId: CapabilitySourceId): NectoModuleKey | null =>
  CAPABILITY_SOURCES[sourceId]?.module ?? null;

/**
 * ¿Está disponible este origen en la sede?
 *
 * ⚠️ Un origen de módulo **sin** su módulo no debe ofrecerse, ni siquiera
 * deshabilitado. La tarjeta de pedidos rotulaba "Pedidos conectados" en verde de
 * forma **incondicional**: con el módulo de Pedidos apagado afirmaba una conexión
 * que no existía, que es peor que no mostrarla.
 */
export const isCapabilitySourceAvailable = (
  sourceId: CapabilitySourceId,
  activeModules?: NectoModuleKey[]
): boolean => {
  const required = sourceModuleOf(sourceId);
  return required === null || (activeModules ?? []).includes(required);
};

/** Neutral starting point for the logo/banner framing controls. */
export const DEFAULT_TRANSFORM: ImageTransformConfig = { scale: 1, rotate: 0, posX: 0, posY: 0 };

/** Renders a CSS transform with the framing transform applied, exactly as the storefront does. */
export const transformStyle = (t: ImageTransformConfig): React.CSSProperties => ({
  transform: `rotate(${t.rotate}deg) scale(${t.scale}) translate(${t.posX}%, ${t.posY}%)`,
});

/**
 * Catálogo único de secciones de los ajustes de sede.
 *
 * ⚠️ Antes había **dos** listas: `SETTINGS_TAB_IDS` (aquí, exportada y sin un
 * solo lector) y `TABS` (dentro del modal, con etiquetas e iconos). Dos fuentes
 * para el mismo hecho: añadir una sección en una sola de las dos la dejaba
 * inalcanzable sin que nada avisara. Ahora hay una.
 *
 * `label` es lo que se pinta en la navegación lateral; `eyebrow`/`title`/
 * `description` son el encabezado de la sección activa. Antes cada pestaña
 * escribía su propio encabezado a mano —con dos tamaños de `h2` distintos— y la
 * etiqueta de la pestaña quedaba duplicada en el cuerpo.
 *
 * ⚠️ `label` es **contrato de los arneses**: `verify-settings-layout.mjs` pulsa
 * cada sección buscando `textContent.trim() === label` (línea 209). Renombrar
 * una etiqueta obliga a actualizar esa lista en el mismo cambio.
 *
 * ⚠️ Rótulos en **minúscula normal**: el antetítulo se pintaba en versalita
 * espaciada y los títulos llevaban "&" y Mayúsculas De Título. Es el mismo
 * defecto de "tipografía y rótulos" que se corrigió en Ajustes de perfil
 * (`Perfil & Identidad` → `Perfil y personalización`).
 */
export interface SettingsTabDef {
  id: SettingsTabKey;
  /** Etiqueta de la navegación lateral del modal. **Contrato de los arneses.** */
  label: string;
  /** Antetítulo de la sección, encima del título. */
  eyebrow: string;
  /** Título del encabezado de la sección. */
  title: string;
  /** Bajada del encabezado de la sección. */
  description: string;
  icon: ElementType;
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  {
    id: "general",
    label: "General",
    eyebrow: "Identidad de la sede",
    title: "General y ubicación",
    description: "Identidad comercial, dirección física y modalidades de servicio de la sede.",
    icon: Store,
  },
  {
    id: "channels",
    label: "Canales de entrada",
    eyebrow: "Puntos de contacto",
    title: "Canales de entrada",
    description: "Gestiona los medios por donde tus clientes envían pedidos a esta sede.",
    icon: MessageSquare,
  },
  {
    id: "assistant",
    label: "Asistente de WhatsApp IA",
    eyebrow: "Atención automatizada",
    title: "Asistente de WhatsApp IA",
    description: "Configura la personalidad, fuentes de información y reglas de atención conversacional.",
    icon: Bot,
  },
  {
    id: "payments",
    label: "Pagos",
    eyebrow: "Cobros y transferencias",
    title: "Cuentas y métodos de pago",
    description: "Cuentas receptoras para transferencias de clientes y métodos de cobro presencial habilitados.",
    icon: CreditCard,
  },
  {
    id: "branding",
    label: "Marca y visual",
    eyebrow: "Identidad visual",
    title: "Personalización de la sede",
    description: "Así verán tus clientes esta sede. Ajusta el logo, la portada y el color de marca.",
    icon: Camera,
  },
  {
    id: "operations",
    label: "Operaciones",
    eyebrow: "Operación diaria",
    title: "Operaciones y estado de la sede",
    description: "Flujo de órdenes, pausas programadas y acciones críticas de la sede.",
    icon: SlidersHorizontal,
  },
];

/** La sección declarada por `id`, o `general` si el id no está en el catálogo. */
export const settingsTabDef = (id: SettingsTabKey): SettingsTabDef =>
  SETTINGS_TABS.find((t) => t.id === id) ?? SETTINGS_TABS[0];

/** Default custom capabilities seeded on first run. */
export const DEFAULT_CUSTOM_CAPABILITIES: CustomCapability[] = [
  {
    id: "cap_combo_sugerido",
    sourceId: "catalog",
    label: "Sugerir maridajes y combos",
    desc: "Ofrece guarnición o bebida sugerida al elegir plato fuerte",
    instruction:
      "Cuando el cliente elija un plato principal, sugiere automáticamente la bebida o combo recomendado con el valor promocional.",
    enabled: true,
  },
  {
    id: "cap_alergias",
    sourceId: "business",
    label: "Protocolo de alérgenos y celiaquía",
    desc: "Informa advertencias de ingredientes si el cliente lo consulta",
    instruction:
      "Si el cliente pregunta por ingredientes alérgenos, trazas de frutos secos o celiaquía, valida la ficha técnica y provee el contacto del responsable de cocina.",
    enabled: true,
  },
];

/** Sub-navigation of the assistant tab. */
export type BotSubTab =
  | "identity"
  | "knowledge"
  | "orders_oms"
  | "handoff"
  | "hours"
  | "experience";

/**
 * Sub-navegación del asistente.
 *
 * ⚠️ **Única fuente.** El rótulo y el icono de cada apartado viven aquí. Antes
 * esta lista existía **duplicada**: esta copia sin un solo lector, y otra con
 * iconos dentro de `WhatsAppBotTab` — con rótulos distintos en cada una
 * ("Horarios y disponibilidad" vs "Horarios"), así que la navegación que se
 * pintaba no era la del catálogo.
 */
export interface BotSubTabDef {
  id: BotSubTab;
  label: string;
  icon: ElementType;
  /**
   * Módulo de la sede que este apartado necesita, o `null` si no depende de
   * ninguno.
   *
   * ⚠️ Gatear sólo las **tarjetas** de dentro dejaba la puerta abierta: con el
   * módulo de Pedidos apagado, "Reglas de pedidos" seguía en la barra y dejaba
   * configurar la creación y confirmación de pedidos de un módulo que la sede no
   * tiene. El apartado entero es del módulo, así que lo declara aquí y la barra
   * se construye filtrando — igual que las capacidades.
   */
  module: NectoModuleKey | null;
}

export const BOT_SUB_TABS: BotSubTabDef[] = [
  { id: "identity", label: "Identidad y comportamiento", icon: Bot, module: null },
  { id: "knowledge", label: "Conocimiento y capacidades", icon: BookOpen, module: null },
  { id: "orders_oms", label: "Reglas de pedidos", icon: ShoppingBag, module: "pedidos" },
  { id: "handoff", label: "Pasar a un asesor", icon: UserCheck, module: null },
  { id: "hours", label: "Horarios y disponibilidad", icon: Clock, module: null },
  { id: "experience", label: "Experiencia del cliente", icon: SlidersHorizontal, module: null },
];

/**
 * Los apartados que esta sede puede ver: los suyos, y los que su módulo respalda.
 *
 * Nunca devuelve la lista vacía: cinco de los seis apartados no dependen de
 * ningún módulo, así que siempre queda al menos uno al que caer.
 */
export const botSubTabsFor = (activeModules?: NectoModuleKey[]): BotSubTabDef[] =>
  BOT_SUB_TABS.filter((t) => t.module === null || (activeModules ?? []).includes(t.module));

/**
 * Maps any external tab link to a valid SettingsTabKey so legacy deep links
 * ("pedidos", "schedule", "advanced") keep working.
 *
 * ⚠️ `whatsapp_bot` se conserva como alias: era la clave de la pestaña del
 * asistente cuando el asistente colgaba de WhatsApp. Un enlace guardado con la
 * clave vieja sigue abriendo la pestaña correcta.
 */
export const resolveTab = (tab?: string): SettingsTabKey => {
  if (!tab) return "general";
  if (tab === "channels") return "channels";
  if (tab === "assistant" || tab === "whatsapp_bot") return "assistant";
  if (tab === "payments") return "payments";
  if (tab === "branding") return "branding";
  if (tab === "operations" || tab === "pedidos" || tab === "schedule" || tab === "advanced")
    return "operations";
  return "general";
};
