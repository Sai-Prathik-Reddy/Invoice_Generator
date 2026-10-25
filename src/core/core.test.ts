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

  it('formats multilingual Soundbox announcements and WhatsApp invoice receipts with UPI links', async () => {
    const { formatBillAnnouncementText } = await import('./soundbox');
    const { formatWhatsAppInvoiceMessage } = await import('../features/share/whatsappShare');

    // Test Soundbox Voice announcements
    expect(formatBillAnnouncementText('435', 'en-IN')).toBe('Bill total: 435 Rupees');
    expect(formatBillAnnouncementText('435', 'hi-IN')).toBe('बिल राशि: 435 रुपये');
    expect(formatBillAnnouncementText('435', 'te-IN')).toBe('బిల్లు మొత్తం: 435 రూపాయలు');
    expect(formatBillAnnouncementText('435', 'ta-IN')).toBe('பில் தொகை: 435 ரூபாய்');
    expect(formatBillAnnouncementText('435', 'kn-IN')).toBe('ಬಿಲ್ ಮೊತ್ತ: 435 ರೂಪಾಯಿ');
    expect(formatBillAnnouncementText('435', 'mr-IN')).toBe('बिल रक्कम: 435 रुपये');

    // Test WhatsApp Invoice Message with UPI Link and Store Footer
    const msg = formatWhatsAppInvoiceMessage({
      customerName: 'Rajesh',
      companyName: 'Sharma Grocery Store',
      invoiceNumber: 'INV-26-27-0042',
      date: '2026-10-25',
      grandTotal: '435.00',
      isPaid: false,
      upiVpa: 'sharma@upi',
      items: [
        { name: 'Parle-G Biscuit', qty: '2', rate: '10' },
        { name: 'Fortune Oil 1L', qty: '1', rate: '155' },
      ],
      language: 'en-IN',
    });

    expect(msg).toContain('Sharma Grocery Store');
    expect(msg).toContain('INV-26-27-0042');
    expect(msg).toContain('₹435.00');
    expect(msg).toContain('upi://pay?pa=sharma@upi');
    expect(msg).toContain('Thank you for shopping with Sharma Grocery Store!');

    // Test Telugu WhatsApp Receipt
    const teluguMsg = formatWhatsAppInvoiceMessage({
      customerName: 'Ramesh',
      companyName: 'Sri Balaji Traders',
      invoiceNumber: 'INV-001',
      date: '2026-10-25',
      grandTotal: '250.00',
      isPaid: true,
      items: [{ name: 'Rice 1kg', qty: '1', rate: '250' }],
      language: 'te-IN',
    });
    expect(teluguMsg).toContain('నమస్కారం Ramesh గారు');
    expect(teluguMsg).toContain('Sri Balaji Traders లో కొనుగోలు చేసినందుకు ధన్యవాదాలు');
  });

  it('exports and parses Inventory and Clients CSV files accurately with escaping', async () => {
    const {
      exportInventoryToCsv,
      parseInventoryCsv,
      exportClientsToCsv,
      parseClientsCsv,
    } = await import('../features/catalog/csvService');

    // Test Inventory CSV round-trip
    const testItems = [
      {
        id: 'itm_1',
        company_id: 'cmp_1',
        name: 'Basmati Rice, Super 1kg',
        barcode: '8901030383700',
        rate: '145.00',
        tax_rate: '5',
        unit: 'KG',
        hsn_sac: '1006',
        stock_qty: 45,
        low_stock_threshold: 10,
        price_includes_tax: false,
        custom_fields: [],
        use_count: 5,
        created_at: 1000,
        updated_at: 1000,
      },
    ];

    const csvOutput = exportInventoryToCsv(testItems);
    expect(csvOutput).toContain('"Basmati Rice, Super 1kg"');
    expect(csvOutput).toContain('8901030383700');
    expect(csvOutput).toContain('45');

    const parsedItems = parseInventoryCsv(csvOutput);
    expect(parsedItems.length).toBe(1);
    expect(parsedItems[0]!.name).toBe('Basmati Rice, Super 1kg');
    expect(parsedItems[0]!.barcode).toBe('8901030383700');
    expect(parsedItems[0]!.stock_qty).toBe(45);
    expect(parsedItems[0]!.low_stock_threshold).toBe(10);

    // Test Clients CSV
    const testClients = [
      {
        id: 'cli_1',
        company_id: 'cmp_1',
        name: 'Priya Traders',
        gstin: '36AAAAA0000A1Z5',
        phone: '9876543210',
        billing_address: {
          line1: 'Shop 4, Market Road',
          city: 'Hyderabad',
          state: 'Telangana',
          state_code: '36',
          pincode: '500001',
          country: 'India',
        },
        custom_fields: [],
        use_count: 3,
        created_at: 1000,
        updated_at: 1000,
      },
    ];

    const clientCsv = exportClientsToCsv(testClients);
    expect(clientCsv).toContain('Priya Traders');
    expect(clientCsv).toContain('36AAAAA0000A1Z5');
    expect(clientCsv).toContain('9876543210');

    const parsedClients = parseClientsCsv(clientCsv);
    expect(parsedClients.length).toBe(1);
    expect(parsedClients[0]!.name).toBe('Priya Traders');
    expect(parsedClients[0]!.gstin).toBe('36AAAAA0000A1Z5');
    expect(parsedClients[0]!.phone).toBe('9876543210');
  });
});
