import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getFounderSession } from "@/lib/founder/session";
import { getOrdersForExport, flattenOrderForExport, type OrderFilters } from "@/lib/founder/orders-management";
import { logFounderAction } from "@/lib/founder/audit";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

export async function GET(req: Request) {
  const session = await getFounderSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const filters: OrderFilters = {
    dateRange: (searchParams.get("dateRange") as OrderFilters["dateRange"]) || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    status: (searchParams.get("status") as OrderFilters["status"]) || undefined,
    paymentMethod: (searchParams.get("paymentMethod") as OrderFilters["paymentMethod"]) || undefined,
    state: searchParams.get("state") || undefined,
    city: searchParams.get("city") || undefined,
    product: searchParams.get("product") || undefined,
    size: searchParams.get("size") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const orders = await getOrdersForExport(filters);
  const rows = orders.map(flattenOrderForExport);

  await logFounderAction({
    founderUserId: session.user.id,
    action: "orders.exported",
    metadata: { format, count: rows.length, filters: JSON.parse(JSON.stringify(filters)) },
  });

  const filename = `aneem-orders-${new Date().toISOString().slice(0, 10)}`;

  if (format === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
