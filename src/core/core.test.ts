import { describe, it, expect } from 'vitest';
import { amountInWords, formatMoney, getFiscalYearLabels } from './format';
import { validateAndParseGstin } from './validate/gstin';
import { evaluateDocument } from './formula';
import { formatSequencePattern } from './sequence';
import { buildGstClassicDefinition } from '../templates/starters';
import { type Company, ItemSchema } from './schema/types';

const DEMO_COMPANY: Company = {
  id: 'cmp_test',
  name: 'INGEN Test Pvt Ltd',
  gstin: '36AABCU9603R1ZV',
  address: {
    line1: 'Road 36, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    state_code: '36',
    pincode: '500033',
    country: 'India',
  },
  currency: 'INR',
  locale: 'en-IN',
  fy_start_month: 4,
  custom_fields: [],
  archived: false,
  created_at: 1,
  updated_at: 1,
};

describe('INGEN Core Engine', () => {
  it('formats Indian currency and Lakh/Crore amount in words accurately', () => {
    expect(formatMoney('245800')).toBe('₹2,45,800.00');
    expect(formatMoney('12345678.5')).toBe('₹1,23,45,678.50');
    expect(amountInWords('125000')).toBe(
      'Rupees One Lakh Twenty-Five Thousand Only'
    );
    expect(amountInWords('2648.50')).toBe(
      'Rupees Two Thousand Six Hundred Forty-Eight and Fifty Paise Only'
    );
  });

  it('validates GSTIN Mod-36 checksum and extracts State Code + PAN', () => {
    const res = validateAndParseGstin('36AABCU9603R1ZO');
    expect(res.error).toBeUndefined();
    expect(res.valid).toBe(true);
    expect(res.stateCode).toBe('36');
    expect(res.stateName).toBe('Telangana');
    expect(res.pan).toBe('AABCU9603R');

    const bad = validateAndParseGstin('36AABCU9603R1Z0');
    expect(bad.valid).toBe(false);
  });

  it('computes intra-state (CGST+SGST) and inter-state (IGST) multi-rate golden fixture with round-off', () => {
    const def = buildGstClassicDefinition();
    const intra = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      placeOfSupply: '36', // Intra-state Telangana
      values: { shipping_charges: '0', invoice_discount: '0' },
      items: [
        { item_name: 'Item A', hsn_sac: '8471', qty: '2', rate: '1000.00', discount_pct: '10', gst_rate: '18' },
        { item_name: 'Item B', hsn_sac: '8517', qty: '1', rate: '499.50', discount_pct: '0', gst_rate: '5' },
      ],
    });

    expect(intra.doc['subtotal']).toBe('2299.50');
    expect(intra.doc['cgst_total']).toBe('174.49');
    expect(intra.doc['sgst_total']).toBe('174.49');
    expect(intra.doc['igst_total']).toBe('0.00');
    expect(intra.doc['raw_total']).toBe('2648.48');
    expect(intra.doc['round_off']).toBe('-0.48');
    expect(intra.doc['grand_total']).toBe('2648.00');

    const inter = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      placeOfSupply: '29', // Inter-state Karnataka
      values: { shipping_charges: '0', invoice_discount: '0' },
      items: [
        { item_name: 'Item A', hsn_sac: '8471', qty: '2', rate: '1000.00', discount_pct: '10', gst_rate: '18' },
      ],
    });

    expect(inter.doc['cgst_total']).toBe('0.00');
    expect(inter.doc['sgst_total']).toBe('0.00');
    expect(inter.doc['igst_total']).toBe('324.00');
    expect(inter.doc['grand_total']).toBe('2124.00');
  });

  it('formats Indian FY sequence numbers across April 1 rollover', () => {
    expect(getFiscalYearLabels('2027-03-31', 4).fyShort).toBe('26-27');
    expect(getFiscalYearLabels('2027-04-01', 4).fyShort).toBe('27-28');
    expect(
      formatSequencePattern('INV/{FY}/{SEQ:4}', {
        series: 'INV',
        issueDate: '2026-10-18',
        fyStartMonth: 4,
        seq: 42,
      })
    ).toBe('INV/26-27/0042');
  });

  it('validates ItemSchema with optional barcode and ensures catalog products auto-calculate GST accurately', () => {
    const validItem = ItemSchema.parse({
      id: 'itm_001',
      company_id: 'cmp_test',
      name: 'Fortune Sunlite Sunflower Oil 1L',
      barcode: '8906007281056',
      hsn_sac: '1512',
      unit: 'LTR',
      rate: '155.00',
      tax_rate: '5',
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    expect(validItem.barcode).toBe('8906007281056');
    expect(validItem.tax_rate).toBe('5');
    expect(validItem.unit).toBe('LTR');

    // Simulate POS Barcode Scan Lookup & Continuous Checkout
    const catalog = [
      validItem,
      {
        id: 'itm_002',
        name: 'Amul Butter 500g',
        barcode: '8901262010053',
        rate: '275.00',
        tax_rate: '12',
        unit: 'PKT',
      },
    ];

    // Scan Barcode 1
    const scannedCode1 = '8906007281056';
    const match1 = catalog.find((i) => i.barcode === scannedCode1);
    expect(match1).toBeDefined();
    expect(match1?.name).toBe('Fortune Sunlite Sunflower Oil 1L');

    // Scan Barcode 1 again -> Increments quantity to 2
    let billItems: Array<Record<string, string>> = [
      {
        item_name: match1!.name,
        barcode: match1!.barcode || '',
        rate: match1!.rate,
        gst_rate: match1!.tax_rate,
        unit: match1!.unit,
        qty: '1',
      },
    ];

    const existing = billItems.find((r) => r.barcode === scannedCode1);
    expect(existing).toBeDefined();
    if (existing) {
      existing.qty = String(Number(existing.qty) + 1);
    }
    expect(billItems[0].qty).toBe('2');

    // Scan Barcode 2 -> Appends second item
    const scannedCode2 = '8901262010053';
    const match2 = catalog.find((i) => i.barcode === scannedCode2);
    expect(match2).toBeDefined();
    billItems.push({
      item_name: match2!.name,
      barcode: match2!.barcode || '',
      rate: match2!.rate,
      gst_rate: match2!.tax_rate,
      unit: match2!.unit,
      qty: '1',
    });

    expect(billItems.length).toBe(2);

    // Evaluate in Document Engine
    const def = buildGstClassicDefinition();
    const docEval = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      placeOfSupply: '36',
      values: { shipping_charges: '0', invoice_discount: '0' },
      items: billItems,
    });

    // 2 * 155 = 310 (at 5% GST -> 15.50 tax)
    // 1 * 275 = 275 (at 12% GST -> 33.00 tax)
    // Subtotal = 310 + 275 = 585
    // Total Tax = 15.50 + 33.00 = 48.50 (CGST 24.25 + SGST 24.25)
    // Grand Total = 585 + 48.50 = 633.50 -> rounded to 634.00
    expect(docEval.doc['subtotal']).toBe('585.00');
    expect(docEval.doc['cgst_total']).toBe('24.25');
    expect(docEval.doc['sgst_total']).toBe('24.25');
    expect(docEval.doc['grand_total']).toBe('634.00');
  });

  it('validates 1D retail barcodes (EAN-13, EAN-8, UPC-A) mathematically with checksums', async () => {
    const { validateEan13Checksum, validateEan8Checksum, validateUpcAChecksum } = await import(
      '../design-system/barcodeDecoder'
    );

    // Valid Indian Retail EAN-13 Barcodes (GS1 prefix 890)
    expect(validateEan13Checksum('8901030383700')).toBe(true); // Lifebuoy Soap
    expect(validateEan13Checksum('8906007281058')).toBe(true); // Fortune Sunflower Oil
    expect(validateEan13Checksum('8901262010054')).toBe(true); // Amul Butter
    expect(validateEan13Checksum('8901058852394')).toBe(true); // Maggi Noodles

    // Corrupted EAN-13 should fail
    expect(validateEan13Checksum('8901030383701')).toBe(false);
    expect(validateEan13Checksum('123456')).toBe(false);

    // Valid EAN-8 Barcodes
    expect(validateEan8Checksum('96385074')).toBe(true);
    expect(validateEan8Checksum('96385075')).toBe(false);

    // Valid UPC-A Barcodes (12-digit)
    expect(validateUpcAChecksum('012345678905')).toBe(true);
    expect(validateUpcAChecksum('012345678906')).toBe(false);
  });
});
