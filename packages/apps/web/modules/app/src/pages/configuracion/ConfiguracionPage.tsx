import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { BuildingOffice2Icon, ChatIcon, ChevronLeftIcon, EyeIcon, PlugInIcon } from "@/icons";
import { organizacionStore } from "@/stores";
import { ConfigHubPagina, ConfigShell, type TarjetaHub } from "@/pages/config-layout";
import { uiStore } from "@/shell/stores";
import type { ThemePreference } from "@/shell/stores/ui.store";

import { AparienciaTab } from "./AparienciaTab";
import { GeneralOrgTab } from "./GeneralOrgTab";
import { ModulosTab } from "@/pages/equipo";
import { CanalesOrgTab, leerCanalesGuardados, type CanalesGuardados } from "./CanalesOrgTab";

// ═══════════════════════════════════════════════════════════════════════════
// CENTRO DE CONFIGURACIÓN — /configuracion
// ═══════════════════════════════════════════════════════════════════════════
//
// Al ingresar sin parámetro (`/configuracion`), muestra el selector inicial de
// CUATRO tarjetas:
//   1. «Información de la sede» (nombre comercial, logo, país, moneda y rubro)
//      — clave `general`, que es la que viaja en la URL
//   2. «Módulos e integraciones» — clave `modulos`
//   3. «Canales de mensajería» (WhatsApp, Telegram, Instagram, Facebook)
//      — clave `canales`
//   4. «Apariencia» — clave `apariencia`
//
// ═══════════════════════════════════════════════════════════════════════════

export type ClaveConfig = "general" | "modulos" | "canales" | "apariencia";

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
  ajustes: string[];
  palabrasClave: string[];
}[] = [
  {
    key: "general",
    label: "Información de la sede",
    hint: "Nombre comercial, logo, país, moneda base y rubro del negocio.",
    icono: BuildingOffice2Icon,
    accion: "Configurar",
    ajustes: ["Nombre comercial", "Logo", "País y zona horaria", "Moneda", "Tipo de empresa"],
    palabrasClave: ["sede", "nombre", "organizacion", "logo", "pais", "moneda", "rubro", "datos", "empresa", "identidad"],
  },
  {
    key: "modulos",
    label: "Módulos de la plataforma",
    hint: "Herramientas activas, catálogo de extensiones y funciones del sistema.",
    icono: PlugInIcon,
    accion: "Configurar",
    ajustes: ["Módulos activos", "Extensiones"],
    palabrasClave: ["modulos", "extensiones", "servicios", "plataforma", "funciones"],
  },
  {
    key: "canales",
    label: "Canales de mensajería",
    hint: "Conexión centralizada de WhatsApp, Telegram, Instagram y Facebook.",
    icono: ChatIcon,
    accion: "Conectar",
    ajustes: ["WhatsApp", "Telegram", "Instagram", "Facebook"],
    palabrasClave: ["whatsapp", "telegram", "instagram", "facebook", "canales", "conectores", "mensajeria", "api", "webhooks", "chat"],
  },
  {
    key: "apariencia",
    label: "Apariencia",
    hint: "Tema de la aplicación (claro, oscuro, sistema) y densidad de la interfaz.",
    icono: EyeIcon,
    accion: "Personalizar",
    ajustes: ["Tema", "Densidad de conversaciones", "Densidad del asistente"],
    palabrasClave: ["apariencia", "tema", "modo oscuro", "oscuro", "claro", "diseño", "densidad", "interfaz", "color"],
  },
];

const NOMBRE_CANAL: Record<keyof CanalesGuardados, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  facebook: "Facebook",
};

const TEMA: Record<ThemePreference, string> = {
  light: "claro",
  dark: "oscuro",
  system: "según el sistema",
};

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

  // ── VISTA INTERNA: MÓDULOS DE LA PLATAFORMA ──────────────────────────────
  if (tab === "modulos") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Ajustes Generales · Módulos de la plataforma"
          description="Servicios y extensiones activas de la organización"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="modulos"
            titulo="Módulos de la plataforma"
            hint="Activa o desactiva capacidades instaladas en tu organización"
          >
            <ModulosTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: CANALES DE MENSAJERÍA ──────────────────────────────────
  if (tab === "canales") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Ajustes Generales · Canales de mensajería"
          description="Conexión centralizada de WhatsApp, Telegram, Instagram y Facebook"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="canales"
            titulo="Canales de mensajería"
            hint="Centraliza la recepción de mensajes, pedidos y atención omnicanal"
          >
            <CanalesOrgTab />
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

  // ── VISTA INICIAL: HUB DE SELECCIÓN ───────────────────────────────────────
  //
  // Mismo hub que las configuraciones de módulo (`ConfigHubPagina`): cada
  // tarjeta lista los ajustes que contiene y cómo están hoy.
  const org = organizacionStore.organizacion;
  const nModulos = organizacionStore.modulosActivos.length;
  const canales = leerCanalesGuardados();
  const conectados = (Object.keys(canales) as (keyof typeof canales)[])
    .filter((k) => canales[k])
    .map((k) => NOMBRE_CANAL[k]);
  const estado: Record<ClaveConfig, { texto: string; aviso?: boolean }> = {
    general: org
      ? { texto: [org.nombre, org.pais, org.moneda].filter(Boolean).join(" · ") }
      : { texto: "Faltan los datos de la organización", aviso: true },
    modulos: { texto: `${nModulos} ${nModulos === 1 ? "módulo activo" : "módulos activos"}` },
    canales:
      conectados.length > 0
        ? { texto: `Conectado: ${conectados.join(", ")}` }
        : { texto: "Ningún canal conectado", aviso: true },
    apariencia: { texto: `Tema ${TEMA[uiStore.themePreference]}` },
  };

  const tarjetas: TarjetaHub[] = TARJETAS_AJUSTES.map((t) => ({
    key: t.key,
    label: t.label,
    hint: t.hint,
    icono: t.icono,
    ajustes: t.ajustes,
    estado: estado[t.key].texto,
    estadoTono: estado[t.key].aviso ? "aviso" : "neutro",
    palabrasClave: t.palabrasClave,
    accion: t.accion,
  }));

  return (
    <>
      <PageMeta
        title="Ajustes Generales"
        description="Centro de ajustes generales de la organización"
      />
      <ConfigHubPagina
        titulo={nombreOrg ? `Ajustes generales · ${nombreOrg}` : "Ajustes generales"}
        descripcion="Lo que vale para toda la organización: sus datos, los módulos que usa, los canales de mensajería y la apariencia."
        tarjetas={tarjetas}
        onEntrar={(k) => irA(k as ClaveConfig)}
      />
    </>
  );
});

export default ConfiguracionPage;
