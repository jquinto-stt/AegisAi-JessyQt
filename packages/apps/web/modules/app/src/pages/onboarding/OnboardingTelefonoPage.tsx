import React, { useState, useRef, useEffect } from "react";
import { useTransicionOnboarding } from "./useTransicionOnboarding";
import { ThemeToggleButton } from "@/shell";
import { ChevronDown, ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";
import { PAISES_ONBOARDING, type PaisOnboarding } from "./paises";
import { BanderaPais } from "./BanderaPais";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="256" cy="256" fill="#fefefe" className="dark:fill-gray-800" r="206.43" />
      <path
        d="M151.33,361.12l20.7-54a103,103,0,1,1,34.3,33Zm59.27-36.43,1.87,1.16a86.44,86.44,0,1,0-26.25-25.23l1.28,1.91-13.9,36.23Z"
        fill="#2e2e2e"
        className="dark:fill-gray-100"
      />
      <path
        d="M306.76,275.55c-9.52-5-19.63-9.5-19.73-9.54-3.48-1.6-5.92.19-6.68,1.29l-7.92,9.85c-2.13,1.87-5.11,0-5.44-.2a65.2,65.2,0,0,1-31.53-27.61c-1.62-2.11-.2-3.48.11-3.74l0,0a38.67,38.67,0,0,0,6.42-7.87c2-3.07.21-6.88.15-7L233.67,211c-2-3.83-6.61-3.17-6.64-3.15h-3.37a7.4,7.4,0,0,0-6.15,1.85h0a28.5,28.5,0,0,0-8.87,11.74,35.93,35.93,0,0,0,4.59,31.5c14.6,23.63,28.65,33.09,29.2,33.45,19.73,14.4,39.47,16.41,40.26,16.49a25.58,25.58,0,0,0,3.32.22,26.26,26.26,0,0,0,18.46-8c4.58-3.95,5.29-12.85,5.32-13.31C309.8,276.86,306.8,275.56,306.76,275.55Z"
        fill="#2e2e2e"
        className="dark:fill-gray-100"
      />
    </svg>
  );
}

export function OnboardingTelefonoPage() {
  const irAPaso = useTransicionOnboarding();
  const inputRef = useRef<HTMLInputElement>(null);

  const [prefijo, setPrefijo] = useState<PaisOnboarding>(PAISES_ONBOARDING[0]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [numero, setNumero] = useState(
    organizacionStore.usuario?.telefono?.replace(/^\+\d+\s*/, "") || ""
  );
  const [autorizaWhatsapp, setAutorizaWhatsapp] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSeleccionarPrefijo = (pais: PaisOnboarding) => {
    setPrefijo(pais);
    setMostrarDropdown(false);
    inputRef.current?.focus();
  };

  const handleContinuar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const soloNumeros = numero.replace(/\D/g, "");

    if (!soloNumeros || soloNumeros.length < 7) {
      setError("Por favor ingresa un número de teléfono válido.");
      inputRef.current?.focus();
      return;
    }

    if (!autorizaWhatsapp) {
      setError("Por favor autoriza el contacto vía WhatsApp para continuar.");
      return;
    }

    const telefonoCompleto = `${prefijo.prefijo} ${numero.trim()}`;
    setCargando(true);
    setError(null);

    organizacionStore.actualizarPerfil({ telefono: telefonoCompleto });

    try {
      await actualizarPerfilRemoto({ telefono: telefonoCompleto });
    } catch {
      // El dato ya quedó en el store local; un fallo de red no frena el onboarding.
    } finally {
      setCargando(false);
      irAPaso("/onboarding/pais");
    }
  };

  return (
    <>
      <PageMeta
        title="Tu número de WhatsApp — Necto"
        description="Indica tu número de WhatsApp para comunicarnos contigo."
      />

      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Barra de progreso superior: Paso 1 de 3 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 z-20">
          <div
            className="h-full bg-brand-500"
            style={{ width: "33.333%", viewTransitionName: "onboarding-progreso" }}
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

        {/* Contenido central: una sola pregunta */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-lg mx-auto w-full my-auto z-10 pointer-events-auto"
          style={{ viewTransitionName: "onboarding-contenido" }}
        >
          <form onSubmit={handleContinuar} className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[12px] font-bold">
                  1
                </span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Paso 1 de 3
                </span>
              </div>
              <h1 className="text-[24px] font-bold tracking-tight text-ink-title dark:text-white leading-tight">
                ¿Cuál es tu número de WhatsApp?<span className="text-brand-500">*</span>
              </h1>
              <p className="mt-1 text-[14px] text-gray-500 dark:text-gray-400">
                Te escribiremos solo para avisos importantes de tu cuenta.
              </p>
            </div>

            <div className="space-y-5">
              <div className="relative flex items-center border-b-2 border-gray-300 dark:border-gray-700 focus-within:border-brand-500 dark:focus-within:border-brand-400 pb-2 transition-colors">
                {/* Prefijo del número */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMostrarDropdown(!mostrarDropdown)}
                    aria-haspopup="listbox"
                    aria-expanded={mostrarDropdown}
                    aria-label={`Prefijo ${prefijo.prefijo} (${prefijo.nombre}). Cambiar prefijo`}
                    className="flex items-center gap-1.5 pr-3 py-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <BanderaPais codigo={prefijo.codigo} className="h-4 w-6" />
                    <span className="text-[16px] font-bold text-gray-700 dark:text-gray-200">
                      {prefijo.prefijo}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
                  </button>

                  {mostrarDropdown && (
                    <div
                      role="listbox"
                      className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800 py-1.5 z-50 animate-entrada-menu max-h-60 overflow-y-auto"
                    >
                      {PAISES_ONBOARDING.map((p) => (
                        <button
                          key={p.codigo}
                          type="button"
                          role="option"
                          aria-selected={prefijo.codigo === p.codigo}
                          onClick={() => handleSeleccionarPrefijo(p)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                            prefijo.codigo === p.codigo
                              ? "text-brand-500 font-bold bg-brand-50/50 dark:bg-brand-500/10"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <BanderaPais codigo={p.codigo} className="h-3.5 w-5" />
                            <span>{p.nombre}</span>
                          </span>
                          <span className="text-gray-400 font-mono text-[12px]">{p.prefijo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  aria-label="Número de WhatsApp"
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={prefijo.placeholder}
                  className="flex-1 min-w-0 pl-2 text-[24px] font-normal tracking-wide text-ink-title dark:text-white bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autorizaWhatsapp}
                  onChange={(e) => {
                    setAutorizaWhatsapp(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed flex items-center gap-1.5">
                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 inline-block" />
                  <span>Autorizo a Necto a contactarme vía WhatsApp para notificaciones operativas de mi cuenta.</span>
                </span>
              </label>

              {error && (
                <p role="alert" className="text-[12px] font-bold text-error-600 dark:text-error-400 animate-aparecer">
                  {error}
                </p>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-md shadow-brand-500/25 transition-[background-color,transform] duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <span>{cargando ? "Guardando..." : "Continuar"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[12px] text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                  presiona <strong className="text-gray-600 dark:text-gray-300">Enter ↵</strong>
                </span>
              </div>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>
          <span>Paso 1 de 3</span>
        </footer>
      </div>
    </>
  );
}
