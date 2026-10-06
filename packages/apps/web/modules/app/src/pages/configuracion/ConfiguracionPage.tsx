import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  IdentificationIcon,
  PlugInIcon,
} from "@/icons";
import { organizacionStore } from "@/stores";
import { ConfigHub, ConfigShell } from "@/pages/config-layout";

import { GeneralOrgTab } from "./GeneralOrgTab";
import { ModulosTab } from "@/pages/equipo";

// ═══════════════════════════════════════════════════════════════════════════
// CENTRO DE CONFIGURACIÓN — /configuracion
// ═══════════════════════════════════════════════════════════════════════════
//
// Al ingresar sin parámetro (`/configuracion`), muestra el selector inicial de
// dos tarjetas:
//   1. «Información de la sede» (nombre comercial, logo, país, moneda y rubro)
//      — clave `general`, que es la que viaja en la URL
//   2. Módulos e integraciones (Servicios y conexiones activas)
//
// El rótulo visible y la CLAVE son independientes: la clave `general` se
// conserva porque está en `?tab=general` y la leen guardas y tests; el rótulo
// se cambió a «Información de la sede» porque «General» no describía su
// contenido (06/10).
//
// Al hacer clic en una tarjeta, navega DENTRO de esa configuración
// (`?tab=general` o `?tab=modulos`), mostrando la pantalla completa con un
// botón «← Volver a Configuración» para regresar al selector.
//
// ═══════════════════════════════════════════════════════════════════════════

export type ClaveConfig = "general" | "modulos";

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

  // ── VISTA INTERNA: CONFIGURACIÓN GENERAL ─────────────────────────────────
  if (tab === "general") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Configuración · Información de la sede"
          description="Datos generales, identidad y región de la organización"
        />

        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={volverAlHub}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a Configuración</span>
          </button>

          <button
            type="button"
            onClick={() => irA("modulos")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 dark:text-gray-400"
          >
            <span>Ir a Módulos e integraciones</span>
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </div>

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
          title="Configuración · Módulos e integraciones"
          description="Servicios y conexiones activas de la organización"
        />

        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={volverAlHub}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a Configuración</span>
          </button>

          <button
            type="button"
            onClick={() => irA("general")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 dark:text-gray-400"
          >
            <ChevronLeftIcon className="h-3 w-3" />
            <span>Ir a General</span>
          </button>
        </div>

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

  // ── VISTA INICIAL: HUB DE SELECCIÓN CON LAS TARJETAS ─────────────────────
  //
  // ESTA pantalla es la REFERENCIA del estilo de tarjeta vertical según la
  // captura del usuario (General y Módulos e integraciones).
  return (
    <div className="animate-aparecer">
      <PageMeta
        title="Configuración"
        description="Centro de configuración de la organización"
      />

      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          <span>Configuración del sistema</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-title dark:text-white">
          Configuración {nombreOrg ? `· ${nombreOrg}` : ""}
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
        ]}
        onEntrar={(k) => irA(k as ClaveConfig)}
      />
    </div>
  );
});

export default ConfiguracionPage;
