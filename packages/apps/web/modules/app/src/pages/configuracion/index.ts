/**
 * Configuración de la organización — `/configuracion`.
 *
 * Una sola pantalla con tres pestañas (General · Módulos e integraciones ·
 * Equipo y permisos). Las dos últimas reutilizan el contenido de `@/pages/equipo`,
 * que es donde vivían cuando eran páginas sueltas: mover los archivos habría
 * cambiado rutas de código sin cambiar nada de lo que ve el usuario.
 */
export { ConfiguracionPage } from "./ConfiguracionPage";
export { GeneralOrgTab } from "./GeneralOrgTab";
