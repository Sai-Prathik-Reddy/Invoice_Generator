# 10 — Dynamic Vector UPI QR Code

> NPCI-compliant `upi://pay` deep-link builder and vector SVG `<Path>` QR renderer bound to any computed amount (`grand_total`) or balance due.

## 1. Overview
Generates a crisp, infinitely scalable vector QR code on the PDF that pre-fills the payee VPA, business name, exact invoice amount, and invoice number in Google Pay, PhonePe, Paytm, and BHIM.

## 2. UPI URI Specification
```
upi://pay?pa=<vpa>&pn=<payee_name>&am=<amount_2dp>&cu=INR&tn=<note>&tr=<doc_number>
```
- `pa`: `company.upi.vpa` (validated against `/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/`).
- `pn`: URI-encoded `company.upi.payee_name || company.name`.
- `am`: `Big(amount).toFixed(2)` (omitted if `<= 0`).
- `cu`: `"INR"`.
- `tn`: URI-encoded `"Invoice INV/26-27/0042"` (truncated to 50 chars).

## 3. Vector Rendering Pipeline
1. `qrcode.create(upiUri, { errorCorrectionLevel: 'M' })` produces the boolean module matrix `N × N`.
2. `matrixToSvgPath(matrix, quietZone = 2)` converts dark modules into a single SVG path string (`Mx y h1 v1 h-1 z ...`).
3. Rendered in HTML builder preview via `<svg viewBox=...><path d={path} /></svg>` and in `@react-pdf/renderer` via `<Svg viewBox=...><Path d={path} fill="#111827" /></Svg>`.

## 4. Functional Requirements
- **FR-10.1:** Minimum PDF size is clamped to `64pt × 64pt` (default `96pt`) for reliable phone camera scanning.
- **FR-10.2:** If `company.upi?.vpa` is empty or the bound amount is `<= 0`, the block gracefully hides on the final PDF (and shows a placeholder hint in the Builder).

## 5. Technical Implementation
- **Files:** `src/core/upi/upiLink.ts`, `src/core/upi/qrSvgPath.ts`, `src/pdf/blocks/UpiQrPdfBlock.tsx`.

## 6. Acceptance Criteria
- [ ] Generated `upi://pay` URI passes NPCI parameter formatting and decodes accurately when scanned.
- [ ] QR code is 100% vector (`<Path>`) in the output PDF with zero raster blur.
