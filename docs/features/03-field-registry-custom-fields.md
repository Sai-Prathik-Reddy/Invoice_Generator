# 03 — Field Registry & Custom Fields

> Typed input schema (`FieldDef[]`) per template plus quick "Add Custom Field" support on templates, companies, clients, and items—powering dynamic forms, validation, and `{{token}}` bindings.

## 1. Overview
Replaces fragile free-text `{{Variable}}` scraping with an explicit, user-extensible Field Registry while keeping a 1-click "Add Custom Field / Generic Text Box" workflow for proprietary business data.

## 2. User Stories
- **US-03.1:** As a business owner, I want to add a custom field (e.g., "Vehicle No.", "Doctor Reg. No.", "PO Number", "Patient Age") in two clicks and place it anywhere on my template.
- **US-03.2:** As a user, I want each field to know its input type (`text`, `multiline`, `number`, `money`, `percent`, `date`, `select`, `boolean`, `gstin`, `state`) and scope (`document` vs `line_item`).

## 3. UX & Flows
- **Quick Add Custom Field:** In the Builder (or Generator), clicking **+ Add Custom Field** asks for *Label* (e.g., `"Vehicle Number"`), *Type* (default `text`), *Scope* (`Document` or `Line Item`), and *Required* toggle. It auto-generates `key: "vehicle_number"`, adds the `FieldDef` to `definition.fields`, and optionally drops a `field_pair` block onto the canvas.
- **Token Picker:** Typing `{{` in any text/table/totals block opens an autocomplete popover listing all registered `fields`, `computed` keys, `company.*`, `client.*`, `doc.*`, and formatting pipes (`| money`, `| words`, `| date`).

## 4. Functional Requirements
- **FR-03.1:** Auto-generate `snake_case` field keys from labels, deduplicating collisions (`custom_field_2`) and blocking reserved prefixes (`company`, `client`, `doc`, `page`, `items`, `today`).
- **FR-03.2:** Build a runtime `zod` schema from `FieldDef[]` (`buildDocumentZodSchema(fields)`) to validate `react-hook-form` inputs in the Generator.
- **FR-03.3:** Support `CatalogBinding` on fields so selecting a Client or Item auto-populates bound fields (e.g., `client_name` fills `client_gstin`, `client_address`, `place_of_supply`).

## 5. Technical Implementation
- **Files:** `src/core/schema/fieldRegistry.ts`, `src/features/builder/FieldsPanel.tsx`, `src/core/tokens/resolver.ts`.

## 6. Acceptance Criteria
- [ ] Users can add custom document-level and line-item fields and immediately see them in the Generator form and PDF output.
- [ ] Referencing an undeclared `{{token}}` highlights a warning in the Builder validation panel.
