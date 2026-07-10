import { prisma } from "@/lib/prisma";

export const metadata = { title: "Customers", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black uppercase">Customers ({customers.length})</h1>
      <div className="overflow-x-auto border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-ink-100 border-b bg-paper text-xs uppercase text-ink-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Loyalty Points</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-ink-100 border-b">
                <td className="p-3 font-semibold">{c.name ?? "—"}</td>
                <td className="p-3 text-ink-400">{c.email}</td>
                <td className="p-3 text-ink-400">{c.phone ?? "—"}</td>
                <td className="p-3">{c._count.orders}</td>
                <td className="p-3">{c.loyaltyPoints}</td>
                <td className="p-3 text-ink-400">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
