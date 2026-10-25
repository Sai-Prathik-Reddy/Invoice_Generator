# INGEN — Architecture Decision Records

Each ADR records **one** decision: its context, the decision itself, and what follows from it. ADRs are append-only. To change a decision, add a new ADR that supersedes the old one.

| # | Decision | Status |
|---|---|---|
| 001 | Local-first, no backend | Accepted |
| 002 | TypeScript strict + zod as the single source of types | Accepted |
| 003 | One layout model: zone-based, not device-based | Accepted |
| 004 | Immutable template versions instead of a full snapshot per document | Accepted |
| 005 | Snapshot company and client at finalize; archive the final PDF | Accepted |
| 006 | Field Registry instead of free-text variable parsing | Accepted |
| 007 | Formula engine (DAG) with the Modifier Stack as a UI layer | Accepted |
| 008 | Allocate sequence numbers only at finalize | Accepted |
| 009 | react-pdf in a Web Worker, main thread computes everything | Accepted |
| 010 | Two-step Generate → Share | Accepted |
| 011 | Secure Vault: real encryption at rest, no recovery | Accepted |
| 012 | Backups as chunked AES-GCM `.ingen` containers | Accepted |
| 013 | shadcn/ui + Tailwind CSS v4 with an INGEN glass design system | Accepted |
| 014 | Dark and light themes, purple + champagne gold | Accepted |
| 015 | India-first, with custom fields for anything else | Accepted |
| 016 | No automatic retention or purge in v1 | Accepted |
| 017 | No Indic-script PDF text in v1 | Accepted |
| 018 | Prefixed ULIDs for all IDs | Accepted |

---

### ADR-001 — Local-first, no backend
- **Context:** Small businesses want privacy, zero running cost, and an app that works with patchy connectivity.
- **Decision:** All data lives in IndexedDB (Dexie). Nothing is sent to a server. The app is a PWA that works offline after the first load.
- **Consequences:** Data durability is the user's responsibility, so we must provide backups, reminders, and `storage.persist()`. Sync is not possible in v1, but ULIDs keep it possible later.

### ADR-002 — TypeScript strict + zod
- **Context:** Templates are deeply nested JSON that is stored for years and imported from backups.
- **Decision:** zod schemas in `core/schema` are the single source. TS types are inferred from them, and every external input (DB read after migration, backup import, template pack) is parsed with them.
- **Consequences:** Some runtime cost when parsing large imports, which is acceptable. There's a single place to evolve the schema.

### ADR-003 — Zone-based layout model
- **Context:** The original plan used absolute positioning on desktop and a 12-column grid on mobile. That would mean two data models, and absolute positioning in paginating content breaks the PDF.
- **Decision:** Fixed zones (header, footer, sidebars) use absolute frames in pt. The body uses 12-column flow rows. This is the same on every device; mobile only changes the editing UX (snapping, sheets, nudge).
- **Consequences:** One renderer, one JSON format, and pagination that works correctly. Content that appears on the first page only has to live in the body.

### ADR-004 — Immutable template versions
- **Context:** Embedding a full template copy in every document wastes storage, but documents must never change after the fact.
- **Decision:** **Publish** creates a write-once `TemplateVersion`. Documents reference `template_version_id`.
- **Consequences:** The same immutability guarantee at a fraction of the storage. Requires a clear Draft and Publish UX in the builder.

### ADR-005 — Snapshot company/client and archive the PDF
- **Context:** Changing a company address, client GSTIN, or logo would otherwise change past invoices. react-pdf upgrades can also change output.
- **Decision:** At finalize, store `snapshot.company`, `snapshot.client`, the frozen `computed` values, and the final PDF as a write-once asset.
- **Consequences:** Old invoices stay exactly as they were sent. Storage grows by about 50–150 KB per finalized document, so backups get an "Include PDFs" toggle.

### ADR-006 — Field Registry
- **Context:** Parsing `{{Variables}}` out of free text gives no types, validation, or scope, and renaming a variable breaks things silently.
- **Decision:** Templates declare `fields[]` with type, scope, validation, and catalog binding. Tokens are validated against this registry. Users add custom fields through a simple "Custom field" action.
- **Consequences:** Strongly typed dynamic forms, with fewer unknown-token bugs.

### ADR-007 — Formula engine with the Modifier Stack as UI
- **Context:** A linear modifier stack can't express per-line GST rates, the CGST/SGST vs IGST split, inclusive pricing, or HSN summaries.
- **Decision:** A small, safe formula language (Pratt parser, big.js evaluation, DAG ordering, cycle detection). GST presets and the Modifier Stack UI compile down to `computed[]`.
- **Consequences:** Flexible and testable with golden fixtures. We maintain our own parser, kept small (~400 LOC).

### ADR-008 — Sequence numbers at finalize
- **Context:** GST requires consecutive invoice numbers. Numbering drafts would create gaps when drafts are deleted.
- **Decision:** Allocate the number inside a Dexie `rw` transaction when the document is finalized. Cancelled documents keep their number.
- **Consequences:** Drafts show "Draft" or a preview of the next number instead of a real number.

### ADR-009 — react-pdf in a worker; compute on the main thread
- **Context:** PDF layout is CPU-heavy, and calculations must be identical everywhere.
- **Decision:** `core/formula` runs on the main thread. The worker gets resolved data and only renders. Comlink handles the RPC, and asset bytes are transferred.
- **Consequences:** The UI stays responsive, there's one calculation path, and the worker stays simple and replaceable.

### ADR-010 — Two-step Generate → Share
- **Context:** `navigator.share()` needs transient user activation. Asynchronous PDF generation uses it up, especially on iOS Safari.
- **Decision:** Generate the PDF first and show a ready state. A separate **Share** tap calls `share()` synchronously.
- **Consequences:** One extra tap, in exchange for reliable sharing to WhatsApp and Mail.

### ADR-011 — Secure Vault: encryption at rest, no recovery
- **Context:** The user wants a password or fingerprint lock and accepts that a forgotten password means losing the data.
- **Decision:** An optional Vault. A random DEK encrypts record payloads and asset blobs. The DEK is wrapped by a PBKDF2-derived password KEK, and optionally by a WebAuthn PRF-derived biometric KEK. There is no recovery path. If a device doesn't support PRF, only the password works; the DEK is never stored unprotected.
- **Consequences:** Real protection for a lost or stolen device. Search runs on an in-memory decrypted cache. Encryption happens outside IDB transactions.

### ADR-012 — `.ingen` backup containers
- **Context:** Backups get shared over WhatsApp and Drive, can be large (PDFs and images), and must not use Base64.
- **Decision:** An fflate zip (manifest + JSON + binary assets). When a password is set, it's wrapped in chunked AES-256-GCM: a PBKDF2 key, a per-chunk IV, and an AAD that protects chunk order and the final chunk.
- **Consequences:** Memory stays bounded and tampering is detected. A forgotten backup password means that backup can't be recovered.

### ADR-013 — shadcn/ui + Tailwind v4
- **Context:** The UI must be consistent, accessible, and premium, and come together quickly.
- **Decision:** shadcn components (owned in the repo, built on Radix) themed with INGEN tokens, on Tailwind v4 with `@theme`. A design-system showcase route is built before any features.
- **Consequences:** Every screen composes system components. Ad-hoc styling of features is discouraged in code review.

### ADR-014 — Dark + light, purple + gold
- **Decision:** "Obsidian" (dark) and "Pearl" (light) themes, defaulting to the system setting. Amethyst primary, champagne gold accent. Gold text uses a darker shade in light mode to meet contrast requirements.

### ADR-015 — India-first plus custom fields
- **Decision:** GST, UPI, the April–March FY, INR, and en-IN formatting are built in. Anything else is covered by user-defined fields on templates, companies, clients, and items.

### ADR-016 — No automatic retention in v1
- **Context:** GST records must be kept for about 6 years, and the target users are small businesses.
- **Decision:** Manual delete only. Deleting finalized documents requires typing a confirmation.

### ADR-017 — No Indic-script PDF text in v1
- **Context:** Complex text shaping in react-pdf is unreliable for Indic scripts.
- **Decision:** PDFs support Latin text and ₹ only (Inter, Roboto, Noto Sans). We'll revisit this in v2.

### ADR-018 — Prefixed ULIDs
- **Decision:** IDs look like `doc_01JB…`. They sort by time, don't collide when backups are merged, and their type is clear when debugging.
