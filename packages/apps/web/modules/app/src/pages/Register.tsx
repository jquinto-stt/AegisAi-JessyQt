import { AuthPageLayout } from "../layouts/auth";
import SignUpForm from "./auth/sign-up";

export default function Register() {
  return (
    <AuthPageLayout>
      <SignUpForm />
    </AuthPageLayout>
  );
}
