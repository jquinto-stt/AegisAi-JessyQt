import { AuthPageLayout } from "../layouts/auth";
import SignUpForm from "./auth/sign-up";
import type { OnboardingBrandMessage } from "./onboarding/OnboardingLayout";

const MENSAJES_REGISTRO: OnboardingBrandMessage[] = [
  {
    badge: "Plataforma Necto",
    title: "Crea un negocio",
    subtitle: "En minutos y sin configuraciones complejas para tu operación.",
  },
  {
    badge: "Gestión Centralizada",
    title: "Administra tu inventario",
    subtitle: "Controla existencias, catálogo y movimientos en tiempo real.",
  },
  {
    badge: "Escalabilidad Total",
    title: "Empieza en Necto",
    subtitle: "Conecta tus canales de venta y haz crecer tu negocio omnicanal.",
  },
];

export default function Register() {
  return (
    <AuthPageLayout
      panelTone="brand"
      brandMessages={MENSAJES_REGISTRO}
    >
      <SignUpForm />
    </AuthPageLayout>
  );
}
