import { observer } from "mobx-react-lite";
import { CanalAvatar } from "./CanalAvatar";
import { Badge } from "@/elements/ui/badge";
import { retardoEscalonado } from "@/utils";
import { conversacionesStore, etiquetaEstado } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import { uiStore } from "@/shell/stores/ui.store";
import {
  intencionDe,
  INTENCION_LABEL,
  INTENCION_BADGE,
} from "../conversaciones.clasificacion";
import {
  statusDe,
  formatearFechaListaChat,
  ultimoTexto,
} from "../conversaciones.utils";

interface BandejaListaProps {
  onToggle?: () => void;
  bandejaExpandida?: boolean;
}

export const BandejaLista = observer(({ onToggle, bandejaExpandida = true }: BandejaListaProps) => {
  const bandeja = conversacionesStore.bandeja;
  const seleccionadaId = conversacionesStore.seleccionadaId;
  const compacta = uiStore.densidadBandeja === "compacta";

  return (
    <div className="flex h-full flex-col overflow-hidden font-sans text-gray-800 dark:text-white/90">
      {/* Cabecera: Título "Chats" */}
      <div className="p-4 sm:p-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white/90">
              Chats
            </h3>
            {conversacionesStore.totalNoLeidos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white shadow-theme-xs">
                {conversacionesStore.totalNoLeidos}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 custom-scrollbar">
        {bandeja.length === 0 ? (
          <div className="flex h-36 items-center justify-center p-4 text-center text-xs font-normal text-gray-400 dark:text-gray-500">
            No se encontraron conversaciones.
          </div>
        ) : (
          <div className={compacta ? "space-y-0.5" : "space-y-1"}>
            {bandeja.map((conv, i) => {
              const seleccionada = seleccionadaId === conv.id;
              const preview = ultimoTexto(conv.id) || conv.contacto.telefono || "Sin mensajes";
              const pedidoVivo = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
              const idPedido = pedidoVivo?.numero || (pedidoVivo?.id ? pedidoVivo.id.slice(0, 6) : "");
              const intencion = intencionDe(conv.id);
              const fecha = formatearFechaListaChat(conv.ultimaActividad);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (seleccionadaId === conv.id) {
                      conversacionesStore.seleccionar(null);
                    } else {
                      conversacionesStore.seleccionar(conv.id);
                    }
                  }}
                  style={{ animationDelay: retardoEscalonado(i) }}
                  className={`animate-entrada-lista group flex cursor-pointer items-center transition-colors ${
                    compacta ? "gap-2.5 rounded-xl px-3 py-2.5" : "gap-3 rounded-xl p-3"
                  } ${
                    seleccionada
                      ? "bg-brand-500/10 dark:bg-brand-500/15"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Avatar con foto o canal WhatsApp/Telegram y presencia */}
                  <div className="relative shrink-0">
                    <CanalAvatar
                      canal={conv.canal}
                      nombre={conv.contacto.nombre}
                      size={compacta ? "medium" : "large"}
                      status={statusDe(conv.estado)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Fila 1: Nombre + Badges de intención/estado + Fecha */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                        <h5
                          className={`truncate text-sm font-bold ${
                            seleccionada ? "text-brand-500 dark:text-brand-400" : "text-gray-900 dark:text-white/90"
                          }`}
                        >
                          {conv.contacto.nombre}
                        </h5>

                        {idPedido && (
                          <span className="rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                            #{idPedido}
                          </span>
                        )}

                        <Badge size="xs" color={INTENCION_BADGE[intencion]}>
                          {INTENCION_LABEL[intencion]}
                        </Badge>

                        {conversacionesStore.requiereAtencionHumana(conv) && (
                          <span title={etiquetaEstado("en_espera")}>
                            <Badge size="xs" color="warning">
                              {etiquetaEstado("en_espera")}
                            </Badge>
                          </span>
                        )}
                      </div>

                      <span className="shrink-0 text-xs font-normal text-gray-400 dark:text-gray-500">
                        {fecha}
                      </span>
                    </div>

                    {/* Fila 2: Teléfono + Preview del mensaje */}
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400 font-normal">
                        {conv.contacto.telefono ? `${conv.contacto.telefono} · ` : ""}
                        {preview}
                      </p>
                      {conv.noLeidos > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-theme-xs">
                          {conv.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default BandejaLista;
