"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";

function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <CartHydration />
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: "4px", fontSize: "14px" } }} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
