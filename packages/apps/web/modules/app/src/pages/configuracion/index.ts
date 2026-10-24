/**
 * Configuración de la organización — `/configuracion`.
 *
 * Una sola pantalla con cuatro tarjetas: **Configuración del negocio** (`general`) ·
 * **Integraciones** (`modulos`) · **Opciones de mensajería** (`canales`) ·
 * **Preferencias** (`apariencia`). Las
 * dos primeras reutilizan contenido de otros sitios (`GeneralOrgTab` de aquí y
 * `ModulosTab` de `@/pages/equipo`), que es donde vivía antes de agruparlas.
 *
 * ── «Configuración del negocio» tiene su propio submenú (23/10) ───────────
 *
 * `?tab=general` es un hub de TRES tarjetas —datos generales, fiscales y
 * bancarios— y el detalle vive en `?tab=general&seccion=organizacion|fiscales|bancarios`.
 * Antes `?tab=general` era directamente el formulario: con dos secciones nuevas
 * no cabía todo en una pantalla, y meterlas dentro del formulario lo habría
 * convertido en un cajón.
 *
 * ── Por qué «Preferencias» está en ESTA pantalla (07/10) ──────────────────
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
