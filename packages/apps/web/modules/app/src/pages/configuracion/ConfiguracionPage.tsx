import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { ChevronLeftIcon, EyeIcon, IdentificationIcon, PlugInIcon } from "@/icons";
import { organizacionStore } from "@/stores";
import { ConfigHub, ConfigShell } from "@/pages/config-layout";

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

export const ConfiguracionPage = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") as ClaveConfig | null;

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

  // ── VISTA INICIAL: HUB DE SELECCIÓN CON LAS TARJETAS ─────────────────────
  //
  // ESTA pantalla es la REFERENCIA del estilo de tarjeta vertical según la
  // captura del usuario (General y Módulos e integraciones).
  return (
    <div className="animate-aparecer">
      <PageMeta
        title="Ajustes Generales"
        description="Centro de ajustes generales de la organización"
      />

      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          <span>Ajustes Generales</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-title dark:text-white">
          Ajustes Generales {nombreOrg ? `· ${nombreOrg}` : ""}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-gray-500 dark:text-gray-400">
          Selecciona la sección que deseas gestionar para tu negocio.
        </p>
      </div>

      <ConfigHub
        tarjetas={[
          {
            key: "general",
            label: "Información de la sede",
            hint: "Nombre comercial, logo, país, moneda de cobro y perfil de rubro.",
            icono: IdentificationIcon,
          },
          {
            key: "modulos",
            label: "Módulos e integraciones",
            hint: "Herramientas activas, catálogo de extensiones y conectores externos.",
            icono: PlugInIcon,
          },
          {
            key: "apariencia",
            label: "Apariencia",
            hint: "Tema de la aplicación y densidad de la lista de conversaciones y del hilo del asistente.",
            icono: EyeIcon,
          },
        ]}
        onEntrar={(k) => irA(k as ClaveConfig)}
      />
    </div>
  );
});

export default ConfiguracionPage;
