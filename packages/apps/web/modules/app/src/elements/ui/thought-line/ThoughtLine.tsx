import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { animate, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SparklesIcon, Tick02Icon } from "@hugeicons/core-free-icons";

// ═══════════════════════════════════════════════════════════════════════════
// ThoughtLine — línea de «pensando» con rastro de pasos
// ═══════════════════════════════════════════════════════════════════════════
//
// Portado del componente que pasó el usuario (09/10). La MECÁNICA es la suya,
// entera: no se ha reescrito nada del comportamiento. Lo que cambia es lo
// mínimo para que compile y conviva con el proyecto:
//
//   1. **Tipado.** El original venía sin tipos (`ds => …`). El proyecto compila
//      con `strict: true`, así que las props, las refs y los parámetros están
//      anotados. Es el único cambio obligatorio.
//   2. **Sin `'use client'`.** Es una directiva de Next.js. Esto es una SPA de
//      Vite: ahí no significa nada, y dejarla invita a pensar que hay un
//      servidor de componentes que no existe.
//   3. **El CSS vive en `src/css/thought-line.css`**, importado desde
//      `index.css`. La convención del proyecto es CSS global; un `.tsx` que
//      importe su propio `.css` es un patrón que aquí no existe.
//
// ── Lo que este componente NO integra, y por qué queda escrito ─────────────
//
// Trae su propio vocabulario de movimiento (`--tl-*`, dos curvas propias) y sus
// propias dependencias (`motion/react`, `@hugeicons/*`), que no son las del
// proyecto (`--animate-*` + una curva, y Heroicons). Son TRES motores de
// movimiento conviviendo y una tercera librería de iconos: se acepta porque lo
// pidió el usuario, y se documenta aquí para que la próxima sesión no lo
// descubra por sorpresa. Su guarda de `prefers-reduced-motion` es propia y está
// intacta, así que la accesibilidad no depende de esta decisión.
//
// ── Una regla que este componente NO puede garantizar solo ─────────────────
//
// El `steps` que se le pase tiene que describir trabajo **real**. Un rastro con
// pasos inventados no es una animación de más: es una afirmación falsa sobre lo
// que el sistema está haciendo. Y el cronómetro mide lo que tarde de verdad: si
// la operación es síncrona, el número que se pinte será mentira.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
const GLYPH_DONE = 0.55;

/** Estable entre renders: un `[]` nuevo por render reiniciaría los efectos. */
const EMPTY_STEPS: string[] = [];

const fmt = (ds: number): string =>
  ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;

const spoken = (ds: number): string =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

export type GlifoThoughtLine = "sparkle" | "dot" | "none" | ReactNode;

export interface ThoughtLineProps {
  /** Etiqueta mientras trabaja. */
  label?: string;
  /** Etiqueta al terminar. Si falta, se compone con `showTimer`. */
  doneLabel?: string;
  /** Permite pintar la etiqueta con marcado propio. */
  renderLabel?: (texto: string, trabajando: boolean) => ReactNode;
  glyph?: GlifoThoughtLine;
  /** Pasos del rastro. **Deben describir trabajo real**: ver la cabecera. */
  steps?: string[];
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  color?: string;
  glyphColor?: string;
  fontSize?: number;
  breathPeriod?: number;
  breathDepth?: number;
  shimmer?: boolean;
  shimmerDuration?: number;
  settleDuration?: number;
  settleBlur?: number;
  /** ¿Sigue trabajando? Es el interruptor de todo el componente. */
  working?: boolean;
  /** Segundos tras los cuales se asienta solo. `0` = nunca. */
  settleAfter?: number;
  /** Segundos ya transcurridos, si los lleva quien invoca. */
  elapsed?: number;
  showTimer?: boolean;
  onSettle?: (segundos: number) => void;
  className?: string;
  style?: CSSProperties;
}

export default function ThoughtLine({
  label = "Thinking…",
  doneLabel = "",
  renderLabel,
  glyph = "sparkle",
  steps = EMPTY_STEPS,
  collapsible = true,
  collapseOnSettle = true,
  color = "currentColor",
  glyphColor = "",
  fontSize = 16,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  shimmer = true,
  shimmerDuration = 1.8,
  settleDuration = 350,
  settleBlur = 2,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  onSettle,
  className = "",
  style,
}: ThoughtLineProps) {
  // `useReducedMotion` puede devolver `null` antes de la primera medida: se
  // normaliza a booleano para que el resto del componente no tenga tres estados.
  const reduce = useReducedMotion() === true;
  const [autoSettled, setAutoSettled] = useState(false);
  const [open, setOpen] = useState(true);
  const isWorking = working && !autoSettled;
  const doneText = doneLabel || (showTimer ? "Thought for" : "Done thinking");
  const hasTrace = steps.length > 0;
  const depth = reduce ? Math.min(breathDepth, 0.2) : breathDepth;
  const period = reduce ? breathPeriod * 1.5 : breathPeriod;
  const trough = 1 - depth;
  const sheen = shimmer && !reduce;

  const glyphRef = useRef<HTMLSpanElement | null>(null);
  const breathRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<HTMLSpanElement | null>(null);
  const stackRef = useRef<HTMLSpanElement | null>(null);
  const workRef = useRef<HTMLSpanElement | null>(null);
  const doneRef = useRef<HTMLSpanElement | null>(null);
  const dsRef = useRef(0);
  const prevWorking = useRef(isWorking);
  // El callback va en una ref para que cambiarlo no reinicie el efecto de
  // asentamiento. Se reasigna en cada render, como el original.
  const latest = useRef<{ onSettle?: (segundos: number) => void }>({});
  latest.current = { onSettle };
  const [announce, setAnnounce] = useState(label);

  useEffect(() => {
    if (working) setAutoSettled(false);
  }, [working]);

  useEffect(() => {
    if (isWorking) setOpen(true);
    else if (collapseOnSettle) setOpen(false);
  }, [isWorking, collapseOnSettle]);

  useEffect(() => {
    const glyphEl = glyphRef.current;
    const breathEl = breathRef.current;
    if (!breathEl) return undefined;
    const s = settleDuration / 1000;
    const loop = (el: HTMLElement, delay: number) =>
      animate(el, { opacity: [trough, 1, trough] }, { duration: period, ease: EASE_IN_OUT, repeat: Infinity, delay });
    let cancelled = false;
    const running: { stop: () => void }[] = [];
    if (isWorking) {
      if (depth > 0) {
        if (sheen) running.push(animate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
        if (glyphEl) {
          const lead = animate(glyphEl, { opacity: trough }, { duration: 0.2, ease: EASE_OUT });
          running.push(lead);
          lead.then(() => {
            if (cancelled) return;
            running.push(loop(glyphEl, 0));
            if (!sheen) running.push(loop(breathEl, 0.14));
          });
        } else if (!sheen) {
          running.push(loop(breathEl, 0.14));
        }
      } else {
        if (glyphEl) running.push(animate(glyphEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
        running.push(animate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
      }
    } else {
      if (glyphEl) running.push(animate(glyphEl, { opacity: GLYPH_DONE }, { duration: s, ease: EASE_OUT }));
      running.push(animate(breathEl, { opacity: 1 }, { duration: s, ease: EASE_OUT }));
    }
    return () => {
      cancelled = true;
      running.forEach((a) => a.stop());
    };
  }, [isWorking, period, depth, trough, settleDuration, glyph, sheen]);

  const paint = (ds: number) => {
    dsRef.current = ds;
    if (timerRef.current) timerRef.current.textContent = fmt(ds);
  };

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (!isWorking) return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => {
      const ds = Math.floor((performance.now() - startedAt) / 100);
      paint(ds);
      if (settleAfter > 0 && ds >= Math.round(settleAfter * 10)) setAutoSettled(true);
    }, 100);
    return () => clearInterval(id);
  }, [isWorking, elapsed, settleAfter]);

  // El cronómetro se desliza de la posición del rótulo de trabajo a la del de
  // terminado. Se mide con `ResizeObserver` en vez de con anchos fijos: los
  // rótulos son texto y cambian de ancho con el idioma y la fuente.
  useLayoutEffect(() => {
    const t = timerRef.current;
    const stack = stackRef.current;
    if (!t || !stack) return undefined;
    const place = (glide: boolean) => {
      const active = isWorking ? workRef.current : doneRef.current;
      if (!active) return;
      const shift = active.offsetWidth - stack.offsetWidth;
      if (!glide) t.style.transition = "none";
      t.style.transform = `translateX(${shift}px)`;
      if (!glide) {
        void t.offsetWidth;
        t.style.transition = "";
      }
    };
    place(prevWorking.current !== isWorking);
    prevWorking.current = isWorking;
    const ro = new ResizeObserver(() => place(false));
    if (workRef.current) ro.observe(workRef.current);
    if (doneRef.current) ro.observe(doneRef.current);
    return () => ro.disconnect();
  }, [isWorking, label, doneText, fontSize, showTimer]);

  useEffect(() => {
    if (isWorking) {
      setAnnounce(label);
      return;
    }
    setAnnounce(showTimer ? `${doneText} ${spoken(dsRef.current)}` : doneText);
    latest.current.onSettle?.(dsRef.current / 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorking]);

  const toggle = hasTrace && collapsible;
  const head = (
    <>
      {glyph !== "none" ? (
        <span ref={glyphRef} className="thought-line__glyph" aria-hidden="true">
          {glyph === "sparkle" ? (
            <HugeiconsIcon icon={SparklesIcon} size="100%" strokeWidth={2} />
          ) : glyph === "dot" ? (
            <span className="thought-line__dot" />
          ) : (
            glyph
          )}
        </span>
      ) : null}
      <span ref={stackRef} className="thought-line__label" aria-hidden="true">
        <span ref={workRef} className="thought-line__text" data-active={isWorking ? "" : undefined}>
          <span ref={breathRef} className="thought-line__breath" data-shimmer={sheen ? "" : undefined}>
            {renderLabel ? renderLabel(label, true) : label}
          </span>
        </span>
        <span
          ref={doneRef}
          className="thought-line__text thought-line__text--done"
          data-active={isWorking ? undefined : ""}
        >
          {renderLabel ? renderLabel(doneText, false) : doneText}
        </span>
      </span>
      {showTimer ? (
        <span ref={timerRef} className="thought-line__timer" data-done={isWorking ? undefined : ""} aria-hidden="true">
          0.0s
        </span>
      ) : null}
      {collapsible ? (
        <span className="thought-line__chevron" data-on={hasTrace ? "" : undefined} aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size="1em" strokeWidth={2.2} />
        </span>
      ) : null}
      {/* El único punto que habla. Todo lo visual va `aria-hidden` arriba, así
          que un lector de pantalla oye UNA frase, no cinco fragmentos. */}
      <span className="thought-line__sr" role="status">
        {announce}
      </span>
    </>
  );

  return (
    <div
      className={`thought-line${className ? ` ${className}` : ""}`}
      data-working={isWorking ? "" : undefined}
      data-open={open && hasTrace ? "" : undefined}
      // Las `--tl-*` son propiedades personalizadas: `CSSProperties` no las
      // admite sin ensanchar el tipo, y ensancharlo aquí es correcto porque el
      // CSS las lee de este mismo nodo.
      style={
        {
          "--tl-font": `${fontSize}px`,
          "--tl-color": color,
          "--tl-glyph": glyphColor || color,
          "--tl-settle": `${settleDuration}ms`,
          "--tl-blur": `${settleBlur}px`,
          "--tl-shimmer": `${shimmerDuration}s`,
          ...style,
        } as CSSProperties
      }
    >
      {collapsible ? (
        <button
          type="button"
          className="thought-line__head"
          data-toggle={toggle ? "" : undefined}
          aria-expanded={toggle ? open : undefined}
          tabIndex={toggle ? 0 : -1}
          onClick={() => {
            if (toggle) setOpen((v) => !v);
          }}
        >
          {head}
        </button>
      ) : (
        <div className="thought-line__head">{head}</div>
      )}
      {hasTrace ? (
        <div className="thought-line__trace" data-open={open ? "" : undefined} aria-hidden={!open}>
          <div className="thought-line__fold">
            <div className="thought-line__steps">
              {steps.map((text, i) => {
                const done = !isWorking || i < steps.length - 1;
                return (
                  <div key={`${i}-${text}`} className="thought-line__step" data-done={done ? "" : undefined}>
                    <span className="thought-line__mark" aria-hidden="true">
                      {done ? (
                        <HugeiconsIcon icon={Tick02Icon} size="1em" strokeWidth={2.5} />
                      ) : (
                        <i className="thought-line__pulse" />
                      )}
                    </span>
                    <span className="thought-line__step-text">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
