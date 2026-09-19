/**
 * Persistencia de la decisión sobre cookies.
 *
 * Se guarda en **almacenamiento local** y no en una cookie: es una decisión del
 * navegador sobre el propio navegador, y no necesita viajar al servidor en cada
 * petición. La política de cookies explica que tratamos ambos igual.
 *
 * ⚠️ Toda lectura y escritura va envuelta en `try/catch`. En modo privado, o con
 * el almacenamiento bloqueado, `localStorage` **lanza** al acceder; sin la guarda
 * el aviso de cookies tumbaría el arranque de la aplicación entera, que es un
 * precio absurdo por un banner. Si no se puede escribir, el aviso simplemente
 * vuelve a aparecer, que es el peor caso aceptable.
 *
 * ⚠️ La clave lleva versión. El día que añadamos una categoría de cookies que hoy
 * no existe, hay que volver a pedir el consentimiento: subir la clave es la
 * forma de invalidar lo que la gente aceptó bajo las condiciones anteriores.
 */

/** Clave de la decisión vigente. Subirla re-pregunta a todo el mundo. */
export const COOKIE_CONSENT_KEY = "necto_cookie_consent_v1";

export type CookieConsentValue = "accepted" | "rejected";

interface StoredConsent {
  value: CookieConsentValue;
  /** ISO de cuándo se decidió. Sirve para auditar y para caducar la decisión. */
  decidedAt: string;
}

/** Lee la decisión guardada. `null` significa "todavía no ha decidido". */
export function readCookieConsent(): CookieConsentValue | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return parsed?.value === "accepted" || parsed?.value === "rejected" ? parsed.value : null;
  } catch {
    // Almacenamiento no disponible o JSON corrupto: se trata como "sin decidir".
    return null;
  }
}

/** Guarda la decisión. Devuelve si se pudo escribir. */
export function writeCookieConsent(value: CookieConsentValue): boolean {
  try {
    const payload: StoredConsent = { value, decidedAt: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
