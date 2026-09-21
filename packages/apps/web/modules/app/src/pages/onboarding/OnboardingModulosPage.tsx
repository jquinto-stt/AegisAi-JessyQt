import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { organizacionStore } from "@/stores/organizacion.store";
import { plataformaStore, CATALOGO_MODULOS, type IdModuloNegocio } from "@/stores/plataforma.store";
import { OnboardingLayout } from "./OnboardingLayout";

// Aquí se importaban `ThemeToggleButton`, `OnboardingStepper` y
// `OnboardingBrandPanel`, y se declaraba `ONBOARDING_STEPS`. Ninguno se usaba:
// medido con `--noUnusedLocals`. Se retiran en la limpieza de superficie.

/**
 * Logo de cada módulo. Es PRESENTACIÓN: el catálogo no guarda JSX.
 *
 * Es lo único de esta pantalla que no sale del catálogo, junto con el paso de
 * onboarding. El nombre, el tagline, la descripción, los destacados y —sobre
 * todo— la DISPONIBILIDAD se leen de `CATALOGO_MODULOS`, que es la única
 * respuesta a «¿se puede usar hoy?».
 */
const LOGO_MODULO: Record<IdModuloNegocio, React.ReactNode> = {
  pedidos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  inventario: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
};

// `rutaOnboarding` se lee del catálogo (`CATALOGO_MODULOS[id].rutaOnboarding`).
// Antes había un mapeo local `PASO_ONBOARDING` duplicado; se eliminó porque
// estaba desconectado del que usaba `ConfiguracionModulosPage`.

export const OnboardingModulosPage = observer(() => {
  const navigate = useNavigate();
  const org = organizacionStore.organizacion;

  const handleOmitir = () => {
    navigate("/onboarding/encuesta?redirect=/modulos");
  };

  return (
    <>
      <PageMeta
        title="Catálogo de Módulos · Necto"
        description="Selecciona los módulos para tu organización"
      />

      <OnboardingLayout
        pasoActual={3}
        totalPasos={3}
        pasoLabel="Módulos"
        onBack={() => navigate("/onboarding/organizacion")}
        brandBadge="Catálogo Modular"
        brandHeadline="Construye la suite exacta que necesitas"
        brandDescription="Cada módulo se integra de forma nativa sin duplicar datos de clientes, productos ni canales."
        brandBullets={[
          "Módulos independientes e interconectados",
          "Activa solo lo que utilizas",
          "Agrega más capacidades en cualquier momento",
        ]}
        brandQuote={{
          text: "El módulo de pedidos adaptado a nuestro rubro nos simplificó la vida desde el primer día.",
          author: "Andrea V. · Dueña de negocio",
        }}
        brandSummary={{
          eyebrow: "Espacio de trabajo",
          title: org?.nombre || "Mi Organización",
          // Derivado del catálogo: antes decía «Inventario & Stock próximamente» a
          // mano, así que el día que Inventario estuviera disponible este resumen
          // habría seguido anunciándolo como futuro.
          lines: plataformaStore.catalogoModulos.map((m) =>
            m.disponible ? `${m.nombre} disponible` : `${m.nombre} próximamente`,
          ),
        }}
      >
        <div className="w-full">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Paso 3 de 3 — Módulos · {org?.nombre || "Mi Organización"}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
              Elige los módulos para tu negocio
            </h1>
            <p className="mt-2 text-sm text-ink-body dark:text-gray-400">
              Necto es modular. Puedes agregar Pedidos ahora para gestionar tus ventas y entregas, o explorar tu organización primero.
            </p>
          </div>

          {/* Grilla de módulos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Una tarjeta por módulo DEL CATÁLOGO, no dos fichas a mano.
                Antes cada ficha traía su propio texto, así que la descripción de
                Pedidos aquí era un TERCER texto distinto del de `/configuracion` y
                del de `/modulos`. Ahora nombre, descripción, destacados y
                disponibilidad salen de `CATALOGO_MODULOS`; en esta página solo
                viven el logo y el paso de onboarding. */}
            {plataformaStore.catalogoModulos.map((modulo) => (
              <div
                key={modulo.id}
                className={
                  modulo.disponible
                    ? "flex flex-col justify-between rounded-2xl border border-brand-500/40 bg-white p-5 shadow-theme-sm hover:border-brand-500 hover:shadow-theme-md transition-all dark:border-brand-500/30 dark:bg-gray-800/80"
                    : "flex flex-col justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 opacity-70 dark:border-gray-800 dark:bg-gray-800/40"
                }
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={
                        modulo.disponible
                          ? "flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-md shadow-brand-500/20"
                          : "flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }
                    >
                      {LOGO_MODULO[modulo.id]}
                    </div>
                    {modulo.disponible ? (
                      <Badge color="primary" size="sm">
                        Disponible
                      </Badge>
                    ) : (
                      <span className="rounded-full bg-gray-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Próximamente
                      </span>
                    )}
                  </div>

                  <h3
                    className={
                      modulo.disponible
                        ? "mt-3 text-base font-bold text-ink-title dark:text-white"
                        : "mt-3 text-base font-bold text-gray-600 dark:text-gray-300"
                    }
                  >
                    {modulo.nombre}
                  </h3>
                  <p
                    className={
                      modulo.disponible
                        ? "mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed"
                        : "mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed"
                    }
                  >
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 space-y-1 border-t border-gray-100 pt-2.5 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                    {modulo.destacados.map((destacado) => (
                      <div key={destacado} className="flex items-center gap-1.5">
                        <span className={modulo.disponible ? "text-brand-500" : ""}>
                          {modulo.disponible ? "✓" : "•"}
                        </span>{" "}
                        {destacado}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {/* El botón exige las DOS cosas: que el módulo exista hoy
                      (`disponible`) y que tenga un paso de onboarding al que ir.
                      Un módulo disponible sin paso no puede pintar «Agregar»:
                      no hay a dónde llevarlo sin instalar otro módulo. */}
                  {modulo.disponible && modulo.rutaOnboarding ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(modulo.rutaOnboarding!)}
                      className="w-full rounded-full font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-sm shadow-brand-500/20 cursor-pointer"
                    >
                      Agregar este módulo →
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full rounded-full text-xs text-gray-400 cursor-not-allowed"
                    >
                      En desarrollo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => navigate("/onboarding/organizacion")}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white cursor-pointer"
            >
              ← Volver a Organización
            </button>

            <button
              type="button"
              onClick={handleOmitir}
              className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition"
            >
              Omitir por ahora e ir a mi organización →
            </button>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
});

export default OnboardingModulosPage;
