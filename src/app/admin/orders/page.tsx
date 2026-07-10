import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    include: { user: true, address: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses = ["PENDING_PAYMENT", "PAID", "COD_CONFIRMED", "SENT_TO_QIKINK", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black uppercase">Orders ({orders.length})</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`px-3 py-1.5 text-xs font-bold uppercase ${!status ? "bg-ink text-white" : "border border-ink-200"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`px-3 py-1.5 text-xs font-bold uppercase ${status === s ? "bg-ink text-white" : "border border-ink-200"}`}>
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-ink-100 border-b bg-paper text-xs uppercase text-ink-400">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">State</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-ink-100 border-b">
                <td className="p-3 font-semibold">{o.orderNumber}</td>
                <td className="p-3">{o.user.name ?? o.user.email}</td>
                <td className="p-3 text-ink-400">{o.address.state}</td>
                <td className="p-3">{formatINR(Number(o.total))}</td>
                <td className="p-3 text-ink-400">{o.paymentMethod}</td>
                <td className="p-3">
                  <Badge variant={o.status === "DELIVERED" ? "accent" : o.status === "CANCELLED" ? "danger" : "outline"}>
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="p-3 text-ink-400">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
