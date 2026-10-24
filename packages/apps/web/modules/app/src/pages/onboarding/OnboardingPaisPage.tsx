import React, { useState } from "react";
import { useTransicionOnboarding } from "./useTransicionOnboarding";
import { ThemeToggleButton } from "@/shell";
import { ArrowRight, Check } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";
import { PAISES_ONBOARDING } from "./paises";
import { BanderaPais } from "./BanderaPais";

export function OnboardingPaisPage() {
  const irAPaso = useTransicionOnboarding();

  // El paso arranca vacío: el país lo elige la persona, no se supone.
  const [codigoPais, setCodigoPais] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [cargando, setCargando] = useState(false);

  const pais = PAISES_ONBOARDING.find((p) => p.codigo === codigoPais);

  const handleContinuar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pais) return;
    const ubicacionFinal = ubicacion.trim();
    setCargando(true);

    organizacionStore.actualizarPerfil({
      pais: pais.nombre,
      ...(ubicacionFinal && { ubicacion: ubicacionFinal }),
    });

    if (organizacionStore.tieneOrganizacion) {
      organizacionStore.actualizarOrganizacion({
        pais: pais.nombre,
        moneda: pais.moneda,
        zonaHoraria: pais.zonaHoraria,
      });
    }

    try {
      await actualizarPerfilRemoto({
        pais: pais.nombre,
        ubicacion: ubicacionFinal || undefined,
      });
    } catch {
      // El dato ya quedó en el store local; un fallo de red no frena el onboarding.
    } finally {
      setCargando(false);
      irAPaso("/onboarding/encuesta");
    }
  };

  return (
    <>
      <PageMeta
        title="¿Dónde está tu negocio? — Necto"
        description="Elige el país y la ciudad donde opera tu negocio."
      />

      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Barra de progreso superior: Paso 2 de 3 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-20">
          <div
            className="h-full bg-brand-500"
            style={{ width: "66.666%", viewTransitionName: "onboarding-progreso" }}
          />
        </div>

        {/* Mosaico interactivo de puntos */}
        <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

        {/* Patrón de círculos decorativos */}
        <div className="dark:hidden">
          <DecorativeCircles variant="canvas" />
        </div>
        <div className="hidden dark:block">
          <DecorativeCircles variant="indigo" />
        </div>

        {/* Header superior */}
        <header className="relative w-full flex items-center justify-between z-10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo/necto-full-white.svg"
              alt="Necto"
              className="hidden h-9 w-auto dark:block"
            />
            <img
              src="/images/logo/logo-principal.svg"
              alt="Necto"
              className="h-9 w-auto dark:hidden"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
          </div>
        </header>

        {/* Contenido central */}
        <main
          className="relative flex-1 flex flex-col justify-center px-4 max-w-2xl mx-auto w-full my-auto z-10 pointer-events-auto py-6"
          style={{ viewTransitionName: "onboarding-contenido" }}
        >
          <form onSubmit={handleContinuar} className="space-y-7">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[12px] font-bold">
                  2
                </span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Paso 2 de 3
                </span>
              </div>
              <h1 className="text-[24px] font-bold tracking-tight text-ink-title dark:text-white leading-tight">
                ¿Dónde está tu negocio?<span className="text-brand-500">*</span>
              </h1>
              <p className="mt-1 text-[14px] text-gray-500 dark:text-gray-400">
                Con esto configuramos tu moneda y tu horario. Podrás cambiarlo después.
              </p>
            </div>

            {/* Lista de países: radios nativos, así las flechas del teclado recorren la lista */}
            <fieldset>
              <legend className="sr-only">País</legend>
              <div className="necto-escalonado grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAISES_ONBOARDING.map((p) => {
                  const seleccionado = codigoPais === p.codigo;
                  return (
                    <label
                      key={p.codigo}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40 ${
                        seleccionado
                          ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 ring-2 ring-brand-500/20"
                          : "border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 hover:border-brand-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pais"
                        value={p.codigo}
                        checked={seleccionado}
                        onChange={() => setCodigoPais(p.codigo)}
                        className="sr-only"
                      />
                      <BanderaPais codigo={p.codigo} className="h-5 w-[30px]" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-[14px] font-bold text-ink-title dark:text-white">
                          {p.nombre}
                        </span>
                        <span className="block text-[12px] text-gray-500 dark:text-gray-400">
                          {p.moneda}
                        </span>
                      </span>
                      {seleccionado && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white animate-aparecer">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="onboarding-ubicacion" className="block text-[12px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Ciudad <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative flex items-center border-b-2 border-gray-300 dark:border-gray-700 focus-within:border-brand-500 dark:focus-within:border-brand-400 pb-2 transition-colors">
                <input
                  id="onboarding-ubicacion"
                  type="text"
                  autoComplete="address-level2"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Bogotá, Medellín, Lima, Quito..."
                  className="w-full text-[16px] text-ink-title dark:text-white bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!pais || cargando}
                className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-md shadow-brand-500/25 transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>{cargando ? "Guardando..." : "Continuar"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-[12px] text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                presiona <strong className="text-gray-600 dark:text-gray-300">Enter ↵</strong>
              </span>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>
          <span>Paso 2 de 3</span>
        </footer>
      </div>
    </>
  );
}
