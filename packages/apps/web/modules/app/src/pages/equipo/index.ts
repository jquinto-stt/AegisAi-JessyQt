/**
 * Módulo transversal "Equipo y perfiles" (Organización).
 *
 * Gestiona personas con un rol (y sus excepciones) con capacidades atómicas.
 *
 * `EquipoPage` es una PÁGINA con ruta propia (`/equipo`), hermana de
 * Configuración de la organización en el menú lateral. `ModulosTab` sigue siendo
 * una pestaña de `/configuracion`, porque encender un módulo es un ajuste de una
 * vez, no una tarea recurrente. `PerfilOperadorPage` también es página
 * (`/equipo/:id`).
 */
export { EquipoPage } from "./EquipoPage";
export { PerfilOperadorPage } from "./PerfilOperadorPage";
export { ModulosTab } from "./ConfiguracionModulosPage";

export { ESTADO_META, CATEGORIA_COLORES, NIVEL_COLOR, FILTRO_ESTADO_TODAS, OPCIONES_FILTRO_ESTADO, emailSugerido } from "./equipo.constants";
export type { TabEquipo } from "./equipo.constants";

export { procedenciaDe, esEfectiva, aplicarToggle, aplicarPreset, normalizar } from "./excepciones";
export type { Procedencia } from "./excepciones";

export {
  AREA_COPY,
  NIVEL_LABEL,
  PERFILES_TAREA,
  PROCEDENCIA_HUMANA,
  ajustesDe,
  areasCompletas,
  etiquetaLlana,
  fraseDeAcceso,
  inicialesDe,
  labelDeArea,
  nivelDeArea,
  perfilQueEncaja,
  resumenDeAreas,
  resumenDeArea,
  unirConY,
} from "./equipo.presentacion";
export type { AjustePersona, NivelArea, PerfilTarea, ResumenArea } from "./equipo.presentacion";
