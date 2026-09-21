import type { ReactNode } from "react";

import { Card } from "@/elements/ui/card";
import { retardoEscalonado } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// PIEZAS COMPARTIDAS DE LOS WIDGETS DEL INICIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Lo que usan varios widgets y no merece una copia por widget. Cada copia es
// una divergencia esperando: el mismo KPI con dos formatos de moneda en la
// misma pantalla es exactamente el tipo de incoherencia que este proyecto
// retiró de la configuración.
//
// ═══════════════════════════════════════════════════════════════════════════

// ── Paleta oficial NECTO ───────────────────────────────────────────────────
//
// Los tres colores de marca. Se declaran aquí y los importan todos los widgets,
// en vez de que cada uno redeclare su propio `const ORANGE = "#FF3C10"`.
export const ORANGE = "#FF3C10";
export const INDIGO = "#15008B";
export const CELESTE = "#71D6E0";

/**
 * Importe en pesos colombianos.
 *
 * Una sola definición para toda la pantalla. Sin decimales: en un tablero
 * operativo los centavos son ruido, y `toLocaleString("es-CO")` los pondría.
 */
export const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/**
 * Tiempo relativo legible a partir de MINUTOS ya calculados por el store.
 *
 * Acepta el número, nunca deriva por su cuenta: `minutosEnEstado` y
 * `minutosEsperando` son los dueños de ese cálculo, y recalcularlo aquí
 * produciría dos relojes que pueden discrepar.
 */
export const relativo = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};

// ── Cabecera de tarjeta con acción ─────────────────────────────────────────

/**
 * Título de tarjeta + un destino a la derecha.
 *
 * El botón de la derecha es un `<button>` y no un `<Link>` porque cada tarjeta
 * navega a un sitio distinto y algunas filtran antes de navegar; `Link` no
 * permite el segundo caso sin duplicar la tarjeta.
 */
export function CabeceraWidget({
  titulo,
  extra,
  accion,
  onAccion,
}: {
  titulo: string;
  /** Contenido junto al título (un `Badge` con el conteo, por ejemplo). */
  extra?: ReactNode;
  accion?: string;
  onAccion?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-title dark:text-white/90">{titulo}</h3>
        {extra}
      </div>
      {accion && onAccion && (
        <button
          type="button"
          onClick={onAccion}
          className="shrink-0 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          {accion}
        </button>
      )}
    </div>
  );
}

// ── Estado vacío de un widget de lista ─────────────────────────────────────

/**
 * Estado vacío en prosa, para listas.
 *
 * Se distingue de `SinDatos` (que es para gráficos y dice qué falta en el
 * periodo): una lista vacía no es un fallo de datos, es una buena noticia —la
 * cola está limpia—, así que el texto lo dice en vez de lamentarse.
 */
export function ListaVacia({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{children}</p>
  );
}

// ── KPI ────────────────────────────────────────────────────────────────────

/**
 * Tarjeta de KPI: etiqueta, valor grande y una línea de contexto.
 *
 * El delta va en NEUTRO (gris) a propósito: con cuatro KPIs seguidos, el
 * verde/rojo saturado era ruido, y la dirección ya la dan la flecha y el signo.
 * Se conserva la decisión que ya estaba tomada en esta pantalla.
 */
export function KpiCard({
  titulo,
  valor,
  contexto,
  positivo = true,
  icon,
  indice = 0,
  onClick,
}: {
  titulo: string;
  valor: string;
  contexto?: string;
  positivo?: boolean;
  icon?: ReactNode;
  /** Posición en la rejilla, para el retardo escalonado de entrada. */
  indice?: number;
  onClick?: () => void;
}) {
  const contenido = (
    <Card className="h-full">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{titulo}</p>
        {icon && <span className="text-gray-300 dark:text-gray-600">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
        {valor}
      </p>
      {contexto && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400">
          {contexto}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3 w-3 shrink-0"
            aria-hidden="true"
          >
            {positivo ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9m8 0v8" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 17H9m8 0V9" />
            )}
          </svg>
        </p>
      )}
    </Card>
  );

  // Sin `onClick` es una tarjeta informativa, no un botón. Envolverla en un
  // `<button disabled>` la haría inenfocable y la marcaría como control inerte.
  if (!onClick) {
    return (
      <div style={{ animationDelay: retardoEscalonado(indice) }} className="animate-entrada-lista">
        {contenido}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: retardoEscalonado(indice) }}
      className="animate-entrada-lista group block h-full w-full text-left"
    >
      <div className="h-full transition-all group-hover:border-brand-300 dark:group-hover:border-brand-700">
        {contenido}
      </div>
    </button>
  );
}

// ── Rejilla de KPIs ────────────────────────────────────────────────────────

/** Rejilla responsiva de KPIs. 4 en escritorio, 2 en tablet, 1 en móvil. */
export function RejillaKpi({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
