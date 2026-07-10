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

function stripStyleCode(categoryName: string): string {
  // Real sheets pack a style code onto the category, e.g. "V Neck T-Shirt |
  // UV34" — that code still matters for grouping (two different codes are
  // two different designs) but reads badly as a product title.
  return categoryName.replace(/\s*\|\s*\S+\s*$/, "").trim();
}

const GENDER_SYNONYMS: Record<string, string[]> = {
  male: ["male", "men", "mens", "man"],
  female: ["female", "women", "womens", "woman"],
  unisex: ["unisex"],
  kids: ["kids", "kid", "boy", "boys", "girl", "girls", "children"],
};

function categoryAlreadyStatesGender(genderName: string, category: string): boolean {
  const g = genderName.trim().toLowerCase();
  const catLower = category.toLowerCase();
  const bucket = Object.values(GENDER_SYNONYMS).find((list) => list.includes(g)) ?? [g];
  return bucket.some((word) => catLower.includes(word));
}

/** Real sheets don't carry a separate product-title column — Category Name
 * plus Gender Name is the only style-level text available (Product
 * Description embeds color/size per row, see grouping note below), so this
 * is what a freshly imported product is titled until the founder edits it
 * (or generates a real one via the AI Marketing Studio). */
function deriveGroupTitle(genderName: string, categoryName: string): string {
  const clean = stripStyleCode(categoryName) || categoryName.trim();
  if (categoryAlreadyStatesGender(genderName, clean)) return clean;
  return `${genderName.trim()} ${clean}`.trim() || "Untitled Product";
}

/** Tries a recognized garment size code first (S/M/L/XL/...); falls back to
 * whatever trails the SKU's last "-" so non-apparel items (mouse pad
 * shapes, mug color-in-SKU variants, etc — none of which use S/M/L) still
 * get a value that actually differs between variants of the same color.
 * ProductVariant's (productId, size, color) uniqueness depends on this not
 * collapsing distinct SKUs onto the same label. */
function parseSizeFromSku(sku: string): string | null {
  const match = sku.match(SIZE_SUFFIX_RE);
  if (match) return match[1].toUpperCase();
  const parts = sku.split("-");
  const tail = parts.length > 1 ? parts[parts.length - 1].trim() : "";
  return tail || null;
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
  const rowsAoA: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Real exports sometimes have a title/sheet-name cell above the actual
  // header row (e.g. row 1 = "sku_descriptions", row 2 = the real headers),
  // so scan for whichever row has at least two recognizable column names
  // instead of assuming row 1 is always it.
  const headerRowIndex = rowsAoA.findIndex(
    (row) => row.filter((cell) => HEADER_ALIASES[normalizeHeader(String(cell))]).length >= 2,
  );
  if (headerRowIndex === -1) {
    throw new Error(
      'Couldn\'t find a header row — expected column names like "SKU", "Category Name", "Base Price" somewhere near the top of the sheet.',
    );
  }
  const headerRow = rowsAoA[headerRowIndex];
  const headerByIndex = headerRow.map((cell) => HEADER_ALIASES[normalizeHeader(String(cell))] ?? null);
  const dataRows = rowsAoA.slice(headerRowIndex + 1);

  const rowErrors: CatalogImportRowError[] = [];
  const rows: CatalogImportRow[] = [];
  const seenSkus = new Map<string, number>();
  const duplicateSkus = new Set<string>();

  dataRows.forEach((cells, i) => {
    if (cells.every((cell) => String(cell).trim() === "")) return; // blank row, not an error

    const rowNumber = headerRowIndex + 2 + i;
    const fields: Record<string, unknown> = {};
    headerByIndex.forEach((canonical, colIndex) => {
      if (canonical) fields[canonical] = cells[colIndex];
    });

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
    const genderName = String(fields.genderName ?? "").trim() || "Unisex";
    const categoryName = String(fields.categoryName ?? "").trim();
    const title = String(fields.title ?? "").trim() || deriveGroupTitle(genderName, categoryName);
    const colorName = String(fields.colorName ?? "").trim();

    let size = String(fields.size ?? "").trim();
    if (!size) {
      size = parseSizeFromSku(sku) ?? "";
      if (!size) {
        size = "One Size";
        warnings.push("No size column and no distinguishing suffix on the SKU — defaulted to \"One Size\"");
      }
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
    // Grouped by (gender, category) only — Product Description embeds
    // color/size per row in real exports ("Male V Neck T-Shirt | UV34
    // Black S"), so it can't be part of the key without splitting every
    // color/size into its own single-SKU "product". Category Name already
    // carries a style code when one exists (e.g. "V Neck T-Shirt | UV34"),
    // which is what actually distinguishes two designs of the same type.
    const productKey = slugify(`${row.genderName}-${row.categoryName}`) || slugify(row.sku);
    let group = groups.get(productKey);
    if (!group) {
      const title = row.title;
      const styleCode = row.categoryName.match(/\|\s*(\S+)\s*$/)?.[1];
      group = {
        productKey,
        title,
        description: styleCode ? `${title} (style ${styleCode})` : title,
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
    totalRows: dataRows.length,
    importedRows: cleanRows.length,
    rowErrors,
    duplicateSkus: Array.from(duplicateSkus),
  };
}

export { PARENT_CATEGORIES };
