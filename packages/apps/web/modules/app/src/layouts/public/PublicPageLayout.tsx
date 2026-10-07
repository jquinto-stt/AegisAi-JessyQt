import React from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
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
  /** Banda del hero compacta. */
  compactHero?: boolean;
  /** Color de la banda hero: 'blue' (#190088 oficial), 'green' (#17B363 legal) o 'orange'. */
  heroColor?: "blue" | "green" | "orange";
  children: React.ReactNode;
}

/**
 * Chrome de las páginas públicas de contenido (ayuda, soporte, términos,
 * privacidad, cookies).
 */
export default function PublicPageLayout({
  eyebrow,
  title,
  summary,
  heroExtra,
  contentWidth = "wide",
  compactHero = false,
  heroColor = "blue",
  children,
}: PublicPageLayoutProps) {
  const navigate = useNavigate();
  const isAuthenticated = sessionStore.isReady;

  const backLabel = isAuthenticated ? "Volver a mi organización" : "Iniciar sesión";
  const backTarget = isAuthenticated ? "/modulos" : "/login";

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100",
        heroColor === "green"
          ? "selection:bg-[#17b363] selection:text-white"
          : heroColor === "orange"
          ? "selection:bg-brand-500 selection:text-white"
          : "selection:bg-[#190088] selection:text-white"
      )}
    >
      <section
        className={cn(
          "relative overflow-hidden px-5 pt-6 text-white sm:px-10 lg:px-16",
          heroColor === "green"
            ? "bg-[#17b363]"
            : heroColor === "orange"
            ? "bg-brand-500"
            : "bg-[#190088]",
          compactHero ? "pb-10" : "pb-14"
        )}
      >
        <InteractiveDotGrid dotGap={26} baseRadius={1.5} activeRadius={3.0} glowDistance={150} />
        <DecorativeCircles variant={heroColor === "blue" ? "indigo" : "brand"} />

        <div className={cn("relative z-10 mx-auto w-full", contentWidth === "wide" ? "max-w-6xl" : "max-w-5xl")}>
          <div className="flex items-center justify-between gap-4">
            <img src="/images/logo/necto-full-pure-white.svg" alt="Necto" className="h-7 w-auto" />

            <button
              type="button"
              onClick={() => navigate(backTarget)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-theme-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
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
            contentWidth === "prose" ? "max-w-4xl lg:px-8" : "max-w-6xl lg:px-10"
          )}
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white px-5 py-8 sm:px-10 lg:px-16 dark:border-gray-800 dark:bg-gray-950">
        <div className={cn("mx-auto flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", contentWidth === "wide" ? "max-w-6xl" : "max-w-5xl")}>
          <NectoLogo size="xs" />
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
