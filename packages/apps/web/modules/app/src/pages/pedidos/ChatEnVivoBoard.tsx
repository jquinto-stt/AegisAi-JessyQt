import { observer } from "mobx-react-lite";

import { Badge } from "@/elements/ui/badge";
import { conversacionesStore, presenciaDe } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import type { ConversacionCanal } from "@/stores";
import { formatoMoneda, inicialesDe, retardoEscalonado } from "@/utils";
import { formatearFechaListaChat, ultimoTexto } from "@/pages/conversaciones/conversaciones.utils";

// ═══════════════════════════════════════════════════════════════════════════
// ETAPAS DEL FLUJO EN VIVO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Las cinco etapas del pipeline de conversaciones, en el orden en que el
 * contacto las recorre: del primer «hola» al pago validado.
 */
export type EtapaChat =
  | "contacto_inicial"
  | "oferta_enviada"
  | "seguimiento"
  | "en_cierre"
  | "validacion_pago";

/**
 * Catálogo de las columnas: clave, rótulo y color del punto.
 *
 * El punto de color no es decoración: con cinco columnas, el ojo necesita
 * anclar cada tarjeta a su etapa cuando la columna se sale de pantalla, y el
 * color viaja con la ETAPA, no con la tarjeta.
 */
export const ETAPAS_CHAT: ReadonlyArray<{
  clave: EtapaChat;
  label: string;
  punto: string;
}> = [
  { clave: "contacto_inicial", label: "Contacto Inicial", punto: "bg-accent-500" },
  { clave: "oferta_enviada", label: "Oferta Enviada", punto: "bg-brand-500" },
  { clave: "seguimiento", label: "Seguimiento", punto: "bg-secondary-500" },
  { clave: "en_cierre", label: "En Cierre", punto: "bg-success-500" },
  { clave: "validacion_pago", label: "Validación de pago", punto: "bg-warning-500" },
];

/**
 * En qué etapa cae un hilo.
 *
 * Se DERIVA de lo que ya se sabe del hilo —su estado de atención y si el
 * contacto tiene un pedido activo—, no de un campo nuevo que habría que
 * mantener sincronizado con el store. La regla es una PARTICIÓN: cada hilo cae
 * en una sola etapa, así que los contadores de las columnas suman el total.
 *
 *   1. `atendida`           → En Cierre            un asesor lo está cerrando
 *   2. `en_espera`          → Seguimiento          pidió asesor y espera respuesta
 *   3. `cerrada`            → Validación de pago   el hilo terminó; queda el cobro
 *   4. `abierta` con pedido → Oferta Enviada       el bot ya armó la oferta
 *   5. `abierta` sin pedido → Contacto Inicial     todavía solo conversa
 *
 * El orden importa: es el que resuelve los empates (un hilo `atendida` con
 * pedido es «En Cierre», no «Oferta Enviada»).
 */
export function etapaChatDe(conv: ConversacionCanal): EtapaChat {
  if (conv.estado === "atendida") return "en_cierre";
  if (conv.estado === "en_espera") return "seguimiento";
  if (conv.estado === "cerrada") return "validacion_pago";
  return pedidosStore.pedidoActivoDe(conv.contacto.telefono)
    ? "oferta_enviada"
    : "contacto_inicial";
}

/** Hilos de una etapa, del más reciente al más viejo. */
export function conversacionesDeEtapa(
  convs: ConversacionCanal[],
  etapa: EtapaChat,
): ConversacionCanal[] {
  return convs
    .filter((c) => etapaChatDe(c) === etapa)
    .sort((a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad));
}

/** Cuántos hilos hay en una etapa. Lo consumen las píldoras de filtro. */
export function contarEtapaChat(convs: ConversacionCanal[], etapa: EtapaChat): number {
  return convs.filter((c) => etapaChatDe(c) === etapa).length;
}

/** Fondo del avatar por contacto. Estable por índice, no por hash aleatorio. */
const PALETA_AVATAR = [
  "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  "bg-secondary-100 text-secondary-600 dark:bg-secondary-950 dark:text-secondary-300",
  "bg-accent-100 text-accent-600 dark:bg-accent-950 dark:text-accent-300",
  "bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300",
];

// ═══════════════════════════════════════════════════════════════════════════
// TARJETA DE CONTACTO
// ═══════════════════════════════════════════════════════════════════════════

interface TarjetaChatProps {
  conv: ConversacionCanal;
  indice: number;
  onAbrir: () => void;
}

/**
 * Una tarjeta = un contacto vivo. Resume lo que hace falta para decidir si
 * abrirlo: quién es, por dónde va, qué escribió por última vez y cuánto vale.
 *
 * «Sin valor» no es un hueco: es la respuesta a «¿este contacto dejó dinero?»,
 * y un hilo sin pedido la responde con la palabra, no con un `$0` que se lee
 * como una venta de cero pesos.
 */
const TarjetaChat = observer(({ conv, indice, onAbrir }: TarjetaChatProps) => {
  const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
  const valor = pedido ? pedidosStore.totalPedido(pedido) : 0;
  const preview = ultimoTexto(conv.id);
  const presencia = presenciaDe(conv.estado);
  const iniciales = inicialesDe(conv.contacto.nombre);

  return (
    <button
      type="button"
      onClick={onAbrir}
      style={{ animationDelay: retardoEscalonado(indice) }}
      className="animate-entrada-lista w-full cursor-pointer rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-theme-xs transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-900"
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar con iniciales y presencia: la misma codificación que la bandeja. */}
        <div className="relative shrink-0">
          <span
            className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${
              PALETA_AVATAR[indice % PALETA_AVATAR.length]
            }`}
          >
            {iniciales}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${
              presencia === "online"
                ? "bg-accent-500"
                : presencia === "busy"
                  ? "bg-brand-500"
                  : "bg-gray-400"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-ink-title dark:text-white">
              {conv.contacto.nombre}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-gray-400">
              {formatearFechaListaChat(conv.ultimaActividad)}
            </span>
          </div>
          <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
            {conv.contacto.telefono}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            {preview || "Sin mensajes todavía"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
        <span
          className={`text-[11px] font-semibold ${
            valor > 0 ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {valor > 0 ? formatoMoneda(valor) : "Sin valor"}
        </span>
        <div className="flex items-center gap-1.5">
          {conv.noLeidos > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {conv.noLeidos}
            </span>
          )}
          {/* Lead / Cliente: el único eje que el pie necesita decir. Un contacto
              sin pedido activo es un lead, y eso es información, no un vacío. */}
          <Badge color={pedido ? "success" : "light"} size="sm">
            {pedido ? "Cliente" : "Lead"}
          </Badge>
        </div>
      </div>
    </button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNA
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnaChatProps {
  label: string;
  punto: string;
  convs: ConversacionCanal[];
  onAbrirChat: (convId: string) => void;
}

const ColumnaChat = observer(({ label, punto, convs, onAbrirChat }: ColumnaChatProps) => {
  // El dinero de la columna se DERIVA de los pedidos activos de sus contactos:
  // no se guarda en ningún sitio, así que no puede quedarse desfasado.
  const total = convs.reduce((s, c) => {
    const p = pedidosStore.pedidoActivoDe(c.contacto.telefono);
    return s + (p ? pedidosStore.totalPedido(p) : 0);
  }, 0);

  return (
    <section className="flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-gray-100/80 bg-gray-50/90 p-3 dark:border-gray-800/60 dark:bg-white/[0.02]">
      {/* Cabecera: punto de etapa + nombre, y debajo «dinero · contactos».
          El importe va primero porque es lo que se compara de un vistazo. */}
      <header className="mb-3 shrink-0 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${punto}`} />
          <h2 className="truncate text-sm font-bold text-ink-title dark:text-white">{label}</h2>
        </div>
        <p className="mt-1 pl-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {formatoMoneda(total)} <span className="font-medium text-gray-400">· {convs.length}</span>
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {convs.map((c, i) => (
          <TarjetaChat key={c.id} conv={c} indice={i} onAbrir={() => onAbrirChat(c.id)} />
        ))}
        {convs.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 py-10 text-center text-xs font-medium text-gray-400 dark:border-gray-800/80">
            Sin chats
          </div>
        )}
      </div>
    </section>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TABLERO
// ═══════════════════════════════════════════════════════════════════════════

interface ChatEnVivoBoardProps {
  /** Etapa filtrada desde la barra. `"todas"` = las cinco columnas. */
  filtro: EtapaChat | "todas";
  /** Texto del buscador de la barra (nombre o teléfono del contacto). */
  busqueda: string;
  /** Abre el hilo del contacto. Lo resuelve el contenedor, no el tablero. */
  onAbrirChat: (convId: string) => void;
}

/**
 * ChatEnVivoBoard — el flujo de conversaciones en vivo, en columnas.
 *
 * Es la mitad «Chat en vivo» del conmutador de Pedidos: mientras «Operación»
 * responde «¿cómo va el pedido?», este tablero responde «¿quién está hablando
 * conmigo ahora y en qué punto quedó?». Los dos leen el mismo negocio, pero no
 * la misma pregunta, y por eso no comparten columnas ni tarjetas.
 *
 * No hay arrastre entre columnas a propósito: la etapa se deriva del estado del
 * hilo y de si tiene pedido, así que soltar una tarjeta en otra columna no
 * tendría a quién escribirle el cambio — sería un gesto que no hace nada.
 */
export const ChatEnVivoBoard = observer(({ filtro, busqueda, onAbrirChat }: ChatEnVivoBoardProps) => {
  const q = busqueda.trim().toLowerCase();

  const convs = conversacionesStore.conversaciones.filter((c) => {
    if (!q) return true;
    return (
      c.contacto.nombre.toLowerCase().includes(q) ||
      c.contacto.telefono.toLowerCase().includes(q)
    );
  });

  const columnas = ETAPAS_CHAT.filter((e) => filtro === "todas" || e.clave === filtro);

  return (
    <div className="flex h-full min-h-0 flex-1 gap-4 overflow-x-auto pb-1">
      {/* Las etapas del pipeline, una al lado de otra como en el tablero de
          referencia: cinco columnas se leen de un vistazo y, si no caben, la
          fila se desplaza en horizontal en vez de partirse en dos renglones
          (un pipeline partido deja de leerse como un recorrido). */}
      {columnas.map((etapa) => (
        <div
          key={etapa.clave}
          className={`flex min-h-0 ${
            columnas.length === 1 ? "w-full max-w-md" : "min-w-[260px] max-w-[380px] flex-1"
          }`}
        >
          <ColumnaChat
            label={etapa.label}
            punto={etapa.punto}
            convs={conversacionesDeEtapa(convs, etapa.clave)}
            onAbrirChat={onAbrirChat}
          />
        </div>
      ))}
    </div>
  );
});

export default ChatEnVivoBoard;
