/**
 * Pedidos — Timeline de la orden (§10)
 * =====================================
 *
 * Hace que la orden responda **"¿qué ocurrió?"**, no sólo "¿cuál es su estado?".
 *
 * ── Qué cuenta, además de qué pasó ──────────────────────────────────────────
 *
 * ⚠️ Una lista de cambios con fecha responde *qué* pasó, pero no **cuánto costó
 * cada paso**, que es donde están los problemas. Por eso cada entrada lleva ahora
 * el tiempo que la orden estuvo en el estado al que entró: "Confirmada · 12 sep
 * 09:20 · 42 min". Con eso, auditar deja de ser leer y pasa a ser comparar.
 *
 * ⚠️ Y por eso el umbral entra por parámetro: un tramo que se pasó del ritmo de
 * trabajo configurado se marca. Sin el umbral, "3 h en alistamiento" es un dato
 * que el auditor tiene que juzgar solo; con él, el visor dice qué se salió de lo
 * previsto — que es la pregunta que justifica abrir un historial.
 *
 * ── Lo que el contrato ya guardaba y no se veía ─────────────────────────────
 *
 * ⚠️ El contrato de §10 lleva dos campos que **ninguna** superficie pintaba: la
 * referencia del actor (`wa_conv_8812`, `erp_doc_55210`, `ticket_7731` — el
 * documento externo del que salió el cambio) y `metadata` (canal, pago, regla
 * aplicada). Son exactamente los datos que un auditor necesita para reconstruir
 * el caso, y estaban guardados sin salir a la luz. Aquí se pintan.
 *
 * ⚠️ La entrada de **creación** (`from: null`) se rotula distinto: no es una
 * transición, es el nacimiento de la orden. Tratarla como transición mostraría
 * una flecha "→ Por validar" que no sale de ningún sitio.
 */

import { Clock3, TriangleAlert } from "lucide-react";

import { cn } from "@/utils";
import type { Order, OrderStatusHistoryEntry } from "@/contracts/order.contract";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../order-status.constants";
import {
  ORDER_STATUS_DOT_CLASSES,
  formatDuration,
  formatOrderDate,
} from "../order-presentation.utils";
import { isLongVisit, orderStateVisits } from "../operational/order-operations";

export interface OrderTimelineProps {
  /** La orden entera, no su historial: las duraciones salen de los huecos. */
  order: Order;
  /**
   * Umbral de demora configurado (§17), para marcar los tramos que se pasaron.
   *
   * ⚠️ Opcional: sin él el recorrido sigue siendo correcto, sólo que sin juicio.
   * El detalle lo pasa; una superficie que no tenga los ajustes a mano puede
   * omitirlo sin que el componente mienta.
   */
  thresholdMinutes?: number;
}

const ACTOR_KIND_LABELS: Record<string, string> = {
  user: "Operador",
  customer: "Cliente",
  channel: "Canal",
  automation: "Automatización",
  system: "Sistema",
};

/**
 * Rótulos legibles para las claves de `metadata` que el dominio usa hoy.
 *
 * ⚠️ `metadata` es un vocabulario **abierto** (`Record<string, …>`): una clave que
 * no esté aquí se pinta tal cual, sin traducir. Es lo correcto —inventar un
 * rótulo para una clave desconocida sería peor que enseñarla cruda—, y es también
 * lo que permite que un módulo futuro añada su clave sin tocar este archivo.
 */
const METADATA_LABELS: Record<string, string> = {
  channel: "Canal",
  payment: "Pago",
  rule: "Regla",
  externalId: "Id externo",
};

function metadataEntries(
  entry: OrderStatusHistoryEntry
): { key: string; label: string; value: string }[] {
  const raw = entry.metadata;
  if (!raw) return [];
  return Object.entries(raw).map(([key, value]) => ({
    key,
    label: METADATA_LABELS[key] ?? key,
    value: String(value),
  }));
}

export function OrderTimeline({ order, thresholdMinutes }: OrderTimelineProps) {
  const visits = orderStateVisits(order);

  // Más reciente primero: lo que acaba de pasar es lo que el operador busca.
  const rows = order.history
    .map((entry, index) => ({ entry, visit: visits[index] }))
    .reverse();

  return (
    <ol data-order-timeline className="relative flex flex-col gap-4 pl-1">
      {rows.map(({ entry, visit }, index) => {
        const tone = ORDER_STATUS_TONES[entry.to];
        const isLatest = index === 0;
        const isCreation = entry.from === null;
        const isLast = index === rows.length - 1;
        const isOpenVisit = visit.minutes === null;
        const isLong =
          thresholdMinutes !== undefined && isLongVisit(visit, thresholdMinutes);
        const meta = metadataEntries(entry);

        return (
          <li key={entry.id} data-timeline-entry={entry.to} className="relative flex gap-3">
            {/* Raíl + punto. El raíl se omite en la última entrada para no dejar
                una línea colgando hacia la nada. */}
            <div className="relative flex flex-none flex-col items-center pt-1.5">
              <span
                className={`h-2 w-2 flex-none rounded-full ${ORDER_STATUS_DOT_CLASSES[tone]} ${
                  isLatest ? "ring-4 ring-gray-100 dark:ring-white/5" : ""
                }`}
                aria-hidden
              />
              {!isLast && <span className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-800" />}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {isCreation ? "Orden creada" : ORDER_STATUS_LABELS[entry.to]}
                </p>
                {/* ⚠️ En un visor de auditoría la hora **absoluta** es el dato
                    primario: "hace 4 h" obliga a hacer la resta mentalmente y deja
                    de ser cierto en cuanto se imprime. El relativo se reserva para
                    las pantallas de trabajo, donde la pregunta es "¿lleva mucho?". */}
                <p className="text-theme-xs tabular-nums text-gray-400 dark:text-gray-500">
                  {formatOrderDate(entry.at)}
                </p>
              </div>

              <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                {/* Quién o qué lo originó (§9, §10), con su referencia externa. */}
                {ACTOR_KIND_LABELS[entry.actor.kind] ?? entry.actor.kind}
                {entry.actor.name ? ` · ${entry.actor.name}` : ""}
                {!isCreation && ` · desde ${ORDER_STATUS_LABELS[entry.from!]}`}
              </p>

              {entry.actor.ref && (
                <p
                  data-timeline-actor-ref={entry.actor.ref}
                  className="mt-0.5 font-mono text-theme-xs text-gray-400 dark:text-gray-500"
                >
                  {entry.actor.ref}
                </p>
              )}

              {/* ⚠️ Cuánto duró **este** tramo. Es la cifra que convierte el
                  historial en auditoría: sin ella se sabe qué pasó, pero no
                  cuánto costó cada paso. */}
              <p
                data-timeline-visit={visit.status}
                data-timeline-visit-minutes={visit.minutes ?? ""}
                data-timeline-visit-long={isLong ? "true" : "false"}
                className={cn(
                  "mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-theme-xs",
                  isOpenVisit
                    ? "bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400"
                    : isLong
                      ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                      : "bg-gray-100 text-gray-600 dark:bg-white/[0.04] dark:text-gray-300"
                )}
              >
                {isLong ? (
                  <TriangleAlert className="h-3 w-3 flex-none" aria-hidden />
                ) : (
                  <Clock3 className="h-3 w-3 flex-none" aria-hidden />
                )}
                {isOpenVisit
                  ? "Sigue en este estado"
                  : `${formatDuration(visit.minutes!)} en este estado`}
                {isLong && thresholdMinutes !== undefined
                  ? ` · umbral ${formatDuration(thresholdMinutes)}`
                  : ""}
              </p>

              {/* Motivo (§9) — sólo aparece cuando existe, que es cuando importa. */}
              {entry.reason && (
                <p
                  data-timeline-reason
                  className="mt-1.5 rounded-lg border-l-2 border-gray-200 bg-gray-50 px-2.5 py-1.5 text-theme-xs text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300"
                >
                  {entry.reason}
                </p>
              )}

              {/* Metadata del cambio (§10). Estaba guardada y no se veía. */}
              {meta.length > 0 && (
                <ul data-timeline-metadata className="mt-1.5 flex flex-wrap gap-1.5">
                  {meta.map(item => (
                    <li
                      key={item.key}
                      data-timeline-metadata-key={item.key}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-theme-xs text-gray-500 dark:bg-white/[0.03] dark:text-gray-400"
                    >
                      <span>{item.label}</span>
                      <span className="font-mono text-gray-700 dark:text-gray-200">
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default OrderTimeline;
