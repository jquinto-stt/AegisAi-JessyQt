import { useCallback, useLayoutEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Transición entre pasos del onboarding con la View Transitions API.
 *
 * Las pantallas del onboarding son rutas hermanas en `App.tsx`, no hijas de un
 * layout común, así que no hay un `AnimatePresence` que pueda ver salir a la
 * anterior. La View Transition fotografía la pantalla vieja y la nueva y deja
 * que el CSS (`css/onboarding.css`) las anime: el contenido central se desliza
 * en la dirección del avance, la barra de progreso crece de un paso al otro y
 * el fondo, la cabecera y el pie quedan quietos.
 *
 * ── Por qué una promesa y no `flushSync` ───────────────────────────────────
 *
 * `BrowserRouter` aplica cada navegación dentro de `React.startTransition`, y
 * `flushSync` no fuerza una actualización de transición. Si la View Transition
 * terminara su callback antes del commit, fotografiaría la pantalla vieja como
 * si fuera la nueva. Por eso el callback devuelve una promesa que resuelve el
 * paso entrante desde su `useLayoutEffect`, justo tras el commit y antes de
 * pintar. Si el destino no la resuelve, el temporizador la libera para no
 * congelar la pantalla.
 */

const ESPERA_MAXIMA_MS = 800;

let avisarPasoMontado: (() => void) | null = null;

/** El paso que entra confirma que ya está en el DOM. */
export function usePasoOnboardingMontado() {
  useLayoutEffect(() => {
    avisarPasoMontado?.();
    avisarPasoMontado = null;
  }, []);
}

export function useTransicionOnboarding() {
  const navigate = useNavigate();
  usePasoOnboardingMontado();

  return useCallback(
    (destino: string) => {
      if (typeof document.startViewTransition !== "function") {
        navigate(destino);
        return;
      }

      const transicion = document.startViewTransition(
        () =>
          new Promise<void>((resolver) => {
            avisarPasoMontado = resolver;
            navigate(destino);
            setTimeout(resolver, ESPERA_MAXIMA_MS);
          })
      );

      // Si el navegador omite la transición (pestaña oculta, otra en curso),
      // `ready` se rechaza; la navegación ya ocurrió igual.
      transicion.ready.catch(() => {});
    },
    [navigate]
  );
}
