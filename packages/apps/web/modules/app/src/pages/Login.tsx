import { AuthPageLayout } from "../layouts/auth";
import SignInForm from "./auth/sign-in";

export default function Login() {
  return (
    <AuthPageLayout>
      <SignInForm />
    </AuthPageLayout>
  );
}
