"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

// Founder pages need their own SessionProvider — pointed at
// /api/founder-auth instead of the customer site's /api/auth — so
// next-auth/react's signIn()/signOut()/useSession() all talk to the
// founder auth realm instead of accidentally hitting the customer one.
export function FounderProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } }));

  return (
    <SessionProvider basePath="/api/founder-auth">
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: "4px", fontSize: "14px" } }} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
