import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign In", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="container-aneem flex min-h-[70vh] items-center justify-center py-16">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
