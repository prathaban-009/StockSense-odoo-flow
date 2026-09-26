# End-to-End Warehouse Operations, Lifecycle State Machine & Employee Management

A robust, real-world operational engine for **StockSense IMS** featuring authentic multi-step state machines (`Draft` → `Ready` → `Processing` → `Completed`), line-level location assignments, strict stock decrement/increment accounting, employee dispatch with credential delivery, role-based receipt permissions, and an upfront full-screen authentication gate.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Key decisions confirmed during Phase 1 clarification:
> - **Mandatory Login Gate**: The application starts at a full-screen unified login portal for both Managers and Warehouse Staff. Public or unauthenticated demo views are disabled.
> - **Manager-Only Sign Up**: Self-registration is restricted strictly to Managers. Warehouse Staff accounts must be created by an authorized Manager, which dispatches their access credentials.
> - **Granular Staff Permissions**: Managers can toggle `canCreateReceipts` per employee. When enabled, warehouse staff can independently initiate draft receipt intakes.
> - **Line-Item Granular Shelving & Picking**: Receipts assign destination locations per line item, and deliveries specify source locations per line item. Stock updates dynamically as items are confirmed rather than in an opaque bulk flip.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the operational module from static simulated badges into a live, interactive execution flow:
  1. **Inbound Receipt Orders**: Manager/permitted staff creates receipt with per-product destination locations. Status moves `Draft` → `Ready` (staff assigned and notified) → `Processing` (staff starts intake) → line-by-line verification and bin shelving (stock increments on shelf confirmation) → `Completed`.
  2. **Outbound Delivery Orders**: Manager selects customer delivery lines with specific source picking locations and assigns staff. Status moves `Draft` → `Ready` → `Processing` (staff picking) → line-by-line shelf deduction (stock decrements from bin and total) → `Completed`.
  3. **Internal Transfers**: Products are relocated from one specific storage location/rack to another, updating location-level balances atomically.
  4. **Stock Adjustments & Physical Counting**: Staff records physical shelf counts; system ledger reconciles discrepancies with automated audit records.
  5. **Employee Roster & Notification**: Manager creates employees, sets receipt creation rights, generates login credentials with visual email dispatch confirmation, and tracks assigned tasks in real time.
  6. **Unified Login First Screen**: Dedicated landing login screen with Manager signup toggle and staff login instructions.

- **Target Audience / Persona**:
  - **Inventory Manager**: Oversees warehouse capacity, creates products/locations, dispatches task assignments to staff, monitors live operational order queues, and manages staff permissions.
  - **Warehouse Staff**: Floor operators executing task queues (picking lists, intake shelving, bin-to-bin transfers), confirming quantities and shelf placements.

- **Key Value**: Eliminates stock discrepancies with true bin-level inventory math and provides clear accountability across staff assignments.

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Authentication Gate**:
   - Initial load displays a clean, industrial SaaS login portal (`Cabinet Grotesk` display typography, neutral slate styling).
   - Unified Sign In: Accepts email/password for either Managers (`manager@stocksense.io`) or Staff (`staff@stocksense.io`).
   - "Register New Warehouse Manager" mode available; employee signup tab is disallowed (staff are directed to use credentials provided by their manager).
   - Fast demo role picker for testing without typing.

2. **Manager Operation Dispatch & Monitoring**:
   - **Receipt Creation**: Select warehouse → select supplier/vendor → add line items with product, quantity, and individual destination shelf/bin location → select assigned staff member. Saves in `Draft`.
   - **Dispatch to Floor**: Manager reviews order and clicks **Mark as Ready & Assign**. Order moves to `Ready`; assigned employee receives visual notification badge in their queue.
   - **Delivery Creation**: Add customer delivery lines specifying exact pick location per product.

3. **Staff Floor Execution**:
   - Staff logs in, sees their dedicated Floor Operations queue categorized by Assigned Inbound, Assigned Picking, and Floor Transfers.
   - Staff opens assigned receipt in `Ready`, clicks **Start Intake / Process**, transitioning order to `Processing`.
   - As staff physically verifies and places goods into destination racks, they click **Confirm Shelved** on each line. That specific line changes to `Done`, and stock at that specific location immediately increases!
   - When all lines are shelved, order automatically transitions to `Completed`.
   - Outbound picking follows symmetric flow: staff picks item from shelf, confirms quantity picked, stock immediately decrements from source rack and company total.

4. **Employee Management Panel**:
   - Manager views active team members, their assigned pending tasks, and permissions.
   - "+ Add Employee" modal captures Name, Email, Warehouse, and `Can Create Receipts` toggle. Upon creation, sends simulated credentials delivery with copyable access keys.

#### Visual Identity & Layout (SaaS & Dashboard)
- **Palette**: Neutral slate (`#0F172A` background/text tones, `#F8FAFC` card base, `#E2E8F0` hairline dividers), industrial emerald (`#10B981`) for completed/intake, amber (`#F59E0B`) for processing/ready, and indigo (`#6366F1`) for primary dispatch actions.
- **Zero-Pill Discipline**: Statuses presented as quiet typographic indicators with semantic colored bullet points (`● Draft`, `● Ready`, `● Processing`, `● Completed`), never garish neon candy capsules.
- **Tabular Figures**: Quantities, location short codes, and timestamps styled with `font-mono tabular-nums`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Line-by-Line Execution vs. All-or-Nothing Finalization**
  - *Chosen Approach*: Line items track individual `status` (`pending` → `done`) and `doneQty`. Location stock updates immediately as each line is confirmed shelved or picked.
  - *Why*: Reflects real-world warehouse operations where large shipments take hours to rack; inventory is made available as soon as it hits the bin.
  - *Alternatives Considered*: Single validation button updating all items at once. Rejected because it causes phantom out-of-stocks during long receiving shifts.

- **Decision 2: Client/Server Reactive State Architecture**
  - *Chosen Approach*: Centralized reactive state store connected to the backend API with optimistic local updates, persistent ledger records, and instant notification indicators.
  - *Why*: Provides snappy, zero-latency feedback for warehouse workers using handheld or floor tablets while maintaining database integrity.

- **Decision 3: Dedicated Staff Receipt Permission Gate**
  - *Chosen Approach*: `canCreateReceipts` boolean attribute on employee records, verified both in the UI view controls and API handler.
  - *Why*: Gives managers strict control over procurement intake while allowing autonomous floor staff when designated.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FULL-SCREEN LOGIN GATE                          │
│   Unified Sign-In  │  Manager Self-Signup  │  Role Quick-Selector     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Authenticated User Context
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       STOCKSENSE IMS WORKSPACE                         │
│                                                                        │
│   ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│   │     INVENTORY MANAGER        │  │       WAREHOUSE STAFF        │   │
│   │  • Full Dashboard & Reports  │  │  • Floor Ops Queue           │   │
│   │  • Products & Shelves Setup  │  │  • Assigned Intake Shelving  │   │
│   │  • Dispatch Order Creation   │  │  • Assigned Bin Picking      │   │
│   │  • Staff & Permission Mgmt   │  │  • Rack-to-Rack Relocation   │   │
│   └──────────────┬───────────────┘  └──────────────┬───────────────┘   │
└──────────────────┼─────────────────────────────────┼───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   REAL-WORLD STATE ENGINE & LEDGER                     │
│                                                                        │
│    Draft ───(Dispatch)───► Ready ───(Staff Start)───► Processing       │
│                                                              │         │
│                                                (Line-by-Line Shelve)   │
│                                                              ▼         │
│     Completed ◄──────(All Lines Verified)───────── Line Items Done     │
│                                                                        │
│    * Immediate Location Stock Accounting (+ Inbound / - Outbound)      │
│    * Immutable Stock Movement Audit Trail Entries                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### State Transition Matrix

| Current State | Permitted Actions | Target State | Stock Impact | Permitted Roles |
| :--- | :--- | :--- | :--- | :--- |
| **Draft** | Edit items, assign staff, cancel | `Ready` or `Canceled` | None | Manager (or Staff if authorized) |
| **Ready** | Staff accepts/starts task | `Processing` | None | Assigned Staff / Manager |
| **Processing** | Shelve/Pick line item | `Processing` (line `done`) | $\pm$ Line Qty on Shelf & Total | Assigned Staff / Manager |
| **Processing** | Finalize when all lines done | `Completed` | Final audit ledger logged | Automatic / Staff / Manager |
| **Canceled** | Void order | `Canceled` | Reverses any partial allocations | Manager |

#### Verification & Quality Gates
1. Run `compile_applet` and `lint_applet` to ensure zero compilation or typing regressions.
2. Verify interactive state machine: Create draft receipt → Assign staff → Switch to Staff view → View notification → Start processing → Shelve line item → Confirm location on-hand increase → Verify completed order in Move History.
3. Verify outbound picking: Create delivery with designated source bin → Staff picks item → Confirm location on-hand decrease.
4. Verify staff permission toggle: Toggle receipt creation permission off/on and verify button visibility for employee.
