import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { BuildingOffice2Icon, ChevronLeftIcon, EyeIcon, PlugInIcon } from "@/icons";
import { organizacionStore } from "@/stores";
import { ConfigShell } from "@/pages/config-layout";

import { AparienciaTab } from "./AparienciaTab";
import { GeneralOrgTab } from "./GeneralOrgTab";
import { ModulosTab } from "@/pages/equipo";

// ═══════════════════════════════════════════════════════════════════════════
// CENTRO DE CONFIGURACIÓN — /configuracion
// ═══════════════════════════════════════════════════════════════════════════
//
// Al ingresar sin parámetro (`/configuracion`), muestra el selector inicial de
// TRES tarjetas:
//   1. «Información de la sede» (nombre comercial, logo, país, moneda y rubro)
//      — clave `general`, que es la que viaja en la URL
//   2. «Módulos e integraciones» — clave `modulos`
//   3. «Apariencia» — clave `apariencia`
//
// El rótulo visible y la CLAVE son independientes: la clave `general` se
// conserva porque está en `?tab=general` y la leen guardas y tests; el rótulo
// se cambió a «Información de la sede» porque «General» no describía su
// contenido (06/10).
//
// ── Por qué «Apariencia» entró aquí (07/10) ───────────────────────────────
//
// El tema y las dos densidades se administraban desde cuatro sitios —el botón de
// la cabecera, la configuración del asistente y la del canal— con tres
// vocabularios, y dos de ellos no los leía nadie. Son preferencias de la
// APLICACIÓN, no de un módulo, y esta es la pantalla de los ajustes que valen
// para todo. Un módulo no es dueño de una preferencia global.
//
// ── Por qué las pestañas ya no se enlazan entre sí ────────────────────────
//
// Cada vista interna llevaba un «Ir a <la otra>» arriba a la derecha. Con dos
// pestañas era un atajo razonable; con tres, el enlace elige arbitrariamente a
// cuál de las dos otras lleva. Se retiró: el camino de vuelta al selector es uno
// solo («Volver a Configuración») y desde ahí se elige.
//
// ═══════════════════════════════════════════════════════════════════════════

export type ClaveConfig = "general" | "modulos" | "apariencia";

/** Cabecera de una vista interna: el camino de vuelta al selector. */
const VolverAlSelector = ({ onVolver }: { onVolver: () => void }) => (
  <div className="mb-6">
    <button
      type="button"
      onClick={onVolver}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Volver a Ajustes Generales</span>
    </button>
  </div>
);

const TARJETAS_AJUSTES: {
  key: ClaveConfig;
  label: string;
  hint: string;
  icono: React.FC<React.SVGProps<SVGSVGElement>>;
  accion: string;
  palabrasClave: string[];
}[] = [
  {
    key: "general",
    label: "Información de la sede",
    hint: "Nombre comercial, logo, país, moneda base y rubro del negocio.",
    icono: BuildingOffice2Icon,
    accion: "Configurar",
    palabrasClave: ["sede", "nombre", "organizacion", "logo", "pais", "moneda", "rubro", "datos", "empresa", "identidad"],
  },
  {
    key: "modulos",
    label: "Módulos e integraciones",
    hint: "Herramientas activas, catálogo de extensiones y conectores externos.",
    icono: PlugInIcon,
    accion: "Configurar",
    palabrasClave: ["modulos", "integraciones", "extensiones", "servicios", "conectores", "whatsapp", "telegram", "funciones"],
  },
  {
    key: "apariencia",
    label: "Apariencia",
    hint: "Tema de la aplicación (claro, oscuro, sistema) y densidad de la interfaz.",
    icono: EyeIcon,
    accion: "Personalizar",
    palabrasClave: ["apariencia", "tema", "modo oscuro", "oscuro", "claro", "diseño", "densidad", "interfaz", "color"],
  },
];

export const ConfiguracionPage = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") as ClaveConfig | null;
  const [busqueda, setBusqueda] = useState("");

  const nombreOrg = organizacionStore.organizacion?.nombre;

  const irA = (clave: ClaveConfig) => {
    setSearchParams({ tab: clave });
  };

  const volverAlHub = () => {
    setSearchParams({});
  };

  // ── VISTA INTERNA: INFORMACIÓN DE LA SEDE ────────────────────────────────
  if (tab === "general") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Ajustes Generales · Información de la sede"
          description="Datos generales, identidad y región de la organización"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="general"
            titulo="Datos generales de la organización"
            hint="Identidad de marca, ubicación y moneda de trabajo"
          >
            <GeneralOrgTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: MÓDULOS E INTEGRACIONES ───────────────────────────────
  if (tab === "modulos") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Ajustes Generales · Módulos e integraciones"
          description="Servicios y conexiones activas de la organización"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="modulos"
            titulo="Módulos e integraciones"
            hint="Activa o desactiva capacidades y conecta servicios externos"
          >
            <ModulosTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: APARIENCIA ────────────────────────────────────────────
  //
  // Es la administración de las preferencias de interfaz de la aplicación
  // entera: el tema y las dos densidades. Se aplican al instante y se persisten
  // en `uiStore`; por eso esta vista no tiene botón de guardar.
  if (tab === "apariencia") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Ajustes Generales · Apariencia"
          description="Tema y densidad de la interfaz"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="apariencia"
            titulo="Apariencia"
            hint="Tema y densidad de la interfaz. Se aplican al instante"
          >
            <AparienciaTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INICIAL: HUB DE SELECCIÓN CON BUSCADOR Y TARJETAS MODERNAS ─────
  const query = busqueda.toLowerCase().trim();
  const tarjetasFiltradas = TARJETAS_AJUSTES.filter((t) => {
    if (!query) return true;
    const coincideTexto =
      t.label.toLowerCase().includes(query) ||
      t.hint.toLowerCase().includes(query);
    const coincidePalabrasClave = t.palabrasClave.some((p) => p.includes(query));
    return coincideTexto || coincidePalabrasClave;
  });

  return (
    <div className="pb-12 space-y-8 animate-aparecer">
      <PageMeta
        title="Ajustes Generales"
        description="Centro de ajustes generales de la organización"
      />

      {/* ── Encabezado con buscador interactivo ─────────────────────── */}
      <section className="space-y-6" data-purpose="page-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Ajustes Generales {nombreOrg ? `· ${nombreOrg}` : ""}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
              Gestiona la información de la sede, módulos activos, extensiones y preferencias de apariencia.
            </p>
          </div>

          {/* Barra de búsqueda interactiva */}
          <div className="w-full md:w-80 relative shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <input
              id="moduleSearchInput"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ajuste o parámetro..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 dark:focus:border-brand-500 text-slate-900 dark:text-white shadow-2xs transition placeholder-slate-400 dark:placeholder-slate-500"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Borrar búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent dark:from-gray-800 dark:via-gray-800"></div>
      </section>

      {/* ── Cuadrícula de módulos ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-purpose="modules-grid">
        {tarjetasFiltradas.length > 0 ? (
          tarjetasFiltradas.map((t) => {
            const Icono = t.icono;
            return (
              <article
                key={t.key}
                onClick={() => irA(t.key)}
                className="group relative bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 rounded-2xl p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-brand-900 group-hover:text-white dark:group-hover:bg-brand-600 transition-all duration-200 mb-6">
                    <Icono className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-brand-950 dark:group-hover:text-brand-300 transition-colors">
                    {t.label}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal mb-6">
                    {t.hint}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-900 dark:group-hover:text-brand-400 transition-colors">
                    <span>{t.accion}</span>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-900 dark:group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No se encontraron ajustes para «<span className="font-semibold">{busqueda}</span>».
            </p>
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 underline cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>
    </div>
  );
});

export default ConfiguracionPage;
