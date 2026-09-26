# Delivery Operation Workflow Implementation

Implement an end-to-end Outbound Delivery Order workflow in StockSense IMS. This enables warehouse managers to create delivery orders, allocate specific products and quantities from source warehouse racks, assign floor operators, and progress the order through a verified four-stage lifecycle (`Draft` ➔ `Ready` ➔ `Processing` ➔ `Done`), automatically decrementing inventory from PostgreSQL upon completion.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters and architectural behaviors have been confirmed:

- **Confirmed Workflow Lifecycle**: Strict four-stage state machine:
  1. `Draft`: Manager builds the order, selects customer, picks products, quantities, and source shelf/rack locations.
  2. `Ready`: Manager assigns a registered warehouse staff member (`responsible`) to dispatch the order into the operator's active floor queue.
  3. `Processing`: Warehouse staff initiates picking on the warehouse floor (picking individual line items with physical bin confirmations).
  4. `Done`: All lines confirmed or manager validates full order, causing the system to automatically deduct the demanded quantities from the source location's on-hand stock and log immutable audit entries in `stock_ledger`.
- **Confirmed Insufficient Stock Guard**: If any requested product line exceeds the available on-hand quantity at the source pick location when attempting validation, the system **blocks completion** and automatically flags the operation status as **`Waiting`** (Waiting for Stock Replenishment), preventing negative inventory.
- **Per-Line Source Location Resolution**: Ensure line-specific pick racks (e.g., `WH/Stock1`, `WH/Rack-A`, `WH/Zone-B`) are directly decremented in `stock_levels` during both line-by-line picking and bulk validation.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, high-precision outbound delivery workflow (`WH/OUT/xxxx`) for shipping customer goods. Managers specify customer details, choose products from active warehouse storage locations, and assign floor staff. Floor staff receive the order on their terminal, pick items from racks, and mark the order complete, immediately updating stock ledgers and on-hand balances.
- **Target Audience / Persona**: Warehouse Managers (creation, staff dispatch, stock oversight) and Warehouse Staff (physical order picking and shelf confirmation).
- **Key Value**: Enforces physical storage accountability, stops out-of-stock fulfillments before dispatch, and guarantees accurate real-time inventory balances.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Manager Creation Flow (`New Delivery Order`)**:
     - Manager clicks **"New Delivery Order"** in the Operations view (or Outbound Deliveries tab).
     - Manager selects the Warehouse Facility (e.g. `Central Warehouse`), inputs Customer Name (e.g. `Deco Addict`), Scheduled Date, and default Source Rack.
     - Under **Product Items & Storage Placement**, manager adds lines. Each line dynamically shows current on-hand stock at the chosen rack: `Available: 45 Units`. If a requested quantity exceeds available stock, a high-contrast inline amber/red warning appears immediately.
     - Manager selects the designated **Warehouse Staff Operator** directly from the creation modal or saves as `Draft`.
  2. **Staff Assignment & Dispatch Flow**:
     - In `Draft` status, the manager clicks **"Assign Staff & Mark as Ready"**. A dialog lists registered floor staff along with their current active task count.
     - Selecting a worker transitions the order to **`Ready`** and sets the `responsible` metadata.
  3. **Floor Execution & Picking Flow (`Processing`)**:
     - Floor operator clicks **"Start Order Picking (Processing)"**.
     - Operator picks items line by line, clicking **"Pick from Bin"** as each shelf rack is verified.
     - Alternatively, managers can click **"Validate All Lines & Commit to Stock"**.
  4. **Automatic Stock Decrement (`Done`)**:
     - When all lines are picked or validated, PostgreSQL commits the exact stock decrements to `stock_levels` for the source locations.
     - Each line creates an entry in `stock_ledger` with `operationType: delivery`, recording `fromLocation` (rack name), `toLocation` (Customer), and timestamp.
     - If available stock is insufficient, the operation halts and transitions to `waiting` with a descriptive alert message: *"Insufficient stock for [Product]. On hand: X, Demanded: Y. Operation set to 'Waiting'."*
- **Visual Design (SaaS High-Density Anti-Slop)**:
  - Tabular monospace numbers (`font-mono tabular-nums`) for demanded vs. picked quantities.
  - Crisp status pipeline banner (`Draft` ➔ `Ready` ➔ `Processing` ➔ `Done` / `Waiting`).
  - Printable **Delivery Dispatch Voucher** / Packing Slip accessible with 1 click.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Per-Line Location Storage & Deductions**:
  - *Chosen Approach*: Store line-level source locations in operation metadata (`lineLocations`) and query both line-specific location IDs and parent operation location IDs.
  - *Why*: Large warehouses frequently pick different items for a single customer order from different aisles or racks.
- **Decision 2: Atomic State Machine & Stock Decrement Guard**:
  - *Chosen Approach*: In `queries.ts`, ensure `validateOperation` and `confirmOperationLine` use exact stock verification prior to updating `stock_levels`.
  - *Why*: Eliminates race conditions and prevents negative stock balances in PostgreSQL.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   StockSense Client                    │
│   (OperationsView.tsx • Outbound Deliveries Tab)       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP POST / PUT
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express API Server                   │
│   • POST /api/operations (create delivery draft)       │
│   • PUT  /api/operations/:id/status (assign & ready)   │
│   • POST /api/operations/:id/lines/:lid/confirm        │
│   • POST /api/operations/:id/validate (auto-decrement) │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   PostgreSQL Database    │  │   Stock Level Engine     │
│  • operations (delivery) │  │ • verify onHand >= qty   │
│  • operation_lines       │  │ • onHand = onHand - qty  │
│  • stock_ledger (audit)  │  │ • fallback to 'waiting'  │
└──────────────────────────┘  └──────────────────────────┘
```

### Components to Update:
1. **Backend Queries (`src/db/queries.ts`)**:
   - Verify that `validateOperation` for `delivery` respects per-line `sourceLocationId` (falling back to `op.sourceLocationId`).
   - Ensure accurate stock check and automatic transition to `waiting` if stock is deficient.
   - Verify `confirmOperationLine` properly checks line-specific stock and marks allComplete when final item is picked.
2. **Operations View (`src/views/OperationsView.tsx`)**:
   - Enhance the New Delivery Modal to display live on-hand quantity per rack location in real-time as the manager selects products and pick locations.
   - Wire the direct staff selector into the New Delivery creation modal so managers can create directly in `Ready` or `Draft` state.
   - Ensure clear UI actions for `Draft` ➔ `Ready` (Assign Staff) ➔ `Processing` (Start Picking) ➔ `Done` (Validate & Decrement).
   - Display a distinct `Waiting` state badge with a "Re-check Available Stock" button when replenished.
3. **Verification**:
   - Verify compilation with `lint_applet` and `compile_applet`.
