import type { ReactNode } from "react";

import { Badge } from "@/elements/ui/badge";
import { Switch } from "@/elements/form/switch";
import { ChevronDownIcon, LockIcon } from "@/icons";
import { cn } from "@/utils";
import {
  CAPACIDAD_LABEL,
  type Capacidad,
  type CapacidadGrupo,
} from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// REJILLA DE CAPACIDADES — una sola pieza para roles y para personas
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué problema resuelve ─────────────────────────────────────────────────
//
// `RolesTab` (permisos de un ROL) y `PerfilOperadorPage` (permisos de una
// PERSONA) pintaban la misma rejilla —grupo colapsable, contador «n de m»,
// «Dar todo / Quitar todo» y un `Switch` por capacidad— con dos copias del
// mismo JSX de ~90 líneas. La diferencia real entre las dos pantallas es UNA:
// en el perfil de una persona cada capacidad dice de DÓNDE viene (de su rol,
// concedida de más, quitada a mano); en el rol no hay tal cosa porque el rol
// ES el origen.
//
// Dos copias se desincronizan en cuanto cambie una: ya pasó en las pantallas
// de configuración, donde el mismo ajuste se veía distinto según el módulo.
// Aquí se declara la estructura una vez y la diferencia se expresa con un
// `pie` por fila.
//
// ── El interruptor de solo lectura ────────────────────────────────────────
//
// El `Switch` del catálogo FUERZA el track a gris cuando está `disabled`,
// ignorando `checked` (`bg-gray-100` en la rama del disabled). En un rol de
// sistema —que tiene 23 de 23 capacidades y sus interruptores son de solo
// lectura— eso pinta 23 interruptores grises: el admin lee «este rol no puede
// nada» cuando el contador de al lado dice «23 de 23 activas». El control
// contradecía a su propia etiqueta.
//
// Medido antes del arreglo: los 23 `input` con `checked: true` y
// `disabled: true`, y los 23 tracks en `rgb(236, 236, 236)`.
//
// Un control que miente es peor que un control ausente. Cuando no se puede
// accionar, aquí se pinta un **indicador** que muestra el estado REAL
// (concedida / no concedida) en vez de un interruptor apagado: deja de haber
// un control que prometa algo y pasa a haber un dato que se lee.

/**
 * Una capacidad ya resuelta para pintar. Las páginas deciden sus datos; esta
 * pieza decide cómo se ven.
 */
export interface FilaCapacidad {
  cap: Capacidad;
  /** Si la persona/rol TIENE la capacidad. En solo lectura es el dato que se muestra. */
  activa: boolean;
  /**
   * Estado del control. `false` = se puede accionar.
   *
   * No es lo mismo que `!puedeAccionar`: una fila bloqueada por autodesahuicio
   * sigue mostrando el estado real con un interruptor, solo que apagado.
   */
  bloqueada?: boolean;
  /** Motivo del bloqueo, para el `title` y el lector de pantalla. */
  motivoBloqueo?: string;
  /** Contenido del extremo izquierdo, después de la etiqueta (p. ej. un badge). */
  etiqueta?: ReactNode;
  /**
   * Franja inferior de la fila. Es el punto donde las dos pantallas difieren:
   * el perfil de una persona pone AQUÍ la procedencia del permiso
   * («Viene de su rol» / «Se le dio de más» / «Se le quitó»); el editor de un
   * rol no pone nada.
   */
  pie?: ReactNode;
}

export interface GrupoCapacidadesProps {
  grupo: CapacidadGrupo;
  /** Capacidades del grupo YA resueltas, en el orden del catálogo. */
  filas: FilaCapacidad[];
  colapsado: boolean;
  onAlternarColapso: () => void;
  /**
   * Cambio de UNA capacidad. Si falta, las filas son inertes: es lo que
   * convierte la rejilla en solo lectura sin necesidad de un flag aparte.
   */
  onCambiarCapacidad?: (cap: Capacidad, nuevo: boolean) => void;
  /**
   * Acción de grupo. `undefined` la oculta — que es lo correcto en solo
   * lectura, donde no hay nada que conceder ni revocar.
   */
  onAlternarGrupo?: () => void;
  /** Etiqueta del badge del grupo. La elige la página desde su propio mapa. */
  colorEtiqueta?: Parameters<typeof Badge>[0]["color"];
  /**
   * Modo de solo lectura de TODA la rejilla. Es independiente de que falten
   * los callbacks: una pantalla puede ser de solo lectura por PERMISO aunque
   * la rejilla siga recibiendo handlers.
   */
  soloLectura?: boolean;
}

/**
 * Rejilla de capacidades — la unidad de agrupación de permisos.
 *
 * Rejilla de 2 columnas desde `lg`: son grupos cortos (1–6 capacidades) y en
 * una sola columna la pantalla se hace muy larga sin ganar legibilidad.
 */
export function GrupoCapacidades({
  grupo,
  filas,
  colapsado,
  onAlternarColapso,
  onCambiarCapacidad,
  onAlternarGrupo,
  colorEtiqueta = "light",
  soloLectura = false,
}: GrupoCapacidadesProps) {
  const activas = filas.filter((f) => f.activa).length;
  const completa = activas === filas.length;

  const onCambiarDe = (cap: Capacidad) =>
    onCambiarCapacidad ? (nuevo: boolean) => onCambiarCapacidad(cap, nuevo) : undefined;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow dark:border-gray-800 dark:bg-gray-900">
      {/* Cabecera — pulsable para colapsar. Es un `role="button"` con teclado
          porque el grupo entero no es un control: contiene otros controles
          dentro, así que no puede ser un `<button>` (anidaría interactivos). */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!colapsado}
        onClick={onAlternarColapso}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAlternarColapso();
          }
        }}
        className={cn(
          "flex cursor-pointer select-none items-center justify-between p-4 transition-colors hover:bg-gray-50/75 dark:hover:bg-white/[0.02]",
          !colapsado && "border-b border-gray-100 bg-gray-50/30 dark:border-gray-800/60 dark:bg-white/[0.01]",
        )}
      >
        <div className="flex items-center gap-2.5">
          <Badge color={colorEtiqueta} size="xs">
            {grupo.label}
          </Badge>
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {activas} de {filas.length}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!colapsado && onAlternarGrupo && (
            <button
              type="button"
              onClick={onAlternarGrupo}
              className="cursor-pointer text-theme-xs font-semibold text-secondary-600 hover:text-ink-title dark:text-brand-400"
            >
              {completa ? "Quitar todo" : "Dar todo"}
            </button>
          )}

          <button
            type="button"
            onClick={onAlternarColapso}
            aria-label={colapsado ? `Expandir ${grupo.label}` : `Contraer ${grupo.label}`}
            title={colapsado ? "Expandir" : "Contraer"}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                colapsado ? "-rotate-90" : "rotate-0",
              )}
            />
          </button>
        </div>
      </div>

      {!colapsado && (
        <div className="space-y-1 p-2">
          {filas.map((fila) => (
            <CapacidadFila
              key={fila.cap}
              fila={fila}
              soloLectura={soloLectura}
              onCambiar={onCambiarDe(fila.cap)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Una fila de capacidad. Exportada por si una pantalla necesita pintarla suelta. */
export function CapacidadFila({
  fila,
  soloLectura,
  onCambiar,
}: {
  fila: FilaCapacidad;
  soloLectura?: boolean;
  /** Cambio del interruptor. Si falta, la fila es inerte. */
  onCambiar?: (nuevo: boolean) => void;
}) {
  const inerte = soloLectura || !onCambiar;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
        fila.bloqueada
          ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/[0.06]"
          : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {fila.bloqueada && (
            <LockIcon className="h-3.5 w-3.5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
          )}
          <span className="truncate text-theme-xs font-medium text-ink-body dark:text-gray-200">
            {CAPACIDAD_LABEL[fila.cap]}
          </span>
          {fila.etiqueta}
        </div>
        {/* El pie lleva su propio color (procedencia: verde «de más», rojo «de
            menos»). Si no lo trae, hereda el gris de cuerpo. */}
        {fila.pie && <div className="text-gray-500 dark:text-gray-400">{fila.pie}</div>}
      </div>

      {inerte ? (
        <IndicadorCapacidad activa={fila.activa} />
      ) : (
        <Switch
          checked={fila.activa}
          onChange={onCambiar}
          disabled={fila.bloqueada}
          aria-label={
            fila.bloqueada && fila.motivoBloqueo ? fila.motivoBloqueo : CAPACIDAD_LABEL[fila.cap]
          }
          label=""
        />
      )}
    </div>
  );
}

/**
 * Indicador de solo lectura del estado de una capacidad.
 *
 * Sustituye al `Switch` deshabilitado, que pintaba el track gris ignorando
 * `checked` y decía «apagado» donde el dato es «concedida». No es un control:
 * es una etiqueta con un punto de color, y por eso no tiene foco ni responde a
 * teclado.
 *
 * El fondo usa los tintes de la especificación (`estado-verde` / `estado-gris`),
 * cuyos tokens sí están declarados en el tema. El punto interior NO usa
 * `emerald-*` —esa familia no existe en `theme.css`— sino `success-700`, que
 * es el verde de la rampa declarada y da contraste sobre el tinte claro.
 */
export function IndicadorCapacidad({ activa }: { activa: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold",
        activa
          ? "bg-estado-verde text-ink-body dark:bg-estado-verde/15 dark:text-estado-verde"
          : "bg-estado-gris text-ink-body dark:bg-white/5 dark:text-white/70",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          activa ? "bg-success-700 dark:bg-estado-verde" : "bg-gray-400 dark:bg-white/40",
        )}
        aria-hidden="true"
      />
      {activa ? "Concedida" : "No concedida"}
    </span>
  );
}
