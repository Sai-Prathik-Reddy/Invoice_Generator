# 13 — Encrypted Backup & Restore (`.ingen` Archives)

> Password-encrypted `.ingen` backup bundles (`fflate` ZIP + `AES-256-GCM` + `PBKDF2-SHA-256`) supporting Everything, Templates-Only, or Data-Only exports and Merge/Replace restores.

## 1. Overview
Allows users to export and restore their templates, business data, and binary image/PDF blobs in a compact, password-encrypted archive without Base64 bloat.

## 2. Export Scopes & Options
- **Scope:**
  1. **Full Backup (Everything):** Companies, Templates, TemplateVersions, Documents, Sequences, Clients, Items, Assets.
  2. **Templates Pack Only:** Selected or all `Templates` + `TemplateVersions` + template image `Assets` (for sharing template designs or backing up layouts).
  3. **Business Data Only:** Companies, Clients, Items, Documents, Sequences.
- **Include Archived PDFs Toggle:** Default `true` (can be unchecked for tiny kilobyte-sized backups since finalized invoices can also re-render from their frozen snapshots).
- **Password Protection:** Required by default (user enters password + confirm to encrypt; entering the same password is required on import to decrypt).

## 3. `.ingen` Container & ZIP Structure
- **Inner ZIP (built via `fflate`):**
  ```
  manifest.json        # format_version: 1, app_version, created_at, scope, counts, sha256 map
  data/companies.json
  data/templates.json
  data/templateVersions.json
  data/documents.json
  data/sequences.json
  data/clients.json
  data/items.json
  assets/<asset_id>.bin
  ```
- **Outer Encryption Envelope:**
  - Magic bytes `"INGN"` (4B) + Version `1` (1B) + Flags `encrypted` (1B) + JSON header length (2B) + header (`{ salt, iv, iterations: 600000 }`) + `AES-256-GCM` ciphertext of the compressed ZIP bytes.

## 4. Restore Modes
1. **Merge (Safe Default):** Matches records by ULID; appends missing `templateVersions`, `documents`, `assets`; updates `clients`/`items`/`templates` if imported `updated_at > local.updated_at`; merges `sequences` with `Math.max(last_value)`.
2. **Replace All:** Wipes local tables after confirmation and restores the archive cleanly.

## 5. Technical Implementation
- **Files:** `src/backup/backupService.ts`, `src/features/settings/BackupRestorePage.tsx`.

## 6. Acceptance Criteria
- [ ] Exporting with password `"Secret#123"` and importing on a clean browser restores all templates, invoices, and binary blobs identically.
- [ ] Entering a wrong password during import fails decryption cleanly with `"Incorrect backup password"` before touching local data.
