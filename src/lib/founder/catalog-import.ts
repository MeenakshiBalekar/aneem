import "server-only";
import * as XLSX from "xlsx";
import { slugify } from "@/lib/utils";
import { PARENT_CATEGORIES, CATEGORY_MAP, type ParentCategoryKey } from "@/lib/qikink/category-map";

// Parses a founder-uploaded catalog spreadsheet (CSV or XLSX export of the
// real SKU master — no such export exists via Qikink's API, only their
// dashboard, see .env.example) into Product + ProductVariant groups.
//
// One row = one SKU = one ProductVariant. Rows are grouped into a Product by
// (gender, category, description) — real POD catalog exports repeat the same
// style-level description across every size/color of one design, so that
// triple is a stable grouping key without needing an explicit style code
// column.

const HEADER_ALIASES: Record<string, string> = {
  sku: "sku",
  "gender name": "genderName",
  gender: "genderName",
  "category name": "categoryName",
  category: "categoryName",
  "color name": "colorName",
  color: "colorName",
  colour: "colorName",
  "colour name": "colorName",
  size: "size",
  "product description": "description",
  description: "description",
  "product name": "title",
  title: "title",
  "style name": "title",
  "base price": "basePrice",
  price: "basePrice",
  "selling price": "basePrice",
  "shipping weight": "shippingWeight",
  "shipping weight g": "shippingWeight",
  "shipping weight grams": "shippingWeight",
  weight: "shippingWeight",
  "tax rate": "taxRatePercent",
  "tax rate %": "taxRatePercent",
  "gst": "taxRatePercent",
  "gst %": "taxRatePercent",
  "tax %": "taxRatePercent",
};

const REQUIRED_FIELDS = ["sku", "categoryName", "basePrice"] as const;

const SIZE_SUFFIX_RE = /-(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl)$/i;

const ACCESSORY_KEYWORDS = ["cap", "bottle", "tumbler", "bag", "sock", "mug", "accessor", "belt", "wallet"];

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function deriveTitle(description: string): string {
  const firstSentence = description.split(/[.\n]/)[0]?.trim() ?? "";
  const candidate = firstSentence.length > 0 && firstSentence.length <= 90 ? firstSentence : description.slice(0, 90).trim();
  return candidate || "Untitled Product";
}

function parseSizeFromSku(sku: string): string | null {
  const match = sku.match(SIZE_SUFFIX_RE);
  return match ? match[1].toUpperCase() : null;
}

/** Maps a (gender, category) pair from the sheet onto our Men/Women/
 * Accessories/Kids taxonomy. Checks the shared CATEGORY_MAP first (same
 * table the Qikink sync fallback uses) so a category that's already known
 * lands in the exact same place; anything new falls back to a slug derived
 * from the sheet's own text plus a keyword/gender-based parent guess. */
export function resolveCategory(genderName: string, categoryName: string): { slug: string; name: string; parentKey: ParentCategoryKey } {
  const gender = genderName.trim();
  const category = categoryName.trim();

  const candidates = [category, `${gender}'s ${category}`.trim()];
  for (const candidate of candidates) {
    const mapped = CATEGORY_MAP[candidate];
    if (mapped) return { slug: mapped.slug, name: category, parentKey: mapped.parent ?? "accessories" };
  }

  const g = gender.toLowerCase();
  let parentKey: ParentCategoryKey;
  if (g.startsWith("kid") || g.startsWith("boy") || g.startsWith("girl") || g === "children") {
    parentKey = "kids";
  } else if (g.startsWith("wom") || g === "female" || g === "girl" || g === "girls") {
    parentKey = "women";
  } else if (g.startsWith("men") || g === "male") {
    parentKey = "men";
  } else if (ACCESSORY_KEYWORDS.some((k) => category.toLowerCase().includes(k))) {
    parentKey = "accessories";
  } else {
    parentKey = "men"; // unisex apparel default — matches how Hoodies/Jackets/Sweatshirts are mapped in CATEGORY_MAP
  }

  return { slug: slugify(`${parentKey}-${category}`), name: category, parentKey };
}

export interface CatalogImportRow {
  rowNumber: number;
  sku: string;
  title: string;
  description: string;
  genderName: string;
  categoryName: string;
  colorName: string;
  size: string;
  basePrice: number;
  shippingWeightGrams: number | null;
  taxRatePercent: number | null;
  warnings: string[];
}

export interface CatalogImportRowError {
  rowNumber: number;
  sku?: string;
  errors: string[];
}

export interface CatalogImportProductGroup {
  productKey: string; // slug-safe grouping key, becomes qikinkProductId as `csv:${productKey}`
  title: string;
  description: string;
  genderName: string;
  categoryName: string;
  basePrice: number;
  rows: CatalogImportRow[];
}

export interface CatalogImportParseResult {
  groups: CatalogImportProductGroup[];
  totalRows: number;
  importedRows: number;
  rowErrors: CatalogImportRowError[];
  duplicateSkus: string[];
}

/** Reads an uploaded workbook (xlsx or csv — SheetJS handles both from the
 * same buffer) and produces validated, grouped rows. Never touches the
 * database — callers decide whether to just show this as a preview or
 * commit it. */
export function parseCatalogWorkbook(buffer: Buffer): CatalogImportParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const rowErrors: CatalogImportRowError[] = [];
  const rows: CatalogImportRow[] = [];
  const seenSkus = new Map<string, number>();
  const duplicateSkus = new Set<string>();

  raw.forEach((record, i) => {
    const rowNumber = i + 2; // header is row 1
    const fields: Record<string, unknown> = {};
    for (const [header, value] of Object.entries(record)) {
      const canonical = HEADER_ALIASES[normalizeHeader(header)];
      if (canonical) fields[canonical] = value;
    }

    const errors: string[] = [];
    for (const required of REQUIRED_FIELDS) {
      if (fields[required] === undefined || String(fields[required]).trim() === "") {
        errors.push(`Missing required column "${required}"`);
      }
    }

    const sku = String(fields.sku ?? "").trim();
    const basePrice = parseNumber(fields.basePrice);
    if (fields.basePrice !== undefined && String(fields.basePrice).trim() !== "" && basePrice === null) {
      errors.push(`Base price "${fields.basePrice}" isn't a number`);
    }

    if (errors.length > 0) {
      rowErrors.push({ rowNumber, sku: sku || undefined, errors });
      return;
    }

    if (sku) {
      const prevRow = seenSkus.get(sku);
      if (prevRow !== undefined) duplicateSkus.add(sku);
      seenSkus.set(sku, rowNumber);
    }

    const warnings: string[] = [];
    const description = String(fields.description ?? "").trim() || sku;
    const title = String(fields.title ?? "").trim() || deriveTitle(description);
    const genderName = String(fields.genderName ?? "").trim() || "Unisex";
    const categoryName = String(fields.categoryName ?? "").trim();
    const colorName = String(fields.colorName ?? "").trim();

    let size = String(fields.size ?? "").trim();
    if (!size) {
      size = parseSizeFromSku(sku) ?? "One Size";
      if (size === "One Size") warnings.push("No size column and none parseable from SKU — defaulted to \"One Size\"");
    }

    const shippingWeightGrams = parseNumber(fields.shippingWeight);
    if (fields.shippingWeight !== undefined && String(fields.shippingWeight).trim() !== "" && shippingWeightGrams === null) {
      warnings.push(`Shipping weight "${fields.shippingWeight}" isn't a number — ignored`);
    }

    const taxRatePercent = parseNumber(fields.taxRatePercent);
    if (fields.taxRatePercent !== undefined && String(fields.taxRatePercent).trim() !== "" && taxRatePercent === null) {
      warnings.push(`Tax rate "${fields.taxRatePercent}" isn't a number — ignored`);
    }

    rows.push({
      rowNumber,
      sku,
      title,
      description,
      genderName,
      categoryName,
      colorName,
      size,
      basePrice: basePrice as number,
      shippingWeightGrams,
      taxRatePercent,
      warnings,
    });
  });

  // Drop duplicate-SKU rows entirely rather than silently letting the last
  // one win — a repeated SKU almost always means the source sheet has a
  // real data problem, and ProductVariant.sku is a unique DB constraint
  // anyway so only one could ever be kept.
  const cleanRows = rows.filter((r) => {
    if (duplicateSkus.has(r.sku)) {
      rowErrors.push({ rowNumber: r.rowNumber, sku: r.sku, errors: [`Duplicate SKU "${r.sku}" appears more than once in the sheet`] });
      return false;
    }
    return true;
  });

  const groups = new Map<string, CatalogImportProductGroup>();
  for (const row of cleanRows) {
    const productKey = slugify(`${row.genderName}-${row.categoryName}-${row.description}`) || slugify(row.sku);
    let group = groups.get(productKey);
    if (!group) {
      group = {
        productKey,
        title: row.title,
        description: row.description,
        genderName: row.genderName,
        categoryName: row.categoryName,
        basePrice: row.basePrice,
        rows: [],
      };
      groups.set(productKey, group);
    }
    group.basePrice = Math.min(group.basePrice, row.basePrice);
    group.rows.push(row);
  }

  return {
    groups: Array.from(groups.values()),
    totalRows: raw.length,
    importedRows: cleanRows.length,
    rowErrors,
    duplicateSkus: Array.from(duplicateSkus),
  };
}

export { PARENT_CATEGORIES };
