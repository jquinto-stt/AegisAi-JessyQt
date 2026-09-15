import { PageMeta } from "@/shell/meta";
import PublicPageLayout from "../layouts/public/PublicPageLayout";
import { HELP_FEATURES } from "./help/help.constants";
import { HelpNextSteps } from "./help/HelpNextSteps";
import { HelpSupportCta } from "./help/HelpSupportCta";
import { FaqAccordion } from "./help/FaqAccordion";

/**
 * Centro de ayuda (`/ayuda`).
 *
 * Es una página **aparte** y de acceso libre: se puede leer sin sesión, porque
 * quien tiene una duda sobre Necto puede no tener cuenta todavía. No es un modal
 * ni una pestaña de Ajustes, así que no depende de que exista un perfil activo.
 *
 * Sigue el diseño de referencia —banda de marca con los sellos, "Primeros pasos"
 * numerado y acordeón de preguntas— sin la tarjeta de precio, que era del
 * referente y aquí no aplica.
 *
 * ⚠️ La banda es `public-500` (verde #17B363) y **no** el naranja de marca. En
 * Necto el naranja es el acento de *interacción* —botones, focos, enlaces dentro
 * de la aplicación— y el verde de `success-*` sigue reservado para **estado**
 * (activo, conectado, correcto). Este verde es el tercero, el del **contenido
 * abierto**, y lo comparten `/ayuda`, `/soporte` y las páginas legales. Ver la
 * nota de `--color-public-500` en `css/theme.css`.
 *
 * El armazón —hero, columna y pie— vive en `PublicPageLayout`, que comparte con
 * las páginas legales y con soporte. Antes se resolvía aquí a mano y las páginas
 * nuevas necesitaban exactamente lo mismo.
 *
 * Cierra con `HelpSupportCta`, que es el puente a `/soporte`: hasta ahora la
 * página enumeraba los problemas y no ofrecía ninguna forma de contarlos.
 */
export default function HelpPage() {
  return (
    <PublicPageLayout
      eyebrow="Centro de ayuda"
      title="Ayuda y preguntas frecuentes"
      summary="Todo lo que necesitas para poner tu negocio en marcha, y las respuestas a las dudas que más nos llegan."
      heroExtra={
        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {HELP_FEATURES.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex flex-col items-center gap-3 text-center">
              <Icon className="h-9 w-9" strokeWidth={1.4} />
              <span className="text-theme-sm leading-tight font-bold">{label}</span>
            </div>
          ))}
        </div>
      }
    >
      <PageMeta
        title="Ayuda y preguntas frecuentes — NECTO"
        description="Primeros pasos y respuestas a las dudas más frecuentes sobre Necto"
      />

      <HelpNextSteps />
      <div className="mt-16">
        <FaqAccordion />
      </div>
      <HelpSupportCta />
    </PublicPageLayout>
  );
}
