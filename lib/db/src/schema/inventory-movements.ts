import { createInsertSchema } from "drizzle-zod";
import { integer, index, pgEnum, pgTable, serial, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["purchase", "sale"]);

export const inventoryMovementsTable = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    stockAfter: integer("stock_after").notNull(),
    counterparty: text("counterparty"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productCreatedAtIdx: index("inventory_movements_product_created_at_idx").on(table.productId, table.createdAt),
  }),
);

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertInventoryMovement = typeof inventoryMovementsTable.$inferInsert;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;