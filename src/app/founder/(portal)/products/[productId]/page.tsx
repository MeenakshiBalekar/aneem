import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCategoryTree } from "@/lib/founder/product-catalog";
import { ProductEditForm } from "@/components/founder/product-edit-form";

export const metadata = { title: "Edit Product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  const [product, categoryTree] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true } },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    }),
    getCategoryTree(),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/founder/products" className="mb-4 flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ArrowLeft size={14} /> All products
      </Link>

      <ProductEditForm
        categoryTree={categoryTree}
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          categoryId: product.categoryId,
          basePrice: Number(product.basePrice),
          compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
          isActive: product.isActive,
          tags: product.tags,
          qikinkProductId: product.qikinkProductId,
          images: product.images.map((img) => ({ id: img.id, url: img.url, color: img.color })),
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            price: Number(v.price),
            stock: v.stock,
          })),
        }}
      />
    </div>
  );
}
