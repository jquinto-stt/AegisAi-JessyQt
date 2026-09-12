import { AuthPageLayout } from "../layouts/auth";
import SignUpForm from "./auth/sign-up";

export default function Register() {
  return (
    <AuthPageLayout
      panelTone="brand"
      panelHeadline="Nos cruzamos, nos unimos, crecemos."
      panelTagline="grow together"
    >
      <SignUpForm />
    </AuthPageLayout>
  );
}
