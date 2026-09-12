import React from "react";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { Link } from "react-router-dom";
import { ThemeToggleButton } from "@/shell";

/**
 * @kgId 587cd4dfc73e
 */
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="relative items-center hidden w-full h-full lg:w-1/2 bg-[#190088] dark:bg-zinc-950 lg:flex lg:justify-center overflow-hidden border-l border-zinc-200 dark:border-zinc-800 select-none">
          {/* Google Stitch inspired Interactive Dot Mosaic Background */}
          <InteractiveDotGrid
            dotGap={24}
            baseRadius={1.0}
            activeRadius={2.0}
            glowDistance={160}
          />

          <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6 sm:px-10 text-center pointer-events-auto py-8">
            <Link
              to="/"
              className="inline-block mb-6 transition-transform duration-300 hover:scale-105 cursor-pointer"
            >
              <img
                src="/images/logo/necto-full-white.svg"
                alt="Necto Logo"
                className="h-12 sm:h-14 md:h-16 w-auto max-w-full drop-shadow-md"
              />
            </Link>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-normal max-w-xl mx-auto pb-4 drop-shadow-xs">
              Plataforma de Operaciones & Gestión
            </h2>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeToggleButton variant="floating" />
        </div>
      </div>
    </div>
  );
}
