# 06 — Catalog & Intelligent Autocomplete

> Dedicated Clients and Items directory with prefix + usage-ranked autocomplete, smartphone barcode scanner POS, visual 1-tap catalog drawer, instant multi-field population (`CatalogBinding`), and custom fields.

## 1. Overview
Eliminates repetitive typing by storing frequently billed Clients and Products/Services (`Item`s), scanning physical product barcodes (EAN-13, EAN-8, UPC, Code 128, QR) using the device camera, and auto-filling linked fields in the Generator.

## 2. User Stories
- **US-06.1:** As a user typing a client name in an invoice, I want matching saved clients to appear immediately and fill their GSTIN, billing address, state code (`place_of_supply`), and phone number on selection.
- **US-06.2:** As a grocery or retail store owner, I want to scan product barcodes with my phone camera or enter them in bulk along with item name, unit rate, and GST rate, so that my entire shop catalog is quickly registered.
- **US-06.3:** As a cashier generating a bill, I want to scan product barcodes continuously using my smartphone camera like a supermarket checkout POS to automatically add items, update quantities on repeat scans, and hear an audible beep and vibration.
- **US-06.4:** As a user creating an invoice on mobile or desktop, I want a 1-tap visual product catalog drawer with live search, GST rate filter chips, and inline `[+]` / `[-]` quantity adjustments to rapidly compose line items.

## 3. UX & Flows
- **Catalog Screen (`/catalog`):**
  - Two tabs (`Clients` | `Items`), instant search bar (searches name, barcode, HSN), GST rate filter pills.
  - "Add Item" with inline `[📷 Scan]` camera button to auto-capture barcode.
  - "⚡ Bulk Batch" multi-row quick entry mode with 1-click `[⚡ Grocery Samples]` starter pack (Milk, Basmati Rice, Sunflower Oil, Atta, Salt, Toor Dal, Soap).
- **Generator POS Scanner & Visual Drawer (`/generator`):**
  - **`[📷 Scan Barcode]` Continuous Checkout Mode:**
    - Uses native hardware-accelerated `BarcodeDetector` API.
    - Animated laser sweep HUD, torch toggle, and camera flip (front/rear).
    - Repeat scans of the same barcode increment quantity automatically.
    - Audible supermarket POS beep (Web Audio API) and haptic vibration (`navigator.vibrate`).
    - Manual barcode entry bar with Enter key support (bridges desktop & USB/Bluetooth handheld barcode guns).
  - **`[📦 Pick from Catalog]` Visual Drawer:**
    - Live search + GST filter chips (`All`, `0%`, `5%`, `12%`, `18%`, `28%`).
    - Direct `[-]` and `[+]` quantity stepper buttons on each item card.
  - **Generator Autocomplete (`<CatalogAutocomplete />`):**
    - Ranking score: exact prefix match (`+100`) > substring match (`+40`) + `Math.min(use_count, 50)` + recency bonus.
    - Selecting an entry executes `CatalogBinding.fills` (e.g., `{ client_gstin: 'gstin', client_address: 'billing_address', place_of_supply: 'billing_address.state_code' }`).

## 4. Functional Requirements
- **FR-06.1:** Deduplicate auto-saved clients by matching normalized `gstin` (if present) or case-insensitive `name`.
- **FR-06.2:** Increment `use_count` and `last_used_at` whenever a document referencing the client/item is finalized.
- **FR-06.3:** Support `barcode: string` on `Item` stored in Dexie database `items` table with `[company_id+barcode]` compound index.
- **FR-06.4:** Support `custom_fields: CustomFieldValue[]` on both `Client` and `Item`.

## 5. Technical Implementation
- **Files:**
  - `src/core/schema/types.ts`: `ItemSchema` with `barcode`.
  - `src/db/schema.ts`: Dexie v2 indexing `barcode` and `[company_id+barcode]`.
  - `src/design-system/BarcodeScannerModal.tsx`: Web camera barcode scanner dialog with `BarcodeDetector` and continuous POS mode.
  - `src/design-system/CatalogItemPickerModal.tsx`: Visual product picker drawer with inline quantity controls.
  - `src/features/catalog/CatalogBackupAndSettings.tsx`: Single item + bulk batch catalog management.
  - `src/features/generator/DocumentGeneratorPage.tsx`: Integrated camera scanner and visual catalog drawer.

## 6. Acceptance Criteria
- [x] Selecting a saved client in the Generator populates GSTIN, address, and place of supply, immediately updating the CGST/SGST vs IGST tax split.
- [x] Store owners can register barcodes via camera scan or bulk batch entry.
- [x] Cashiers can scan barcodes continuously during billing to add items and auto-increment quantities with audio/haptic feedback.
- [x] Visual 1-tap product drawer allows instant item selection and quantity adjustment.
- [x] All 18 Vitest unit tests pass and clean production build.
