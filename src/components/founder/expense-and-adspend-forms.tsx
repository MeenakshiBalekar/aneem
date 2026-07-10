"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";
import { formatINR } from "@/lib/utils";

interface MiscExpense { id: string; date: string; category: string; amount: number; note: string | null }
interface AdSpendEntry { id: string; platform: string; campaign: string | null; date: string; spend: number }

export function MiscExpenseForm({ initial }: { initial: MiscExpense[] }) {
  const [list, setList] = useState(initial);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "", amount: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.category || !form.amount) return toast.error("Category and amount required");
    setSaving(true);
    const res = await founderFetch("/api/founder/misc-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setList((l) => [{ ...created, amount: Number(created.amount) }, ...l]);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "", amount: "" });
      toast.success("Expense added");
    } else toast.error("Couldn't add expense");
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Misc Expenses</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <input placeholder="Category (e.g. Software)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="h-9 w-40 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="h-9 w-28 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <button onClick={submit} disabled={saving} className="h-9 border border-white/15 px-3 text-xs hover:bg-white/5 disabled:opacity-50">Add</button>
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-white/60">
        {list.map((e) => (
          <li key={e.id} className="flex justify-between border-b border-white/5 py-1">
            <span>{new Date(e.date).toLocaleDateString("en-IN")} — {e.category}</span>
            <span>{formatINR(e.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdSpendForm({ initial }: { initial: AdSpendEntry[] }) {
  const [list, setList] = useState(initial);
  const [form, setForm] = useState({ platform: "META", campaign: "", date: new Date().toISOString().slice(0, 10), spend: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.spend) return toast.error("Spend amount required");
    setSaving(true);
    const res = await founderFetch("/api/founder/ad-spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, spend: Number(form.spend) }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setList((l) => [{ ...created, spend: Number(created.spend) }, ...l]);
      setForm({ platform: "META", campaign: "", date: new Date().toISOString().slice(0, 10), spend: "" });
      toast.success("Ad spend logged");
    } else toast.error("Couldn't log ad spend");
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Ad Spend</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none">
          <option value="META" className="bg-[#0b0d12]">Meta</option>
          <option value="GOOGLE" className="bg-[#0b0d12]">Google</option>
          <option value="OTHER" className="bg-[#0b0d12]">Other</option>
        </select>
        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-9 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <input placeholder="Campaign (optional)" value={form.campaign} onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))} className="h-9 w-36 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <input type="number" placeholder="Spend" value={form.spend} onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))} className="h-9 w-24 border border-white/15 bg-white/5 px-2 text-xs focus:outline-none" />
        <button onClick={submit} disabled={saving} className="h-9 border border-white/15 px-3 text-xs hover:bg-white/5 disabled:opacity-50">Add</button>
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-white/60">
        {list.map((e) => (
          <li key={e.id} className="flex justify-between border-b border-white/5 py-1">
            <span>{new Date(e.date).toLocaleDateString("en-IN")} — {e.platform}{e.campaign ? ` (${e.campaign})` : ""}</span>
            <span>{formatINR(e.spend)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
