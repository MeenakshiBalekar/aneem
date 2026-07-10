import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My Orders", robots: { index: false } };

const STATUS_VARIANT: Record<string, "default" | "accent" | "outline" | "danger"> = {
  DELIVERED: "accent",
  SHIPPED: "default",
  CANCELLED: "danger",
  PAYMENT_FAILED: "danger",
};

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    include: { items: { include: { product: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black uppercase">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="text-ink-400 text-sm">You haven&apos;t placed any orders yet.</p>
      ) : (
        <ul className="divide-ink-100 divide-y">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/account/orders/${o.id}`} className="font-semibold underline">
                    {o.orderNumber}
                  </Link>
                  <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>{o.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-ink-400 text-xs">
                  {o.items[0]?.product.title}
                  {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""} ·{" "}
                  {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="font-bold">{formatINR(Number(o.total))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
