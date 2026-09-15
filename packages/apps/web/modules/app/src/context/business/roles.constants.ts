import { CLIENT_ADMIN_ROLE_DESCRIPTION, CLIENT_ADMIN_ROLE_LABEL } from "@/auth/profile";
import type { RolePermission } from "./types";

/* ── Catálogo de roles ─────────────────────────────────────────────────
 * Un único rol: el **Admin Cliente** (documento oficial de Necto, §5.3
 * "Roles y permisos").
 *
 * §5.3 define cuatro roles del cliente —Administrador del Cliente, Operador del
 * Cliente, Referente y Cliente Final—, pero el alta solo crea al titular, así que
 * el catálogo se reduce a uno. Antes había cinco roles de restaurante ("Dueño /
 * Propietario", "Administrador de Tienda", "Cocinero / KDS Chef", "Mesero /
 * Cajero POS", "Encargado de Insumos & Stock") que ningún flujo usaba: su único
 * consumidor era el selector de rol, ya retirado.
 *
 * §5.4 ("Tabla de roles vs. funcionalidades") concede al Admin Cliente todas las
 * funcionalidades del negocio —configuración, dashboards, métricas, reportes,
 * pedidos, agendamiento, reservas, turnos, inventarios, referidos y encuestas— y
 * le niega únicamente el "Acceso global", privativo del Administrador General de
 * Necto. Por eso la matriz de capacidades va entera en `true`.
 *
 * La etiqueta y la descripción se importan del dominio del perfil para que el
 * nombre del rol tenga una sola fuente: es el mismo concepto en las dos capas.
 * ──────────────────────────────────────────────────────────────────── */

export const CLIENT_ADMIN_ROLE: RolePermission = {
  id: "role-client-admin",
  name: CLIENT_ADMIN_ROLE_LABEL,
  description: CLIENT_ADMIN_ROLE_DESCRIPTION,
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
};
