import { prisma } from "@/lib/prisma";
import { getCostSettings } from "@/lib/founder/profit-engine";
import { CostSettingsForm } from "@/components/founder/cost-settings-form";
import { ProductCostTable } from "@/components/founder/product-cost-table";
import { MiscExpenseForm, AdSpendForm } from "@/components/founder/expense-and-adspend-forms";

export const metadata = { title: "Cost Settings" };
export const dynamic = "force-dynamic";

export default async function CostSettingsPage() {
  const [settings, products, costs, miscExpenses, adSpend] = await Promise.all([
    getCostSettings(),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.productCost.findMany(),
    prisma.miscExpense.findMany({ orderBy: { date: "desc" }, take: 50 }),
    prisma.adSpend.findMany({ orderBy: { date: "desc" }, take: 50 }),
  ]);

  const costMap = new Map(costs.map((c) => [c.productId, c]));
  const productRows = products.map((p) => ({
    productId: p.id,
    title: p.title,
    productCost: Number(costMap.get(p.id)?.productCost ?? 0),
    printingCost: Number(costMap.get(p.id)?.printingCost ?? 0),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-black">Cost Settings</h1>
      <p className="text-sm text-white/50">
        These figures drive every profit calculation across the Founder Portal. Set them once, update as your costs
        change.
      </p>

      <CostSettingsForm
        initial={{
          defaultShippingCost: Number(settings.defaultShippingCost),
          defaultPackagingCost: Number(settings.defaultPackagingCost),
          gatewayFeePercent: Number(settings.gatewayFeePercent),
          gstPercent: Number(settings.gstPercent),
        }}
      />

      <ProductCostTable rows={productRows} />

      <div className="grid gap-6 md:grid-cols-2">
        <MiscExpenseForm initial={miscExpenses.map((e) => ({ ...e, date: e.date.toISOString(), amount: Number(e.amount) }))} />
        <AdSpendForm initial={adSpend.map((e) => ({ ...e, date: e.date.toISOString(), spend: Number(e.spend) }))} />
      </div>
    </div>
  );
}
