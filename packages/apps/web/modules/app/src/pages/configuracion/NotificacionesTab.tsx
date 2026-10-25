import React from "react";
import { ReglasNotificaciones } from "./notificaciones/ReglasNotificaciones";

/**
 * Pestaña de Notificaciones de la Organización.
 *
 * Centraliza las reglas automáticas de comunicación con clientes (WhatsApp y Correo)
 * para los eventos del ciclo de vida del pedido (guías, tránsitos, entregas y novedades).
 */
export const NotificacionesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <ReglasNotificaciones />
    </div>
  );
};

export default NotificacionesTab;
