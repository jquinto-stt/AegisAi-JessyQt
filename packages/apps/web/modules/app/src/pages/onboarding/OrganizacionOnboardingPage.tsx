import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { PageMeta } from "@/shell/meta";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import {
  organizacionStore,
  PAISES_CONFIG,
  TIPO_EMPRESA_POR_DEFECTO,
  TIPOS_EMPRESA,
  slugDe,
} from "@/stores/organizacion.store";
import { OnboardingLayout } from "./OnboardingLayout";

const BRAND_MESSAGES_WORKSPACE = [
  {
    badge: "Tu Espacio de Trabajo",
    title: "Centraliza la operación de tu negocio.",
    subtitle: "Un solo entorno donde conviven tus sedes, tus ventas y tu equipo.",
  },
  {
    badge: "Arquitectura por Sedes",
    title: "Escalable desde el primer minuto.",
    subtitle: "Comienza con tu sede principal y activa los módulos que necesites con total libertad.",
  },
  {
    badge: "Estandarización Regional",
    title: "Moneda y horarios sincronizados.",
    subtitle: "Tus reportes y transacciones operan automáticamente bajo el huso horario correcto.",
  },
];

export const OrganizacionOnboardingPage = observer(() => {
  const navigate = useNavigate();
  const orgActual = organizacionStore.organizacion;

  const [nombre, setNombre] = useState(orgActual?.nombre || "");
  const [pais, setPais] = useState(orgActual?.pais || "Colombia");
  const [tipoEmpresa, setTipoEmpresa] = useState(
    orgActual?.tipoEmpresa || TIPO_EMPRESA_POR_DEFECTO
  );
  const [personalizarSede, setPersonalizarSede] = useState(false);
  const [nombreSede, setNombreSede] = useState("");
  const [error, setError] = useState("");

  const configPais = PAISES_CONFIG[pais] || PAISES_CONFIG["Colombia"];
  const slugGenerado = nombre.trim() ? slugDe(nombre) : "";
  const sedeMostrada = nombreSede.trim() || (nombre.trim() ? `${nombre.trim()} — Principal` : "Sede Principal");

  const handleCrearWorkspace = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa el nombre de tu empresa o negocio.");
      return;
    }
    setError("");

    // 1. Crear el Workspace y su Sede Principal por defecto
    organizacionStore.crearOrganizacion({
      nombre,
      nombreSede: sedeMostrada,
      pais,
      moneda: configPais.moneda,
      zonaHoraria: configPais.zonaHoraria,
      tipoEmpresa,
    });

    // 2. Marcar el perfil personal como completado (actualizarPerfil lo fija internamente)
    organizacionStore.actualizarPerfil({
      pais,
    });

    // 3. Aterrizar directamente en el Hub de Módulos del Workspace
    navigate("/modulos");
  };

  return (
    <>
      <PageMeta
        title="Crear Espacio de Trabajo · Necto"
        description="Define tu espacio de trabajo y tu sede principal"
      />

      <OnboardingLayout
        pasoActual={1}
        totalPasos={1}
        pasoLabel="Espacio de Trabajo"
        brandMessages={BRAND_MESSAGES_WORKSPACE}
        brandSummary={{
          eyebrow: "Tu espacio de trabajo",
          title: nombre || "Nombre de tu empresa",
          lines: [
            slugGenerado ? `necto.app/${slugGenerado}` : "",
            `Sede inicial: ${sedeMostrada}`,
            `${configPais.moneda} · ${pais}`,
            tipoEmpresa,
          ].filter(Boolean),
        }}
      >
        <div className="w-full">
          {/* Encabezado del paso */}
          <div className="mb-6 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-brand-400">
              Paso único — Espacio de trabajo
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-ink-title dark:text-white">
              Crea tu espacio de trabajo
            </h1>
            <p className="mt-1.5 text-sm text-ink-body dark:text-gray-400">
              Configura tu negocio. Crearemos automáticamente tu primera sede para que puedas gestionar módulos e inventario con total libertad.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCrearWorkspace} className="space-y-5">
            {/* 1. Nombre de la empresa */}
            <div>
              <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Nombre de la empresa o negocio <span className="text-secondary-600 dark:text-accent-300">*</span>
              </Label>
              <Input
                id="companyName"
                placeholder="Ej: Café Central, Boutique Roma, Distribuidora Solís"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setError("");
                }}
                className="mt-1.5 h-11"
              />
              {slugGenerado && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Identificador web:{" "}
                  <span className="font-mono font-semibold text-secondary-600 dark:text-brand-400">
                    necto.app/{slugGenerado}
                  </span>
                </p>
              )}
            </div>

            {/* 2. País de operación con moneda y huso sincronizados */}
            <div>
              <Label htmlFor="countrySelect" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                País de operación <span className="text-secondary-600 dark:text-accent-300">*</span>
              </Label>
              <div className="mt-1.5 relative">
                <select
                  id="countrySelect"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-theme-xs transition-colors focus:border-secondary-500 focus:outline-hidden focus:ring-3 focus:ring-secondary-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  {Object.keys(PAISES_CONFIG).map((pKey) => (
                    <option key={pKey} value={pKey}>
                      {pKey} ({PAISES_CONFIG[pKey].moneda})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Moneda base ({configPais.moneda}) y zona horaria ({configPais.zonaHoraria}) sincronizadas automáticamente con tu región.
              </p>
            </div>

            {/* 3. Rubro del negocio */}
            <div>
              <Label htmlFor="companyType" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tipo o rubro de negocio <span className="text-secondary-600 dark:text-accent-300">*</span>
              </Label>
              <div className="mt-1.5 relative">
                <select
                  id="companyType"
                  value={tipoEmpresa}
                  onChange={(e) => setTipoEmpresa(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-theme-xs transition-colors focus:border-secondary-500 focus:outline-hidden focus:ring-3 focus:ring-secondary-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  {TIPOS_EMPRESA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 4. Sede inicial automática */}
            <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700 dark:bg-brand-500/15 dark:text-brand-300">
                    <BuildingStorefrontIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-title dark:text-white">
                      Sede inicial
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sedeMostrada}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPersonalizarSede(!personalizarSede)}
                  className="text-xs font-semibold text-secondary-600 hover:underline dark:text-brand-400 cursor-pointer pt-1"
                >
                  {personalizarSede ? "Ocultar" : "Personalizar"}
                </button>
              </div>

              {personalizarSede && (
                <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-800">
                  <Label htmlFor="sedeName" className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Nombre personalizado de la sede
                  </Label>
                  <Input
                    id="sedeName"
                    placeholder="Ej. Sede Norte, Sucursal Chapinero"
                    value={nombreSede}
                    onChange={(e) => setNombreSede(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Botón de acción principal */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-theme-lg shadow-brand-500/20 cursor-pointer transition-transform active:scale-[0.99]"
              >
                Crear espacio de trabajo
                <ArrowRightIcon className="size-5 ml-2 inline" />
              </Button>
            </div>
          </form>
        </div>
      </OnboardingLayout>
    </>
  );
});

export default OrganizacionOnboardingPage;
