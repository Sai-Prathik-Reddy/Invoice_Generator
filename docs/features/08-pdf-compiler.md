# 08 — PDF Compiler & Web Worker Pipeline

> High-performance `@react-pdf/renderer` compilation with custom `.ttf` font registration (`₹` support), fixed-zone absolute mapping, multi-page continuation template pagination, and crash-proof browser preview architecture.

## 1. Overview
Renders selectable, vector-based PDFs in a dedicated worker / async pipeline so the UI stays responsive at 60fps even on multi-page invoices or medical prescriptions.

## 2. Worker Contract (`src/pdf/api.ts`)
```ts
export interface RenderPdfPayload {
  jobId: string;
  definition: TemplateDefinition;
  company: Company;
  client?: Client;
  docMeta: {
    number: string;
    status: 'draft' | 'finalized' | 'cancelled';
    issue_date: ISODate;
    due_date?: ISODate;
    place_of_supply?: string;
    type_label: string;
  };
  values: Record<string, string>;
  items: Array<Record<string, string>>;
  computed: ComputedResult;
  assets: Record<ID<'ast'>, { mime: string; bytes: ArrayBuffer }>;
}

export interface PdfWorkerApi {
  renderPdf(payload: RenderPdfPayload): Promise<ArrayBuffer>;
}
```

## 3. Page Assembly & Multi-Page Continuation Rules
1. **Derived Page Padding:**
   - When `continuation.mode === 'custom_page_2'`, the base top padding is:
     `effectivePadHeaderH = min(header.height, page2Header.height)`
     `paddingTop = page.margin + effectivePadHeaderH`
     `paddingBottom = page.margin + max(footer.height, page2Footer.height)`
   - When Page 1's header is taller than Page 2+'s continuation header, an initial Page-1-only spacer `page1ExtraHeaderSpacer = header.height - effectivePadHeaderH` is injected into the body flow so Page 1 flow content starts below Page 1's header, while subsequent pages start immediately below Page 2+'s compact header.
2. **Fixed Zones (`header`, `footer`, `left`, `right`):**
   - **Static by Default (`repeat_page_1`):** Headers and footers render as static `<View fixed>` with explicit heights. This completely avoids dynamic reconciler evaluation for standard documents.
   - **Continuation Mode (`custom_page_2`):** Evaluates `activeHeader = pageNumber === 1 ? header : page2Header` and `activeFooter = pageNumber === 1 ? footer : page2Footer`.
   - **Safe Render Prop Isolation:** To prevent `@react-pdf/renderer` layout reconciler infinite loops or crashes, dynamic `<View render={...}>` passes `isInsideViewRender: true` down through `TokenResolutionContext`. Inner blocks check `!ctx.isInsideViewRender` before returning a `<Text render={...}>`, ensuring nested render callbacks are never created.
3. **Body Rows & Tables:**
   - Table header uses `<View fixed>` inside the table container to repeat column headers across page breaks.
   - Each table row uses `wrap={false}` so rows never split mid-line.
   - `TotalsBlock`, `SignatureBlock`, and rows with `keep_together: true` set `wrap={false}` and `minPresenceAhead={48}`.
4. **Page Numbers:**
   - Outside dynamic `<View render>`, any text block containing `{{page.number}}` or `{{page.total}}` uses native `<Text render={({ pageNumber, totalPages }) => ...} />`.
5. **Watermarks:**
   - When `status === 'draft'` (in preview) or `'cancelled'`, renders a diagonal 45° semi-transparent fixed SVG/Text watermark (`DRAFT` / `CANCELLED`).

## 4. Crash-Proof PDF Preview Architecture
- **Root Cause of Preview Hangs & Blank Display in Chromium:**
  1. **Layout Loops in `@react-pdf/renderer`:** Nesting `<Text render={({ pageNumber, totalPages }) => ...}>` inside dynamic `<View render={({ pageNumber }) => ...}>` triggered an infinite layout reconciler loop in Yoga/react-pdf. This was solved by making headers/footers static by default and passing `isInsideViewRender: true` in continuation mode.
  2. **Chromium `<object>` Blob Blocking:** Chromium's security policy treats blob URLs inside `<object data="blob:..." type="application/pdf">` as untrusted MIME types, falling back to empty/fallback text and failing to display the document.
  3. **Premature URL Revocation:** Immediate `URL.revokeObjectURL(oldUrl)` while the browser PDF plugin was still reading caused `Unchecked runtime.lastError: The message port closed before a response was received`.
- **Preview Architecture Implementation:**
  1. **Responsive `<iframe>` with Toolbar Parameters:** Employs `<iframe src={`${previewUrl}#toolbar=1&navpanes=0`} className="w-full h-full rounded-xl border border-border bg-white" />` across all preview surfaces (Studio Tab, Modal Dialog, Document Generator, and Document Detail).
  2. **Dual Preview Architecture in Studio:**
     - **Tab 4 (Live PDF Preview Studio):** Users can switch directly to a full-workspace in-page preview tab to view live PDF updates without dialog popups.
     - **Full-Screen Modal Dialog:** Available via "Preview PDF (Modal)" with full-screen presentation.
  3. **Safe Blob URL Lifecycle:** Retains previous blob URLs for 5000ms (`setTimeout(..., 5000)`) so the browser extension and iframe plugin finish handshaking before revocation.
  4. **Primary Action Bar:** Every preview touchpoint provides 1-click **"Open in Browser Window"** (`window.open(url, '_blank')`) and direct **"Download PDF"** buttons as 100% reliable cross-device fallbacks.

## 5. Font Registry
Registers self-hosted `.ttf` weights (400, 500, 600, 700) for `Inter`, `Roboto`, `NotoSans`, and `RobotoMono` via `Font.register()`, guaranteeing crisp rendering of the Indian Rupee symbol (`₹`, `U+20B9`).

## 6. Image & Asset Pipeline (`compilePdfToBlob`)
- **Automated Asset Resolution:**
  - `compilePdfToBlob` actively scans the document definition (`fixed zones`, `continuation zones`, and `body rows`) and company profile for `logo_asset_id`, `signature_asset_id`, and `source.kind === 'asset'`.
  - When assets are not provided in `input.assetDataUrls`, it queries IndexedDB (`db.assets`) asynchronously, converts the binary blobs to base64 Data URLs via `blobToDataUrl`, and merges them into `assetDataUrls`.
  - This eliminates placeholder boxes (`[Company Logo]`, `[Image / Photo]`) across all preview surfaces without requiring individual caller components to implement asset loading logic.
- **Sizing & Container Fallback:**
  - `@react-pdf/renderer` collapses `<Image style={{ width: '100%', height: '100%' }}>` to height 0 when inside unconstrained flex containers (such as body rows without absolute bounds).
  - `renderSingleBlock` derives explicit dimensions (`blockW`, `blockH`) from `frame`, `rel_frame`, or a 48pt fallback, wrapping images in a bounded `<View>` with `overflow: 'hidden'`.
  - Image alignment (`left`, `center`, `right`) maps to `objectPositionX` and `alignItems` for exact positioning.
- **Data URL & Asset Fallback Cascade:**
  - Resolves images in order: `assetDataUrls[company.logo_asset_id]` → `company.logo_data_url` → `assetDataUrls['company_logo']` → `db.assets.where('kind').equals('image').last()` → `DEFAULT_COMPANY_LOGO_DATA_URL` → `block.source.data_url` → `context.values[field]`.
  - Signature images follow an identical cascade: `assetDataUrls[company.signature_asset_id]` → `company.signature_data_url` → `assetDataUrls['company_signature']` → `block.source.data_url`.
- **Image Data URL Cleaning & Canvas Normalization:**
  - `@react-pdf/image` strictly matches `^data:image\/([a-zA-Z+]*);base64,([^"]*)` and only permits `jpg`, `jpeg`, `png`, `svg`, `svg+xml`. Any extraneous MIME params (like `;charset=utf-8`), spaces, or newlines in the base64 payload cause silent rendering failure.
  - `cleanDataUrlForPdf`: strips extra MIME parameters, removes newlines and whitespace from base64 payloads, and normalizes formats.
  - `blobToPdfDataUrl`: decodes any input blob (including WebP, SVG, AVIF, BMP, GIF) via an in-memory `HTMLCanvasElement` in the browser, downscales to a max dimension of 1200px, and exports standard `image/png` Data URLs.
  - `DEFAULT_COMPANY_LOGO_DATA_URL`: an embedded 48x48 PNG INGEN monogram (Amethyst background with Champagne Gold border and monogram) used as a fallback so that preview and finalized documents always render an elegant brand mark rather than a blank or dashed box.

## 7. Acceptance Criteria
- [x] Multi-page invoices paginate cleanly across 2–4 pages with repeating continuation headers.
- [x] Preview PDF never freezes the UI and shows a loading state.
- [x] No `runtime.lastError: message port closed` extension errors in console.
- [x] `₹` symbol renders accurately in all weights.
- [x] Custom uploaded template images (`data_url`), company logos, and signatures display crisply in all PDF previews and final document generation.
- [x] Image heights never collapse to 0 inside flex rows.

