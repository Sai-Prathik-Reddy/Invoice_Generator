# 04 — Formula & Indian GST Engine

> Arbitrary-precision (`big.js`) DAG formula evaluator, visual Modifier Stack compiler, and Indian GST engine (CGST + SGST vs IGST split, inclusive/exclusive tax, HSN summary, and round-off).

## 1. Overview
Computes all line-item and document-level amounts deterministically using `big.js` decimal strings. Never uses JavaScript floating-point math.

## 2. User Stories
- **US-04.1:** As an Indian business owner, I want intra-state sales (`place_of_supply == company.address.state_code`) to automatically split GST 50/50 into CGST + SGST, and inter-state sales to charge IGST.
- **US-04.2:** As a user, I want to stack discounts, shipping charges, and round-off rules using a simple Modifier Stack UI or custom formulas.

## 3. Formula Grammar & Functions
- **Literals:** Decimal numbers (`18`, `0.5`), strings (`'36'`), booleans (`true`, `false`).
- **Identifiers:** Field/computed keys (`qty`, `rate`, `discount_pct`), context paths (`company.address.state_code`, `doc.place_of_supply`), column series (`items.taxable`).
- **Operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`, `!`.
- **Functions:** `sum(items.x)`, `count(items.x)`, `min(...)`, `max(...)`, `round(x, dp)`, `floor(x)`, `ceil(x)`, `abs(x)`, `if(cond, a, b)`, `coalesce(a, b)`.

## 4. GST Calculation Rules
1. **Exclusive Mode (`tax_mode = 'exclusive'`):**
   - `gross = qty * rate`
   - `discount_amt = round(gross * discount_pct / 100, 2)`
   - `taxable = gross - discount_amt`
   - `line_tax = round(taxable * gst_rate / 100, 2)`
2. **Inclusive Mode (`tax_mode = 'inclusive'`):**
   - `gross_after_disc = round(qty * rate * (1 - discount_pct / 100), 2)`
   - `taxable = round(gross_after_disc * 100 / (100 + gst_rate), 2)`
   - `line_tax = gross_after_disc - taxable`
3. **Intra-State vs Inter-State Split:**
   - If `doc.place_of_supply == company.address.state_code`: `cgst = round(line_tax / 2, 2)`, `sgst = line_tax - cgst`, `igst = "0.00"`.
   - Else: `cgst = "0.00"`, `sgst = "0.00"`, `igst = line_tax`.
4. **Summaries (`ComputedResult.summaries`):**
   - `tax`: grouped by `gst_rate`.
   - `hsn`: grouped by `(hsn_sac, gst_rate)`.
5. **Grand Total & Round-Off:**
   - `raw_total = subtotal + total_tax + shipping - invoice_discount`
   - If `grand_total === 'nearest_1'`: `grand_total = round(raw_total, 0)`, `round_off = grand_total - raw_total`.

## 5. Worked Golden Fixture (Intra-State Multi-Rate)
- Company State: `"36"` (Telangana), Place of Supply: `"36"`.
- Item 1: `qty="2"`, `rate="1000.00"`, `discount_pct="10"`, `gst_rate="18"` → `taxable="1800.00"`, `cgst="162.00"`, `sgst="162.00"`, `line_total="2124.00"`.
- Item 2: `qty="1"`, `rate="499.50"`, `discount_pct="0"`, `gst_rate="5"` → `taxable="499.50"`, `cgst="12.49"`, `sgst="12.49"`, `line_total="524.48"`.
- Document Totals: `subtotal="2299.50"`, `cgst_total="174.49"`, `sgst_total="174.49"`, `raw_total="2648.48"`, `round_off="-0.48"`, `grand_total="2648.00"`.

## 6. Technical Implementation
- **Files:** `src/core/formula/parser.ts`, `src/core/formula/dag.ts` (Kahn's topological sort + cycle detector), `src/core/formula/evaluator.ts`, `src/core/formula/gstPresets.ts`.

## 7. Acceptance Criteria
- [ ] Cyclic formulas (`a = b + 1`, `b = a + 1`) throw a descriptive `CycleError(['a', 'b'])`.
- [ ] Division by zero returns `"0.00"` without throwing.
- [ ] All 3 golden GST test suites pass with exact decimal string equality.
