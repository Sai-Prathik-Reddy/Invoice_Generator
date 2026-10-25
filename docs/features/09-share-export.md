# 09 — Native Share, Export & Print Gateway

> Gesture-safe two-step PDF sharing (`navigator.share` to WhatsApp/Mail), instant download, print preview, WhatsApp message deep link, and bulk `.zip` PDF export.

## 1. Overview
Delivers compiled PDF `Blob`s to customers on mobile and desktop while respecting strict browser transient-user-activation rules.

## 2. User Stories
- **US-09.1:** As a mobile user, I want to tap **Share PDF** on a finalized invoice and immediately send the PDF file to my client on WhatsApp.
- **US-09.2:** As a desktop user, I want 1-click **Download PDF**, **Print**, or **Bulk Export Selected PDFs (.zip)**.

## 3. Why Two-Step Generate → Share Is Mandatory
On iOS Safari and mobile Chromium, `navigator.share({ files })` throws `NotAllowedError` if an `await` (such as worker PDF compilation) takes longer than ~1–2 seconds after the tap.
- **Solution:** Finalizing pre-compiles and caches the `File` object in memory (`pdf_asset_id`). When the user taps **Share PDF**, `navigator.share({ files: [cachedFile], title, text })` is invoked **synchronously** inside the click handler.

## 4. Functional Requirements
- **FR-09.1:** Sanitize filenames using `${series}-${seq}_${clientName}_${issueDate}.pdf` (e.g., `INV-26-27-0042_Acme-Traders_2026-10-18.pdf`).
- **FR-09.2:** Check `navigator.canShare?.({ files: [file] })`; if unsupported (most desktop browsers), fall back to `<a download>` + optional `wa.me/?text=` summary link.
- **FR-09.3:** Bulk selection on `/documents` compiles/fetches selected PDF blobs and streams them into a single `Invoices_YYYY-MM-DD.zip` via `fflate`.

## 5. Technical Implementation
- **Files:** `src/features/share/sharePdf.ts`, `src/features/share/ShareActionsBar.tsx`.

## 6. Acceptance Criteria
- [ ] Tapping **Share PDF** on mobile invokes the native share sheet synchronously without `NotAllowedError`.
- [ ] Desktop download and print work offline.
