import { Badge } from "@/elements/ui/badge";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utils";
import {
  diferenciaDe,
  estadoDeLinea,
  type CondicionElemento,
  type EstadoElemento,
  type EstadoInventario,
  type EstadoLinea,
  type Inventario,
  type LineaInventario,
  type Progreso,
} from "@/domain/inventarios/inventarios.domain";
import {
  CONDICION_META,
  ESTADO_ELEMENTO_META,
  ESTADO_INVENTARIO_META,
  ESTADO_LINEA_META,
} from "./inventarios.constants";

// ═══════════════════════════════════════════════════════════════════════════
// WIDGETS DE INVENTARIOS
// ═══════════════════════════════════════════════════════════════════════════
//
// Las piezas que se repiten en varias pantallas. Se declaran UNA vez aquí y las
// páginas componen.
//
// **Regla que este archivo respeta:** un widget nunca recalcula el hecho que
// pinta. `EstadoLineaBadge` recibe la línea y llama a `estadoDeLinea()`, que es
// la definición única; no tiene su propia comparación. Si la tuviera, existirían
// dos respuestas a «¿esta línea cuadra?» y bastaría con tocarlas por separado
// para que discreparan.

// ── Badges de estado ──────────────────────────────────────────────────────

export function EstadoInventarioBadge({
  estado,
  size = "sm",
}: {
  estado: EstadoInventario;
  size?: "xs" | "sm" | "md";
}) {
  const meta = ESTADO_INVENTARIO_META[estado];
  return (
    <Badge color={meta.color} size={size}>
      {meta.label}
    </Badge>
  );
}

export function EstadoElementoBadge({
  estado,
  size = "sm",
}: {
  estado: EstadoElemento;
  size?: "xs" | "sm" | "md";
}) {
  const meta = ESTADO_ELEMENTO_META[estado];
  return (
    <Badge color={meta.color} size={size}>
      {meta.label}
    </Badge>
  );
}

/**
 * Estado de una línea, **derivado de la línea** y no recibido por parámetro.
 *
 * La firma es a propósito: si el llamador pasara el `EstadoLinea`, tendría que
 * calcularlo primero, y ese cálculo viviría en la página. Recibiendo la línea,
 * el único sitio donde se decide el estado es `estadoDeLinea()`.
 */
export function EstadoLineaBadge({
  linea,
  size = "sm",
}: {
  linea: Pick<LineaInventario, "cantidadObservada" | "cantidadEsperada">;
  size?: "xs" | "sm" | "md";
}) {
  const meta = ESTADO_LINEA_META[estadoDeLinea(linea)];
  return (
    <Badge color={meta.color} size={size}>
      {meta.label}
    </Badge>
  );
}

export function CondicionBadge({
  condicion,
  size = "sm",
}: {
  condicion: CondicionElemento;
  size?: "xs" | "sm" | "md";
}) {
  const meta = CONDICION_META[condicion];
  return (
    <Badge color={meta.color} size={size}>
      {meta.label}
    </Badge>
  );
}

/** Estado de línea por su valor ya derivado. Para los filtros y los resúmenes. */
export function EstadoLineaBadgeDirecto({
  estado,
  size = "sm",
}: {
  estado: EstadoLinea;
  size?: "xs" | "sm" | "md";
}) {
  const meta = ESTADO_LINEA_META[estado];
  return (
    <Badge color={meta.color} size={size}>
      {meta.label}
    </Badge>
  );
}

// ── Diferencia ────────────────────────────────────────────────────────────

/**
 * La diferencia observado − esperado, **con signo y con el caso vacío resuelto**.
 *
 * Tres estados, no dos:
 *   · `null` → se pinta «—». No se pinta «0»: un cero significaría «cuadra
 *     exactamente», y una línea sin contar no cuadra — no se sabe.
 *   · `0` → se pinta «0» en gris, y significa cuadra.
 *   · ≠ 0 → se pinta con signo, en naranja (la rampa de advertencia de la marca).
 *
 * El signo se escribe explícito (`+3`, `−2`) porque el color no basta: hay
 * personas que no distinguen el naranja, y una diferencia de 3 no dice en qué
 * dirección va sin el signo.
 */
export function DiferenciaTexto({
  linea,
  className,
}: {
  linea: Pick<LineaInventario, "cantidadObservada" | "cantidadEsperada">;
  className?: string;
}) {
  const d = diferenciaDe(linea);

  if (d === null) {
    return <span className={cn("text-gray-600 dark:text-gray-400", className)}>—</span>;
  }
  if (d === 0) {
    return <span className={cn("text-gray-500 dark:text-gray-400", className)}>0</span>;
  }
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        // Naranja de la rampa de advertencia: es la marca, y aquí el uso está
        // justificado porque una discrepancia es exactamente lo que hay que
        // mirar. El gris del signo negativo no se usa para `falta`, porque
        // sobrar también descuadra.
        "text-brand-700 dark:text-brand-400",
        className,
      )}
    >
      {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
    </span>
  );
}

/** Cantidad observada, distinguiendo «sin contar» de «contada y sin existencia». */
export function CantidadObservadaTexto({
  cantidad,
  className,
}: {
  cantidad: number | null;
  className?: string;
}) {
  if (cantidad === null) {
    return (
      <span className={cn("text-gray-600 dark:text-gray-400", className)} title="Sin contar">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        // El cero SÍ se pinta, y se pinta normal: es un dato, no una ausencia.
        // Distinguirlo visualmente de «—» es todo el punto.
        cantidad === 0 ? "text-gray-500 dark:text-gray-400" : "text-ink-body dark:text-gray-200",
        className,
      )}
    >
      {cantidad}
    </span>
  );
}

// ── Progreso ──────────────────────────────────────────────────────────────

/**
 * Barra de progreso del conteo, con el texto «n de N contados».
 *
 * El porcentaje no va solo: una barra al 62% no dice cuántos elementos faltan, y
 * es el número de pendientes lo que decide si se puede finalizar. El texto
 * `title` lleva el detalle completo para cuando la fila es estrecha.
 */
export function ProgresoBar({
  progreso,
  className,
}: {
  progreso: Progreso;
  className?: string;
}) {
  const { total, contadas, pendientes, porcentaje } = progreso;

  if (total === 0) {
    return (
      <span className={cn("text-xs text-gray-600 dark:text-gray-400", className)}>
        Sin elementos
      </span>
    );
  }

  const completo = pendientes === 0;

  return (
    <div className={cn("min-w-[7rem]", className)}>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              completo ? "bg-accent-500" : "bg-brand-500",
            )}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            completo ? "text-accent-700 dark:text-accent-400" : "text-gray-500 dark:text-gray-400",
          )}
        >
          {contadas}/{total}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
        {completo
          ? "Todo contado"
          : `${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`}
      </p>
    </div>
  );
}

// ── Estados vacíos ────────────────────────────────────────────────────────

/**
 * Bloque de «sin resultados».
 *
 * El mismo bloque discontinuo que usa el resto del producto
 * (`rounded-2xl border border-dashed … py-14 text-center`), con una línea que
 * dice QUÉ está vacío y no solo que está vacío. Un «No hay datos» genérico
 * obliga a mirar los filtros para saber si el vacío es del filtro o del módulo.
 */
export function SinResultados({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 sm:p-12 text-center dark:border-gray-800 dark:bg-white/[0.01]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <InformationCircleIcon className="h-6 w-6" />
      </div>
      <p className="mt-3.5 text-base font-semibold text-ink-title dark:text-white">{titulo}</p>
      {detalle && (
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{detalle}</p>
      )}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}

// ── Aviso honesto ─────────────────────────────────────────────────────────

/**
 * Bloque de nota al margen, con borde discontinuo.
 *
 * Es la pieza con la que el módulo **declara sus límites en la propia UI**: que
 * las alertas configurables no existen todavía, que las evidencias se pierden al
 * recargar, que no hay motor de reglas. Un párrafo gris en un rincón no lo lee
 * nadie, y omitirlo convertiría una limitación en una promesa implícita.
 */
export function NotaHonesta({
  titulo,
  children,
  tono = "neutro",
}: {
  titulo?: string;
  children: React.ReactNode;
  tono?: "neutro" | "atencion";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed px-4 py-3",
        tono === "atencion"
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/[0.06]"
          : "border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]",
      )}
    >
      {titulo && (
        <p
          className={cn(
            "text-xs font-semibold",
            tono === "atencion"
              ? "text-brand-700 dark:text-brand-400"
              : "text-gray-600 dark:text-gray-300",
          )}
        >
          {titulo}
        </p>
      )}
      <div
        className={cn(
          "text-xs leading-relaxed",
          titulo && "mt-1",
          tono === "atencion"
            ? "text-brand-700/90 dark:text-brand-300/90"
            : "text-gray-500 dark:text-gray-400",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── Cabecera de conteo ────────────────────────────────────────────────────

/**
 * «Contando en: Cliente › Sede › Ubicación».
 *
 * Es la pieza que hace cumplir R3 de forma visible: la ubicación no es un campo
 * del formulario de líneas, es un hecho del inventario, y se muestra **fija** en
 * la cabecera para que el operador nunca dude de dónde está contando. Si fuera
 * un `<Select>` dentro del modal, se podría cambiar a mitad de conteo y la
 * esperada —congelada para OTRA ubicación— dejaría de describir nada.
 */
export function UbicacionFija({ camino }: { camino: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
        Contando en
      </span>
      <span className="text-sm font-medium text-ink-title dark:text-gray-200">{camino}</span>
    </div>
  );
}

// ── Resumen de diferencias ────────────────────────────────────────────────

/**
 * Los cuatro contadores de estado de un inventario, en una línea.
 *
 * Solo aparecen los que tienen algo: un «Sobra 0» no informa de nada y añade
 * ruido a cada fila de la tabla. Cuando no hay ninguno, se dice «Sin
 * discrepancias» en gris, que sí es información.
 */
export function ResumenDiscrepancias({ lineas }: { lineas: readonly LineaInventario[] }) {
  const cuenta = lineas.reduce(
    (acc, l) => {
      const e = estadoDeLinea(l);
      if (e === "sobra") acc.sobra += 1;
      else if (e === "falta") acc.falta += 1;
      return acc;
    },
    { sobra: 0, falta: 0 },
  );

  if (cuenta.sobra === 0 && cuenta.falta === 0) {
    return <span className="text-xs text-gray-600 dark:text-gray-400">Sin discrepancias</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {cuenta.falta > 0 && (
        <Badge color="warning" size="xs">
          {cuenta.falta} {cuenta.falta === 1 ? "falta" : "faltan"}
        </Badge>
      )}
      {cuenta.sobra > 0 && (
        <Badge color="warning" size="xs">
          {cuenta.sobra} {cuenta.sobra === 1 ? "sobra" : "sobran"}
        </Badge>
      )}
    </div>
  );
}

/** ¿Este inventario tiene líneas por contar? Lo usan la tabla y el tablero. */
export function inventarioTienePendientes(inv: Inventario, lineas: readonly LineaInventario[]): boolean {
  return lineas.some(
    (l) => l.inventarioId === inv.id && l.cantidadObservada === null,
  );
}
