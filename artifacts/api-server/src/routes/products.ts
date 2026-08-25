import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  GetProductSummaryResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const MAX_IMAGE_LENGTH = 1_400_000;

function hasValidImage(imageUrl: string | null | undefined) {
  return imageUrl == null || (imageUrl.startsWith("data:image/") && imageUrl.length <= MAX_IMAGE_LENGTH);
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filters = [];
  if (parsed.data.search) {
    filters.push(ilike(productsTable.name, `%${parsed.data.search}%`));
  }
  if (parsed.data.category) {
    filters.push(eq(productsTable.category, parsed.data.category));
  }
  const products = await db
    .select()
    .from(productsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(productsTable.name));
  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!Number.isInteger(parsed.data.stock)) {
    res.status(400).json({ error: "La existencia debe ser un número entero" });
    return;
  }
  if (!hasValidImage(parsed.data.imageUrl)) {
    res.status(400).json({ error: "La imagen debe ser JPG, PNG o WebP y pesar menos de 1 MB" });
    return;
  }
  try {
    const [product] = await db.insert(productsTable).values(parsed.data).returning();
    res.status(201).json(CreateProductResponse.parse(product));
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      res.status(409).json({ error: "El SKU ya está registrado" });
      return;
    }
    throw error;
  }
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.stock !== undefined && !Number.isInteger(parsed.data.stock)) {
    res.status(400).json({ error: "La existencia debe ser un número entero" });
    return;
  }
  if (!hasValidImage(parsed.data.imageUrl)) {
    res.status(400).json({ error: "La imagen debe ser JPG, PNG o WebP y pesar menos de 1 MB" });
    return;
  }
  const [product] = await db
    .update(productsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.sendStatus(204);
});

router.get("/products/summary", async (_req, res): Promise<void> => {
  const [summary] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      totalUnits: sql<number>`coalesce(sum(${productsTable.stock}), 0)::int`,
      inventoryValue: sql<number>`coalesce(sum(${productsTable.costPrice} * ${productsTable.stock}), 0)::float8`,
      projectedProfit: sql<number>`coalesce(sum((${productsTable.salePrice} - ${productsTable.costPrice}) * ${productsTable.stock}), 0)::float8`,
      lowStockCount: sql<number>`count(*) filter (where ${productsTable.stock} <= 5)::int`,
      categories: sql<number>`count(distinct ${productsTable.category})::int`,
    })
    .from(productsTable);
  res.json(GetProductSummaryResponse.parse(summary));
});

export default router;