import { getCategoryTree, getDistinctColorsAndSizes } from "@/lib/founder/product-catalog";
import { AddProductForm } from "@/components/founder/add-product-form";

export const metadata = { title: "Add Product" };
export const dynamic = "force-dynamic";

export default async function AddProductPage() {
  const [categoryTree, { colors, sizes }] = await Promise.all([getCategoryTree(), getDistinctColorsAndSizes()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black">Add Product</h1>
      <p className="mt-1 text-sm text-white/50">
        Build a product directly — pick colors and sizes, drop in photos per color, assign a category, and it goes
        live under the matching section on the storefront.
      </p>
      <div className="mt-6">
        <AddProductForm categoryTree={categoryTree} suggestedColors={colors} suggestedSizes={sizes} />
      </div>
    </div>
  );
}
