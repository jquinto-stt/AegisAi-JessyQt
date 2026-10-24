/**
 * Código de verificación de 6 caracteres.
 *
 * Vive en su propio módulo porque lo usan DOS flujos —datos fiscales y datos
 * bancarios— y el día que exista un backend de correo, este es el único sitio
 * que cambia: se reemplaza la generación local por la llamada al servidor.
 *
 * Mientras no haya servidor, el código se genera aquí y se muestra en pantalla
 * con un aviso de demostración. No se envía a ninguna parte.
 */
export function nuevoCodigo(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
}
