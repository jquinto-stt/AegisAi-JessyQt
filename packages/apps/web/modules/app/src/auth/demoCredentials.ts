/**
 * Credenciales e identidad de demostración para el modo local (sin Cognito).
 *
 * Se usan únicamente cuando la app corre sin backend, de modo que el
 * desarrollador no tenga que inventarse un correo cada vez. No son credenciales
 * reales: en modo local `signIn` acepta cualquier correo no vacío.
 */

export const LOCAL_MODE_DEMO_EMAIL = 'admin@necto.app';
export const LOCAL_MODE_DEMO_PASSWORD = 'necto123';

/**
 * Identidad que simula el retorno de Google en modo local.
 *
 * Se elige un correo **distinto** al de demostración a propósito: así el botón
 * "Acceder con Google" ejercita el caso real de una cuenta creada sólo con
 * Google —sin contraseña de Necto— en lugar de entrar a la cuenta de demo que ya
 * tiene una. Es lo que permite ver el flujo "Establecer contraseña" en Ajustes.
 */
export const LOCAL_MODE_GOOGLE_EMAIL = 'lucia.moreno@gmail.com';
export const LOCAL_MODE_GOOGLE_FIRST_NAME = 'Lucía';
export const LOCAL_MODE_GOOGLE_LAST_NAME = 'Moreno';
/** `sub` de Google: identifica la identidad externa, no al usuario de Necto. */
export const LOCAL_MODE_GOOGLE_SUB = 'google-sub-demo-100293847';
