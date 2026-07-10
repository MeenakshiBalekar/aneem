import { Suspense } from "react";
import { FounderLoginForm } from "@/components/founder/founder-login-form";

export const metadata = { title: "Sign In" };

export default function FounderLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={null}>
        <FounderLoginForm />
      </Suspense>
    </div>
  );
}
