import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or generated local user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Inventory Manager'), // 'Inventory Manager' | 'Warehouse Staff'
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// OTP Codes for password reset and authentication
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Warehouses
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  shortCode: text('short_code').notNull().unique(), // e.g. "WH", "CENTRAL"
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Locations inside warehouses or virtual partners
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  name: text('name').notNull(), // e.g. "WH/Stock1", "Production Rack", "Rack A", "Customer/Out"
  shortCode: text('short_code').notNull(), // e.g. "Stock1", "Rack-A"
  locationType: text('location_type').notNull().default('internal'), // 'internal' | 'vendor' | 'customer' | 'production' | 'inventory_loss'
  createdAt: timestamp('created_at').defaultNow(),
});

// Product Categories
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  categoryId: integer('category_id').references(() => productCategories.id),
  uom: text('uom').notNull().default('Units'), // 'Units', 'kg', 'm', 'box'
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }).default('0.00'),
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }).default('0.00'),
  minReorderLevel: integer('min_reorder_level').default(10),
  reorderQty: integer('reorder_qty').default(50),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Stock Levels per product per location
export const stockLevels = pgTable('stock_levels', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  onHand: integer('on_hand').notNull().default(0),
  reserved: integer('reserved').notNull().default(0), // reserved for waiting/ready delivery orders
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory Operations (Receipts, Delivery, Internal, Adjustments)
export const operations = pgTable('operations', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(), // e.g. "WH/IN/0001", "WH/OUT/0001", "WH/INT/0001"
  operationType: text('operation_type').notNull(), // 'receipt' | 'delivery' | 'internal' | 'adjustment'
  status: text('status').notNull().default('draft'), // 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
  contact: text('contact'), // Vendor or Customer name (e.g. "Azure Interior", "Deco Addict")
  sourceLocationId: integer('source_location_id').references(() => locations.id),
  destLocationId: integer('dest_location_id').references(() => locations.id),
  scheduledDate: text('scheduled_date'), // YYYY-MM-DD
  responsible: text('responsible'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Operation Line items
export const operationLines = pgTable('operation_lines', {
  id: serial('id').primaryKey(),
  operationId: integer('operation_id').notNull().references(() => operations.id),
  productId: integer('product_id').notNull().references(() => products.id),
  demandQty: integer('demand_qty').notNull(),
  doneQty: integer('done_qty').notNull().default(0),
});

// Stock Ledger (Move History)
export const stockLedger = pgTable('stock_ledger', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull(),
  operationType: text('operation_type').notNull(), // 'receipt' | 'delivery' | 'internal' | 'adjustment'
  productId: integer('product_id').notNull().references(() => products.id),
  fromLocation: text('from_location').notNull(),
  toLocation: text('to_location').notNull(),
  contact: text('contact'),
  quantity: integer('quantity').notNull(),
  status: text('status').notNull().default('done'),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  stockLevels: many(stockLevels),
  operationLines: many(operationLines),
  stockLedger: many(stockLedger),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  product: one(products, {
    fields: [stockLevels.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stockLevels.locationId],
    references: [locations.id],
  }),
}));

export const operationsRelations = relations(operations, ({ one, many }) => ({
  sourceLocation: one(locations, {
    fields: [operations.sourceLocationId],
    references: [locations.id],
    relationName: 'sourceLocation',
  }),
  destLocation: one(locations, {
    fields: [operations.destLocationId],
    references: [locations.id],
    relationName: 'destLocation',
  }),
  lines: many(operationLines),
}));

export const operationLinesRelations = relations(operationLines, ({ one }) => ({
  operation: one(operations, {
    fields: [operationLines.operationId],
    references: [operations.id],
  }),
  product: one(products, {
    fields: [operationLines.productId],
    references: [products.id],
  }),
}));

export const stockLedgerRelations = relations(stockLedger, ({ one }) => ({
  product: one(products, {
    fields: [stockLedger.productId],
    references: [products.id],
  }),
}));
