import { organizacionStore } from "@/stores/organizacion.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { Building2, Layers, Package, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tareas de puesta en marcha del negocio.
 * Flujo progresivo de Necto:
 * 1. Configurar datos reales del negocio (reemplazar defaults demo).
 * 2. Instalar módulos de operación.
 * 3. Si 'pedidos' está activo, desbloquear tareas específicas:
 *    - Crear productos propios
 *    - Crear el primer pedido real
 *    - Realizar el primer envío en Necto
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
  const tareas: TareaInicio[] = [];

  // 1. Ingresar datos reales del negocio (no el placeholder demo «Mi Empresa»)
  const org = organizacionStore.organizacion;
  const nombreOrg = org?.nombre?.trim() ?? "";
  const negocioCompletado = Boolean(
    org &&
    nombreOrg !== "" &&
    nombreOrg.toLowerCase() !== "mi empresa" &&
    nombreOrg.toLowerCase() !== "empresa demo"
  );

  tareas.push({
    id: "negocio",
    nombre: "Ingresa los datos del negocio",
    aviso: {
      titulo: "Negocio: Datos de la empresa",
      texto: "Ingresa el nombre, identificación y moneda de tu negocio.",
      accion: "Completar",
    },
    ruta: "/configuracion",
    completada: negocioCompletado,
    icono: Building2,
  });

  // 2. Instalar módulos de operación
  const tieneModulos = organizacionStore.modulosActivos.length > 0;
  tareas.push({
    id: "modulo",
    nombre: "Instala un módulo",
    aviso: {
      titulo: "Configuración: Instalar módulos",
      texto: "Activa tus módulos operativos (Pedidos, WhatsApp, etc.).",
      accion: "Completar",
    },
    ruta: "/configuracion?tab=modulos",
    completada: tieneModulos,
    icono: Layers,
  });

  // 3. Tareas dependientes del módulo de PEDIDOS
  // Solo se desbloquean si el usuario tiene activo el módulo 'pedidos'
  if (organizacionStore.esModuloActivo("pedidos")) {
    const catalogo = pedidosStore?.config?.catalogo || [];
    // Comprobar si el usuario cargó productos propios (excluyendo los 3 demo por defecto)
    const tieneProductosPropios =
      catalogo.length > 0 &&
      !catalogo.every((c) =>
        ["cat1", "cat2", "cat3"].includes(c.id) ||
        ["Combo clásico", "Bebida 350ml", "Postre del día"].includes(c.nombre)
      );

    tareas.push({
      id: "productos",
      nombre: "Crea tus productos",
      aviso: {
        titulo: "Catálogo: Agrega tus productos",
        texto: "Publica tus artículos con precios y stock para vender.",
        accion: "Completar",
      },
      ruta: "/pedidos/catalogo",
      completada: tieneProductosPropios,
      icono: Package,
    });

    // Pedidos reales creados por el usuario (excluyendo el lote de seed pd1..pd7)
    const pedidosReales = (pedidosStore?.pedidos || []).filter(
      (p) => !p.id.startsWith("pd") && !p.id.startsWith("p-seed-")
    );
    const tienePrimerPedido = pedidosReales.length > 0;

    tareas.push({
      id: "pedido",
      nombre: "Crea tu primer pedido",
      aviso: {
        titulo: "Pedidos: Primer pedido",
        texto: "Registra o toma tu primera orden desde el catálogo o chat.",
        accion: "Completar",
      },
      ruta: "/pedidos/crear",
      completada: tienePrimerPedido,
      icono: ShoppingCart,
    });

    const tienePrimerEnvio = pedidosReales.some(
      (p) => p.estado === "enviado" || p.estado === "entregado" || Boolean(p.guiaTransportadora)
    );

    tareas.push({
      id: "envio",
      nombre: "Haz tu primer envío y aprende a operar en Necto",
      aviso: {
        titulo: "Logística: Primer despacho",
        texto: "Genera la guía de transporte y aprende el flujo operativo en Necto.",
        accion: "Completar",
      },
      ruta: "/pedidos",
      completada: tienePrimerEnvio,
      icono: Truck,
    });
  }

  return tareas;
}
