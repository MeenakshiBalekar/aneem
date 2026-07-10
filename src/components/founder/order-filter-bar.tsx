"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const DATE_RANGES = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const STATUSES = [
  "PENDING_PAYMENT", "PAID", "COD_CONFIRMED", "SENT_TO_QIKINK", "IN_PRODUCTION",
  "PRINTED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "RTO", "REFUNDED",
];

export function OrderFilterBar({ states, cities }: { states: string[]; cities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

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
          placeholder="Search phone / email / order ID / name"
          className={`${inputClass} w-64`}
        />
        <button onClick={() => setParam("search", search)} className="h-9 border border-white/15 px-3 text-xs hover:bg-white/5">
          Search
        </button>
      </div>

      <select defaultValue={searchParams.get("dateRange") ?? ""} onChange={(e) => setParam("dateRange", e.target.value)} className={inputClass}>
        {DATE_RANGES.map((d) => (
          <option key={d.value} value={d.value} className="bg-[#0b0d12]">
            {d.label}
          </option>
        ))}
      </select>

      {searchParams.get("dateRange") === "custom" && (
        <>
          <input type="date" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} className={inputClass} />
          <input type="date" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} className={inputClass} />
        </>
      )}

      <select defaultValue={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)} className={inputClass}>
        <option value="" className="bg-[#0b0d12]">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s} className="bg-[#0b0d12]">
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <select defaultValue={searchParams.get("paymentMethod") ?? ""} onChange={(e) => setParam("paymentMethod", e.target.value)} className={inputClass}>
        <option value="" className="bg-[#0b0d12]">All Payments</option>
        <option value="RAZORPAY" className="bg-[#0b0d12]">Prepaid</option>
        <option value="COD" className="bg-[#0b0d12]">COD</option>
      </select>

      <select defaultValue={searchParams.get("state") ?? ""} onChange={(e) => setParam("state", e.target.value)} className={inputClass}>
        <option value="" className="bg-[#0b0d12]">All States</option>
        {states.map((s) => (
          <option key={s} value={s} className="bg-[#0b0d12]">{s}</option>
        ))}
      </select>

      <select defaultValue={searchParams.get("city") ?? ""} onChange={(e) => setParam("city", e.target.value)} className={inputClass}>
        <option value="" className="bg-[#0b0d12]">All Cities</option>
        {cities.map((c) => (
          <option key={c} value={c} className="bg-[#0b0d12]">{c}</option>
        ))}
      </select>

      <select defaultValue={searchParams.get("size") ?? ""} onChange={(e) => setParam("size", e.target.value)} className={inputClass}>
        <option value="" className="bg-[#0b0d12]">All Sizes</option>
        {["S", "M", "L", "XL", "XXL", "One Size"].map((s) => (
          <option key={s} value={s} className="bg-[#0b0d12]">{s}</option>
        ))}
      </select>

      <div className="ml-auto flex gap-2">
        <a href={`/api/founder/orders/export?format=csv&${searchParams.toString()}`} className="h-9 border border-white/15 px-3 text-xs leading-9 hover:bg-white/5">
          Export CSV
        </a>
        <a href={`/api/founder/orders/export?format=xlsx&${searchParams.toString()}`} className="h-9 border border-white/15 px-3 text-xs leading-9 hover:bg-white/5">
          Export Excel
        </a>
        <a href={`/founder/orders/print?${searchParams.toString()}`} target="_blank" rel="noreferrer" className="h-9 border border-white/15 px-3 text-xs leading-9 hover:bg-white/5">
          Print / PDF
        </a>
      </div>
    </div>
  );
}
