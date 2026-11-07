import { organizacionStore } from "@/stores/organizacion.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { inventarioStore } from "@/stores/inventario.store";
import { UserCheck, Building2, Package, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tareas de puesta en marcha del negocio. Una sola fuente para el checklist
 * de `/inicio` y para las notificaciones del dashboard en Necto.
 */
export interface TareaInicio {
  id: string;
  nombre: string;
  /** Título y texto de la notificación cuando la tarea está pendiente. */
  aviso: { titulo: string; texto: string; accion: string };
  ruta: string;
  completada: boolean;
  icono: LucideIcon;
}

export function tareasDeInicio(): TareaInicio[] {
  const tienePerfil = Boolean(organizacionStore?.tienePerfil);
  const tieneNegocio = Boolean(organizacionStore?.tieneOrganizacion);
  const tieneProductos =
    (pedidosStore?.config?.catalogo?.length ?? 0) > 0 ||
    (inventarioStore?.articulos?.length ?? 0) > 0;
  const tienePedidos = (pedidosStore?.pedidos?.length ?? 0) > 0;
  const tieneEnvios = Boolean(
    pedidosStore?.pedidos?.some(
      (p) => p.estado === "enviado" || p.estado === "entregado" || Boolean(p.guiaTransportadora)
    )
  );

  return [
    {
      id: "cuenta",
      nombre: "Crea tu cuenta",
      aviso: {
        titulo: "Cuenta: Completa tus datos",
        texto: "Completa tu perfil para personalizar tu cuenta en Necto.",
        accion: "Completar",
      },
      ruta: "/onboarding/perfil",
      completada: tienePerfil,
      icono: UserCheck,
    },
    {
      id: "negocio",
      nombre: "Ingresa los datos del negocio",
      aviso: {
        titulo: "Negocio: Datos de la empresa",
        texto: "Ingresa el nombre, identificación y moneda de tu negocio.",
        accion: "Completar",
      },
      ruta: "/configuracion",
      completada: tieneNegocio,
      icono: Building2,
    },
    {
      id: "productos",
      nombre: "Crea tus productos",
      aviso: {
        titulo: "Catálogo: Agrega tus productos",
        texto: "Publica tus artículos con precios y stock para vender.",
        accion: "Completar",
      },
      ruta: "/pedidos/catalogo",
      completada: tieneProductos,
      icono: Package,
    },
    {
      id: "pedido",
      nombre: "Crea tu primer pedido",
      aviso: {
        titulo: "Pedidos: Primer pedido",
        texto: "Registra o toma tu primera orden desde el catálogo o chat.",
        accion: "Completar",
      },
      ruta: "/pedidos/crear",
      completada: tienePedidos,
      icono: ShoppingCart,
    },
    {
      id: "envio",
      nombre: "Haz tu primer envío y aprende a operar en Necto",
      aviso: {
        titulo: "Logística: Primer despacho",
        texto: "Genera la guía de transporte y aprende el flujo operativo en Necto.",
        accion: "Completar",
      },
      ruta: "/pedidos",
      completada: tieneEnvios,
      icono: Truck,
    },
  ];
}
