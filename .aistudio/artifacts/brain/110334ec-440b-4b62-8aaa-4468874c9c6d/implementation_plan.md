# Implementation Plan: Weekly Personnel Activity Dashboard with Recharts

Add an interactive dual-axis visualization dashboard component to the **Personnel Activity** tab in `SettingsView`, plotting weekly completed operations (as bar columns) against error/exception rates (as a line trend) per warehouse staff member.

---

## 1. Package Installation
- Install `recharts` package via `install_applet_package`.

---

## 2. Weekly Trend Aggregator Logic
- Aggregate operation records over the chosen time window (Default: **Last 4 weeks**, with toggles for 4, 8, or 12 weeks).
- Bucket tasks into ISO weekly intervals (`Week 1`, `Week 2`, `Week 3`, `Week 4`, etc., with dates).
- For each week:
  - Total completed operations count (Receipts, Deliveries, Internal Moves, Adjustments).
  - Exception/Error count (waiting on stock shortages, cancellations, discrepancies).
  - Calculated Error Rate % (`(exceptions / total) * 100`).
- Support filtering by:
  - **All Personnel** (aggregate warehouse team throughput vs. team error rate).
  - **Individual Staff Member** (e.g., Deva, Prathaban, Floor Operators) to evaluate individual weekly trajectories.

---

## 3. Dashboard UI Component (`src/components/PersonnelActivityChart.tsx` or inline in `SettingsView.tsx`)
- **Dual-Axis Combo Chart**:
  - `ResponsiveContainer` with `ComposedChart`.
  - **Left Y-Axis**: Completed Operations count (Bar format, branded primary `#1E40AF` / `#3B82F6` with subtle rounded top).
  - **Right Y-Axis**: Error Rate % (0% to 100% or auto-scaled, plotted with a bold alert Line `#EF4444` and dot indicators).
  - **X-Axis**: Week labels (e.g., `Wk 35 (Sep 1 - 7)`).
  - **Custom Tooltip**: Formatted with operations count, exceptions, and exact error percentage.
  - **Quick Metric Badges**: Showing 4-week trend (e.g., "Throughput +12%", "Error Rate -3.5%").
  - Time range selector (Last 4 Weeks, Last 8 Weeks, Last 12 Weeks).

---

## 4. Verification Plan
- Install `recharts` and run `lint_applet` & `compile_applet`.
- Verify the chart renders smoothly in both Light and Dark mode without layout shifts.
- Verify changing the staff filter or week range updates the chart dynamically.
