/**
 * Catálogo de las cuatro tarjetas del hub de Configuraciones.
 *
 * Vive aparte de `ConfiguracionPage.tsx` porque hay DOS consumidores: el propio
 * hub, que pinta la tarjeta completa, y el flyout de «Organización» del sidebar
 * en modo rail, que pinta solo etiqueta e icono. Tener el nombre escrito en los
 * dos sitios es cómo se acaba renombrando una tarjeta y dejando el acceso
 * directo con el nombre viejo.
 *
 * La clave `key` es la MISMA que viaja en la URL (`?tab=`): no hay traducción
 * entre «tarjeta» y «pestaña», es la misma cosa.
 */
import type { FC, SVGProps } from "react";

import {
  AdjustmentsHorizontalIcon,
  BellIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";

export type ClaveConfig = "general" | "modulos" | "canales" | "notificaciones" | "apariencia";

export interface TarjetaConfig {
  key: ClaveConfig;
  label: string;
  hint: string;
  icono: FC<SVGProps<SVGSVGElement>>;
  accion: string;
  ajustes: string[];
  palabrasClave: string[];
}

export const TARJETAS_CONFIG: TarjetaConfig[] = [
  {
    key: "general",
    label: "Configuración del negocio",
    hint: "Datos operativos, personalización de marca, datos fiscales y bancarios.",
    icono: BuildingOffice2Icon,
    accion: "Configurar",
    ajustes: ["Datos operativos", "Personalización de marca", "Datos fiscales", "Datos bancarios"],
    palabrasClave: ["sede", "negocio", "nombre", "organizacion", "logo", "pais", "moneda", "rubro", "datos", "empresa", "identidad", "personalizacion"],
  },
  {
    key: "modulos",
    label: "Módulos",
    hint: "Herramientas activas, catálogo de extensiones y funciones del sistema.",
    icono: PuzzlePieceIcon,
    accion: "Configurar",
    ajustes: ["Módulos activos", "Extensiones"],
    palabrasClave: ["modulos", "extensiones", "servicios", "plataforma", "funciones"],
  },
  {
    key: "canales",
    label: "Opciones de mensajería",
    hint: "Conexión centralizada de WhatsApp, Telegram, Instagram y Facebook.",
    icono: ChatBubbleLeftRightIcon,
    accion: "Conectar",
    ajustes: ["WhatsApp", "Telegram", "Instagram", "Facebook"],
    palabrasClave: ["opciones", "whatsapp", "telegram", "instagram", "facebook", "canales", "conectores", "mensajeria", "api", "webhooks", "chat"],
  },
  {
    key: "notificaciones",
    label: "Notificaciones",
    hint: "Reglas automáticas de pedidos por WhatsApp y correo, y avisos de la tienda.",
    icono: BellIcon,
    accion: "Configurar",
    ajustes: ["Alertas de pedidos", "WhatsApp de servicio", "Plantillas de notificación"],
    palabrasClave: ["notificaciones", "alertas", "avisos", "whatsapp", "correo", "email", "mensajes", "pedidos", "reglas", "automaticas"],
  },
  {
    key: "apariencia",
    label: "Preferencias",
    hint: "Tema de la aplicación (claro, oscuro, sistema) y densidad de la interfaz.",
    icono: AdjustmentsHorizontalIcon,
    accion: "Personalizar",
    ajustes: ["Tema", "Densidad de conversaciones", "Densidad del asistente"],
    palabrasClave: ["preferencias", "personalizacion", "apariencia", "tema", "modo oscuro", "oscuro", "claro", "diseño", "densidad", "interfaz", "color"],
  },
];
