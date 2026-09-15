import React from "react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { ThemeToggle } from "@/compositions/shared/ThemeToggle";
import { cn } from "@/utils";

export interface AuthPageLayoutProps {
  children: React.ReactNode;
  /**
   * Visual tone of the decorative right panel.
   * - `"indigo"` — deep brand indigo (default, used by Login)
   * - `"brand"` — full-bleed brand orange (used by Register, matching the onboarding panel)
   */
  panelTone?: "indigo" | "brand";
  /** Headline displayed on the decorative right panel. */
  panelHeadline?: string;
  /** Optional small line displayed under the headline. */
  panelTagline?: string;
}

/**
 * @kgId 587cd4dfc73e
 */
export default function AuthPageLayout({
  children,
  panelTone = "indigo",
  panelHeadline = "Plataforma de operaciones y gestión",
  panelTagline,
}: AuthPageLayoutProps) {
  const isBrand = panelTone === "brand";

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div
          className={cn(
            "relative items-center hidden w-full h-full lg:w-1/2 lg:flex lg:justify-center overflow-hidden border-l select-none transition-colors duration-300",
            "bg-brand-500 dark:bg-secondary-600 border-brand-500 dark:border-secondary-900/50"
          )}
        >
          {/* Google Stitch inspired Interactive Dot Mosaic Background */}
          <InteractiveDotGrid
            dotGap={24}
            baseRadius={1.5}
            activeRadius={3.0}
            glowDistance={160}
          />

          <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6 sm:px-10 text-center pointer-events-auto py-8">
            <div className="inline-block mb-6">
              <img
                src="/images/logo/necto-full-white.svg"
                alt="Necto Logo"
                className="h-12 sm:h-14 md:h-16 w-auto max-w-full drop-shadow-md"
              />
            </div>

            <h2
              className={cn(
                "max-w-xl mx-auto text-white drop-shadow-xs font-bold tracking-tight",
                isBrand
                  ? "text-2xl sm:text-3xl md:text-4xl leading-[1.1]"
                  : "text-xl sm:text-2xl md:text-3xl leading-normal pb-4"
              )}
            >
              {panelHeadline}
            </h2>

            {panelTagline && (
              <p className="mt-4 text-theme-xs font-bold uppercase tracking-[0.2em] text-white/70">
                {panelTagline}
              </p>
            )}
          </div>
        </div>
        <div className="fixed z-50 top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
