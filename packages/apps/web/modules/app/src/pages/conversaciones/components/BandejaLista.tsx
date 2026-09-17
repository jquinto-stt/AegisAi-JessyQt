import { observer } from "mobx-react-lite";

import { Badge, type BadgeColor } from "@/elements/ui/badge";
import { Input } from "@/elements/form/input";
import { conversacionesStore } from "@/stores/conversaciones.store";
import type {
  Conversacion,
  EstadoConversacion,
  FiltroBandeja,
  ModoAtencion,
  ModuloDestino,
} from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// BANDEJA — columna izquierda de la consola /conversaciones (tarea 6.2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opciones de filtro de la bandeja (Req 1.3–1.6). El `valor` es el argumento
 * que se pasa a `conversacionesStore.setFiltro`; la `etiqueta` es lo que ve el
 * operador.
 */
const FILTROS: ReadonlyArray<{ valor: FiltroBandeja; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "no_leidas", etiqueta: "No leídas" },
  { valor: "requieren_atencion", etiqueta: "Requieren atención" },
  { valor: "cerradas", etiqueta: "Cerradas" },
];

/**
 * Etiqueta legible de cada módulo de dominio para el filtro por módulo. Una
 * conversación es transversal: puede tocar varios módulos. Este filtro muestra
 * solo las que incluyen al menos un mensaje de ese módulo (`moduloContexto`).
 */
const MODULO_LABEL: Record<ModuloDestino, string> = {
  pedidos: "Pedidos",
  inventario: "Inventario",
  turnos: "Turnos",
  agendamiento: "Agendamiento",
  general: "General",
};

/**
 * Etiqueta y color del badge de ESTADO del hilo (Req 1.9). Es un indicador
 * distinto del badge de responsable (más abajo): comunica en qué punto del
 * ciclo de vida está la conversación (`abierta`/`en_espera`/`atendida`/`cerrada`).
 */
const ESTADO_META: Record<
  EstadoConversacion,
  { etiqueta: string; color: BadgeColor }
> = {
  abierta: { etiqueta: "Abierta", color: "info" },
  en_espera: { etiqueta: "En espera", color: "warning" },
  atendida: { etiqueta: "Atendida", color: "success" },
  cerrada: { etiqueta: "Cerrada", color: "light" },
};

/**
 * Etiqueta e icono del badge de RESPONSABLE (Req 1.9). Distingue quién atiende
 * ahora: 🤖 `bot` (Necto Intelligence) o 👤 `humano` (operador). Es un badge
 * SEPARADO del de estado para que ambos se lean de un vistazo.
 */
const ATENCION_META: Record<ModoAtencion, { etiqueta: string; icono: string }> =
  {
    bot: { etiqueta: "Bot", icono: "🤖" },
    humano: { etiqueta: "Humano", icono: "👤" },
  };

/**
 * Fila de una conversación en la bandeja. Muestra el nombre del contacto, el
 * badge de estado y el badge de responsable (distintos entre sí, Req 1.9) y el
 * contador de no leídos (Req 1.10). Al hacer click selecciona la conversación
 * —lo que la marca como leída (Req 1.11)— y se resalta si es la seleccionada.
 */
const BandejaItem = observer(({ conv }: { conv: Conversacion }) => {
  const seleccionada = conversacionesStore.seleccionadaId === conv.id;
  const estado = ESTADO_META[conv.estado];
  const atencion = ATENCION_META[conv.atencion];
  // Módulos tocados por la conversación (transversal): se muestran como badges
  // para saber de un vistazo de qué trata el hilo sin abrirlo.
  const modulos = conversacionesStore.modulosDe(conv.id);

  return (
    <li>
      <button
        type="button"
        onClick={() => conversacionesStore.seleccionar(conv.id)}
        aria-current={seleccionada}
        className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          seleccionada
            ? "border-brand-300 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
            : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {conv.contacto.nombre}
          </span>
          {/* Contador de no leídos (Req 1.10): solo visible si hay pendientes. */}
          {conv.noLeidos > 0 && (
            <Badge variant="solid" color="primary" size="xs">
              {conv.noLeidos}
            </Badge>
          )}
        </div>

        <span className="truncate text-xs text-gray-400 dark:text-gray-500">
          {conv.contacto.telefono}
        </span>

        {/* Badges: estado del hilo, responsable (Req 1.9) y módulo(s) tocados. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color={estado.color} size="xs">
            {estado.etiqueta}
          </Badge>
          <Badge variant="light" color="light" size="xs">
            <span aria-hidden="true">{atencion.icono}</span> {atencion.etiqueta}
          </Badge>
          {modulos.map((mod) => (
            <Badge key={mod} variant="light" color="info" size="xs">
              {MODULO_LABEL[mod]}
            </Badge>
          ))}
        </div>
      </button>
    </li>
  );
});

/**
 * BandejaLista — columna izquierda de la consola del operador (tarea 6.2).
 *
 * Renderiza `conversacionesStore.bandeja` (ya filtrada, buscada y ordenada por
 * el store) y ofrece los controles de la bandeja:
 *  - Filtros `Todas` / `No leídas` / `Requieren atención` / `Cerradas` vía
 *    `setFiltro` (Req 1.3–1.6), marcando visualmente el activo.
 *  - Buscador por nombre/teléfono vía `setBusqueda` (Req 1.7).
 *  - Cada item muestra badge de estado distinto del de responsable (Req 1.9) y
 *    el contador de no leídos (Req 1.10); al seleccionar llama `seleccionar`
 *    (marca leído, Req 1.11) y resalta la seleccionada.
 *  - Indicador de bandeja vacía cuando no hay coincidencias (Req 1.8).
 *
 * Es `observer`: re-renderiza al cambiar bandeja, filtro, búsqueda o selección.
 */
export const BandejaLista = observer(() => {
  const bandeja = conversacionesStore.bandeja;
  const filtroActivo = conversacionesStore.filtro;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Bandeja
        </h2>
        {conversacionesStore.totalNoLeidos > 0 && (
          <Badge variant="solid" color="primary" size="xs">
            {conversacionesStore.totalNoLeidos}
          </Badge>
        )}
      </div>

      {/* Buscador (Req 1.7): filtra por nombre o teléfono, case-insensitive. */}
      <Input
        type="text"
        placeholder="Buscar por nombre o teléfono"
        value={conversacionesStore.busqueda}
        onChange={(e) => conversacionesStore.setBusqueda(e.target.value)}
        aria-label="Buscar conversaciones"
      />

      {/* Filtros (Req 1.3–1.6): marca visualmente el activo. */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => {
          const activo = filtroActivo === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => conversacionesStore.setFiltro(f.valor)}
              aria-pressed={activo}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                activo
                  ? "border-brand-300 bg-brand-500 text-white dark:border-brand-500"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {f.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Lista de conversaciones o indicador de bandeja vacía (Req 1.8). */}
      {bandeja.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-3 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
          No hay conversaciones que coincidan con el filtro y la búsqueda.
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {bandeja.map((conv) => (
            <BandejaItem key={conv.id} conv={conv} />
          ))}
        </ul>
      )}
    </div>
  );
});

export default BandejaLista;
