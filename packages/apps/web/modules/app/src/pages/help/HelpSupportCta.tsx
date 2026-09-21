import React from "react";
import { Link } from "react-router";
import { LifeBuoy } from "lucide-react";

/**
 * Puente entre el centro de ayuda y soporte.
 *
 * Va al final de `/ayuda` porque es donde desemboca quien ha leído el acordeón
 * sin encontrar su respuesta: el siguiente paso natural es escribir. Hasta ahora
 * ese enlace no existía en ninguna parte, y los términos remitían a "el centro de
 * ayuda" para contactar sin que hubiera forma de hacerlo.
 *
 * ⚠️ No lleva `<ol>` ni `<ul>` a propósito. La guarda de `/ayuda`
 * (`verify-help-page.mjs`) toma el **primer** `<ol>` de la página para medir los
 * pasos del alta, así que una lista decorativa aquí se lo robaría y la aserción
 * empezaría a medir este bloque.
 *
 * ⚠️ El enlace es un `<a>` de react-router y no un `Button`: navega, no ejecuta.
 * Se pinta en `brand-500` porque es el color del contenido abierto, el mismo de
 * la banda de esta página.
 */
export const HelpSupportCta: React.FC = () => (
  <section aria-labelledby="help-support-cta" className="mt-16">
    <div className="flex flex-col gap-5 rounded-2xl border border-brand-500/30 bg-brand-500/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-500 text-white">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="help-support-cta"
            className="text-lg font-bold text-ink-title dark:text-white"
          >
            ¿No está tu respuesta?
          </h2>
          <p className="mt-1.5 text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Escríbenos y te contesta una persona del equipo. Cuéntanos el caso con tus
            palabras y queda registrado con una referencia.
          </p>
        </div>
      </div>

      <Link
        to="/soporte"
        className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-brand-500 px-6 text-theme-sm font-bold text-white transition-colors hover:bg-brand-700"
      >
        Ir a soporte
      </Link>
    </div>
  </section>
);

export default HelpSupportCta;
