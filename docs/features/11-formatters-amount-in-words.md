# 11 — Formatters, Token Pipes & Amount-in-Words

> Indian numbering formatters (`₹1,23,45,678.90`), Lakh/Crore Amount-in-Words converter, date/FY helpers, GSTIN Mod-36 checksum validator, and `{{token | pipe}}` resolver.

## 1. Overview
Pure, zero-DOM formatting and validation utilities in `src/core/format/` and `src/core/tokens/`.

## 2. Indian Currency & Number Formatting (`src/core/format/money.ts`)
- Groups rightmost 3 integer digits, then pairs of 2 digits leftward (`1234567.8` → `12,34,567.80`).
- `formatMoney(value: Decimal, opts?: { symbol?: boolean; dp?: number }): string`
  - `formatMoney("245800")` → `"₹2,45,800.00"`
  - `formatMoney("-0.48")` → `"-₹0.48"`

## 3. Amount-in-Words Transformer (`src/core/format/words.ts`)
- **Indian System (`style: 'indian'`):** Uses `Crore` ($10^7$), `Lakh` ($10^5$), `Thousand` ($10^3$), `Hundred` ($10^2$).
- **Paise Handling:** Non-zero decimal part appends `"and <Words> Paise"`.
- **Examples:**
  - `"0"` → `"Rupees Zero Only"`
  - `"125000"` → `"Rupees One Lakh Twenty-Five Thousand Only"`
  - `"2648.50"` → `"Rupees Two Thousand Six Hundred Forty-Eight and Fifty Paise Only"`

## 4. Token & Pipe Resolver (`src/core/tokens/resolver.ts`)
Evaluates `{{ path | pipe1 | pipe2:arg }}` inside text, table cells, and labels:
- `| money` → `₹1,25,000.00`
- `| money:nosymbol` → `1,25,000.00`
- `| number:2` → `1,25,000.00`
- `| percent` → `18%`
- `| words` → `Rupees One Lakh Twenty-Five Thousand Only`
- `| date:'DD MMM YYYY'` → `18 Oct 2026`
- `| upper` / `| lower` / `| default:'—'`

## 5. Indian State Codes & GSTIN Checksum (`src/core/validate/gstin.ts`)
- Full lookup table of all 38 Indian GST State/UT codes (`01` Jammu & Kashmir .. `36` Telangana, `37` Andhra Pradesh, `38` Ladakh, `97` Other Territory).
- Mod-36 weighted checksum verification on character 15 of GSTIN.

## 6. Acceptance Criteria
- [ ] Unit tests cover Indian grouping edge cases (`0`, negatives, `99,99,99,999.99`, paise rounding).
- [ ] All pipe combinations resolve deterministically in both main thread and PDF Worker.
