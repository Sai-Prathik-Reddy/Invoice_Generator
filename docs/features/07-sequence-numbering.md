# 07 — Smart Sequence Numbering

> Gap-free, transactional document numbering per company, series, and period with Indian Financial Year (`{FY}`) automatic rollover on April 1.

## 1. Overview
Generates compliant, human-readable document numbers (e.g., `INV/26-27/0001`) inside an atomic IndexedDB transaction only when a document is finalized.

## 2. Supported Pattern Tokens
| Token | Example (for `2026-10-18`) | Description |
|---|---|---|
| `{SERIES}` | `INV` | Series code from `config.sequence.series` |
| `{FY}` | `26-27` | 2-digit Indian financial year (Apr–Mar) |
| `{FY4}` | `2026-27` | 4-digit financial year |
| `{YYYY}` / `{YY}` | `2026` / `26` | Calendar year of `issue_date` |
| `{MM}` / `{DD}` | `10` / `18` | Month / Day of `issue_date` |
| `{SEQ:n}` | `0042` (`{SEQ:4}`) | Zero-padded counter (`n` = 1..8) |

## 3. Period Resolution & Reset Rules
- `reset: 'fiscal_year'`: `period = fyLabel(issue_date, company.fy_start_month)` (e.g., `"2026-27"`). Automatically starts at `1` on April 1 of a new financial year.
- `reset: 'monthly'`: `period = "YYYY-MM"`.
- `reset: 'never'`: `period = "all"`.

## 4. Transactional Allocation Algorithm
```ts
// Inside db.transaction('rw', db.sequences, db.documents, async () => { ... })
const seqId = `${companyId}|${series}|${period}`;
const current = await db.sequences.get(seqId);
const nextValue = (current?.last_value ?? 0) + 1;
await db.sequences.put({
  id: seqId,
  company_id: companyId,
  series,
  period,
  last_value: nextValue,
  updated_at: Date.now(),
});
const number = formatSequencePattern(pattern, { series, issueDate, fyStartMonth, seq: nextValue });
```

## 5. Functional Requirements
- **FR-07.1:** Users migrating from another billing app can set a custom starting sequence counter in Settings / Template Config (e.g., set `last_value = 142` so the next invoice is `0143`).
- **FR-07.2:** Backup Merge imports resolve sequence collisions via `Math.max(local.last_value, imported.last_value)`.

## 6. Acceptance Criteria
- [ ] An invoice dated `2027-03-31` gets `INV/26-27/00xx`, while `2027-04-01` starts `INV/27-28/0001`.
- [ ] Deleting drafts never creates sequence gaps.
