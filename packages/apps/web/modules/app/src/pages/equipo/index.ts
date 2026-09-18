/**
 * Módulo transversal "Equipo y Roles" (Organización).
 *
 * Gestiona personas con un rol (y sus excepciones) con capacidades atómicas.
 */
export { EquipoPage } from "./EquipoPage";
export { PerfilOperadorPage } from "./PerfilOperadorPage";

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
