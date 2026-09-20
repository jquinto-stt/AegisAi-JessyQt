import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { cn } from "@/utils";
import { NectoLogo } from "../../compositions/shared/NectoLogo";
import { sessionStore } from "@/stores";
import { LegalFooterLinks } from "../../legal/LegalFooterLinks";

interface PublicPageLayoutProps {
  /** Rótulo del badge sobre el titular. */
  eyebrow: string;
  title: string;
  summary?: React.ReactNode;
  /** Contenido de la banda de marca, bajo el titular (p. ej. los sellos de ayuda). */
  heroExtra?: React.ReactNode;
  /** Ancho de la columna de contenido. */
  contentWidth?: "prose" | "wide";
  /**
   * Banda del hero compacta.
   *
   * ⚠️ No es una variante estética: el hero de `/ayuda` lleva debajo una rejilla
   * de sellos y el de un documento legal sólo una línea de versión. Con la misma
   * altura, el legal quedaba con un hueco vacío entre la fecha y el borde de la
   * banda que se lee como un bloque sin cargar.
   */
  compactHero?: boolean;
  children: React.ReactNode;
}

/**
 * Chrome de las páginas públicas de contenido (ayuda, soporte, términos,
 * privacidad, cookies).
 *
 * Existe porque `HelpPage` resolvía este mismo armazón a mano —banda de marca
 * con `InteractiveDotGrid`, logo blanco, botón de vuelta que depende de si hay
 * sesión, columna centrada y un pie mínimo— y las páginas legales necesitaban
 * exactamente eso. Copiarlo tres veces habría dejado cuatro heros que se separan
 * en cuanto alguien retoque uno.
 *
 * ⚠️ El botón de vuelta **depende de la sesión** (`useAuth`), no de la ruta: es
 * una página de acceso libre, así que quien la lee puede no tener cuenta. Con
 * sesión vuelve al hub; sin ella, a iniciar sesión. Si se fija un destino único,
 * uno de los dos casos acaba en una pantalla que no le corresponde.
 *
 * ⚠️ La banda es `public-500` (verde #17B363), **no** `brand-500`. El naranja de
 * marca es el acento de *interacción* —botones, focos, enlaces dentro de la
 * aplicación—; este verde identifica el **contenido abierto**, que es lo que
 * tienen en común las cinco páginas que usan este armazón. Con la banda en
 * naranja, las pantallas públicas se leían como si fueran la aplicación.
 * Si se cambia aquí, cambian las cinco a la vez: es justo el punto único que
 * buscaba este componente.
 *
 * ⚠️ El logo va en **blanco** (`necto-full-white.svg`) porque la banda es de
 * color pleno: el wordmark naranja de `NectoLogo` desaparecería sobre ella. En
 * el pie, que es claro, sí se usa `NectoLogo`.
 */
export default function PublicPageLayout({
  eyebrow,
  title,
  summary,
  heroExtra,
  contentWidth = "wide",
  compactHero = false,
  children,
}: PublicPageLayoutProps) {
  const navigate = useNavigate();
  const isAuthenticated = sessionStore.isReady;

  const backLabel = isAuthenticated ? "Volver a mi organización" : "Iniciar sesión";
  const backTarget = isAuthenticated ? "/modulos" : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased selection:bg-public-500 selection:text-white dark:bg-gray-950 dark:text-gray-100">
      <section
        className={cn(
          "relative overflow-hidden bg-public-500 px-5 pt-6 text-white sm:px-10 lg:px-16",
          compactHero ? "pb-10" : "pb-14"
        )}
      >
        <InteractiveDotGrid dotGap={26} baseRadius={1.5} activeRadius={3.0} glowDistance={150} />

        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <img src="/images/logo/necto-full-white.svg" alt="Necto" className="h-7 w-auto" />

            <button
              type="button"
              onClick={() => navigate(backTarget)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-theme-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </button>
          </div>

          <div className={cn("max-w-3xl space-y-4", compactHero ? "mt-10" : "mt-16")}>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-theme-xs font-bold tracking-[0.18em] uppercase backdrop-blur-sm">
              {eyebrow}
            </span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">{title}</h1>
            {summary && (
              <p className="max-w-xl text-base leading-relaxed text-white/85">{summary}</p>
            )}
          </div>

          {heroExtra}
        </div>
      </section>

      <main className="flex-1 bg-white dark:bg-gray-950">
        <div
          className={cn(
            "mx-auto w-full px-5 py-14 sm:px-10",
            contentWidth === "prose" ? "max-w-4xl lg:px-8" : "max-w-5xl lg:px-16"
          )}
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white px-5 py-8 sm:px-10 lg:px-16 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <NectoLogo size="xs" inline />
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
