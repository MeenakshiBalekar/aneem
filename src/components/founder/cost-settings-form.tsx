"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";

interface Settings {
  defaultShippingCost: number;
  defaultPackagingCost: number;
  gatewayFeePercent: number;
  gstPercent: number;
}

export function CostSettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await founderFetch("/api/founder/cost-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (res.ok) toast.success("Cost settings saved");
    else toast.error("Couldn't save");
  }

  const field = (key: keyof Settings, label: string, suffix = "₹") => (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-white/40">{suffix}</span>
        <input
          type="number"
          step="0.01"
          value={values[key]}
          onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
          className="h-9 w-32 border border-white/15 bg-white/5 px-2 text-sm focus:border-white/40 focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Store-wide Cost Settings</h2>
      <div className="flex flex-wrap gap-4">
        {field("defaultShippingCost", "Shipping Cost / Order")}
        {field("defaultPackagingCost", "Packaging Cost / Order")}
        {field("gatewayFeePercent", "Razorpay Gateway Fee", "%")}
        {field("gstPercent", "GST Rate", "%")}
      </div>
      <button onClick={save} disabled={saving} className="bg-accent text-ink mt-4 px-4 py-2 text-xs font-bold uppercase disabled:opacity-50">
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
