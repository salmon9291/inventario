import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, inventoryMovementsTable, productsTable } from "@workspace/db";
import {
  CreateMovementBody,
  CreateMovementResponse,
  ListMovementsQueryParams,
  ListMovementsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

class ProductNotFoundError extends Error {}
class InsufficientStockError extends Error {}

function movementResponse(movement: typeof inventoryMovementsTable.$inferSelect, product: typeof productsTable.$inferSelect) {
  return CreateMovementResponse.parse({
    id: movement.id,
    productId: movement.productId,
    productName: product.name,
    productSku: product.sku,
    type: movement.type,
    quantity: movement.quantity,
    unitPrice: movement.unitPrice,
    total: movement.unitPrice * movement.quantity,
    stockAfter: movement.stockAfter,
    counterparty: movement.counterparty,
    note: movement.note,
    createdAt: movement.createdAt,
  });
}

router.get("/movements", async (req, res): Promise<void> => {
  const parsed = ListMovementsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.productId !== undefined) {
    filters.push(eq(inventoryMovementsTable.productId, parsed.data.productId));
  }
  if (parsed.data.type) {
    filters.push(eq(inventoryMovementsTable.type, parsed.data.type));
  }

  const movements = await db
    .select({
      id: inventoryMovementsTable.id,
      productId: inventoryMovementsTable.productId,
      productName: productsTable.name,
      productSku: productsTable.sku,
      type: inventoryMovementsTable.type,
      quantity: inventoryMovementsTable.quantity,
      unitPrice: inventoryMovementsTable.unitPrice,
      total: sql<number>`${inventoryMovementsTable.unitPrice} * ${inventoryMovementsTable.quantity}`,
      stockAfter: inventoryMovementsTable.stockAfter,
      counterparty: inventoryMovementsTable.counterparty,
      note: inventoryMovementsTable.note,
      createdAt: inventoryMovementsTable.createdAt,
    })
    .from(inventoryMovementsTable)
    .innerJoin(productsTable, eq(productsTable.id, inventoryMovementsTable.productId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(inventoryMovementsTable.createdAt), desc(inventoryMovementsTable.id));

  res.json(ListMovementsResponse.parse(movements));
});

router.post("/movements", async (req, res): Promise<void> => {
  const parsed = CreateMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!Number.isInteger(parsed.data.quantity) || parsed.data.quantity < 1) {
    res.status(400).json({ error: "La cantidad debe ser un número entero mayor a cero" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, parsed.data.productId));
      if (!product) throw new ProductNotFoundError();

      if (parsed.data.type === "sale" && product.stock < parsed.data.quantity) {
        throw new InsufficientStockError();
      }

      const nextStock = parsed.data.type === "purchase"
        ? product.stock + parsed.data.quantity
        : product.stock - parsed.data.quantity;
      const [updatedProduct] = await tx
        .update(productsTable)
        .set({ stock: nextStock, updatedAt: new Date() })
        .where(eq(productsTable.id, product.id))
        .returning();
      const [movement] = await tx
        .insert(inventoryMovementsTable)
        .values({
          productId: product.id,
          type: parsed.data.type,
          quantity: parsed.data.quantity,
          unitPrice: parsed.data.unitPrice,
          stockAfter: nextStock,
          counterparty: parsed.data.counterparty || null,
          note: parsed.data.note || null,
        })
        .returning();

      return movementResponse(movement, updatedProduct);
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    if (error instanceof InsufficientStockError) {
      res.status(400).json({ error: "No hay existencia suficiente para registrar esta venta" });
      return;
    }
    throw error;
  }
});

export default router;