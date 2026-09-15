/**
 * Pedidos — Vocabulario de destinos del módulo.
 * ==============================================
 *
 * Las ocho pantallas de Pedidos, con su clave, su rótulo, su icono y **para qué
 * sirve cada una**, en un solo sitio.
 *
 * ── Por qué esto no vive en `OrdersModule.tsx` ──────────────────────────────
 *
 * ⚠️ Vivía allí, y dejó de poder vivir allí el día que el **Panel** —que es una
 * de las pantallas del módulo— necesitó listar los destinos para pintar sus
 * atajos. El shell importa las vistas, así que una vista que importara el
 * vocabulario del shell cerraba el ciclo `OrdersModule → OrdersPanelView →
 * OrdersModule`. En ESM eso no siempre revienta —a veces sólo deja la constante
 * en zona muerta temporal y falla al azar, según qué módulo se evalúe primero—,
 * que es la peor forma de romperse.
 *
 * ⚠️ Y hay una razón de fondo, no sólo mecánica: **el vocabulario de destinos no
 * es una propiedad del shell**. Lo consumen la barra del módulo, la barra lateral
 * del shell, el breadcrumb de `NectoApp`, el widget del Dashboard y ahora el
 * Panel. Vivir dentro de uno de sus consumidores era lo que hacía que los demás
 * tuvieran que importar el componente para leer un array de rótulos.
 *
 * `OrdersModule` lo reexporta, así que los importadores existentes no cambian.
 */

import {
  Archive,
  CalendarClock,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Radio,
  Settings2,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Los destinos del módulo.
 *
 * ⚠️ Es un array `as const`: el tipo se **deriva** de él, así que el vocabulario
 * que pinta la barra y el que valida lo que llega por enlace no pueden divergir
 * (el mismo criterio que `APP_DESTINATIONS` en el shell principal).
 *
 * ⚠️ El orden **es** el recorrido del trabajo: el Panel —el estado y los atajos—
 * abre la marcha, y luego entrada → preparación → salida → lo programado → lo
 * cerrado, y al final el contexto. Un orden alfabético o por antigüedad de
 * implementación obligaría al operador a memorizar dónde está cada cosa en lugar
 * de leerla.
 */
export const ORDERS_SECTIONS = [
  "panel",
  "bandeja",
  "alistamiento",
  "despacho",
  "programados",
  "historial",
  "canales",
  "configuracion",
] as const;

export type OrdersSectionKey = (typeof ORDERS_SECTIONS)[number];

/**
 * El destino con el que abre el módulo cuando nadie pide otro.
 *
 * ⚠️ Es el **Panel**, y es una decisión de diseño, no un descuido: el módulo tiene
 * siete pantallas y el operador no siempre entra sabiendo cuál necesita. Abrir en
 * la Bandeja obligaba a que la primera decisión del día fuera "¿es aquí donde
 * tengo que estar?", y esa pregunta no se responde mirando la Bandeja —una lista
 * de órdenes no dice si además hay algo vencido en Programados—. El Panel sí la
 * responde, y desde él cada cifra lleva a su lista.
 *
 * ⚠️ Vive aquí, junto al vocabulario, para que la barra lateral, el shell y el
 * widget del Dashboard no puedan discrepar sobre cuál es la puerta de entrada:
 * antes cada uno escribía su literal, y el del widget (`"ordenes"`) ya no existía
 * en el vocabulario — funcionaba sólo porque `oneOfSections` lo rechazaba y se
 * caía al valor por defecto.
 */
export const DEFAULT_ORDERS_SECTION: OrdersSectionKey = "panel";

/** El valor si pertenece al vocabulario, o `null`. */
export function oneOfSections(value: string | null): OrdersSectionKey | null {
  return value !== null && (ORDERS_SECTIONS as readonly string[]).includes(value)
    ? (value as OrdersSectionKey)
    : null;
}

export interface OrdersSectionMeta {
  key: OrdersSectionKey;
  /** Rótulo completo, para la barra del módulo. */
  label: string;
  /** Rótulo corto, para la barra lateral estrecha. */
  shortLabel: string;
  icon: LucideIcon;
  /**
   * Para qué sirve esta pantalla, en una frase.
   *
   * ⚠️ Está aquí y no en el Panel porque tiene **dos** consumidores con la misma
   * necesidad: el atajo del Panel la pinta bajo el nombre, y la barra lateral la
   * usa como `title`. Con dos redacciones paralelas, "Historial y auditoría"
   * acabaría describiéndose de dos formas distintas en la misma sesión y el
   * operador dudaría de si son la misma pantalla.
   *
   * ⚠️ Describe **qué se hace** allí, no qué contiene: "Valida lo que acaba de
   * entrar", no "órdenes en estado PENDING". La segunda es la implementación, y
   * cambia sin que cambie el propósito.
   */
  purpose: string;
}

/**
 * La descripción de cada destino, en un solo sitio.
 *
 * ⚠️ La consumen **tres** navegaciones —la barra del módulo, la barra lateral del
 * shell y los atajos del Panel—, así que la etiqueta y el icono tienen que ser
 * los mismos en todas. Con listas paralelas, "Historial y auditoría" acabaría
 * siendo "Historial" en un sitio y otra cosa en el otro.
 */
export const ORDERS_SECTION_META: readonly OrdersSectionMeta[] = [
  {
    key: "panel",
    label: "Panel de pedidos",
    shortLabel: "Panel",
    icon: LayoutDashboard,
    purpose: "El estado del día y un atajo a cada pantalla.",
  },
  {
    key: "bandeja",
    label: "Bandeja de entrada",
    shortLabel: "Bandeja",
    icon: Inbox,
    purpose: "Valida lo que acaba de entrar y asume el compromiso.",
  },
  {
    key: "alistamiento",
    label: "Mesa de alistamiento",
    shortLabel: "Alistamiento",
    icon: ClipboardList,
    purpose: "Prepara las órdenes que ya están comprometidas.",
  },
  {
    key: "despacho",
    label: "Despacho y entrega",
    shortLabel: "Despacho",
    icon: Truck,
    purpose: "Saca lo terminado y cierra lo que llegó a destino.",
  },
  {
    key: "programados",
    label: "Programados",
    shortLabel: "Programados",
    icon: CalendarClock,
    purpose: "Lo que tiene fecha y hora comprometidas.",
  },
  {
    key: "historial",
    label: "Historial y auditoría",
    shortLabel: "Historial",
    icon: Archive,
    purpose: "Responde por lo que ya ocurrió: quién, cuándo y por qué.",
  },
  {
    key: "canales",
    label: "Canales de origen",
    shortLabel: "Canales",
    icon: Radio,
    purpose: "De dónde vienen las órdenes y cuánto pesa cada canal.",
  },
  {
    key: "configuracion",
    label: "Configuración del flujo",
    shortLabel: "Configuración",
    icon: Settings2,
    purpose: "El ritmo de trabajo: cuándo una orden se considera demorada.",
  },
];
