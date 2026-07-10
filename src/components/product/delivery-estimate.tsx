"use client";

import { useState } from "react";
import { Truck } from "lucide-react";

export function DeliveryEstimate() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  function check() {
    if (!/^\d{6}$/.test(pincode)) {
      setResult("Enter a valid 6-digit pincode");
      return;
    }
    const days = 3 + (parseInt(pincode[0], 10) % 4);
    const date = new Date();
    date.setDate(date.getDate() + days);
    setResult(`Delivery by ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`);
  }

  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Truck size={14} /> Check Delivery Estimate
      </label>
      <div className="flex gap-2">
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter pincode"
          className="border-ink-200 h-10 flex-1 border px-3 text-sm focus:outline-none"
        />
        <button onClick={check} className="border-ink bg-ink h-10 px-4 text-xs font-bold uppercase text-white">
          Check
        </button>
      </div>
      {result && <p className="text-ink-600 mt-2 text-xs">{result}</p>}
    </div>
  );
}
