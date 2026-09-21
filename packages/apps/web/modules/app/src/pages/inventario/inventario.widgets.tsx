/**
 * Piezas compartidas por las tres pantallas de lectura de Inventario.
 *
 * Viven aquí y no en cada página porque las tres pintan lo mismo —un KPI, un
 * badge de estado, un encabezado, un vacío— y una copia por página es cómo se
 * acaba con tres tonos del mismo badge. No es un catálogo de diseño: es el
 * mínimo común de este módulo, y ninguna pieza redefine una primitiva de
 * `@/elements` (todas envuelven `Card`, `Badge`, `Table` o `Button`).
 *
 * **Nada de aquí importa `@/pages/pedidos/**`.** Los widgets de Pedidos
 * (`pages/pedidos/widgets`) tienen helpers con el mismo nombre y la tentación es
 * real, pero D2 prohíbe el import cruzado y el formato que se repite no es una
 * regla de negocio.
 */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { Badge } from "@/elements/ui/badge";
import { Card } from "@/elements/ui/card";
import {
  ESTADO_AUDITORIA_BADGE,
  ESTADO_AUDITORIA_LABEL,
  ESTADO_LINEA_BADGE,
  ESTADO_LINEA_LABEL,
  ESTADO_STOCK_BADGE,
  ESTADO_STOCK_LABEL,
  URGENCIA_VENCIMIENTO_BADGE,
  URGENCIA_VENCIMIENTO_LABEL,
  type EstadoAuditoria,
  type EstadoLinea,
  type EstadoStock,
  type UrgenciaVencimiento,
} from "@/stores";

/**
 * Estado de existencias, siempre por el catálogo.
 *
 * La etiqueta y el color salen de `ESTADO_STOCK_LABEL` / `ESTADO_STOCK_BADGE`: no
 * hay ningún `"Agotado"` literal en el JSX de este módulo. Sin verde, y el motivo
 * está escrito en el mapa del store (el manual de marca no tiene verde).
 */
export function EstadoBadge({ estado }: { estado: EstadoStock }) {
  return (
    <Badge color={ESTADO_STOCK_BADGE[estado]} size="sm">
      {ESTADO_STOCK_LABEL[estado]}
    </Badge>
  );
}

/**
 * Urgencia de vencimiento de un lote.
 *
 * Igual que `EstadoBadge`: etiqueta y color salen de los mapas del store, que son
 * `Record<UrgenciaVencimiento, …>` — añadir una banda sin darle texto y color es
 * un error de compilación, no un badge en blanco.
 *
 * Es una pieza distinta de `EstadoBadge` a propósito: un artículo puede estar
 * «ok» de existencias y tener todo su stock vencido, y son dos juicios
 * independientes que no deben compartir badge.
 */
export function VencimientoBadge({ urgencia }: { urgencia: UrgenciaVencimiento }) {
  return (
    <Badge color={URGENCIA_VENCIMIENTO_BADGE[urgencia]} size="sm">
      {URGENCIA_VENCIMIENTO_LABEL[urgencia]}
    </Badge>
  );
}

/**
 * Estado de una auditoría: en proceso, conciliada o cancelada.
 *
 * Mismo contrato que los otros dos badges —etiqueta y color del `Record`
 * exhaustivo del store— y por eso vive aquí y no en la página del conteo.
 */
export function EstadoAuditoriaBadge({ estado }: { estado: EstadoAuditoria }) {
  return (
    <Badge color={ESTADO_AUDITORIA_BADGE[estado]} size="sm">
      {ESTADO_AUDITORIA_LABEL[estado]}
    </Badge>
  );
}

/**
 * En qué quedó una línea del conteo: sin contar, coincide, sobra o falta.
 *
 * Es un cuarto badge y no una reutilización de `EstadoBadge` porque mide otra
 * cosa: `EstadoBadge` juzga existencias contra un mínimo, y esto juzga un conteo
 * contra una foto. Un artículo puede estar «Disponible» de existencias y «Falta»
 * en el conteo sin ninguna contradicción.
 */
export function EstadoLineaBadge({ estado }: { estado: EstadoLinea }) {
  return (
    <Badge color={ESTADO_LINEA_BADGE[estado]} size="sm">
      {ESTADO_LINEA_LABEL[estado]}
    </Badge>
  );
}

/**
 * Encabezado de página: `h1` en tinta de titular y una línea de contexto.
 *
 * `text-ink-title` es la tinta de titular del manual (`#1D3261`); el índigo de
 * marca es acento y **nunca** se usa aquí. La descripción usa gris de cuerpo, no
 * `ink-body`, porque comparte fila con la acción y compite con el título.
 */
export function CabeceraPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink-title dark:text-white/90">{titulo}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{descripcion}</p>
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  );
}

/**
 * Tarjeta de un solo número.
 *
 * `alerta` es la única decoración admitida: cuando el número exige atención, la
 * cifra se tiñe de `error`/`warning` del catálogo. Un KPI coloreado por defecto
 * deja de distinguir nada en cuanto todos lo están.
 */
export function KpiCard({
  label,
  value,
  hint,
  alerta = false,
  tono = "neutro",
}: {
  label: string;
  value: string;
  hint?: string;
  alerta?: boolean;
  tono?: "neutro" | "aviso" | "grave";
}) {
  const tinta =
    alerta && tono === "grave"
      ? "text-error-600 dark:text-error-400"
      : alerta && tono === "aviso"
        ? "text-warning-600 dark:text-warning-400"
        : "text-ink-title dark:text-white/90";

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tinta}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </Card>
  );
}

/**
 * Vacío con causa.
 *
 * Nunca un panel en blanco: `mensaje` dice qué no hay, y `accion` ofrece la
 * salida cuando existe. Un vacío mudo se lee como un fallo de carga.
 */
export function SinResultados({
  titulo,
  mensaje,
  accion,
}: {
  titulo: string;
  mensaje: string;
  accion?: { label: string; to: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-white/10">
      <p className="text-sm font-semibold text-ink-title dark:text-white/90">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{mensaje}</p>
      {accion && (
        <Link
          to={accion.to}
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {accion.label}
        </Link>
      )}
    </div>
  );
}
