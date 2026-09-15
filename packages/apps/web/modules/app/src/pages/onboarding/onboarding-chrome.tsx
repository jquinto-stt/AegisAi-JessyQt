import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils";
import type { MessageItem } from "../onboarding.constants";

/** Small uppercase label used above each step heading. */
export function Eyebrow({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={cn(
        "text-theme-xs font-bold uppercase tracking-[0.2em]",
        tone === "brand" ? "text-brand-500" : "text-gray-400"
      )}
    >
      {children}
    </span>
  );
}

/* ── Step heading ────────────────────────────────────────────────── */

/**
 * Bloque de titular de un paso: eyebrow + `h1` + descripción.
 *
 * Existe porque los cinco pasos de `onboarding_new_user` (y los del wizard de
 * sucursal) repetían el mismo trío con tamaños crudos distintos cada vez. Un
 * único componente fija la escala tipográfica del DS y garantiza que el copy
 * —que es contrato de facto, lo asierta `verify-profile.mjs`— se renderice
 * siempre en el mismo sitio.
 *
 * Los pasos lo invocan así:
 *
 * ```tsx
 * <StepHeading eyebrow={eyebrow}>Hazla tuya antes de empezar.</StepHeading>
 * ```
 */
export function StepHeading({
  eyebrow,
  children,
  description,
  className,
}: {
  eyebrow: string;
  /** Titular del paso. Se renderiza en un `<h1>` para conservar la estructura. */
  children: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-secondary-600 sm:text-4xl dark:text-white/90">
        {children}
      </h1>
      {description && (
        <p className="max-w-md text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}

/* ── Selectable option card ──────────────────────────────────────── */

/**
 * Tarjeta de opción única/múltiple, en el dialecto del `SelectCard` de la
 * referencia (`SeleccionarPage`).
 *
 * El contenedor es un `<button>` —no un `Card` con `onClick`— para que toda la
 * superficie sea UN solo tab stop y `aria-pressed` tenga dónde vivir: los pasos
 * se prueban por `aria-pressed="true"`, así que el atributo es contrato.
 *
 * El estado activo se pinta con el **acento elegido por la persona**
 * (`--necto-accent`), que es lo que hace que el asistente se vea teñido en vivo.
 * ⚠️ El acento llega por variable CSS, así que este componente sólo es correcto
 * dentro de una superficie que publique `accentCssVars`. Fuera de ella cae al
 * naranja de marca por el fallback de la variable.
 */
export function OptionCard({
  active,
  onClick,
  icon,
  title,
  description,
  layout = "row",
  className,
}: {
  active: boolean;
  onClick: () => void;
  /** Nodo ya construido con `Icon` — el tamaño lo fija el componente. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /**
   * `"row"` icono + texto en línea — para listas de una línea o con descripción.
   * `"stack"` icono encima del texto — para rejillas compactas de 4 columnas,
   * donde una fila no cabe y el título se recortaría.
   */
  layout?: "row" | "stack";
  className?: string;
}) {
  const isRow = layout === "row";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex w-full cursor-pointer rounded-xl border text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20",
        isRow ? "items-start gap-3 p-3.5" : "flex-col gap-2.5 p-3.5",
        active
          ? "border-transparent"
          : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40",
        className
      )}
      style={
        active
          ? {
              backgroundColor: "var(--necto-accent-soft, #FF3F1A1F)",
              outline: "2px solid var(--necto-accent, #FF3F1A)",
              outlineOffset: "1px",
            }
          : undefined
      }
    >
      {icon && (
        <span
          className={cn(
            "flex flex-none items-center justify-center rounded-[10.5px] border",
            isRow ? "h-10 w-10" : "h-10 w-10",
            active ? "border-transparent" : "border-gray-200 dark:border-gray-800"
          )}
          style={
            active
              ? {
                  backgroundColor: "var(--necto-accent, #FF3F1A)",
                  color: "var(--necto-on-accent, #ffffff)",
                }
              : undefined
          }
        >
          {icon}
        </span>
      )}

      <span className={cn("min-w-0 flex-1", !isRow && "w-full pr-5")}>
        <span
          className={cn(
            "block font-semibold leading-tight",
            "text-theme-sm",
            active ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-100"
          )}
        >
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
            {description}
          </span>
        )}
      </span>

      {active && (
        <span
          className={cn("flex flex-none items-center justify-center", !isRow && "absolute right-3 top-3")}
          style={{ color: "var(--necto-accent, #FF3F1A)" }}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/* ── Rotating Step Messages Component ───────────────────────────── */

/**
 * Rotating copy for the brand panel. The caller owns the message set: the store
 * wizard keys it by step (`STEP_MESSAGES[stepKey]`) and `onboarding_new_user`
 * keys it by its own steps (`NEW_USER_MESSAGES[stepKey]`), since neither flow is
 * a step of the other.
 *
 * ⚠️ Los pasos se identifican por **clave**, no por número: el primer paso del
 * wizard de sucursal sólo existe la primera vez, así que un índice numérico
 * haría que el mismo número mostrara copy distinto según el caso. `messages` se
 * espera estable (constante de módulo) — cambiar su referencia es lo que resetea
 * la rotación al pasar de paso.
 */
export function AnimatedStepMessages({ messages }: { messages: MessageItem[] }) {
  const [index, setIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    setIndex(0);
    setFadeState("in");
  }, [messages]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFadeState("in");
      }, 350);
    }, 4500);

    return () => clearInterval(timer);
  }, [messages]);

  const currentMsg = messages[index] || messages[0];

  return (
    <div className="space-y-4 min-h-[160px] flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-theme-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-all duration-300">
            {currentMsg.badge}
          </span>
        </div>

        <div
          className={cn(
            "space-y-2 transition-all duration-500 transform",
            fadeState === "in"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          <h2 className="max-w-sm text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl">
            {currentMsg.title}
          </h2>
          <p className="max-w-xs text-xs sm:text-sm leading-relaxed text-white/85">
            {currentMsg.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 pt-2">
        {messages.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFadeState("out");
              setTimeout(() => {
                setIndex(i);
                setFadeState("in");
              }, 250);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"
            )}
            aria-label={`Mensaje ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
