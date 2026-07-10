"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const EMPTY = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch("/api/account/addresses").then((r) => r.json()).then(setAddresses);
  }

  useEffect(refresh, []);

  async function submit() {
    setSaving(true);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Address saved");
      setForm(EMPTY);
      setShowForm(false);
      refresh();
    } else {
      toast.error("Please check the address details");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase">Addresses</h1>
        <button onClick={() => setShowForm((s) => !s)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {showForm ? "Cancel" : "+ Add Address"}
        </button>
      </div>

      {showForm && (
        <div className="border-ink-200 mb-6 grid gap-3 border p-4 sm:grid-cols-2">
          <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="border-ink-200 h-11 border px-3 text-sm" />
          <input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="border-ink-200 h-11 border px-3 text-sm" />
          <input placeholder="Address line 1" value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
          <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
          <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm" />
          <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm" />
          <button onClick={submit} disabled={saving} className={cn(buttonVariants({ variant: "primary", size: "md" }), "sm:col-span-2")}>
            {saving ? "Saving..." : "Save Address"}
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="border-ink-100 border p-4 text-sm">
            <p className="font-semibold">
              {a.fullName} {a.isDefault && <span className="text-ink-400 font-normal">(Default)</span>}
            </p>
            <p className="text-ink-400">
              {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
              {a.city}, {a.state} - {a.pincode} · {a.phone}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
