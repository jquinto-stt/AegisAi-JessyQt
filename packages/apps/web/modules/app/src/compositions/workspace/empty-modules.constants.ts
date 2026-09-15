import { ShoppingBag, Package, Clock, Users, Calendar, Award } from "lucide-react";
import type { NectoModuleKey } from "../../context/BusinessContext";

export interface ModuleDefinition {
  id: NectoModuleKey;
  title: string;
  category: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  isReady: boolean;
}

/** Static catalogue of the operational modules offered by the hub. */
export const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    id: "pedidos",
    title: "Pedidos",
    category: "Operación y despacho",
    description:
      "Gestión y operación del ciclo de vida de las órdenes independientemente del canal de origen.",
    features: [
      "Órdenes en vivo",
      "Estados y flujo operativo",
      "Preparación y despacho",
      "Historial y trazabilidad",
      "Cancelaciones y devoluciones",
    ],
    icon: ShoppingBag,
    isReady: true,
  },
  {
    id: "inventarios",
    title: "Control de inventarios, Kardex y stock",
    category: "Logística y almacén",
    description:
      "Control de existencias físicas, movimientos de entrada/salida (Kardex), gestión de bodegas, compras a proveedores y alertas de reposición de stock.",
    features: [
      "Movimientos de entrada, salida y ajustes",
      "Alertas automáticas de stock mínimo",
      "Valoración y costo promedio de inventario",
    ],
    icon: Package,
    isReady: true,
  },
  {
    id: "turnos",
    title: "Control de turnos y cierres de caja",
    category: "Caja y operaciones",
    description:
      "Apertura y cierre de turnos con arqueo ciego de caja, registro de ingresos/egresos en efectivo y trazabilidad de cajeros.",
    features: [
      "Apertura y cierre ciego de turno",
      "Control de diferencias de efectivo",
      "Reportes de recaudación por medio de pago",
    ],
    icon: Clock,
    isReady: true,
  },
  {
    id: "reservas",
    title: "Reservas y gestión de mesas o espacios",
    category: "Atención y salón",
    description:
      "Gestión de reservaciones presenciales y confirmación automática por WhatsApp con control de capacidad máxima y franjas horarias.",
    features: [
      "Mapa visual de mesas o cabinas",
      "Confirmación de reservas por WhatsApp",
      "Control de tiempos de estadía y rotación",
    ],
    icon: Users,
    isReady: true,
  },
  {
    id: "agendamiento",
    title: "Agendamiento y citas de servicio",
    category: "Servicios y profesionales",
    description:
      "Calendario sincronizado para agendamiento de turnos, citas técnicas, consultas médicas o servicios profesionales con recordatorios al cliente.",
    features: [
      "Agenda por profesional o estación",
      "Recordatorios preventivos por WhatsApp",
      "Bloqueos de horarios y disponibilidad",
    ],
    icon: Calendar,
    isReady: true,
  },
  {
    id: "referidos",
    title: "Fidelización, cupones y cashback",
    category: "Crecimiento y lealtad",
    description:
      "Sistema de recompensas por recurrencia, cupones dinámicos de descuento enviados tras cada compra por WhatsApp y programa de referidos.",
    features: [
      "Puntos y cashback acumulables",
      "Cupones automáticos por WhatsApp",
      "Campañas de reactivación de clientes inactivos",
    ],
    icon: Award,
    isReady: true,
  },
];

/** Human-readable label for each offer model, used on the identity badges. */
export const OFFER_MODEL_LABELS: Record<string, string> = {
  physical_products: "Productos físicos (SKU)",
  prepared_products: "Productos preparados (Recetas)",
  services_appointments: "Servicios y citas",
};
