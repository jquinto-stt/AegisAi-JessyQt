import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ThemeToggleButton } from "@/shell";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";

interface PaisTelefono {
  codigo: string;
  prefijo: string;
  nombre: string;
  bandera: string;
  placeholder: string;
}

const PAISES: PaisTelefono[] = [
  { codigo: "CO", prefijo: "+57", nombre: "Colombia", bandera: "🇨🇴", placeholder: "321 1234567" },
  { codigo: "MX", prefijo: "+52", nombre: "México", bandera: "🇲🇽", placeholder: "55 1234 5678" },
  { codigo: "AR", prefijo: "+54", nombre: "Argentina", bandera: "🇦🇷", placeholder: "11 1234 5678" },
  { codigo: "CL", prefijo: "+56", nombre: "Chile", bandera: "🇨🇱", placeholder: "9 1234 5678" },
  { codigo: "PE", prefijo: "+51", nombre: "Perú", bandera: "🇵🇪", placeholder: "912 345 678" },
  { codigo: "ES", prefijo: "+34", nombre: "España", bandera: "🇪🇸", placeholder: "612 34 56 78" },
  { codigo: "US", prefijo: "+1", nombre: "Estados Unidos", bandera: "🇺🇸", placeholder: "202 555 0123" },
];

export function OnboardingTelefonoPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [paisSeleccionado, setPaisSeleccionado] = useState<PaisTelefono>(PAISES[0]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [numero, setNumero] = useState(
    organizacionStore.usuario?.telefono?.replace(/^\+\d+\s*/, "") || ""
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContinuar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const soloNumeros = numero.replace(/\D/g, "");

    if (!soloNumeros || soloNumeros.length < 7) {
      setError("Por favor ingresa un número de teléfono válido.");
      inputRef.current?.focus();
      return;
    }

    const telefonoCompleto = `${paisSeleccionado.prefijo} ${numero.trim()}`;
    setCargando(true);
    setError(null);

    try {
      // Guardar y sincronizar en PostgreSQL si hay sesión
      await actualizarPerfilRemoto({
        telefono: telefonoCompleto,
      });

      // Avanzar al siguiente paso del onboarding
      navigate("/onboarding/pais");
    } catch {
      // Aunque falle la red, avanzar guardado localmente
      navigate("/onboarding/pais");
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinuar();
    }
  };

  return (
    <>
      <PageMeta
        title="Tu número personal — Necto"
        description="Ingresa tu número de contacto para vincular tu perfil de Necto."
      />
      <div className="relative min-h-screen w-full bg-white dark:bg-gray-950 flex flex-col justify-between p-6 sm:p-10 font-sans transition-colors duration-200 overflow-hidden select-none">
        {/* Mosaico interactivo de puntos del Login */}
        <InteractiveDotGrid dotGap={28} baseRadius={1.4} activeRadius={3.2} glowDistance={160} />

        {/* Patrón de círculos decorativos de marca */}
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

        {/* Contenido Central: Pregunta interactiva Tipo Typeform */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-xl mx-auto w-full my-auto z-10 pointer-events-auto">
          <form onSubmit={handleContinuar}>
            {/* Título de la pregunta */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold">
                  1
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white">
                  Tu número personal<span className="text-brand-500">*</span>
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 pl-7 leading-relaxed">
                El número con el que Necto se pueda contactar contigo
              </p>
            </div>

            {/* Input de teléfono con selector de bandera */}
            <div className="pl-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Número de teléfono<span className="text-brand-500">*</span>
                </label>

                <div className="relative flex items-center border-b-2 border-gray-300 dark:border-gray-700 focus-within:border-brand-500 dark:focus-within:border-brand-400 pb-2 transition-colors">
                  {/* Selector de país / bandera */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMostrarDropdown(!mostrarDropdown)}
                      className="flex items-center gap-1.5 pr-2 py-1 text-base cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="text-2xl leading-none">{paisSeleccionado.bandera}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {/* Menú de países */}
                    {mostrarDropdown && (
                      <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {PAISES.map((p) => (
                          <button
                            key={p.codigo}
                            type="button"
                            onClick={() => {
                              setPaisSeleccionado(p);
                              setMostrarDropdown(false);
                              inputRef.current?.focus();
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                              paisSeleccionado.codigo === p.codigo
                                ? "text-brand-500 font-bold bg-brand-50/50 dark:bg-brand-500/10"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-lg leading-none">{p.bandera}</span>
                              <span>{p.nombre}</span>
                            </span>
                            <span className="text-gray-400 font-mono">{p.prefijo}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campo de número */}
                  <input
                    ref={inputRef}
                    type="tel"
                    value={numero}
                    onChange={(e) => {
                      setNumero(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={paisSeleccionado.placeholder}
                    className="flex-1 pl-3 text-xl sm:text-2xl font-medium tracking-wide text-ink-title dark:text-white bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-error-600 dark:text-error-400 animate-in fade-in duration-150">
                  {error}
                </p>
              )}

              {/* Botón Continuar */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] shadow-md shadow-emerald-500/20 transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  {cargando ? "Guardando..." : "Continuar"}
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                  presiona <strong className="text-gray-600 dark:text-gray-300">Enter ↵</strong>
                </span>
              </div>
            </div>
          </form>
        </main>

        {/* Footer con flechas de navegación Typeform en la esquina inferior derecha */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>

          {/* Flechas de navegación Typeform */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/onboarding/bienvenida")}
              title="Paso anterior"
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleContinuar()}
              title="Siguiente paso"
              className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
