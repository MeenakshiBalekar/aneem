"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncNowButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function sync() {
    setSyncing(true);
    const res = await fetch("/api/admin/sync-qikink", { method: "POST" });
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
      className="border-ink flex items-center gap-2 border px-4 py-2 text-xs font-bold uppercase disabled:opacity-50"
    >
      <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
