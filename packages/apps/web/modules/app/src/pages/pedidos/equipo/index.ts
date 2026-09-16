/**
 * Pantalla "Equipo" del módulo Pedidos.
 *
 * Sustituye a la pantalla legacy de Operadores **solo para pedidos**: gestiona
 * personas con un rol (y sus excepciones) en vez de personas con secciones
 * marcadas a mano. Turnos y Agendamiento siguen usando `pages/operadores`.
 */
export { EquipoPage } from "./EquipoPage";
export { PerfilOperadorPage } from "./PerfilOperadorPage";

export { ESTADO_META, resumenGrupos, FILTRO_ESTADO_TODAS, OPCIONES_FILTRO_ESTADO, emailSugerido } from "./equipo.constants";
export type { TabEquipo } from "./equipo.constants";

export { procedenciaDe, esEfectiva, aplicarToggle, normalizar } from "./excepciones";
export type { Procedencia } from "./excepciones";
