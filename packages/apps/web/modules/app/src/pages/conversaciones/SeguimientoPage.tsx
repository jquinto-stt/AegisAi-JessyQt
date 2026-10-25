import React from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { SeguimientoPipelineView } from "./components/SeguimientoPipelineView";

/**
 * Página de Seguimiento (Pipeline Kanban de Conversaciones / Ventas).
 *
 * Ofrece un flujo visual limpio de 5 etapas para gestionar leads y oportunidades
 * de WhatsApp y canales, con métricas en vivo y acceso rápido al chat.
 */
export const SeguimientoPage: React.FC = observer(() => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden font-sans text-gray-900 dark:text-white/90">
      <PageMeta
        title="Seguimiento · Pipeline de Conversaciones"
        description="Tablero Kanban de seguimiento de prospectos y conversaciones de ventas"
      />

      <SeguimientoPipelineView
        onCambiarAVistaChats={() => navigate("/conversaciones")}
      />
    </div>
  );
});

export default SeguimientoPage;
