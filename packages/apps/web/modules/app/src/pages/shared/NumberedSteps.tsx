import React from "react";

export interface NumberedStep {
  num: number;
  title: string;
  body: string;
}

interface NumberedStepsProps {
  /** `id` del titular. Se usa como ancla (`aria-labelledby`) y para poder medirlo. */
  id: string;
  heading: string;
  steps: NumberedStep[];
}

/**
 * Lista de pasos numerados unidos por una línea vertical.
 *
 * Nació en el centro de ayuda ("Primeros pasos") y la página de soporte la reusa
 * para "Qué pasa después de enviar tu solicitud". Las dos son secuencias
 * ordenadas con el mismo peso visual, y mantener dos copias garantizaba que al
 * retocar el conector una de las dos se quedara atrás.
 *
 * ⚠️ El conector es un `span` **con** `aria-hidden` y la insignia numerada es un
 * `span` **sin** él. No es decoración: es la única forma de distinguirlos por
 * selector en el último paso, que no lleva conector, y la guarda
 * `verify-help-page.mjs` depende de esa diferencia. Añadirle `aria-hidden` a la
 * insignia deja la aserción midiendo el conector (vacío) en vez del número.
 *
 * Los pasos van todos con el mismo peso: en una página de ayuda atenuar los
 * últimos sugeriría que esos pasos no están disponibles, y sí lo están.
 */
export const NumberedSteps: React.FC<NumberedStepsProps> = ({ id, heading, steps }) => (
  <section aria-labelledby={id}>
    <h2 id={id} className="text-2xl font-bold tracking-tight text-ink-title dark:text-white">
      {heading}
    </h2>

    <ol className="mt-7">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.num} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Conector: baja hasta el borde inferior del ítem (que incluye su
                padding), así enlaza con la insignia del siguiente paso. */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-200 dark:bg-gray-800"
              />
            )}

            <span className="relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-success-500 text-theme-sm font-bold text-white shadow-theme-xs">
              {step.num}
            </span>

            <div className="min-w-0 space-y-1.5 pt-0.5">
              <h3 className="text-base font-bold text-ink-title dark:text-white">
                {step.title}
              </h3>
              <p className="max-w-2xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {step.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  </section>
);

export default NumberedSteps;
