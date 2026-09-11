import React from "react";
import GridShape from "@/elements/common/GridShape";
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
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-[#190088] dark:bg-zinc-950 lg:grid border-l border-zinc-200 dark:border-zinc-800">
          <div className="relative flex items-center justify-center z-1">
            <GridShape />
            <div className="flex flex-col items-center max-w-sm px-6 text-center">
              <Link to="/" className="block mb-6 transition-transform hover:scale-105">
                <img
                  width={200}
                  height={48}
                  src="/images/logo/necto-full-white.svg"
                  alt="Necto Logo"
                  className="h-10 w-auto"
                />
              </Link>
              <h2 className="text-xl font-black tracking-tight text-white mb-2">
                Plataforma de Operaciones & Gestión
              </h2>
              <p className="text-xs text-white/70 leading-relaxed max-w-xs font-medium">
                Arquitectura desacoplada en 3 capas para control de pedidos, existencias físicas, caja e integraciones omnicanal.
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeToggleButton variant="floating" />
        </div>
      </div>
    </div>
  );
}
