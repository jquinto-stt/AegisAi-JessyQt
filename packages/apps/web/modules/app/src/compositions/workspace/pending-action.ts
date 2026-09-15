/**
 * Intención de alta de sucursal, para que sobreviva al paso por el login.
 *
 * El hub **se pinta sin sesión** (es una ruta pública: sirve para presentar el
 * producto). Pero el alta de sede sí exige sesión —`OnboardingPage` manda a
 * `/login` si no hay perfil—, así que pulsar "Nueva sucursal" sin haber entrado
 * era un salto sin explicación: el usuario veía un panel de sedes, un botón
 * habilitado, y de pronto un formulario de acceso.
 *
 * El arreglo no es esconder el botón (el hub es, de hecho, una buena puerta de
 * entrada), sino **recordar qué se venía a hacer**. Se guarda en `sessionStorage`
 * —no en `localStorage`: la intención dura la sesión de navegación, no la
 * cuenta— y `SignInForm` la consume para devolver al usuario al alta en lugar de
 * dejarlo en el hub, que era otro callejón: pulsabas "Nueva sucursal", entrabas,
 * y aterrizabas en el hub otra vez.
 */
export const PENDING_ACTION_KEY = "necto_pending_action";

/** Destinos declarados. Se guarda el `id`, nunca la URL, para no admitir redirects arbitrarios. */
export type PendingAction = "branch.create";

/** Ruta que satisface cada intención. Único punto de traducción intención → URL. */
export const PENDING_ACTION_ROUTES: Record<PendingAction, string> = {
  "branch.create": "/onboarding",
};

/** Anota la intención. Silencioso si `sessionStorage` no está disponible. */
export function rememberPendingAction(action: PendingAction): void {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, action);
  } catch {
    // Sin `sessionStorage` el login no sabrá a dónde devolver al usuario. No es
    // fatal: entrará al hub y volverá a pulsar el botón, ya con sesión.
  }
}

/**
 * Lee y **consume** la intención pendiente. Se consume al leer para que un
 * inicio de sesión posterior no repita el desvío: la intención era de un clic
 * concreto, no una preferencia pegajosa.
 */
export function takePendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return raw in PENDING_ACTION_ROUTES ? (raw as PendingAction) : null;
  } catch {
    return null;
  }
}

/** Ruta a la que debe ir quien acaba de autenticarse. `null` si no había intención. */
export function consumePendingRoute(): string | null {
  const action = takePendingAction();
  return action ? PENDING_ACTION_ROUTES[action] : null;
}
