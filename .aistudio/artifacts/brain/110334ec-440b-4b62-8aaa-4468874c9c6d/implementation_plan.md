# Implementation Plan: Product Location Breakdown & Warehouse Relocation Workflow

Enable Inventory Managers to click on any product tag or name to view granular real-time stock levels remaining in each warehouse location/rack, and initiate quick internal relocations with full staff assignment (`Draft ➔ Ready ➔ Processing ➔ Done`).

---

## 1. User Experience & Architecture Overview

### A. Clickable Product Tags & Location Stock Breakdown
- When a manager or warehouse operator clicks on a product row, product tag, or the "Locations" action pill in `ProductsView`:
  - Opens the **Product Location Breakdown & Inventory Drawer / Modal**.
  - Displays:
    - Product SKU, Category, UoM, Cost & Sale Price, and total On-Hand / Free-to-Use.
    - Clean table and visual cards showing **Stock Remaining by Location / Rack**:
      - Location Name, Warehouse, Code, Location Type (Internal storage, Production Floor, Packing Bay, etc.).
      - Physical on-hand quantity, reserved units, and available free-to-use units.
      - Visual capacity and stock badge indicators (In Stock, Low Stock, Empty).

### B. Quick Relocation Action Inside Product Details
- Inside the product location modal, provide a prominent **"Transfer / Relocate Stock"** action button.
- Selecting it opens an integrated **Internal Relocation Wizard**:
  - **Source Location**: Pre-filtered to locations holding available stock of this product (with available balance shown).
  - **Destination Location**: Dropdown of target racks / storage zones across warehouses.
  - **Transfer Quantity**: Numeric input with validation (cannot exceed source available on-hand).
  - **Assigned Warehouse Employee**: Dropdown of active warehouse staff with their current workload/role.
  - **Scheduled Date & Relocation Notes**: Optional reference for special handling or priority.

### C. Workflow & Employee Assignment Logic
- Clicking **"Create Relocation Order & Assign"**:
  - Creates a PostgreSQL internal transfer operation (`operationType: 'internal'`).
  - Sets the operation status directly to `'ready'` (or `'draft'` with assigned operator ready to execute).
  - The assigned employee immediately sees this relocation order in their active task queue (`Floor Task Mode`).
  - When the employee validates the task (`Done`), stock is safely deducted from the source location, credited to the destination rack in PostgreSQL `stock_levels`, and recorded in `stock_ledger`.
  - Also provide an option to switch directly to `OperationsView` to track the task in the Kanban pipeline.

---

## 2. Technical Modifications

### 1. Backend (`src/db/queries.ts` & API routes)
- Ensure internal transfer validation validates stock sufficiency at the source location before decrementing (prevent negative stock).
- Verify that `createOperation` and `updateOperationStatus` properly handle assigned staff information and notes for internal transfers.

### 2. Frontend Components (`src/views/ProductsView.tsx`)
- Make the product name / tag clickable in the product table to open the detailed Location Breakdown modal directly.
- Upgrade the **Stock per Location Modal** with:
  - Richer location metadata (Warehouse name, short code, location type, capacity status).
  - Row-level "Relocate from this rack" quick buttons.
  - An inline / nested **Quick Relocation & Staff Assignment Form**:
    - Product pre-selected.
    - Source location selection with live balance.
    - Destination location selection.
    - Employee picker populated with warehouse personnel (`api.getEmployees`).
    - Validation feedback (errors for insufficient balance, unassigned staff, or same source & destination).
    - Success confirmation with direct link to view the order in Operations Kanban.

### 3. Navigation & Cross-View Linking
- Support opening the internal transfer in `OperationsView` if the manager clicks "View in Operations Pipeline".

---

## 3. Verification & Testing Steps
1. Navigate to **Products** as Manager.
2. Click on a product name / tag (e.g. *Acoustic Wall Panel* or *Desk Chair*).
3. Verify that the modal displays all warehouse racks with remaining stock and reserved amounts.
4. Click **"Relocate Stock"** (or click the quick transfer button next to a specific rack).
5. Select destination rack, enter quantity, and choose an assigned warehouse staff member.
6. Submit the relocation; verify the operation is created in `ready` state assigned to the employee.
7. Switch to Staff view or validate the relocation; verify stock levels update accurately across both locations in PostgreSQL and appear in the stock ledger.
