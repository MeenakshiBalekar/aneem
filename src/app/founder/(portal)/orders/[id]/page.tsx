import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Order Detail" };
export const dynamic = "force-dynamic";

export default async function FounderOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      address: true,
      user: true,
      items: { include: { product: true, variant: true } },
      callLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black">{order.orderNumber}</h1>
      <p className="text-sm text-white/50">{new Date(order.createdAt).toLocaleString("en-IN")}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Customer</h2>
          <p className="text-sm font-semibold">{order.address.fullName}</p>
          <p className="text-xs text-white/60">{order.address.phone}</p>
          <p className="text-xs text-white/60">{order.user.email}</p>
          <p className="mt-2 text-xs text-white/60">
            {order.address.line1}, {order.address.line2 ? `${order.address.line2}, ` : ""}
            {order.address.city}, {order.address.state} - {order.address.pincode}
          </p>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Order</h2>
          <p className="text-sm">Status: <span className="font-semibold">{order.status.replace(/_/g, " ")}</span></p>
          <p className="text-sm">Payment: <span className="font-semibold">{order.paymentMethod}</span></p>
          <p className="text-sm">Contact: <span className="font-semibold">{order.contactStatus.replace(/_/g, " ")}</span></p>
          {order.trackingNumber && <p className="text-sm">Tracking: <span className="font-semibold">{order.trackingNumber}</span></p>}
        </div>
      </div>

      <div className="mt-6 border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Items</h2>
        <ul className="divide-y divide-white/5">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>{item.product.title} — {item.variant.size}{item.variant.color ? ` / ${item.variant.color}` : ""} × {item.quantity}</span>
              <span className="font-semibold">{formatINR(Number(item.totalPrice))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
          <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{formatINR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between text-white/60"><span>Discount</span><span>-{formatINR(Number(order.discountAmount))}</span></div>
          <div className="flex justify-between text-white/60"><span>Shipping</span><span>{formatINR(Number(order.shippingAmount))}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatINR(Number(order.total))}</span></div>
        </div>
      </div>

      {order.callLogs.length > 0 && (
        <div className="mt-6 border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Call History</h2>
          <ul className="space-y-2">
            {order.callLogs.map((log) => (
              <li key={log.id} className="text-xs text-white/60">
                <span className="font-semibold text-white/80">{log.status.replace(/_/g, " ")}</span> —{" "}
                {new Date(log.createdAt).toLocaleString("en-IN")}
                {log.note && <p className="mt-0.5">{log.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
