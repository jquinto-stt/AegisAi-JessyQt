import { AuthPageLayout } from "../layouts/auth";
import ResetPasswordForm from "./auth/reset-password";

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
    </AuthPageLayout>
  );
}
