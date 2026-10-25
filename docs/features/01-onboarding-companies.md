# 01 — Onboarding & Multi-Company Management

> Fast 3-step business setup with automatic GSTIN state/PAN extraction, logo & signature upload, UPI/bank details, custom company fields, and multi-company switching.

## 1. Overview
Allows small-business owners to configure one or more businesses (`Company` records) with Indian GST compliance defaults, payment details, and custom proprietary fields (e.g., FSSAI No., Drug Licence No.).

## 2. User Stories
- **US-01.1:** As a new user, I want to enter my business name, GSTIN, address, and UPI ID in under 60 seconds and immediately generate my first invoice.
- **US-01.2:** As a user who types my 15-character GSTIN, I want the app to validate its checksum and auto-fill my State, State Code, and PAN.
- **US-01.3:** As a shop owner with a proprietary licence number, I want to add custom key-value fields on my company that automatically print on my invoices.

## 3. UX & Flows
1. **Step 1 — Business Identity:** Trade Name, Legal Name, GSTIN (optional for non-GST businesses; live checksum validation), Address + State selector (`state_code` `"01"`..`"38"`, `"97"`), Phone, Email.
2. **Step 2 — Branding & Payments:** Logo upload (auto-cropped/compressed to PNG/WebP Blob), Signature image upload, UPI VPA (`shop@upi`) + Payee Name, Bank Account + IFSC, Custom Fields list (`label` + `value` + `show_on_pdf`).
3. **Step 3 — Ready:** Clones default GST & Simple starter templates into the company, optionally offers "Restore from `.ingen` backup" on Step 1.

## 4. Functional Requirements
- **FR-01.1:** Validate GSTIN format `^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` and Mod-36 checksum digit; extract first 2 digits to `address.state_code` and chars 3–12 to `pan`.
- **FR-01.2:** Store uploaded logos and signatures in the `assets` table as raw `Blob`s with SHA-256 content hashes (never Base64 strings).
- **FR-01.3:** Editing a `Company` updates future drafts only; finalized documents retain their embedded `snapshot.company`.

## 5. Technical Implementation
- **Files:** `src/features/onboarding/OnboardingWizard.tsx`, `src/features/settings/CompanySettingsForm.tsx`, `src/db/repos/companies.repo.ts`, `src/core/validate/gstin.ts`.

## 6. Edge Cases & Error Handling
- Unregistered / Composition dealers can leave GSTIN blank; default template switches to `bill_of_supply`.
- Archiving a company requires at least one other active company.

## 7. Acceptance Criteria
- [ ] Entering a valid GSTIN auto-populates state and PAN.
- [ ] Custom fields added to Company appear in `{{company.custom.<key>}}` and `custom_kv` PDF blocks.
- [ ] Multi-company switcher isolates documents, clients, items, and sequences per `company_id`.
