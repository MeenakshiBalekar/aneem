"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Mail, Copy, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { founderFetch } from "@/lib/founder/fetch-client";
import { formatINR, cn } from "@/lib/utils";

export interface CallingQueueOrderView {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  total: number;
  contactStatus: string;
  contactAttempts: number;
  nextFollowUpAt: string | null;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { title: string; size: string; color: string | null; quantity: number }[];
  lastNote: string | null;
  lastAttemptAt: string | null;
}

const CONTACT_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CALLBACK_REQUESTED", label: "Requested Callback" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "WRONG_NUMBER", label: "Wrong Number" },
  { value: "CANCELLED_BY_CUSTOMER", label: "Cancelled by Customer" },
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-white/50",
  CONTACTED: "text-blue-400",
  CONFIRMED: "text-emerald-400",
  CALLBACK_REQUESTED: "text-orange-400",
  NO_RESPONSE: "text-red-400",
  WRONG_NUMBER: "text-red-400",
  CANCELLED_BY_CUSTOMER: "text-white/40",
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export function CallingQueueCard({ order }: { order: CallingQueueOrderView }) {
  const [status, setStatus] = useState(order.contactStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(nextStatus: string, nextNote?: string) {
    setSaving(true);
    const res = await founderFetch(`/api/founder/orders/${order.id}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note: nextNote }),
    });
    setSaving(false);
    if (!res.ok) toast.error("Couldn't save — try again");
  }

  function onStatusChange(value: string) {
    setStatus(value);
    save(value, note || undefined);
  }

  function onNoteChange(value: string) {
    setNote(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(status, value), 900);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const whatsappNumber = order.phone.replace(/\D/g, "");
  const fullAddress = `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="font-bold">{order.orderNumber}</p>
          <p className="text-xs text-white/40">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{formatINR(order.total)}</p>
          <p className="text-xs text-white/40">
            {order.paymentMethod} · {order.status.replace(/_/g, " ")}
          </p>
          {order.nextFollowUpAt && (
            <p className="mt-1 text-xs font-semibold text-orange-400">
              Follow up: {new Date(order.nextFollowUpAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 py-3 md:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/30">Customer</p>
          <p className="text-sm font-semibold">{order.customerName}</p>
          <p className="text-xs text-white/50">{order.phone}</p>
          <p className="text-xs text-white/50">{order.customerEmail}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/30">Address</p>
          <p className="text-xs text-white/60">{fullAddress}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/30">Products</p>
          <ul className="text-xs text-white/60">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.title} — {item.size}
                {item.color ? ` / ${item.color}` : ""} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Phone size={12} /> Call
        </a>
        <a href={`mailto:${order.customerEmail}`} className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Mail size={12} /> Email
        </a>
        <a
          href={`https://wa.me/91${whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5"
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
        <button onClick={() => copyToClipboard(order.phone, "Phone")} className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Copy size={12} /> Phone
        </button>
        <button onClick={() => copyToClipboard(fullAddress, "Address")} className="flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5">
          <Copy size={12} /> Address
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[200px_1fr]">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Contact Status</label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={cn(
              "h-9 w-full border border-white/15 bg-white/5 px-2 text-xs focus:outline-none",
              STATUS_COLOR[status],
            )}
          >
            {CONTACT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0b0d12] text-white">
                {o.label}
              </option>
            ))}
          </select>
          {order.contactAttempts > 0 && <p className="mt-1 text-[10px] text-white/30">{order.contactAttempts} attempt(s)</p>}
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">
            Comments {saving && <span className="text-white/20">saving…</span>}
          </label>
          <textarea
            defaultValue={order.lastNote ?? ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder='e.g. "Asked to deliver after Friday."'
            rows={1}
            className="h-9 w-full resize-none border border-white/15 bg-white/5 px-2 py-1.5 text-xs focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
