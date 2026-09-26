import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  locations,
  operationLines,
  operations,
  otpCodes,
  productCategories,
  products,
  stockLedger,
  stockLevels,
  users,
  warehouses,
} from './schema.ts';

// ---------------- USER & AUTH QUERIES ----------------
export async function getUserByEmail(email: string) {
  try {
    const res = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw new Error('Database query failed: getUserByEmail', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('Error in getUserByUid:', error);
    throw new Error('Database query failed: getUserByUid', { cause: error });
  }
}

export async function createUser(data: { uid: string; email: string; name: string; role?: string; passwordHash?: string }) {
  try {
    const res = await db.insert(users).values({
      uid: data.uid,
      email: data.email.toLowerCase().trim(),
      name: data.name,
      role: data.role || 'Inventory Manager',
      passwordHash: data.passwordHash || null,
    }).returning();
    return res[0];
  } catch (error) {
    console.error('Error in createUser:', error);
    throw new Error('Database query failed: createUser', { cause: error });
  }
}

export async function updateUserPassword(email: string, passwordHash: string) {
  try {
    const res = await db.update(users)
      .set({ passwordHash })
      .where(eq(users.email, email.toLowerCase().trim()))
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error in updateUserPassword:', error);
    throw new Error('Database query failed: updateUserPassword', { cause: error });
  }
}

// ---------------- OTP QUERIES ----------------
export async function saveOtp(email: string, code: string, expiryMinutes = 10) {
  try {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const res = await db.insert(otpCodes).values({
      email: email.toLowerCase().trim(),
      code,
      expiresAt,
      used: false,
    }).returning();
    return res[0];
  } catch (error) {
    console.error('Error in saveOtp:', error);
    throw new Error('Database query failed: saveOtp', { cause: error });
  }
}

export async function verifyAndMarkOtp(email: string, code: string) {
  try {
    const records = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.email, email.toLowerCase().trim()),
        eq(otpCodes.code, code.trim()),
        eq(otpCodes.used, false)
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!records.length) {
      return { valid: false, message: 'Invalid or already used OTP code' };
    }

    const otpRecord = records[0];
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return { valid: false, message: 'OTP code has expired. Please request a new one.' };
    }

    // Mark as used
    await db.update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, otpRecord.id));

    return { valid: true, otpRecord };
  } catch (error) {
    console.error('Error in verifyAndMarkOtp:', error);
    throw new Error('Database query failed: verifyAndMarkOtp', { cause: error });
  }
}

// ---------------- DASHBOARD QUERIES ----------------
export async function getDashboardStats() {
  try {
    const allProducts = await db.select().from(products);
    const allStock = await db.select().from(stockLevels);
    const allOps = await db.select().from(operations);

    // Calculate aggregated stock per product
    const productStockMap = new Map<number, { onHand: number; reserved: number }>();
    for (const s of allStock) {
      const current = productStockMap.get(s.productId) || { onHand: 0, reserved: 0 };
      productStockMap.set(s.productId, {
        onHand: current.onHand + s.onHand,
        reserved: current.reserved + s.reserved,
      });
    }

    let totalProductsInStock = 0;
    let lowStockCount = 0;

    for (const p of allProducts) {
      const stock = productStockMap.get(p.id) || { onHand: 0, reserved: 0 };
      if (stock.onHand > 0) totalProductsInStock++;
      if (stock.onHand <= (p.minReorderLevel ?? 10)) {
        lowStockCount++;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Receipts breakdown
    const receipts = allOps.filter(o => o.operationType === 'receipt');
    const receiptsToReceive = receipts.filter(o => o.status === 'ready').length;
    const receiptsLate = receipts.filter(o => o.status !== 'done' && o.status !== 'canceled' && o.scheduledDate && o.scheduledDate < todayStr).length;
    const receiptsWaiting = receipts.filter(o => o.status === 'waiting' || o.status === 'draft').length;

    // Deliveries breakdown
    const deliveries = allOps.filter(o => o.operationType === 'delivery');
    const deliveriesToDeliver = deliveries.filter(o => o.status === 'ready').length;
    const deliveriesLate = deliveries.filter(o => o.status !== 'done' && o.status !== 'canceled' && o.scheduledDate && o.scheduledDate < todayStr).length;
    const deliveriesWaiting = deliveries.filter(o => o.status === 'waiting').length;

    // Internal transfers scheduled
    const internalScheduled = allOps.filter(o => o.operationType === 'internal' && o.status !== 'done' && o.status !== 'canceled').length;

    return {
      totalProductsCount: allProducts.length,
      totalProductsInStock,
      lowStockCount,
      receipts: {
        total: receipts.length,
        toReceive: receiptsToReceive,
        late: receiptsLate,
        waiting: receiptsWaiting,
      },
      deliveries: {
        total: deliveries.length,
        toDeliver: deliveriesToDeliver,
        late: deliveriesLate,
        waiting: deliveriesWaiting,
      },
      internalTransfersScheduled: internalScheduled,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    throw new Error('Database query failed: getDashboardStats', { cause: error });
  }
}

// ---------------- PRODUCTS & INVENTORY QUERIES ----------------
export async function getAllProducts() {
  try {
    const prods = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
      uom: products.uom,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      minReorderLevel: products.minReorderLevel,
      reorderQty: products.reorderQty,
      description: products.description,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .orderBy(products.name);

    const levels = await db.select().from(stockLevels);

    return prods.map(p => {
      const pLevels = levels.filter(l => l.productId === p.id);
      const onHand = pLevels.reduce((acc, l) => acc + l.onHand, 0);
      const reserved = pLevels.reduce((acc, l) => acc + l.reserved, 0);
      const freeToUse = Math.max(0, onHand - reserved);
      return {
        ...p,
        onHand,
        reserved,
        freeToUse,
        stockPerLocation: pLevels,
      };
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    throw new Error('Database query failed: getAllProducts', { cause: error });
  }
}

export async function createProductWithStock(data: {
  name: string;
  sku: string;
  categoryId?: number;
  uom: string;
  costPrice?: string;
  salePrice?: string;
  minReorderLevel?: number;
  reorderQty?: number;
  description?: string;
  initialStock?: number;
  initialLocationId?: number;
}) {
  try {
    const inserted = await db.insert(products).values({
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId || null,
      uom: data.uom || 'Units',
      costPrice: data.costPrice || '0.00',
      salePrice: data.salePrice || '0.00',
      minReorderLevel: data.minReorderLevel ?? 10,
      reorderQty: data.reorderQty ?? 50,
      description: data.description || '',
    }).returning();

    const product = inserted[0];

    // If initial stock is given, add to stockLevels and ledger
    if (data.initialStock && data.initialStock > 0 && data.initialLocationId) {
      await db.insert(stockLevels).values({
        productId: product.id,
        locationId: data.initialLocationId,
        onHand: data.initialStock,
        reserved: 0,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      await db.insert(stockLedger).values({
        reference: `INIT/${product.sku}`,
        operationType: 'receipt',
        productId: product.id,
        fromLocation: 'Inventory Initial Setup',
        toLocation: 'WH/Stock1',
        contact: 'System Onboarding',
        quantity: data.initialStock,
        status: 'done',
        date: todayStr,
      });
    }

    return product;
  } catch (error) {
    console.error('Error in createProductWithStock:', error);
    throw new Error('Database query failed: createProductWithStock', { cause: error });
  }
}

export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  try {
    const res = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw new Error('Database query failed: updateProduct', { cause: error });
  }
}

// ---------------- WAREHOUSES & LOCATIONS ----------------
export async function getAllWarehouses() {
  try {
    const whs = await db.select().from(warehouses);
    const locs = await db.select().from(locations);
    return whs.map(w => ({
      ...w,
      locations: locs.filter(l => l.warehouseId === w.id),
    }));
  } catch (error) {
    console.error('Error in getAllWarehouses:', error);
    throw new Error('Database query failed: getAllWarehouses', { cause: error });
  }
}

export async function createWarehouse(data: { name: string; shortCode: string; address?: string }) {
  try {
    const res = await db.insert(warehouses).values(data).returning();
    return res[0];
  } catch (error) {
    console.error('Error in createWarehouse:', error);
    throw new Error('Database query failed: createWarehouse', { cause: error });
  }
}

export async function getAllLocations() {
  try {
    return await db.select({
      id: locations.id,
      name: locations.name,
      shortCode: locations.shortCode,
      locationType: locations.locationType,
      warehouseId: locations.warehouseId,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.shortCode,
    })
    .from(locations)
    .leftJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .orderBy(locations.name);
  } catch (error) {
    console.error('Error in getAllLocations:', error);
    throw new Error('Database query failed: getAllLocations', { cause: error });
  }
}

export async function createLocation(data: { name: string; shortCode: string; warehouseId?: number; locationType?: string }) {
  try {
    const res = await db.insert(locations).values({
      name: data.name,
      shortCode: data.shortCode,
      warehouseId: data.warehouseId || null,
      locationType: data.locationType || 'internal',
    }).returning();
    return res[0];
  } catch (error) {
    console.error('Error in createLocation:', error);
    throw new Error('Database query failed: createLocation', { cause: error });
  }
}

export async function getAllCategories() {
  try {
    return await db.select().from(productCategories).orderBy(productCategories.name);
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    throw new Error('Database query failed: getAllCategories', { cause: error });
  }
}

export async function createCategory(name: string, description?: string) {
  try {
    const res = await db.insert(productCategories).values({ name, description }).returning();
    return res[0];
  } catch (error) {
    console.error('Error in createCategory:', error);
    throw new Error('Database query failed: createCategory', { cause: error });
  }
}

// Helper to parse metadata stored in notes
interface OpMetadata {
  userNotes: string;
  warehouseId?: number | null;
  lineLocations?: Record<number, number>;
  assignedToId?: number | null;
  assignedStaffName?: string | null;
}

function parseOpNotes(rawNotes: string | null): OpMetadata {
  if (!rawNotes) return { userNotes: '' };
  try {
    if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
      const parsed = JSON.parse(rawNotes);
      return {
        userNotes: parsed.userNotes || '',
        warehouseId: parsed.warehouseId || null,
        lineLocations: parsed.lineLocations || {},
        assignedToId: parsed.assignedToId || null,
        assignedStaffName: parsed.assignedStaffName || null,
      };
    }
  } catch (_e) {
    // fallback to plain text
  }
  return { userNotes: rawNotes };
}

// ---------------- OPERATIONS QUERIES ----------------
export async function getAllOperations(type?: string) {
  try {
    let query = db.select({
      id: operations.id,
      reference: operations.reference,
      operationType: operations.operationType,
      status: operations.status,
      contact: operations.contact,
      sourceLocationId: operations.sourceLocationId,
      destLocationId: operations.destLocationId,
      scheduledDate: operations.scheduledDate,
      responsible: operations.responsible,
      notes: operations.notes,
      createdAt: operations.createdAt,
    }).from(operations);

    const ops = type ? await query.where(eq(operations.operationType, type)).orderBy(desc(operations.id)) : await query.orderBy(desc(operations.id));

    const allLines = await db.select({
      id: operationLines.id,
      operationId: operationLines.operationId,
      productId: operationLines.productId,
      productName: products.name,
      productSku: products.sku,
      productUom: products.uom,
      demandQty: operationLines.demandQty,
      doneQty: operationLines.doneQty,
    })
    .from(operationLines)
    .innerJoin(products, eq(operationLines.productId, products.id));

    const locs = await db.select().from(locations);
    const locMap = new Map(locs.map(l => [l.id, l.name]));

    const whs = await db.select().from(warehouses);
    const whMap = new Map(whs.map(w => [w.id, w.name]));

    return ops.map(op => {
      const meta = parseOpNotes(op.notes);
      const opLines = allLines.filter(l => l.operationId === op.id);

      const enhancedLines = opLines.map((l, idx) => {
        const lineLocId = meta.lineLocations?.[idx];
        const destLocId = op.operationType === 'receipt' ? (lineLocId || op.destLocationId) : op.destLocationId;
        const srcLocId = (op.operationType === 'delivery' || op.operationType === 'internal') ? (lineLocId || op.sourceLocationId) : op.sourceLocationId;

        return {
          ...l,
          destLocationId: destLocId || undefined,
          destLocationName: destLocId ? locMap.get(destLocId) || `Location #${destLocId}` : undefined,
          sourceLocationId: srcLocId || undefined,
          sourceLocationName: srcLocId ? locMap.get(srcLocId) || `Location #${srcLocId}` : undefined,
          status: (l.doneQty >= l.demandQty ? 'done' : 'pending') as 'done' | 'pending',
        };
      });

      return {
        ...op,
        warehouseId: meta.warehouseId || undefined,
        warehouseName: meta.warehouseId ? whMap.get(meta.warehouseId) || 'Central Warehouse' : undefined,
        sourceLocationName: op.sourceLocationId ? locMap.get(op.sourceLocationId) || 'Unknown' : 'N/A',
        destLocationName: op.destLocationId ? locMap.get(op.destLocationId) || 'Unknown' : 'N/A',
        notes: meta.userNotes,
        responsible: meta.assignedStaffName || op.responsible || 'Unassigned',
        assignedToId: meta.assignedToId || null,
        assignedStaffName: meta.assignedStaffName || op.responsible || 'Unassigned',
        lines: enhancedLines,
      };
    });
  } catch (error) {
    console.error('Error in getAllOperations:', error);
    throw new Error('Database query failed: getAllOperations', { cause: error });
  }
}

export async function getOperationById(id: number) {
  try {
    const ops = await db.select().from(operations).where(eq(operations.id, id)).limit(1);
    if (!ops.length) return null;
    const op = ops[0];

    const lines = await db.select({
      id: operationLines.id,
      operationId: operationLines.operationId,
      productId: operationLines.productId,
      productName: products.name,
      productSku: products.sku,
      productUom: products.uom,
      costPrice: products.costPrice,
      demandQty: operationLines.demandQty,
      doneQty: operationLines.doneQty,
    })
    .from(operationLines)
    .innerJoin(products, eq(operationLines.productId, products.id))
    .where(eq(operationLines.operationId, id));

    const locs = await db.select().from(locations);
    const locMap = new Map(locs.map(l => [l.id, l.name]));

    const whs = await db.select().from(warehouses);
    const whMap = new Map(whs.map(w => [w.id, w.name]));

    const meta = parseOpNotes(op.notes);

    const enhancedLines = lines.map((l, idx) => {
      const lineLocId = meta.lineLocations?.[idx];
      const destLocId = op.operationType === 'receipt' ? (lineLocId || op.destLocationId) : op.destLocationId;
      const srcLocId = (op.operationType === 'delivery' || op.operationType === 'internal') ? (lineLocId || op.sourceLocationId) : op.sourceLocationId;

      return {
        ...l,
        destLocationId: destLocId || undefined,
        destLocationName: destLocId ? locMap.get(destLocId) || `Location #${destLocId}` : undefined,
        sourceLocationId: srcLocId || undefined,
        sourceLocationName: srcLocId ? locMap.get(srcLocId) || `Location #${srcLocId}` : undefined,
        status: (l.doneQty >= l.demandQty ? 'done' : 'pending') as 'done' | 'pending',
      };
    });

    return {
      ...op,
      warehouseId: meta.warehouseId || undefined,
      warehouseName: meta.warehouseId ? whMap.get(meta.warehouseId) || 'Central Warehouse' : undefined,
      sourceLocationName: op.sourceLocationId ? locMap.get(op.sourceLocationId) || 'Unknown' : 'N/A',
      destLocationName: op.destLocationId ? locMap.get(op.destLocationId) || 'Unknown' : 'N/A',
      notes: meta.userNotes,
      responsible: meta.assignedStaffName || op.responsible || 'Unassigned',
      assignedToId: meta.assignedToId || null,
      assignedStaffName: meta.assignedStaffName || op.responsible || 'Unassigned',
      lines: enhancedLines,
    };
  } catch (error) {
    console.error('Error in getOperationById:', error);
    throw new Error('Database query failed: getOperationById', { cause: error });
  }
}

export async function createOperation(data: {
  operationType: 'receipt' | 'delivery' | 'internal' | 'adjustment';
  contact?: string;
  warehouseId?: number;
  sourceLocationId?: number;
  destLocationId?: number;
  scheduledDate?: string;
  responsible?: string;
  notes?: string;
  lines: Array<{
    productId: number;
    demandQty: number;
    doneQty?: number;
    destLocationId?: number;
    sourceLocationId?: number;
  }>;
}) {
  try {
    const prefixMap = {
      receipt: 'WH/IN/',
      delivery: 'WH/OUT/',
      internal: 'WH/INT/',
      adjustment: 'WH/ADJ/',
    };
    const prefix = prefixMap[data.operationType] || 'WH/OP/';

    const existing = await db.select().from(operations).where(eq(operations.operationType, data.operationType));
    const nextSeq = existing.length + 1;
    const ref = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Map line locations into metadata notes
    const lineLocations: Record<number, number> = {};
    if (data.lines) {
      data.lines.forEach((l, idx) => {
        if (l.destLocationId) lineLocations[idx] = l.destLocationId;
        else if (l.sourceLocationId) lineLocations[idx] = l.sourceLocationId;
      });
    }

    const notesPayload = JSON.stringify({
      userNotes: data.notes || '',
      warehouseId: data.warehouseId || null,
      lineLocations,
    });

    const insertedOp = await db.insert(operations).values({
      reference: ref,
      operationType: data.operationType,
      status: 'draft',
      contact: data.contact || '',
      sourceLocationId: data.sourceLocationId || null,
      destLocationId: data.destLocationId || null,
      scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
      responsible: data.responsible || 'Inventory Manager',
      notes: notesPayload,
    }).returning();

    const op = insertedOp[0];

    // Insert lines
    if (data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        await db.insert(operationLines).values({
          operationId: op.id,
          productId: line.productId,
          demandQty: line.demandQty,
          doneQty: line.doneQty || 0,
        });
      }
    }

    return await getOperationById(op.id);
  } catch (error) {
    console.error('Error in createOperation:', error);
    throw new Error('Database query failed: createOperation', { cause: error });
  }
}

export async function updateOperationStatus(
  id: number,
  status: string,
  assignedStaff?: { id?: number; name?: string }
) {
  try {
    const currentOp = await getOperationById(id);
    if (!currentOp) throw new Error(`Operation #${id} not found`);

    // Valid state transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['ready', 'canceled'],
      ready: ['processing', 'draft', 'canceled'],
      processing: ['done', 'ready', 'canceled'],
      waiting: ['ready', 'processing', 'canceled'],
      done: [], // Completed state is final
      canceled: ['draft'], // Can reopen to draft
    };

    const allowed = validTransitions[currentOp.status] || [];
    // If not identical and not in allowed transitions, reject (unless moving to done)
    if (currentOp.status !== status && !allowed.includes(status) && status !== 'done') {
      throw new Error(
        `Invalid state transition: Cannot change status from '${currentOp.status}' to '${status}'. Valid next states: ${allowed.join(', ') || 'none'}`
      );
    }

    // When transitioning to Done: Commit stock levels & ledger in PostgreSQL
    if (status === 'done' && currentOp.status !== 'done') {
      const validationResult = await validateOperation(id);
      return validationResult.operation;
    }

    // Preserve and update metadata
    const rawOps = await db.select().from(operations).where(eq(operations.id, id)).limit(1);
    let existingMeta: OpMetadata = { userNotes: '' };
    if (rawOps[0]?.notes) {
      existingMeta = parseOpNotes(rawOps[0].notes);
    }

    if (assignedStaff?.name) {
      existingMeta.assignedStaffName = assignedStaff.name;
    }
    if (assignedStaff?.id !== undefined) {
      existingMeta.assignedToId = assignedStaff.id;
    }

    const updatePayload: any = {
      status,
      notes: JSON.stringify(existingMeta),
      updatedAt: new Date(),
    };

    if (assignedStaff?.name) {
      updatePayload.responsible = assignedStaff.name;
    }

    await db.update(operations).set(updatePayload).where(eq(operations.id, id));
    return await getOperationById(id);
  } catch (error) {
    console.error('Error in updateOperationStatus:', error);
    throw error;
  }
}

// Line-by-line shelving, picking, and relocation confirmation
export async function confirmOperationLine(operationId: number, lineId: number) {
  try {
    const op = await getOperationById(operationId);
    if (!op) throw new Error(`Operation #${operationId} not found`);

    const line = op.lines.find(l => l.id === lineId);
    if (!line) throw new Error(`Line item #${lineId} not found on operation #${operationId}`);
    if (line.doneQty >= line.demandQty) {
      return { success: true, message: 'Line item is already completed.', operation: op, allComplete: true };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const qtyToProcess = line.demandQty - line.doneQty;
    const locs = await db.select().from(locations);
    const locMap = new Map(locs.map(l => [l.id, l.name]));

    if (op.operationType === 'receipt') {
      // Inbound: Stock increases at the line's destination location
      const targetLocId = line.destLocationId || op.destLocationId || 1;

      const existingStock = await db.select().from(stockLevels)
        .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, targetLocId)))
        .limit(1);

      if (existingStock.length > 0) {
        await db.update(stockLevels)
          .set({
            onHand: existingStock[0].onHand + qtyToProcess,
            updatedAt: new Date(),
          })
          .where(eq(stockLevels.id, existingStock[0].id));
      } else {
        await db.insert(stockLevels).values({
          productId: line.productId,
          locationId: targetLocId,
          onHand: qtyToProcess,
          reserved: 0,
        });
      }

      await db.insert(stockLedger).values({
        reference: op.reference,
        operationType: 'receipt',
        productId: line.productId,
        fromLocation: op.contact || 'Vendor',
        toLocation: locMap.get(targetLocId) || 'WH/Stock1',
        contact: op.contact,
        quantity: qtyToProcess,
        status: 'done',
        date: todayStr,
      });
    } else if (op.operationType === 'delivery') {
      // Outbound: Stock decreases from the line's source pick location
      const srcLocId = line.sourceLocationId || op.sourceLocationId || 1;

      const existingStock = await db.select().from(stockLevels)
        .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, srcLocId)))
        .limit(1);

      const currentOnHand = existingStock.length ? existingStock[0].onHand : 0;
      if (currentOnHand < qtyToProcess) {
        throw new Error(`Insufficient stock for ${line.productName} at ${locMap.get(srcLocId) || 'location'}. On-hand: ${currentOnHand}, needed: ${qtyToProcess}`);
      }

      await db.update(stockLevels)
        .set({
          onHand: Math.max(0, currentOnHand - qtyToProcess),
          reserved: Math.max(0, (existingStock[0]?.reserved || 0) - qtyToProcess),
          updatedAt: new Date(),
        })
        .where(eq(stockLevels.id, existingStock[0].id));

      await db.insert(stockLedger).values({
        reference: op.reference,
        operationType: 'delivery',
        productId: line.productId,
        fromLocation: locMap.get(srcLocId) || 'WH/Stock1',
        toLocation: op.contact || 'Customer',
        contact: op.contact,
        quantity: qtyToProcess,
        status: 'done',
        date: todayStr,
      });
    } else if (op.operationType === 'internal') {
      // Relocation: Move stock from source to destination location
      const srcLocId = line.sourceLocationId || op.sourceLocationId || 1;
      const dstLocId = line.destLocationId || op.destLocationId || 3;

      const srcStock = await db.select().from(stockLevels)
        .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, srcLocId)))
        .limit(1);

      if (srcStock.length) {
        await db.update(stockLevels)
          .set({ onHand: Math.max(0, srcStock[0].onHand - qtyToProcess), updatedAt: new Date() })
          .where(eq(stockLevels.id, srcStock[0].id));
      }

      const dstStock = await db.select().from(stockLevels)
        .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, dstLocId)))
        .limit(1);

      if (dstStock.length) {
        await db.update(stockLevels)
          .set({ onHand: dstStock[0].onHand + qtyToProcess, updatedAt: new Date() })
          .where(eq(stockLevels.id, dstStock[0].id));
      } else {
        await db.insert(stockLevels).values({
          productId: line.productId,
          locationId: dstLocId,
          onHand: qtyToProcess,
          reserved: 0,
        });
      }

      await db.insert(stockLedger).values({
        reference: op.reference,
        operationType: 'internal',
        productId: line.productId,
        fromLocation: locMap.get(srcLocId) || 'Source',
        toLocation: locMap.get(dstLocId) || 'Destination',
        contact: op.contact || 'Internal Relocation',
        quantity: qtyToProcess,
        status: 'done',
        date: todayStr,
      });
    }

    // Update doneQty for this line
    await db.update(operationLines).set({ doneQty: line.demandQty }).where(eq(operationLines.id, lineId));

    // Check all lines on this operation
    const allOpLines = await db.select().from(operationLines).where(eq(operationLines.operationId, operationId));
    const allDone = allOpLines.every(l => l.doneQty >= l.demandQty);

    if (allDone) {
      await db.update(operations).set({ status: 'done', updatedAt: new Date() }).where(eq(operations.id, operationId));
    } else {
      // Still in progress
      await db.update(operations).set({ status: 'processing', updatedAt: new Date() }).where(eq(operations.id, operationId));
    }

    const updated = await getOperationById(operationId);
    return {
      success: true,
      message: allDone
        ? `All items verified and processed! Operation ${op.reference} is now Completed.`
        : `Line item ${line.productName} processed! Stock balance updated.`,
      operation: updated!,
      allComplete: allDone,
    };
  } catch (error) {
    console.error('Error in confirmOperationLine:', error);
    throw error;
  }
}

// ---------------- OPERATION VALIDATION & STOCK MUTATION ----------------
export async function validateOperation(id: number) {
  try {
    const op = await getOperationById(id);
    if (!op) throw new Error(`Operation #${id} not found`);
    if (op.status === 'done') {
      return { success: true, message: 'Operation is already completed', operation: op };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const locs = await db.select().from(locations);
    const locMap = new Map(locs.map(l => [l.id, l.name]));

    const fromLocName = op.sourceLocationId ? (locMap.get(op.sourceLocationId) || 'Unknown') : (op.contact || 'Vendor');
    const toLocName = op.destLocationId ? (locMap.get(op.destLocationId) || 'Unknown') : (op.contact || 'Customer');

    // Handle by operation type
    if (op.operationType === 'receipt') {
      // Incoming Goods: Stock increases at destLocationId
      const targetLocId = op.destLocationId || 1; // default to WH/Stock1

      for (const line of op.lines) {
        const qtyToAdd = line.demandQty;

        // Check if stock record exists
        const existingStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, targetLocId)))
          .limit(1);

        if (existingStock.length > 0) {
          await db.update(stockLevels)
            .set({
              onHand: existingStock[0].onHand + qtyToAdd,
              updatedAt: new Date(),
            })
            .where(eq(stockLevels.id, existingStock[0].id));
        } else {
          await db.insert(stockLevels).values({
            productId: line.productId,
            locationId: targetLocId,
            onHand: qtyToAdd,
            reserved: 0,
          });
        }

        // Update line doneQty
        await db.update(operationLines).set({ doneQty: qtyToAdd }).where(eq(operationLines.id, line.id));

        // Log movement in stock ledger
        await db.insert(stockLedger).values({
          reference: op.reference,
          operationType: 'receipt',
          productId: line.productId,
          fromLocation: op.contact || 'Vendor',
          toLocation: locMap.get(targetLocId) || 'WH/Stock1',
          contact: op.contact,
          quantity: qtyToAdd,
          status: 'done',
          date: todayStr,
        });
      }
    } else if (op.operationType === 'delivery') {
      // Outgoing Goods: Stock decreases from each line's designated source pick location
      // 1. Verify stock availability across all line items first
      for (const line of op.lines) {
        const lineSrcLocId = line.sourceLocationId || op.sourceLocationId || 1;
        const existingStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, lineSrcLocId)))
          .limit(1);

        const currentOnHand = existingStock.length ? existingStock[0].onHand : 0;
        const locName = locMap.get(lineSrcLocId) || `Location #${lineSrcLocId}`;

        if (currentOnHand < line.demandQty) {
          // Block completion and mark as waiting for stock
          await db.update(operations).set({ status: 'waiting', updatedAt: new Date() }).where(eq(operations.id, id));
          return {
            success: false,
            message: `Insufficient stock for '${line.productName}' at ${locName}. On-hand: ${currentOnHand} ${line.productUom || 'Units'}, Demanded: ${line.demandQty}. Operation ${op.reference} moved to 'Waiting'.`,
            operation: await getOperationById(id),
          };
        }
      }

      // 2. All lines have sufficient stock, deduct and record in ledger
      for (const line of op.lines) {
        const lineSrcLocId = line.sourceLocationId || op.sourceLocationId || 1;
        const existingStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, lineSrcLocId)))
          .limit(1);

        const currentStock = existingStock[0];
        const newOnHand = Math.max(0, currentStock.onHand - line.demandQty);
        const newReserved = Math.max(0, (currentStock.reserved || 0) - line.demandQty);

        await db.update(stockLevels)
          .set({
            onHand: newOnHand,
            reserved: newReserved,
            updatedAt: new Date(),
          })
          .where(eq(stockLevels.id, currentStock.id));

        await db.update(operationLines).set({ doneQty: line.demandQty }).where(eq(operationLines.id, line.id));

        // Log movement in stock ledger with exact source pick rack
        await db.insert(stockLedger).values({
          reference: op.reference,
          operationType: 'delivery',
          productId: line.productId,
          fromLocation: locMap.get(lineSrcLocId) || 'WH/Stock1',
          toLocation: op.contact || 'Customer Delivery',
          contact: op.contact,
          quantity: line.demandQty,
          status: 'done',
          date: todayStr,
        });
      }
    } else if (op.operationType === 'internal') {
      // Internal Transfer: sourceLocationId -> destLocationId
      const srcLocId = op.sourceLocationId || 1;
      const dstLocId = op.destLocationId || 3; // e.g. Production Floor

      // 1. Verify availability at source location
      for (const line of op.lines) {
        const lineSrcId = line.sourceLocationId || srcLocId;
        const srcStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, lineSrcId)))
          .limit(1);

        const currentOnHand = srcStock.length ? srcStock[0].onHand : 0;
        const srcName = locMap.get(lineSrcId) || `Location #${lineSrcId}`;

        if (currentOnHand < line.demandQty) {
          await db.update(operations).set({ status: 'waiting', updatedAt: new Date() }).where(eq(operations.id, id));
          return {
            success: false,
            message: `Insufficient stock for '${line.productName}' at source ${srcName}. Available: ${currentOnHand}, Demanded: ${line.demandQty}. Operation ${op.reference} moved to 'Waiting'.`,
            operation: await getOperationById(id),
          };
        }
      }

      // 2. Perform transfer deduction and addition
      for (const line of op.lines) {
        const lineSrcId = line.sourceLocationId || srcLocId;
        const lineDstId = line.destLocationId || dstLocId;

        // Deduct from source
        const srcStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, lineSrcId)))
          .limit(1);

        if (srcStock.length) {
          await db.update(stockLevels)
            .set({ onHand: Math.max(0, srcStock[0].onHand - line.demandQty), updatedAt: new Date() })
            .where(eq(stockLevels.id, srcStock[0].id));
        }

        // Add to dest
        const dstStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, lineDstId)))
          .limit(1);

        if (dstStock.length) {
          await db.update(stockLevels)
            .set({ onHand: dstStock[0].onHand + line.demandQty, updatedAt: new Date() })
            .where(eq(stockLevels.id, dstStock[0].id));
        } else {
          await db.insert(stockLevels).values({
            productId: line.productId,
            locationId: lineDstId,
            onHand: line.demandQty,
            reserved: 0,
          });
        }

        await db.update(operationLines).set({ doneQty: line.demandQty }).where(eq(operationLines.id, line.id));

        // Log in stock ledger
        await db.insert(stockLedger).values({
          reference: op.reference,
          operationType: 'internal',
          productId: line.productId,
          fromLocation: locMap.get(lineSrcId) || 'Source',
          toLocation: locMap.get(lineDstId) || 'Destination',
          contact: op.contact || 'Internal Relocation',
          quantity: line.demandQty,
          status: 'done',
          date: todayStr,
        });
      }
    } else if (op.operationType === 'adjustment') {
      // Stock Adjustment: set exact physical counted quantity
      const targetLocId = op.sourceLocationId || op.destLocationId || 1;

      for (const line of op.lines) {
        const countedQty = line.demandQty;
        const existingStock = await db.select().from(stockLevels)
          .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.locationId, targetLocId)))
          .limit(1);

        const oldOnHand = existingStock.length ? existingStock[0].onHand : 0;
        const diff = countedQty - oldOnHand;

        if (existingStock.length) {
          await db.update(stockLevels)
            .set({ onHand: countedQty, updatedAt: new Date() })
            .where(eq(stockLevels.id, existingStock[0].id));
        } else {
          await db.insert(stockLevels).values({
            productId: line.productId,
            locationId: targetLocId,
            onHand: countedQty,
            reserved: 0,
          });
        }

        await db.update(operationLines).set({ doneQty: countedQty }).where(eq(operationLines.id, line.id));

        // Log difference in stock ledger
        await db.insert(stockLedger).values({
          reference: op.reference,
          operationType: 'adjustment',
          productId: line.productId,
          fromLocation: locMap.get(targetLocId) || 'Warehouse',
          toLocation: diff >= 0 ? (locMap.get(targetLocId) || 'Warehouse') : 'Scrap / Loss',
          contact: op.notes || 'Physical Count Adjustment',
          quantity: Math.abs(diff),
          status: 'done',
          date: todayStr,
        });
      }
    }

    // Mark operation as done
    await db.update(operations).set({ status: 'done', updatedAt: new Date() }).where(eq(operations.id, id));

    return {
      success: true,
      message: `Operation ${op.reference} successfully validated and stock updated.`,
      operation: await getOperationById(id),
    };
  } catch (error) {
    console.error('Error in validateOperation:', error);
    throw new Error('Database query failed: validateOperation', { cause: error });
  }
}

// ---------------- STOCK LEDGER (MOVE HISTORY) ----------------
export async function getStockLedger(search?: string, type?: string) {
  try {
    const records = await db.select({
      id: stockLedger.id,
      reference: stockLedger.reference,
      operationType: stockLedger.operationType,
      productId: stockLedger.productId,
      productName: products.name,
      productSku: products.sku,
      productUom: products.uom,
      fromLocation: stockLedger.fromLocation,
      toLocation: stockLedger.toLocation,
      contact: stockLedger.contact,
      quantity: stockLedger.quantity,
      status: stockLedger.status,
      date: stockLedger.date,
      createdAt: stockLedger.createdAt,
    })
    .from(stockLedger)
    .innerJoin(products, eq(stockLedger.productId, products.id))
    .orderBy(desc(stockLedger.id));

    let filtered = records;
    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.operationType === type);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.reference.toLowerCase().includes(q) ||
        (r.contact && r.contact.toLowerCase().includes(q)) ||
        r.productName.toLowerCase().includes(q) ||
        r.productSku.toLowerCase().includes(q) ||
        r.fromLocation.toLowerCase().includes(q) ||
        r.toLocation.toLowerCase().includes(q)
      );
    }

    return filtered;
  } catch (error) {
    console.error('Error in getStockLedger:', error);
    throw new Error('Database query failed: getStockLedger', { cause: error });
  }
}

// ---------------- SYSTEM DATA MANAGEMENT ----------------
export async function clearAllDemoData() {
  try {
    // Delete transactional and inventory data
    await db.delete(operationLines);
    await db.delete(operations);
    await db.delete(stockLedger);
    await db.delete(stockLevels);
    await db.delete(products);

    return {
      success: true,
      message: 'All inventory orders, products, and ledger history have been reset to a clean state.',
    };
  } catch (error) {
    console.error('Error in clearAllDemoData:', error);
    throw new Error('Database query failed: clearAllDemoData', { cause: error });
  }
}
