import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { GridIcon, GroupIcon, PlugInIcon } from "@/icons";
import { organizacionStore } from "@/stores";
import {
  ConfigHeader,
  ConfigSectionNav,
  ConfigShell,
  type GrupoNav,
} from "@/pages/config-layout";
import { EquipoTab, ModulosTab } from "@/pages/equipo";
import { GeneralOrgTab } from "./GeneralOrgTab";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE LA ORGANIZACIÓN — /configuracion
// ═══════════════════════════════════════════════════════════════════════════
//
// Una sola pantalla para todo lo que es de la organización. Antes estaba
// partida en dos (`/equipo` y `/configuracion`) y los datos generales no tenían
// sitio ninguno: el onboarding los pedía una vez y no había forma de corregir un
// nombre mal escrito.
//
// ── La pestaña activa vive en la URL (`?tab=`) ────────────────────────────
//
// No en un `useState`. La razón es concreta: `/equipo` tiene que seguir
// funcionando para los enlaces guardados, y la única forma de que un enlace
// apunte a una pestaña es que la pestaña sea direccionable. Con estado local,
// `/equipo` solo podría dejar al usuario en la pantalla y pedirle un clic más.
//
// ── Por qué el mecanismo de pestañas NO se declara aquí ───────────────────
//
// `ConfigSectionNav` + `ConfigShell` ya existen en `@/pages/config-layout` y son
// la navegación por secciones de `/pedidos/config`, `/conversaciones/config` y
// `/asistente/config`. Montan SOLO la sección activa y remontan el panel con
// `seccionKey` para disparar el fundido de entrada. Inventar aquí un segundo
// mecanismo de pestañas daría dos comportamientos distintos para lo mismo — que
// es exactamente cómo divergen las copias.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Claves de pestaña. Son también los valores válidos de `?tab=`. */
type ClaveTab = "general" | "modulos" | "equipo";

const CLAVES_TAB: ClaveTab[] = ["general", "modulos", "equipo"];

/**
 * ¿Es `v` una pestaña conocida?
 *
 * El parámetro lo escribe el usuario, así que un valor inventado no puede dejar
 * la pantalla en blanco: cae en la pestaña por defecto, que es lo que se pinta
 * de verdad. La URL no es una promesa que esta pantalla haya hecho.
 */
const esClaveTab = (v: string | null): v is ClaveTab =>
  v !== null && (CLAVES_TAB as string[]).includes(v);

/** Metadatos de cada pestaña. La etiqueta y el consejo los pinta `ConfigShell`. */
const META_TAB: Record<
  ClaveTab,
  { label: string; hint: string; icono: React.FC<React.SVGProps<SVGSVGElement>> }
> = {
  general: {
    label: "General",
    hint: "Identidad, región y perfil del negocio.",
    icono: GridIcon,
  },
  modulos: {
    label: "Módulos e integraciones",
    hint: "Qué tiene encendido la organización y qué conectores usa cada módulo.",
    icono: PlugInIcon,
  },
  equipo: {
    label: "Equipo y permisos",
    // La sección dice a qué alcanza: el listado son las personas del módulo
    // Pedidos, no toda la organización. Un equipo a medias sin decirlo es una
    // media verdad.
    hint: "Personas del módulo de Pedidos, sus roles y qué puede hacer cada una.",
    icono: GroupIcon,
  },
};

export const ConfiguracionPage = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab: ClaveTab = esClaveTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as ClaveTab)
    : "general";
  const meta = META_TAB[tab];

  const grupos: GrupoNav[] = [
    {
      grupo: "organizacion",
      label: "Organización",
      secciones: CLAVES_TAB.map((k) => ({
        key: k,
        label: META_TAB[k].label,
        hint: META_TAB[k].hint,
        icono: META_TAB[k].icono,
      })),
    },
  ];

  const nombreOrg = organizacionStore.organizacion?.nombre;

  return (
    <>
      <PageMeta
        title="Configuración de la organización"
        description="Datos generales, módulos, integraciones y equipo de la organización"
      />

      <div className="mb-5">
        <ConfigHeader
          titulo="Configuración"
          descripcion="Los datos de tu organización, los módulos que tiene encendidos y quién puede operarlos."
          // El nombre en la cabecera responde «¿de quién es esta configuración?»
          // sin obligar a bajar a la pestaña General. Si no hay organización, no
          // se pinta un hueco: no hay nada que nombrar.
          acciones={
            nombreOrg ? (
              <Badge color="light" size="sm">
                {nombreOrg}
              </Badge>
            ) : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <ConfigSectionNav
          grupos={grupos}
          activa={tab}
          onSeleccionar={(k) => setSearchParams({ tab: k })}
          ariaLabel="Secciones de la configuración de la organización"
        />

        {/* `seccionKey={tab}` es lo que remonta el panel al cambiar de pestaña y
            dispara `animate-aparecer`. Sin él React reutilizaría el nodo y la
            sección se sustituiría de golpe. */}
        <ConfigShell seccionKey={tab} titulo={meta.label} hint={meta.hint}>
          {tab === "general" && <GeneralOrgTab />}
          {tab === "modulos" && <ModulosTab />}
          {tab === "equipo" && <EquipoTab />}
        </ConfigShell>
      </div>
    </>
  );
});

export default ConfiguracionPage;
