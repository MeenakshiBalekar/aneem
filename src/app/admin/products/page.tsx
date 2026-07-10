import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SyncNowButton } from "@/components/admin/sync-now-button";

export const metadata = { title: "Products", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase">Products ({products.length})</h1>
        <SyncNowButton />
      </div>

      <div className="overflow-x-auto border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-ink-100 border-b bg-paper text-xs uppercase text-ink-400">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Sync</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
                <tr key={p.id} className="border-ink-100 border-b">
                  <td className="flex items-center gap-3 p-3">
                    <div className="relative h-10 w-8 shrink-0 overflow-hidden bg-ink-50">
                      {p.images[0] && <Image src={p.images[0].url} alt={p.title} fill sizes="40px" className="object-cover" />}
                    </div>
                    {p.title}
                  </td>
                  <td className="p-3 text-ink-400">{p.category?.name ?? "Uncategorized"}</td>
                  <td className="p-3">{formatINR(Number(p.basePrice))}</td>
                  <td className="p-3">{totalStock}</td>
                  <td className="p-3">
                    <Badge variant={p.syncStatus === "SYNCED" ? "accent" : p.syncStatus === "ERROR" ? "danger" : "outline"}>
                      {p.syncStatus}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
