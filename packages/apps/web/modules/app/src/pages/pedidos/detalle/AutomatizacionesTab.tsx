import { useState } from "react";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { conversacionesStore } from "@/stores/conversaciones.store";
import type { Pedido } from "@/stores/pedidos.store";
import { inicialesDe } from "@/utils";
import { formatearFechaListaChat, ultimoTexto } from "@/pages/conversaciones/conversaciones.utils";
import { fechaHora } from "./detalle.utils";

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATIZACIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AutomatizacionesTab — el último mensaje que salió hacia el cliente por el
 * hilo del pedido.
 *
 * Lo que se muestra es el mensaje REAL del hilo (el mismo que ve el operador en
 * Conversaciones), no una plantilla de ejemplo: si el pedido no tiene hilo, la
 * pestaña lo dice en vez de inventarse un texto bonito. El botón «Ver más»
 * despliega el mensaje completo cuando no cabe en tres líneas.
 */
export const AutomatizacionesTab = ({ pedido }: { pedido: Pedido }) => {
  const [expandido, setExpandido] = useState(false);
  const conv = conversacionesStore.porTelefono(pedido.telefono);
  const texto = conv ? ultimoTexto(conv.id) : "";

  if (!conv || !texto) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gray-50 text-gray-300 dark:bg-gray-800/60 dark:text-gray-600">
          <ChatBubbleLeftRightIcon className="size-7" />
        </span>
        <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
          Este pedido todavía no tiene mensajes con el cliente
        </p>
        <p className="mt-1 max-w-sm text-xs text-gray-400 dark:text-gray-500">
          Cuando el hilo tenga actividad, el último mensaje aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {inicialesDe(conv.contacto.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-title dark:text-white">
              {conv.contacto.nombre}
            </p>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {conv.contacto.telefono} · {formatearFechaListaChat(conv.ultimaActividad)}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-gray-400">Último mensaje</span>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50/80 px-3.5 py-3 dark:bg-white/[0.03]">
        <p
          className={`text-xs leading-relaxed text-gray-700 dark:text-gray-300 ${
            expandido ? "" : "line-clamp-3"
          }`}
        >
          {texto}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-medium text-gray-400">
            {fechaHora(conv.ultimaActividad)}
          </span>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="text-[11px] font-semibold text-brand-600 hover:underline cursor-pointer dark:text-brand-400"
          >
            {expandido ? "Ver menos" : "Ver más"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
        Es el último mensaje del hilo de WhatsApp de este pedido. Las plantillas automáticas se
        configuran en Pedidos › Configuración › Notificaciones.
      </p>
    </div>
  );
};

export default AutomatizacionesTab;
