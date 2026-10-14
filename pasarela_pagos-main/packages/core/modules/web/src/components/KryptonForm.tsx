/**
 * KryptonForm — renders PayZen's embedded card form (Krypton SDK) for the LIVE
 * subscription flow.
 *
 * Given a `formToken` + shop `publicKey` + `jsEndpoint` (from the backend's
 * `/api/subscriptions/form-token`), this component:
 *  1. Loads the Krypton JS (with the `kr-public-key` attribute) and a theme once.
 *  2. Mounts a `<div class="kr-embedded" kr-form-token=...>` so Krypton renders
 *     the card fields.
 *  3. Registers `KR.onSubmit` — when the buyer pays, PayZen returns the payment
 *     result ({ clientAnswer, hash }); we forward it to `onPaid` so the page can
 *     confirm the subscription (`/api/subscriptions/confirm`).
 *
 * The card data never touches our servers — Krypton posts it straight to PayZen.
 *
 * Related files:
 * - services/subscriptions.ts — requestSubscriptionFormToken / confirmSubscription
 * - pages/SubscriptionPlansPage.tsx — hosts this component in the checkout
 */
import { useEffect, useRef, useState } from "react";

/** The payment result Krypton hands back after a successful form submission. */
export interface KryptonPaymentResult {
  /** Raw `kr-answer` JSON string (PayZen's answer object). */
  krAnswer: string;
  /** `kr-hash` HMAC signature of `krAnswer`. */
  krHash: string;
}

/** Minimal shape of the global `KR` object exposed by the Krypton SDK. */
interface KRApi {
  setFormConfig: (config: Record<string, unknown>) => Promise<unknown>;
  onSubmit: (
    cb: (res: { clientAnswer: unknown; rawClientAnswer?: string; hash: string }) => boolean | void,
  ) => void;
  onError?: (cb: (err: { errorMessage?: string }) => void) => void;
  removeForms?: () => Promise<unknown>;
}

declare global {
  interface Window {
    KR?: KRApi;
  }
}

interface KryptonFormProps {
  /** Short-lived form token from the backend. */
  formToken: string;
  /** Shop public key (`shopId:test:...`). */
  publicKey: string;
  /** Base URL of PayZen's static JS/CSS (e.g. https://api.payzen.lat). */
  jsEndpoint: string;
  /** Called with the payment result when the buyer pays successfully. */
  onPaid: (result: KryptonPaymentResult) => void;
  /** Called when Krypton reports a client-side error. */
  onError?: (message: string) => void;
}

/**
 * Loads a `<script>` once (idempotent by src). Resolves when it's ready.
 *
 * The Krypton JS needs the `kr-public-key` attribute set BEFORE it loads, so we
 * pass it through and set it on the element.
 */
function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Guard: don't inject the same script twice across mounts.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.addEventListener("load", () => {
      el.dataset.loaded = "true";
      resolve();
    });
    el.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)));
    document.head.appendChild(el);
  });
}

/** Loads a stylesheet once (idempotent by href). */
function loadStyle(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

export const KryptonForm = ({ formToken, publicKey, jsEndpoint, onPaid, onError }: KryptonFormProps) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  // Keep the latest onPaid/onError without re-running the effect on every render.
  const onPaidRef = useRef(onPaid);
  const onErrorRef = useRef(onError);
  onPaidRef.current = onPaid;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    const base = jsEndpoint.replace(/\/$/, "");

    async function init() {
      try {
        // 1. Load the core SDK (with the public key), then the NEON theme CSS+JS.
        //    Paths per PayZen's docs HEAD snippet (static.payzen.lat).
        await loadScript(`${base}/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js`, {
          "kr-public-key": publicKey,
          "kr-language": "es-ES",
        });
        loadStyle(`${base}/static/js/krypton-client/V4.0/ext/neon-reset.min.css`);
        await loadScript(`${base}/static/js/krypton-client/V4.0/ext/neon.js`);
        if (cancelled) return;

        const KR = window.KR;
        if (!KR) throw new Error("El SDK de pago no se inicializó.");

        // 2. Configure the form with the token, then register the submit hook.
        await KR.setFormConfig({ formToken, "kr-language": "es-ES" });
        KR.onError?.((err) => onErrorRef.current?.(err.errorMessage ?? "Error en el pago."));
        KR.onSubmit((res) => {
          // 3. Hand the raw answer + signature to the page for confirmation.
          //    Use rawClientAnswer (the exact JSON string PayZen signed) so the
          //    backend HMAC over it matches — re-stringifying could reorder keys
          //    and break the signature. Return false so Krypton doesn't redirect.
          const krAnswer =
            res.rawClientAnswer ??
            (typeof res.clientAnswer === "string" ? res.clientAnswer : JSON.stringify(res.clientAnswer));
          onPaidRef.current({ krAnswer, krHash: res.hash });
          return false;
        });

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "No se pudo cargar el formulario de pago.";
          setLoadError(message);
          setLoading(false);
          onErrorRef.current?.(message);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      // Clean up the rendered form so switching plans re-renders fresh.
      void window.KR?.removeForms?.();
    };
  }, [formToken, publicKey, jsEndpoint]);

  return (
    <div>
      {loading && !loadError && (
        <p className="text-sm text-gray-500">Cargando formulario de pago seguro...</p>
      )}
      {loadError && <p className="text-sm text-error-600">{loadError}</p>}
      {/* Krypton renders the card fields inside this container. The custom
          `kr-form-token` attribute is spread in (JSX rejects hyphenated attrs). */}
      <div className="kr-embedded" {...{ "kr-form-token": formToken }} />
    </div>
  );
};

export default KryptonForm;
