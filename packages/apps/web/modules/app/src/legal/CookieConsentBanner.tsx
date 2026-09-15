import { useEffect, useState } from "react";
import { Button, Card, Link } from "@/elements";
import { Cookie } from "lucide-react";
import { LEGAL_DOCUMENTS } from "./legal.constants";
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentValue,
} from "./cookie-consent";

/**
 * Aviso de cookies.
 *
 * Aparece una sola vez, hasta que la persona decide. **No** hay asentimiento
 * implícito: o se acepta o se rechaza, y en ambos casos queda registrado. La `X`
 * de cerrar se ha **omitido a propósito** aunque el panel de consentimiento del
 * DS la traiga: cerrar sin decidir deja el aviso en un limbo en el que vuelve a
 * salir en la siguiente visita, y quien lo cerró cree que ya lo resolvió.
 *
 * ⚠️ Se monta **fuera** del router con contenido (`App.tsx`, por encima de
 * `<Routes>`): el aviso tiene que verse tanto en las pantallas públicas como
 * dentro de la aplicación, y colgado de una ruta concreta sólo saldría en esa.
 *
 * ⚠️ Sólo se ofrecen las categorías que el producto realmente usa (necesarias y
 * de preferencia) y por eso los botones son "Aceptar" y "Rechazar" y no una
 * lista de interruptores: ofrecer controles para categorías que no existen sería
 * fingir una granularidad que no hay. El detalle está en `/cookies`.
 */
export default function CookieConsentBanner() {
  // `null` = todavía no se ha leído, y no se pinta nada mientras tanto. Si se
  // pintara por defecto se vería un parpadeo en cada carga para quien ya decidió.
  const [decision, setDecision] = useState<CookieConsentValue | null | undefined>(undefined);

  useEffect(() => {
    setDecision(readCookieConsent());
  }, []);

  const decide = (value: CookieConsentValue) => {
    writeCookieConsent(value);
    setDecision(value);
  };

  if (decision !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      data-cookie-consent-banner
      className="fixed inset-x-4 bottom-4 z-[99999] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]"
    >
      {/* La superficie es `Card` del catálogo. La base ya trae el borde y el
          fondo que estaban escritos a mano; `className` repone lo que la
          pantalla pedía: el radio (`rounded-2xl`), la densidad del aviso
          (`p-5 sm:p-5`, que gana a la base `sm:p-6`) y su sombra propia
          (`shadow-theme-lg`, que la base no trae). El `dark:bg-gray-900`
          sustituye el `dark:bg-white/[0.03]` de la base, que aquí se vería
          distinto sobre el fondo de la aplicación. */}
      <Card className="rounded-2xl p-5 sm:p-5 shadow-theme-lg dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            <Cookie className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">
              Usamos cookies para que la sesión funcione
            </p>
            <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Sólo las necesarias y las de preferencia. No usamos publicidad ni perfilado, y no
              vendemos datos. Puedes leer el detalle en la{" "}
              {/* `Link` de Elements: envuelve al de react-router por dentro, así
                  que la navegación sigue siendo de cliente, y
                  `variant="secondary"` da el `text-brand-500` que antes estaba
                  escrito a mano. `text-theme-xs` recupera el tamaño del
                  párrafo —el `Link` base emite `text-sm`—. */}
              <Link
                to={LEGAL_DOCUMENTS.cookies.path}
                text={LEGAL_DOCUMENTS.cookies.title}
                variant="secondary"
                className="text-theme-xs font-semibold hover:underline"
              />
              .
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            className="h-10 flex-1 rounded-full text-theme-sm font-bold"
            onClick={() => decide("accepted")}
          >
            Aceptar
          </Button>
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-full text-theme-sm font-bold"
            onClick={() => decide("rejected")}
          >
            Rechazar
          </Button>
        </div>
      </Card>
    </div>
  );
}
