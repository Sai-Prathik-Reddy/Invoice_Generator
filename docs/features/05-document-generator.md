# 05 — Document Generator (Dynamic Form & Finalize Pipeline)

> Runtime data-entry workspace that interprets any `TemplateVersion`, renders grouped `react-hook-form` inputs + line-item repeaters, computes live totals, previews the real PDF, and executes the atomic Finalize transaction.

## 1. Overview
Turns a template into a fast billing screen on both mobile and desktop, supporting draft autosave, live preview, and immutable finalization.

## 2. User Stories
- **US-05.1:** As a user, I want to pick a client and add line items rapidly with keyboard navigation on desktop or thumb-friendly item cards on mobile.
- **US-05.2:** As a user, I want my draft to autosave as I type, and only allocate an official invoice number when I click **Finalize**.

## 3. UX & Flows
- **Desktop:** Split pane — Left (60%): Client/Header fields, Line-item grid (`useFieldArray`) with `[📷 Scan Barcode]` (Continuous POS Mode) & `[📦 Pick from Catalog]` Drawer, Notes/Payment, sticky Totals bar · Right (40%): Live debounced PDF canvas preview + zoom.
- **Mobile:** Segmented top tabs (`Fill Form` | `PDF Preview`) + sticky bottom bar showing `Grand Total` and **Save Draft / Finalize** CTA. Full smartphone camera barcode scanning with sound and haptics.
- **Retail Fast-Checkout Pipeline:**
  - `[📷 Scan Barcode]`: Opens full-screen smartphone camera HUD with laser line. Scanning product barcode looks up local Dexie items catalog. If present on bill, increments `qty`; if new, appends item row. Plays POS beep and vibration.
  - `[📦 Pick from Catalog]`: Opens 1-tap product drawer with search, GST filter pills, and instant `[-]`/`[+]` quantity buttons.
- **Finalize Transaction (`documentsRepo.finalize`):**
  1. Validate form against runtime `zod` schema.
  2. Run `evaluate()` to freeze `ComputedResult`.
  3. Allocate next sequence number (`INV/26-27/0042`) inside a Dexie `rw` transaction on `sequences`, `documents`, `clients`, `items` (incrementing `use_count`).
  4. Embed deep-cloned `snapshot: { company, client }`.
  5. Compile final PDF via Web Worker, store as an `Asset` (`kind: 'pdf'`), and save `pdf_asset_id`.
  6. Transition `status` to `'finalized'` and navigate to `/documents/:id` (ready for 1-tap Share).

## 4. Functional Requirements
- **FR-05.1:** Drafts have `status: 'draft'` and `number: undefined` (displaying `"Preview: INV/26-27/0042 (next)"`).
- **FR-05.2:** Quotations/Estimates include a **Convert to Tax Invoice** action that clones values & items into a new invoice draft with `converted_from_id`.
- **FR-05.3:** Offer a non-intrusive toggle/prompt to save newly typed Clients or Items into the Catalog upon finalize.

## 5. Technical Implementation
- **Files:** `src/features/generator/DocumentGeneratorPage.tsx`, `src/features/generator/LineItemsEditor.tsx`, `src/db/repos/documents.repo.ts`.

## 6. Acceptance Criteria
- [ ] Adding/editing 20 line items recalculates totals in `< 16ms`.
- [ ] Finalizing an invoice assigns a gap-free sequence number, freezes snapshots, stores the PDF Blob, and locks editing.
