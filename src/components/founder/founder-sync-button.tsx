"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { founderFetch } from "@/lib/founder/fetch-client";
import { cn } from "@/lib/utils";

export function FounderSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function sync() {
    setSyncing(true);
    const res = await founderFetch("/api/founder/sync-qikink", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (res.ok) {
      toast.success(`Synced ${data.itemsSynced} products${data.itemsFailed ? `, ${data.itemsFailed} failed` : ""}`);
      router.refresh();
    } else {
      toast.error("Sync failed");
    }
  }

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs font-bold uppercase hover:bg-white/5 disabled:opacity-50"
    >
      <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
