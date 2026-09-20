/**
 * Módulo transversal "Equipo y Roles" (Organización).
 *
 * Gestiona personas con un rol (y sus excepciones) con capacidades atómicas.
 *
 * `EquipoTab` y `ModulosTab` son PESTAÑAS de `/configuracion`, no páginas: se
 * exportan desde aquí porque es donde viven sus archivos, no porque su sitio
 * conceptual sea este. `PerfilOperadorPage` sí sigue siendo una página con ruta
 * propia (`/equipo/:id`).
 */
export { EquipoTab } from "./EquipoPage";
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
