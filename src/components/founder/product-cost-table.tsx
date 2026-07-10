"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";

interface ProductCostRow {
  productId: string;
  title: string;
  productCost: number;
  printingCost: number;
}

function Row({ row }: { row: ProductCostRow }) {
  const [productCost, setProductCost] = useState(row.productCost);
  const [printingCost, setPrintingCost] = useState(row.printingCost);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await founderFetch("/api/founder/product-costs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: row.productId, productCost, printingCost }),
    });
    setSaving(false);
    if (res.ok) toast.success(`${row.title} costs saved`);
    else toast.error("Couldn't save");
  }

  return (
    <tr className="border-b border-white/5">
      <td className="p-2 text-sm">{row.title}</td>
      <td className="p-2">
        <input
          type="number"
          step="0.01"
          value={productCost}
          onChange={(e) => setProductCost(Number(e.target.value))}
          className="h-8 w-24 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          step="0.01"
          value={printingCost}
          onChange={(e) => setPrintingCost(Number(e.target.value))}
          className="h-8 w-24 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none"
        />
      </td>
      <td className="p-2">
        <button onClick={save} disabled={saving} className="border border-white/15 px-2 py-1 text-[11px] hover:bg-white/5 disabled:opacity-50">
          {saving ? "..." : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function ProductCostTable({ rows }: { rows: ProductCostRow[] }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Per-Product Cost (Qikink)</h2>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#0b0d12] text-[10px] uppercase tracking-wide text-white/30">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Product Cost (₹)</th>
              <th className="p-2">Printing Cost (₹)</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => <Row key={r.productId} row={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
