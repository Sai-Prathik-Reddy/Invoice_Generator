# 14 — Dashboard, Documents & Payment Ledger

> Executive glass dashboard (Revenue, Unpaid, Invoice Count, GST Collected + 6-month trend chart) and filterable Documents workspace with payment recording, cancellation, and quotation-to-invoice conversion.

## 1. Overview
Gives business owners an instant financial pulse on the Home screen and complete lifecycle management over drafts, finalized invoices, quotations, receipts, and prescriptions.

## 2. Dashboard Metrics (`/`)
Scoped to the active `Company`:
1. **This Month Revenue:** Sum of `grand_total` for `finalized` invoices (`tax_invoice` + `bill_of_supply`) issued in the current calendar month.
2. **Unpaid / Outstanding:** Sum of `(grand_total - payment.paid_amount)` across finalized invoices where `payment.status !== 'paid'`.
3. **Invoices Issued:** Count of finalized invoices this Financial Year (`{FY}`).
4. **GST Collected (This Month):** Sum of `CGST + SGST + IGST` from `computed.summaries.tax` for finalized invoices this month.
5. **6-Month Revenue Area Chart:** Smooth violet-to-gold gradient chart + recent 5 documents + `<BackupStatusChip />`.

## 3. Documents Workspace (`/documents`)
- **Filters:** Status (`All`, `Draft`, `Finalized`, `Cancelled`), Doc Type (`Tax Invoice`, `Quotation`, `Receipt`, `Prescription`, etc.), Payment Status (`Unpaid`, `Partial`, `Paid`), Search query (`number`, `client_name`).
- **Document Detail (`/documents/:id`):**
  - Renders full multi-page PDF preview + summary rail.
  - **Actions:** View PDF (interactive vector PDF preview in high-fidelity modal), Share PDF (native Web Share API), Download PDF, Print, Record Payment (`cash | upi | bank | card | cheque`), Duplicate as New Draft, Convert to Tax Invoice (for quotations), Cancel Invoice (requires reason; re-renders PDF with `CANCELLED` watermark while preserving sequence number).

## 4. Technical Implementation
- **Files:** `src/features/dashboard/DashboardPage.tsx`, `src/features/documents/DocumentsListPage.tsx`, `src/features/documents/DocumentDetailPage.tsx`, `src/features/documents/RecordPaymentDialog.tsx`.

## 5. Acceptance Criteria
- [ ] Recording a partial payment updates `payment.status` to `'partial'`; paying the balance updates it to `'paid'` and immediately reduces Dashboard Unpaid KPI.
- [ ] Cancelling a finalized invoice preserves its sequence number and stamps `CANCELLED`.
