"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export function ProductFilterBar({ uncategorizedCount }: { uncategorizedCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const uncategorizedOnly = searchParams.get("uncategorized") === "1";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const inputClass = "h-9 border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-white/40 focus:outline-none";

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-end gap-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParam("search", search)}
          placeholder="Search by product name or Qikink ID"
          className={`${inputClass} w-72`}
        />
        <button onClick={() => setParam("search", search)} className="h-9 border border-white/15 px-3 text-xs hover:bg-white/5">
          Search
        </button>
      </div>

      <label className="flex h-9 items-center gap-2 border border-white/15 bg-white/5 px-3 text-xs">
        <input
          type="checkbox"
          checked={uncategorizedOnly}
          onChange={(e) => setParam("uncategorized", e.target.checked ? "1" : "")}
        />
        Uncategorized only ({uncategorizedCount})
      </label>
    </div>
  );
}
