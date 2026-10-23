import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ThemeToggleButton } from "@/shell";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { PageMeta } from "@/shell/meta";
import { DecorativeCircles } from "@/elements/common/DecorativeCircles";
import InteractiveDotGrid from "@/elements/common/InteractiveDotGrid";
import { organizacionStore } from "@/stores/organizacion.store";
import { actualizarPerfilRemoto } from "@/lib/auth.service";

interface OpcionPais {
  id: string;
  letra: string;
  nombre: string;
  moneda: string;
  etiquetaMoneda: string;
  detalle: string;
  zonaHoraria: string;
  renderBanderaEmblema: () => React.ReactNode;
}

const PAISES_DISPONIBLES: OpcionPais[] = [
  {
    id: "Colombia",
    letra: "A",
    nombre: "Colombia",
    moneda: "COP",
    etiquetaMoneda: "COP ($)",
    detalle: "Pesos colombianos y facturación local",
    zonaHoraria: "America/Bogota",
    renderBanderaEmblema: () => (
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-2 ring-white/80 dark:ring-white/10 shrink-0 bg-gray-100 dark:bg-gray-800">
        <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
          <rect width="300" height="100" fill="#FCD116" />
          <rect y="100" width="300" height="50" fill="#003893" />
          <rect y="150" width="300" height="50" fill="#CE1126" />
        </svg>
        {/* Reflejo sutil estilo esmalte */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/25 pointer-events-none" />
      </div>
    ),
  },
  {
    id: "Perú",
    letra: "B",
    nombre: "Perú",
    moneda: "PEN",
    etiquetaMoneda: "PEN (S/)",
    detalle: "Soles y operaciones peruanas",
    zonaHoraria: "America/Lima",
    renderBanderaEmblema: () => (
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-2 ring-white/80 dark:ring-white/10 shrink-0 bg-gray-100 dark:bg-gray-800">
        <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
          <rect width="100" height="200" fill="#D91023" />
          <rect x="100" width="100" height="200" fill="#FFFFFF" />
          <rect x="200" width="100" height="200" fill="#D91023" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/25 pointer-events-none" />
      </div>
    ),
  },
  {
    id: "Ecuador",
    letra: "C",
    nombre: "Ecuador",
    moneda: "USD",
    etiquetaMoneda: "USD ($)",
    detalle: "Dólares para comercio transfronterizo",
    zonaHoraria: "America/Guayaquil",
    renderBanderaEmblema: () => (
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-2 ring-white/80 dark:ring-white/10 shrink-0 bg-gray-100 dark:bg-gray-800">
        <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
          <rect width="300" height="100" fill="#FFDD00" />
          <rect y="100" width="300" height="50" fill="#034EA2" />
          <rect y="150" width="300" height="50" fill="#ED1C24" />
          <circle cx="150" cy="115" r="18" fill="#034EA2" stroke="#FFDD00" strokeWidth="2.5" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/25 pointer-events-none" />
      </div>
    ),
  },
];

export function OnboardingPaisPage() {
  const navigate = useNavigate();
  const [paisSeleccionado, setPaisSeleccionado] = useState<string>(
    organizacionStore.usuario?.pais || "Colombia"
  );
  const [cargando, setCargando] = useState(false);

  // Atajos de teclado: A, B, C y Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está en un input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      if (key === "A") setPaisSeleccionado("Colombia");
      if (key === "B") setPaisSeleccionado("Perú");
      if (key === "C") setPaisSeleccionado("Ecuador");
      if (e.key === "Enter") {
        e.preventDefault();
        handleContinuar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paisSeleccionado]);

  const handleContinuar = async () => {
    const opcion = PAISES_DISPONIBLES.find((p) => p.id === paisSeleccionado) || PAISES_DISPONIBLES[0];
    setCargando(true);

    try {
      // Guardar país en el perfil
      await actualizarPerfilRemoto({
        pais: opcion.nombre,
      });

      // Si ya hay organización creada, actualizamos país y moneda
      if (organizacionStore.tieneOrganizacion) {
        organizacionStore.actualizarOrganizacion({
          pais: opcion.nombre,
          moneda: opcion.moneda,
          zonaHoraria: opcion.zonaHoraria,
        });
      }

      // Avanzar al paso 3: Modelo de Negocio
      navigate("/onboarding/modelo-negocio");
    } catch {
      navigate("/onboarding/modelo-negocio");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Elige tu primer país — Necto"
        description="Selecciona el país donde comenzará a operar tu negocio en Necto."
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

        {/* Contenido Central: Pregunta 2 */}
        <main className="relative flex-1 flex flex-col justify-center px-4 max-w-3xl mx-auto w-full my-auto z-10 pointer-events-auto">
          {/* Título de la pregunta */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold">
                2
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white">
                Elige el primer país donde comenzarás a usar Necto:<span className="text-brand-500">*</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 pl-7 leading-relaxed">
              Luego podrás agregar más países a esta misma cuenta
            </p>
          </div>

          {/* Tarjetas Elevadas con Emblemas de Bandera y Atajos */}
          <div className="pl-7 space-y-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {PAISES_DISPONIBLES.map((pais) => {
                const esSeleccionado = paisSeleccionado === pais.id;
                return (
                  <button
                    key={pais.id}
                    type="button"
                    onClick={() => setPaisSeleccionado(pais.id)}
                    className={`group relative flex flex-col justify-between p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left backdrop-blur-md ${
                      esSeleccionado
                        ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 ring-4 ring-brand-500/15 dark:border-brand-400 dark:ring-brand-400/20 shadow-xl -translate-y-1"
                        : "border-gray-200/90 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 hover:border-brand-300 dark:hover:border-gray-700 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Fila superior: Emblema de la bandera + Chip de tecla [A] */}
                    <div className="flex items-start justify-between w-full mb-4">
                      {pais.renderBanderaEmblema()}

                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono font-bold transition-colors ${
                          esSeleccionado
                            ? "bg-brand-500 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 group-hover:border-gray-300"
                        }`}
                      >
                        {pais.letra}
                      </span>
                    </div>

                    {/* Información del país */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-ink-title dark:text-white tracking-tight">
                          {pais.nombre}
                        </h2>
                        {esSeleccionado && (
                          <CheckCircle2 className="w-5 h-5 text-brand-500 dark:text-brand-400 animate-in zoom-in-75 duration-200" />
                        )}
                      </div>

                      <div className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        {pais.etiquetaMoneda}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal pt-1">
                        {pais.detalle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Botón Continuar */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleContinuar}
                disabled={cargando}
                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-lg shadow-brand-500/25 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Continuar"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                presiona <strong className="text-gray-600 dark:text-gray-300">Enter ↵</strong> o usa las teclas <strong className="text-gray-600 dark:text-gray-300">A / B / C</strong>
              </span>
            </div>
          </div>
        </main>

        {/* Footer con flechas de navegación Typeform */}
        <footer className="relative w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 z-10 pointer-events-auto">
          <span>Necto &copy; {new Date().getFullYear()}</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/onboarding/telefono")}
              title="Paso anterior (Teléfono)"
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleContinuar}
              title="Siguiente paso"
              className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
