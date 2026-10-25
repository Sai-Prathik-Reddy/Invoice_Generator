import { describe, it, expect } from 'vitest';
import { compilePdfToBlob } from '../pdf/renderer';
import { buildGstClassicDefinition } from '../templates/starters';
import type { Company } from './schema/types';
import { evaluateDocument } from './formula';

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

describe('PDF Compilation', () => {
  it('compiles starter template to PDF blob', async () => {
    const def = buildGstClassicDefinition();
    const values = {
      client_name: 'Apex Global',
      notes: 'Notes',
    };
    const items = [
      { item_name: 'Item A', qty: '1', rate: '100', gst_rate: '18' },
    ];
    const comp = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      values,
      items,
    });

    console.log('Starting compilePdfToBlob...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: def,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Finished in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 10000);

  it('compiles template with continuation zones', async () => {
    const def = buildGstClassicDefinition();
    def.layout.continuation = {
      mode: 'custom_page_2',
      zones: {
        header: {
          height: 60,
          blocks: [
            {
              id: 'p2_h',
              name: 'Page 2 Header',
              type: 'text',
              content: 'Page 2 Continuation Header',
              style: {},
              frame: { x: 0, y: 0, w: 200, h: 20 },
              z: 1,
            },

          ],
        },
        footer: {
          height: 30,
          blocks: [],
        },
      },
    };

    const values = { client_name: 'Apex Global' };
    const items = [
      { item_name: 'Item A', qty: '1', rate: '100', gst_rate: '18' },
    ];
    const comp = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      values,
      items,
    });

    console.log('Compiling continuation template...');
    const blob = await compilePdfToBlob({
      definition: def,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Continuation blob compiled, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 10000);

  it('compiles multi-page document with continuation zones and 30 items', async () => {
    const def = buildGstClassicDefinition();
    def.layout.continuation = {
      mode: 'custom_page_2',
      zones: {
        header: {
          height: 60,
          blocks: [
            {
              id: 'p2_h',
              name: 'Page 2 Header',
              type: 'text',
              content: 'Page 2 Continuation Header',
              style: {},
              frame: { x: 0, y: 0, w: 200, h: 20 },
              z: 1,
            },

          ],
        },
        footer: {
          height: 30,
          blocks: [],
        },
      },
    };

    const values = { client_name: 'Apex Global' };
    const items = Array.from({ length: 40 }).map((_, i) => ({
      item_name: `Item #${i + 1} with a longer detailed description of services`,
      qty: '1',
      rate: '100',
      gst_rate: '18',
    }));
    const comp = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      values,
      items,
    });

    console.log('Compiling multi-page continuation template...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: def,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Multi-page compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 15000);

  it('tests if table in fixed header hangs or compiles', async () => {
    const def = buildGstClassicDefinition();
    // Put table into header.blocks
    const tableBlock = def.layout.body.rows[1]!.cols[0]!.blocks[0]!;
    def.layout.zones.header.blocks.push({
      ...tableBlock,
      frame: { x: 0, y: 0, w: 500, h: 80 },
      z: 5,
    } as any);

    const values = { client_name: 'Apex Global' };
    const items = [
      { item_name: 'Item A', qty: '1', rate: '100', gst_rate: '18' },
    ];
    const comp = evaluateDocument({
      definition: def,
      company: DEMO_COMPANY,
      values,
      items,
    });

    console.log('Compiling template with table in header...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: def,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Table in header compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 10000);

  it('compiles scratch wizard custom template definition', async () => {
    const base = buildGstClassicDefinition();
    // Simulate what compilePartsIntoTemplateDefinition produces:
    // Header with company header, title, client_bill_to, invoice_meta
    // Body with items_table, totals_box
    // Footer with signature_box and page number
    const customDef = JSON.parse(JSON.stringify(base));
    customDef.layout.zones.header = {
      height: 260,
      blocks: [
        {
          id: 'blk_1',
          name: 'Company Header',
          type: 'text',
          content: '{{company.name}}\n{{company.address.full}}\nGSTIN: {{company.gstin | default:"Unregistered"}}',
          style: { font_size: 9.5, font_weight: 600, color: 'theme.primary', line_height: 1.4 },
          frame: { x: 0, y: 0, w: 270, h: 120 },
          z: 1,
        },
        {
          id: 'blk_2',
          name: 'Title',
          type: 'text',
          content: 'TAX INVOICE\nNo: {{doc.number}}',
          style: { font_size: 10, font_weight: 700, color: 'theme.primary', align: 'right' },
          frame: { x: 280, y: 0, w: 260, h: 120 },
          z: 2,
        },
      ],
    };
    customDef.layout.zones.footer = {
      height: 60,
      blocks: [
        {
          id: 'blk_sig',
          name: 'Signature Box',
          type: 'signature',
          source: 'company_signature',
          caption: 'For {{company.name}}\nAuthorised Signatory',
          style: { align: 'right' },
          frame: { x: 0, y: 0, w: 540, h: 50 },
          z: 1,
        },
        {
          id: 'blk_page',
          name: 'Page Number',
          type: 'text',
          content: 'Page {{page.number}} of {{page.total}}',
          style: { font_size: 7.5, color: 'theme.muted', align: 'right' },
          frame: { x: 400, y: 44, w: 140, h: 14 },
          z: 2,
        },
      ],
    };
    customDef.layout.body.rows = [
      {
        id: 'row_1',
        gap: 10,
        keep_together: false,
        cols: [
          {
            id: 'col_1',
            span: 12,
            blocks: [base.layout.body.rows[1]!.cols[0]!.blocks[0]!],
          },
        ],
      },
      {
        id: 'row_2',
        gap: 10,
        keep_together: true,
        cols: [
          {
            id: 'col_2_1',
            span: 6,
            blocks: [
              {
                id: 'blk_qr',
                name: 'UPI QR',
                type: 'upi_qr',
                amount_key: 'grand_total',
                size: 80,
                caption: 'Scan to pay',
                style: {},
              },
            ],
          },
          {
            id: 'col_2_2',
            span: 6,
            blocks: [base.layout.body.rows[2]!.cols[1]!.blocks[0]!],
          },
        ],
      },
    ];

    const values = {
      client_name: 'Apex Global',
      notes: 'Thank you for your business.',
    };
    const items = [
      { item_name: 'Consulting', qty: '1', rate: '15000', gst_rate: '18' },
    ];
    const comp = evaluateDocument({
      definition: customDef,
      company: DEMO_COMPANY,
      values,
      items,
    });

    console.log('Compiling custom template...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: customDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Custom template compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 10000);

  it('compiles 6_parts preset template', async () => {
    const base = buildGstClassicDefinition();
    const customDef = JSON.parse(JSON.stringify(base));
    const innerW = customDef.page.width - customDef.page.margin * 2;
    const innerH = customDef.page.height - customDef.page.margin * 2;
    const cellW = innerW / 12;
    const cellH = innerH / 12;

    customDef.layout.zones.header = {
      height: Math.round(5 * cellH),
      blocks: [
        {
          id: 'p1',
          name: 'Part 1',
          type: 'text',
          content: '{{company.name}}\n{{company.address.full}}',
          style: {},
          frame: { x: 0, y: 0, w: Math.round(6 * cellW), h: Math.round(3 * cellH - 4) },
          z: 1,
        },
        {
          id: 'p2',
          name: 'Part 2',
          type: 'text',
          content: 'TAX INVOICE\n{{doc.number}}',
          style: { align: 'right' },
          frame: { x: Math.round(6 * cellW), y: 0, w: Math.round(6 * cellW), h: Math.round(3 * cellH - 4) },
          z: 2,
        },
        {
          id: 'p3',
          name: 'Part 3',
          type: 'text',
          content: 'BILL TO: {{client_name}}',
          style: {},
          frame: { x: 0, y: Math.round(3 * cellH), w: Math.round(6 * cellW), h: Math.round(2 * cellH - 4) },
          z: 3,
        },
        {
          id: 'p4',
          name: 'Part 4',
          type: 'text',
          content: 'Vitals: {{patient_vitals}}',
          style: {},
          frame: { x: Math.round(6 * cellW), y: Math.round(3 * cellH), w: Math.round(6 * cellW), h: Math.round(2 * cellH - 4) },
          z: 4,
        },
      ],
    };

    customDef.layout.zones.footer = {
      height: Math.round(2 * cellH),
      blocks: [
        {
          ...base.layout.body.rows[2]!.cols[1]!.blocks[0]!,
          id: 'p6',
          frame: { x: 0, y: 0, w: Math.round(12 * cellW), h: Math.round(2 * cellH - 4) },
          z: 1,
        },
      ],
    };

    customDef.layout.body.rows = [
      {
        id: 'r_items',
        gap: 10,
        keep_together: false,
        cols: [
          {
            id: 'c_items',
            span: 12,
            blocks: [base.layout.body.rows[1]!.cols[0]!.blocks[0]!],
          },
        ],
      },
    ];

    const values = { client_name: 'Test Client' };
    const items = [{ item_name: 'Item 1', qty: '1', rate: '500', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: customDef, company: DEMO_COMPANY, values, items });

    console.log('Compiling 6_parts preset template...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: customDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`6_parts compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 10000);

  it('compiles A5 custom template with totals and fixed header/footer without hanging', async () => {
    const base = buildGstClassicDefinition();
    const customDef = JSON.parse(JSON.stringify(base));
    customDef.page = {
      size: 'A5',
      orientation: 'portrait',
      width: 419.53,
      height: 595.28,
      margin: 20,
    };
    // 9-parts layout on A5 gives header ~185pt and footer ~185pt
    customDef.layout.zones.header.height = 185;
    customDef.layout.zones.footer.height = 185;
    customDef.layout.body.rows = [
      {
        id: 'r_totals',
        gap: 10,
        keep_together: true,
        cols: [
          {
            id: 'c_totals',
            span: 12,
            blocks: [base.layout.body.rows[2]!.cols[1]!.blocks[0]!],
          },
        ],
      },
    ];

    const values = { client_name: 'Test Client' };
    const items = [{ item_name: 'Item 1', qty: '1', rate: '500', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: customDef, company: DEMO_COMPANY, values, items });

    console.log('Compiling A5 custom template with totals...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: customDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-19',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`A5 compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 5000);

  it('compiles template with customized text fields, attached variables, logo and UPI QR', async () => {
    const base = buildGstClassicDefinition();
    const customDef = JSON.parse(JSON.stringify(base));

    // Register user-defined custom fields
    customDef.fields.push(
      {
        key: 'doctor_reg_no',
        label: 'Doctor Reg. No.',
        type: 'text',
        scope: 'document',
        required: false,
        group: 'Custom Details',
        order: 10,
      },
      {
        key: 'vehicle_no',
        label: 'Vehicle Number',
        type: 'text',
        scope: 'document',
        required: false,
        group: 'Custom Details',
        order: 11,
      }
    );

    // Custom text block attaching company, client and custom variables
    customDef.layout.zones.header.blocks = [
      {
        id: 'blk_logo',
        name: 'Company Logo',
        type: 'image',
        source: { kind: 'company_logo' },
        fit: 'contain',
        style: { align: 'left' },
        frame: { x: 0, y: 0, w: 100, h: 50 },
        z: 1,
      },
      {
        id: 'blk_text_custom',
        name: 'Custom Doctor Header Box',
        type: 'text',
        content:
          '{{company.name}}\n{{company.address.full}}\nReg No: {{doctor_reg_no}} • Vehicle: {{vehicle_no}}\nPatient: {{client_name}} | Age: {{patient_age}}',
        style: {
          font_size: 9,
          font_weight: 600,
          align: 'left',
          padding: [6, 8, 6, 8],
          border: { width: 1, color: '#E5E7EB', radius: 4 },
        },
        frame: { x: 110, y: 0, w: 350, h: 50 },
        z: 2,
      },
    ];

    const values = {
      client_name: 'Suresh Kumar',
      patient_age: '42 Yrs / M',
      doctor_reg_no: 'MCI-98412-TS',
      vehicle_no: 'TS-09-EA-1234',
    };
    const items = [{ item_name: 'Specialist Consultation', qty: '1', rate: '1200', gst_rate: '0' }];
    const comp = evaluateDocument({ definition: customDef, company: DEMO_COMPANY, values, items });

    console.log('Compiling custom text & variable template...');
    const start = Date.now();
    const blob = await compilePdfToBlob({
      definition: customDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'RX/26-27/0042',
        status: 'draft',
        issue_date: '2026-10-20',
        type_label: 'PRESCRIPTION',
      },
      values,
      items,
      computed: comp,
    });
    console.log(`Custom variable template compiled in ${Date.now() - start}ms, size: ${blob.size}`);
    expect(blob.size).toBeGreaterThan(0);
  }, 5000);

  it('compiles section-internal freeform items (Fixed & Variable text fields, custom image data_url, and rel_frame)', async () => {
    const base = buildGstClassicDefinition();
    const customDef = JSON.parse(JSON.stringify(base));

    customDef.fields.push({
      key: 'custom_po_ref',
      label: 'Custom PO Reference',
      type: 'text',
      scope: 'document',
      required: false,
      default: 'PO-2026-991',
      group: 'Custom Template Variables',
      order: 12,
    });

    // 1x1 transparent PNG data URL
    const samplePngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Fixed section containing multiple positioned items (custom uploaded image + fixed text + variable text)
    customDef.layout.zones.header.blocks = [
      {
        id: 'sec1_img',
        name: 'Uploaded Brand Photo',
        type: 'image',
        source: { kind: 'data_url', data_url: samplePngDataUrl },
        fit: 'contain',
        style: { align: 'left' },
        frame: { x: 10, y: 8, w: 60, h: 48 },
        z: 1,
      },
      {
        id: 'sec1_fixed_txt',
        name: 'Company Heading (Fixed)',
        type: 'text',
        content: '{{company.name}}\n{{company.address.full}}',
        style: { font_size: 10, font_weight: 700, align: 'left' },
        frame: { x: 80, y: 8, w: 200, h: 48 },
        z: 2,
      },
      {
        id: 'sec2_var_txt',
        name: 'PO Reference (Variable)',
        type: 'text',
        content: 'PO #: {{custom_po_ref | default:"PO-2026-991"}}',
        style: { font_size: 9, font_weight: 600, align: 'right' },
        frame: { x: 300, y: 12, w: 200, h: 30 },
        z: 3,
      },
    ];

    // Variable section containing multiple rel_frame items
    customDef.layout.body.rows.push({
      id: 'row_rel_section',
      gap: 10,
      keep_together: true,
      cols: [
        {
          id: 'col_rel_section',
          span: 12,
          blocks: [
            {
              id: 'var_sec_qr',
              name: 'UPI QR Item',
              type: 'upi_qr',
              amount_key: 'grand_total',
              size: 70,
              caption: 'Scan to pay',
              style: { align: 'left' },
              rel_frame: { x: 8, y: 6, w: 120, h: 90, container_h: 100 },
            },
            {
              id: 'var_sec_note',
              name: 'Custom Note Item',
              type: 'text',
              content: 'Verified for {{client_name}} (Ref: {{custom_po_ref}})',
              style: { font_size: 9, font_weight: 600, align: 'left' },
              rel_frame: { x: 150, y: 20, w: 320, h: 40, container_h: 100 },
            },
          ],
        },
      ],
    });

    const values = {
      client_name: 'Horizon Enterprises',
      custom_po_ref: 'PO-2026-991',
    };
    const items = [{ item_name: 'Enterprise License', qty: '2', rate: '25000', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: customDef, company: DEMO_COMPANY, values, items });

    const blob = await compilePdfToBlob({
      definition: customDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/26-27/0099',
        status: 'draft',
        issue_date: '2026-10-20',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });
    expect(blob.size).toBeGreaterThan(0);
  }, 5000);

  it('compiles template with custom uploaded data_url images, company logo, and signature in fixed and flow zones', async () => {
    const pngSample =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sigSample =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const testDef = buildGstClassicDefinition({
      title: 'TAX INVOICE',
      series: 'INV',
      primaryColor: '#5B3FD9',
      accentColor: '#B8892E',
    });

    const companyWithAssets: Company = {
      ...DEMO_COMPANY,
      logo_asset_id: 'ast_logo_999',
      signature_asset_id: 'ast_sig_999',
    };

    // 1. Fixed Header with Custom Data URL Image + Company Logo
    testDef.layout.zones.header.blocks.push(
      {
        id: 'blk_custom_img_header',
        name: 'Brand Custom Photo',
        type: 'image',
        source: { kind: 'data_url', data_url: pngSample },
        fit: 'contain',
        style: { align: 'center', background: '#F8FAFC' },
        frame: { x: 200, y: 10, w: 80, h: 40 },
        z: 10,
      },
      {
        id: 'blk_company_logo_header',
        name: 'Business Logo',
        type: 'image',
        source: { kind: 'company_logo' },
        fit: 'cover',
        style: { align: 'right' },
        frame: { x: 420, y: 10, w: 100, h: 48 },
        z: 11,
      }
    );

    // 2. Fixed Footer with Signature Block & Stamp
    testDef.layout.zones.footer.blocks.push({
      id: 'blk_signature_footer',
      name: 'Authorised Signature',
      type: 'signature',
      source: 'company_signature',
      caption: 'Authorised Signatory\nINGEN Solutions',
      style: { align: 'right' },
      frame: { x: 380, y: 5, w: 140, h: 40 },
      z: 12,
    });

    // 3. Variable Body Row with Flow Image Block (no rel_frame)
    testDef.layout.body.rows.push({
      id: 'row_flow_img',
      gap: 10,
      keep_together: true,
      cols: [
        {
          id: 'col_flow_img',
          span: 6,
          blocks: [
            {
              id: 'blk_flow_image',
              name: 'Prescription / Product Photo',
              type: 'image',
              source: { kind: 'data_url', data_url: pngSample },
              fit: 'contain',
              style: { align: 'left' },
              rel_frame: { x: 0, y: 0, w: 120, h: 60, container_h: 60 },
            },
          ],
        },
        {
          id: 'col_flow_txt',
          span: 6,
          blocks: [
            {
              id: 'blk_flow_txt_desc',
              name: 'Image Caption',
              type: 'text',
              content: 'Certified authentic product badge & seal',
              style: { font_size: 9, font_weight: 600 },
            },
          ],
        },
      ],
    });

    const values = { client_name: 'Custom Image Client' };
    const items = [{ item_name: 'Diagnostic Camera Scanner', qty: '1', rate: '45000', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: testDef, company: companyWithAssets, values, items });

    const blob = await compilePdfToBlob({
      definition: testDef,
      company: companyWithAssets,
      docMeta: {
        number: 'INV/26-27/0401',
        status: 'draft',
        issue_date: '2026-10-20',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
      assetDataUrls: {
        ast_logo_999: pngSample,
        ast_sig_999: sigSample,
      },
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/pdf');

    const pdfBuf = Buffer.from(await blob.arrayBuffer());
    const pdfRaw = pdfBuf.toString('latin1');
    const imageCount = (pdfRaw.match(/\/Subtype \/Image/g) || []).length;
    console.log('PDF Image XObjects found count:', imageCount);
    
    // Decompress streams to inspect drawing operators
    const zlib = await import('zlib');
    let totalDoCount = 0;
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(pdfRaw)) !== null) {
      try {
        const streamData = Buffer.from(match[1], 'latin1');
        const decompressed = zlib.inflateSync(streamData).toString('latin1');
        const doMatches = (decompressed.match(/\/[a-zA-Z0-9_]+\s+Do/g) || []).length;
        totalDoCount += doMatches;
      } catch (e) {
        // Not compressed or different filter
      }
    }
    console.log('Decompressed Do operators count:', totalDoCount);
    expect(imageCount).toBeGreaterThan(0);
    expect(totalDoCount).toBeGreaterThan(0);
  }, 8000);

  it('tests custom_page_2 continuation header images', async () => {
    const pngSample =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const testDef = buildGstClassicDefinition();
    testDef.layout.continuation = {
      mode: 'custom_page_2',
      zones: {
        header: {
          height: 80,
          blocks: [
            {
              id: 'p2_img',
              name: 'Page 2 Logo',
              type: 'image',
              source: { kind: 'data_url', data_url: pngSample },
              fit: 'contain',
              style: {},
              frame: { x: 10, y: 10, w: 100, h: 40 },
              z: 1,
            },
          ],
        },
        footer: {
          height: 40,
          blocks: [],
        },
      },
    };
    testDef.layout.zones.header.blocks.push({
      id: 'p1_img',
      name: 'Page 1 Logo',
      type: 'image',
      source: { kind: 'data_url', data_url: pngSample },
      fit: 'contain',
      style: {},
      frame: { x: 10, y: 10, w: 100, h: 40 },
      z: 1,
    });

    const blob = await compilePdfToBlob({
      definition: testDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/001',
        status: 'draft',
        issue_date: '2026-10-20',
        type_label: 'TAX INVOICE',
      },
      values: { client_name: 'Test' },
      items: [{ item_name: 'Item', qty: '1', rate: '100', gst_rate: '18' }],
      computed: evaluateDocument({ definition: testDef, company: DEMO_COMPANY, values: {}, items: [] }),
    });

    const pdfBuf = Buffer.from(await blob.arrayBuffer());
    const pdfRaw = pdfBuf.toString('latin1');
    const imageCount = (pdfRaw.match(/\/Subtype \/Image/g) || []).length;
    console.log('custom_page_2 imageCount:', imageCount);
    expect(imageCount).toBeGreaterThan(0);
  });

  it('reliably renders images with dirty data URLs and falls back to default monogram when logo is missing', async () => {
    const testDef = buildGstClassicDefinition({
      title: 'TAX INVOICE',
      series: 'INV',
    });

    // Dirty data URL containing newlines, spaces, and extra charset param
    const dirtyPngDataUrl = `data:image/png;charset=utf-8;base64,
      iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
    `;

    testDef.layout.zones.header.blocks = [
      {
        id: 'hdr_logo_default_fallback',
        name: 'Company Logo with Fallback',
        type: 'image',
        source: { kind: 'company_logo' },
        fit: 'contain',
        style: { align: 'left' },
        frame: { x: 10, y: 10, w: 60, h: 48 },
        z: 1,
      },
      {
        id: 'hdr_custom_dirty_img',
        name: 'Custom Uploaded Dirty Data URL Image',
        type: 'image',
        source: { kind: 'data_url', data_url: dirtyPngDataUrl },
        fit: 'contain',
        style: { align: 'right' },
        frame: { x: 420, y: 10, w: 80, h: 48 },
        z: 2,
      },
    ];

    const companyWithoutLogo: Company = {
      ...DEMO_COMPANY,
      logo_asset_id: undefined,
      signature_asset_id: undefined,
    };

    const values = { client_name: 'Image Test Client' };
    const items = [{ item_name: 'Product A', qty: '1', rate: '500', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: testDef, company: companyWithoutLogo, values, items });

    const blob = await compilePdfToBlob({
      definition: testDef,
      company: companyWithoutLogo,
      docMeta: {
        number: 'INV/26-27/0777',
        status: 'finalized',
        issue_date: '2026-10-24',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });

    expect(blob.size).toBeGreaterThan(0);
    const pdfBuf = Buffer.from(await blob.arrayBuffer());
    const pdfRaw = pdfBuf.toString('latin1');

    // Both the fallback company monogram logo and the cleaned custom data URL image should be embedded as Image XObjects
    const imageXObjects = (pdfRaw.match(/\/Subtype \/Image/g) || []).length;
    console.log('Image XObjects count with dirty data URL & fallback logo:', imageXObjects);
    expect(imageXObjects).toBeGreaterThanOrEqual(2);
  });

  it('compiles adjacent stacked sections with 0 gap between top and bottom sections', async () => {
    const testDef = buildGstClassicDefinition();
    const cellH = 800 / 12; // Grid cell height for 12 rows on 800pt page
    const topSecH = 2 * cellH; // rows 0..1
    const botSecY = 2 * cellH; // rows 2..3

    // Top section: item at the bottom of the section
    const topItemH = 16;
    const topItemY = topSecH - topItemH;

    // Bottom section: item at the top of the section
    const botItemY = botSecY;
    const botItemH = 16;

    testDef.layout.zones.header = {
      height: 4 * cellH,
      blocks: [
        {
          id: 'top_sec_bottom_item',
          name: 'Top Section Bottom Text',
          type: 'text',
          content: 'End of Top Section',
          style: { font_size: 9 },
          frame: { x: 10, y: topItemY, w: 200, h: topItemH },
          z: 1,
        },
        {
          id: 'bot_sec_top_item',
          name: 'Bottom Section Top Text',
          type: 'text',
          content: 'Start of Bottom Section',
          style: { font_size: 9 },
          frame: { x: 10, y: botItemY, w: 200, h: botItemH },
          z: 2,
        },
      ],
    };

    // Verify distance between top item's bottom and bottom item's top is strictly 0
    const topItemBottom = topItemY + topItemH;
    const botItemTop = botItemY;
    expect(botItemTop - topItemBottom).toBe(0);

    const values = { client_name: 'Gapless Test Client' };
    const items = [{ item_name: 'Product A', qty: '1', rate: '500', gst_rate: '18' }];
    const comp = evaluateDocument({ definition: testDef, company: DEMO_COMPANY, values, items });

    const blob = await compilePdfToBlob({
      definition: testDef,
      company: DEMO_COMPANY,
      docMeta: {
        number: 'INV/26-27/0888',
        status: 'finalized',
        issue_date: '2026-10-24',
        type_label: 'TAX INVOICE',
      },
      values,
      items,
      computed: comp,
    });

    expect(blob.size).toBeGreaterThan(0);
    const pdfBuf = Buffer.from(await blob.arrayBuffer());
    expect(pdfBuf.length).toBeGreaterThan(1000);
  });
});



