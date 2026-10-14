import { Routes, Route } from "react-router";
import { AppShell } from "@/app/AppShell";
import { NectoLandingPage } from "@/pages/NectoLandingPage";
import { CreatePaymentLinkPage } from "@/pages/CreatePaymentLinkPage";
import { PaymentLinksListPage } from "@/pages/PaymentLinksListPage";
import { SubscriptionPlansPage } from "@/pages/SubscriptionPlansPage";
import { SubscriptionsListPage } from "@/pages/SubscriptionsListPage";

/**
 * App — Route configuration for the Necto web module.
 *
 * - "/" is the STANDALONE public marketing landing (its own full-page layout,
 *   no AppShell).
 * - App pages live under the AppShell (sidebar + header):
 *     "/app/enlaces"              → the payment-link creator (PayZen orders).
 *     "/app/enlaces/listado"      → the list of active links with their status.
 *     "/app/suscripciones"        → subscription plans + checkout.
 *     "/app/suscripciones/listado"→ the list of subscriptions.
 */
export default function App() {
  return (
    <Routes>
      {/* Standalone public pages (no app shell) */}
      <Route path="/" element={<NectoLandingPage />} />

      {/* App pages (sidebar + header) */}
      <Route element={<AppShell />}>
        <Route path="/app/enlaces" element={<CreatePaymentLinkPage />} />
        <Route path="/app/enlaces/listado" element={<PaymentLinksListPage />} />
        <Route path="/app/suscripciones" element={<SubscriptionPlansPage />} />
        <Route path="/app/suscripciones/listado" element={<SubscriptionsListPage />} />
      </Route>
    </Routes>
  );
}
