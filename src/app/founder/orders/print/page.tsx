import { redirect } from "next/navigation";
import { getFounderSession } from "@/lib/founder/session";
import { getOrdersForExport, flattenOrderForExport, type OrderFilters } from "@/lib/founder/orders-management";
import { formatINR } from "@/lib/utils";
import { PrintButton } from "@/components/founder/print-button";

export const metadata = { title: "Orders — Print View" };
export const dynamic = "force-dynamic";

// Deliberately outside the (portal) layout — no sidebar, no dark theme,
// just a clean light printable table. "Export PDF" = print this to PDF via
// the browser's native print dialog rather than a server-side PDF renderer,
// which avoids pulling in a heavy binary dependency for one export format.
export default async function OrdersPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getFounderSession();
  if (!session?.user) redirect("/founder/login");

  const sp = await searchParams;
  const filters: OrderFilters = {
    dateRange: (sp.dateRange as OrderFilters["dateRange"]) || undefined,
    from: sp.from,
    to: sp.to,
    status: (sp.status as OrderFilters["status"]) || undefined,
    paymentMethod: (sp.paymentMethod as OrderFilters["paymentMethod"]) || undefined,
    state: sp.state || undefined,
    city: sp.city || undefined,
    product: sp.product || undefined,
    size: sp.size || undefined,
    search: sp.search || undefined,
  };

  const orders = await getOrdersForExport(filters);
  const rows = orders.map(flattenOrderForExport);
  const total = rows.reduce((s, r) => s + Number(r["Order Value"]), 0);

  return (
    <div className="min-h-screen bg-white p-8 text-black">
      <style>{`@media print { body, html { background: white !important; } }`}</style>
      <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">Aneem — Orders Report</h1>
        <PrintButton />
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        Generated {new Date().toLocaleString("en-IN")} · {rows.length} orders · Total {formatINR(total)}
      </p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black/20 text-left">
            {rows[0] && Object.keys(rows[0]).map((h) => <th key={h} className="p-1.5 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black/10">
              {Object.values(row).map((v, j) => <td key={j} className="p-1.5">{String(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
