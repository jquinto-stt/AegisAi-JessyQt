import { observer } from "mobx-react-lite";

import { EyeIcon } from "@/icons";
import { uiStore } from "@/stores";
import { ConfigCard, Label2, Segmentado, claseFila } from "@/pages/config-layout";

import {
  OPCIONES_DENSIDAD_ASISTENTE,
  OPCIONES_DENSIDAD_BANDEJA,
  OPCIONES_TEMA,
  detalleDe,
} from "./apariencia.opciones";

// ═══════════════════════════════════════════════════════════════════════════
// APARIENCIA — la administración de la interfaz
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta pestaña es el DUEÑO de las tres preferencias de apariencia de la
// aplicación. Antes se administraban desde cuatro sitios (el botón de la
// cabecera, la configuración del asistente y la del canal) con tres
// vocabularios, y dos de ellas no las leía nadie.
//
// ── Por qué está en la configuración de la ORGANIZACIÓN ───────────────────
//
// No son datos del negocio —no cambian la moneda ni el rubro—, pero sí son
// ajustes de la aplicación entera, y la configuración de la organización es la
// pantalla de los ajustes que valen para todo. Ponerlas en la configuración de
// un módulo era lo que hacía creer que el tema era «del canal».
//
// ── Por qué no hay botón de guardar ───────────────────────────────────────
//
// Se aplican AL INSTANTE y se persisten en `uiStore`: quien elige «Compacta»
// espera ver la lista más apretada ya, no después de guardar. Un botón de
// guardar aquí sería el control decorativo que este proyecto rechaza.
//
// Y no hay controles que mientan: cada preferencia tiene su LECTOR —
// `BandejaLista` lee la densidad de la lista y `ChatThread` la del hilo—, así que
// elegir una cambia algo de verdad.

export const AparienciaTab = observer(() => (
  <ConfigCard
    icono={EyeIcon}
    titulo="¿Cómo quieres ver la aplicación?"
    descripcion="Preferencias de esta interfaz. Se aplican al instante, no son datos del negocio y no viajan con la configuración de ningún módulo."
  >
    <div>
      {/* El tema conserva el paso por `setThemePreference` (y no `setTheme`)
          porque solo aquí se puede elegir «Sistema». El atajo de la cabecera
          sigue alternando claro/oscuro. */}
      <div className={claseFila}>
        <Label2
          titulo="Tema"
          descripcion={detalleDe(OPCIONES_TEMA, uiStore.themePreference)}
        />
        <Segmentado
          ariaLabel="Tema de la aplicación"
          opciones={OPCIONES_TEMA}
          valor={uiStore.themePreference}
          onChange={(v) => uiStore.setThemePreference(v)}
        />
      </div>

      <div className={claseFila}>
        <Label2
          titulo="Densidad de la lista de conversaciones"
          descripcion={detalleDe(OPCIONES_DENSIDAD_BANDEJA, uiStore.densidadBandeja)}
        />
        <Segmentado
          ariaLabel="Densidad de la lista de conversaciones"
          opciones={OPCIONES_DENSIDAD_BANDEJA}
          valor={uiStore.densidadBandeja}
          onChange={(v) => uiStore.setDensidadBandeja(v)}
        />
      </div>

      <div className={claseFila}>
        <Label2
          titulo="Densidad del hilo del asistente"
          descripcion={detalleDe(OPCIONES_DENSIDAD_ASISTENTE, uiStore.densidadAsistente)}
        />
        <Segmentado
          ariaLabel="Densidad del hilo del asistente"
          opciones={OPCIONES_DENSIDAD_ASISTENTE}
          valor={uiStore.densidadAsistente}
          onChange={(v) => uiStore.setDensidadAsistente(v)}
        />
      </div>
    </div>

    <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
      El tema también se puede alternar desde el botón de la cabecera, que está en
      todas las pantallas. Aquí es donde se elige «Sistema» y donde se ajustan las
      densidades.
    </p>
  </ConfigCard>
));

export default AparienciaTab;
