import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "My Account", robots: { index: false } };

export default async function AccountOverviewPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [orderCount, lifetimeValue, user, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId, status: { notIn: ["PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED"] } } }),
    prisma.order.aggregate({
      where: { userId, status: { notIn: ["PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED"] } },
      _sum: { total: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black uppercase">Account Overview</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="border-ink-100 border p-4">
          <p className="text-ink-400 text-xs uppercase">Orders</p>
          <p className="text-2xl font-bold">{orderCount}</p>
        </div>
        <div className="border-ink-100 border p-4">
          <p className="text-ink-400 text-xs uppercase">Lifetime Spend</p>
          <p className="text-2xl font-bold">{formatINR(Number(lifetimeValue._sum.total ?? 0))}</p>
        </div>
        <div className="border-ink-100 border p-4">
          <p className="text-ink-400 text-xs uppercase">Loyalty Points</p>
          <p className="text-2xl font-bold">{user?.loyaltyPoints ?? 0}</p>
        </div>
      </div>

      {user?.referralCode && (
        <div className="bg-paper mb-8 p-4 text-sm">
          Your referral code: <span className="font-bold">{user.referralCode}</span> — share it and earn loyalty
          points when friends order (coming soon).
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold uppercase">Recent Orders</h2>
      {recentOrders.length === 0 ? (
        <p className="text-ink-400 text-sm">No orders yet.</p>
      ) : (
        <ul className="divide-ink-100 divide-y">
          {recentOrders.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/account/orders/${o.id}`} className="text-sm font-semibold underline">
                  {o.orderNumber}
                </Link>
                <p className="text-ink-400 text-xs">{o.status.replace(/_/g, " ")}</p>
              </div>
              <span className="text-sm font-bold">{formatINR(Number(o.total))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
