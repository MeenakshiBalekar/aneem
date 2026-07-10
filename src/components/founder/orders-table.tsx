import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { getFilteredOrders } from "@/lib/founder/orders-management";

export async function OrdersTable({ orders }: { orders: Awaited<ReturnType<typeof getFilteredOrders>>["orders"] }) {
  if (orders.length === 0) {
    return <p className="py-12 text-center text-sm text-white/40">No orders match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/40">
          <tr>
            <th className="p-3">Order</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Location</th>
            <th className="p-3">Products</th>
            <th className="p-3">Payment</th>
            <th className="p-3">Value</th>
            <th className="p-3">Status</th>
            <th className="p-3">Contact</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5">
              <td className="p-3">
                <Link href={`/founder/orders/${o.id}`} className="font-semibold hover:underline">
                  {o.orderNumber}
                </Link>
                <p className="text-[11px] text-white/30">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
              </td>
              <td className="p-3">
                <p>{o.address.fullName}</p>
                <p className="text-[11px] text-white/40">{o.address.phone}</p>
              </td>
              <td className="p-3 text-white/60">{o.address.city}, {o.address.state}</td>
              <td className="p-3 text-white/60">
                {o.items.map((i) => `${i.product.title} (${i.variant.size})`).join(", ")}
              </td>
              <td className="p-3 text-white/60">{o.paymentMethod}</td>
              <td className="p-3 font-semibold">{formatINR(Number(o.total))}</td>
              <td className="p-3 text-white/60">{o.status.replace(/_/g, " ")}</td>
              <td className="p-3 text-white/60">{o.contactStatus.replace(/_/g, " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
