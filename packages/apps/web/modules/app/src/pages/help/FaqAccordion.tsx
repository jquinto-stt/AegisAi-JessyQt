import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/utils";
import { FAQ_ITEMS } from "./help.constants";

/**
 * Acordeón de preguntas frecuentes.
 *
 * Se abre **una sola** pregunta a la vez y la primera llega abierta, para que la
 * sección no aparezca como una lista de títulos mudos. El icono es `+`/`−` y no
 * un chevron: en una lista larga el signo se lee como "abrir" sin ambigüedad.
 *
 * El estado es local (`openId`) porque no hay nada que persistir ni compartir:
 * una pregunta abierta es una decisión de lectura, no un dato del usuario.
 */
export const FaqAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <section aria-labelledby="help-faq">
      <h2
        id="help-faq"
        className="text-2xl font-bold tracking-tight text-ink-title dark:text-white"
      >
        Preguntas frecuentes
      </h2>

      <div className="mt-7 space-y-3">
        {FAQ_ITEMS.map(item => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "overflow-hidden rounded-xl border transition-all duration-200",
                isOpen
                  ? "border-success-500/40 bg-success-50 shadow-theme-xs dark:border-success-500/40 dark:bg-success-950/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-5 px-5 py-4 text-left"
              >
                <span className="text-base font-bold leading-snug text-gray-900 dark:text-white">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 flex-none items-center justify-center rounded-full transition-colors",
                    isOpen
                      ? "bg-success-500 text-white"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  )}
                >
                  {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </span>
              </button>

              {isOpen && (
                <div className="animate-aparecer border-t border-success-500/15 bg-success-50 px-5 pt-2 pb-5 text-theme-sm leading-relaxed text-gray-700 dark:border-success-500/20 dark:bg-success-950/20 dark:text-gray-300">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
