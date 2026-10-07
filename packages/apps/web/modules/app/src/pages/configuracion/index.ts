/**
 * Configuración de la organización — `/configuracion`.
 *
 * Una sola pantalla con tres pestañas: **Información de la sede** (`general`) ·
 * **Módulos e integraciones** (`modulos`) · **Apariencia** (`apariencia`). Las
 * dos primeras reutilizan contenido de otros sitios (`GeneralOrgTab` de aquí y
 * `ModulosTab` de `@/pages/equipo`), que es donde vivía antes de agruparlas.
 *
 * ── Por qué «Apariencia» está en ESTA pantalla (07/10) ────────────────────
 *
 * El tema y las dos densidades se administraban desde CUATRO sitios —el botón de
 * la cabecera y la configuración de los módulos de asistente y de canal—, con
 * tres vocabularios, y dos de ellos no los leía nadie. No son datos del negocio,
 * pero sí ajustes de la aplicación entera, y esta es la pantalla de los ajustes
 * que valen para todo: un módulo no es dueño de una preferencia global.
 */
export { ConfiguracionPage } from "./ConfiguracionPage";
export { GeneralOrgTab } from "./GeneralOrgTab";
export { AparienciaTab } from "./AparienciaTab";
