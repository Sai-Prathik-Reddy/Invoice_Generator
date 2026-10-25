import { z } from 'zod';

export const DecimalSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Must be a valid decimal string');

export type Decimal = z.infer<typeof DecimalSchema>;

export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export type ISODate = z.infer<typeof ISODateSchema>;

export const AddressSchema = z.object({
  line1: z.string().default(''),
  line2: z.string().optional(),
  city: z.string().default(''),
  state: z.string().default('Telangana'),
  state_code: z.string().default('36'),
  pincode: z.string().default(''),
  country: z.string().default('India'),
});
export type Address = z.infer<typeof AddressSchema>;

export const CustomFieldValueSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  show_on_pdf: z.boolean().default(true),
});
export type CustomFieldValue = z.infer<typeof CustomFieldValueSchema>;

export const DocTypeSchema = z.enum([
  'tax_invoice',
  'bill_of_supply',
  'quotation',
  'estimate',
  'proforma',
  'receipt',
  'credit_note',
  'delivery_challan',
  'prescription',
  'custom',
]);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  tax_invoice: 'Tax Invoice',
  bill_of_supply: 'Bill of Supply',
  quotation: 'Quotation',
  estimate: 'Estimate',
  proforma: 'Proforma Invoice',
  receipt: 'Payment Receipt',
  credit_note: 'Credit Note',
  delivery_challan: 'Delivery Challan',
  prescription: 'Prescription',
  custom: 'Custom Document',
};

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Business name is required'),
  legal_name: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: AddressSchema,
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  logo_asset_id: z.string().optional(),
  signature_asset_id: z.string().optional(),
  upi: z
    .object({
      vpa: z.string(),
      payee_name: z.string(),
    })
    .optional(),
  bank: z
    .object({
      account_name: z.string(),
      account_no: z.string(),
      ifsc: z.string(),
      bank_name: z.string(),
      branch: z.string().optional(),
    })
    .optional(),
  currency: z.literal('INR').default('INR'),
  locale: z.literal('en-IN').default('en-IN'),
  fy_start_month: z.number().default(4),
  default_template_id: z.string().optional(),
  custom_fields: z.array(CustomFieldValueSchema).default([]),
  archived: z.boolean().default(false),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Company = z.infer<typeof CompanySchema>;

export const ClientSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string().min(1, 'Client name is required'),
  contact_person: z.string().optional(),
  gstin: z.string().optional(),
  billing_address: AddressSchema,
  shipping_address: AddressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  custom_fields: z.array(CustomFieldValueSchema).default([]),
  use_count: z.number().default(0),
  last_used_at: z.number().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Client = z.infer<typeof ClientSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  hsn_sac: z.string().optional(),
  unit: z.string().default('NOS'),
  rate: DecimalSchema.default('0'),
  tax_rate: DecimalSchema.default('18'),
  price_includes_tax: z.boolean().default(false),
  stock_qty: z.number().default(0),
  low_stock_threshold: z.number().default(5),
  custom_fields: z.array(CustomFieldValueSchema).default([]),
  use_count: z.number().default(0),
  last_used_at: z.number().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Item = z.infer<typeof ItemSchema>;

// --- Template Definition ("Golden" Schema) ---

export const FieldTypeSchema = z.enum([
  'text',
  'multiline',
  'number',
  'money',
  'percent',
  'date',
  'select',
  'multiselect',
  'boolean',
  'phone',
  'email',
  'gstin',
  'state',
  'image',
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const CatalogBindingSchema = z.object({
  source: z.enum(['clients', 'items']),
  match_on: z.literal('name').default('name'),
  fills: z.record(z.string(), z.string()),
});
export type CatalogBinding = z.infer<typeof CatalogBindingSchema>;

export const FieldDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FieldTypeSchema,
  scope: z.enum(['document', 'line_item']),
  required: z.boolean().default(false),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z
    .object({
      min: z.string().optional(),
      max: z.string().optional(),
      pattern: z.string().optional(),
      max_length: z.number().optional(),
    })
    .optional(),
  catalog: CatalogBindingSchema.optional(),
  system: z.boolean().optional(),
  group: z.string().optional(),
  order: z.number().default(0),
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

export const ComputedDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  scope: z.enum(['document', 'line_item']),
  expr: z.string(),
  format: z.enum(['money', 'number', 'percent', 'text']).default('money'),
  dp: z.number().optional(),
  system: z.boolean().optional(),
  source: z.object({ modifier_stack_id: z.string() }).optional(),
});
export type ComputedDef = z.infer<typeof ComputedDefSchema>;

export const BlockStyleSchema = z.object({
  font_size: z.number().optional(),
  font_weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).optional(),
  italic: z.boolean().optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  line_height: z.number().optional(),
  letter_spacing: z.number().optional(),
  text_transform: z.enum(['none', 'uppercase']).optional(),
  background: z.string().optional(),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  border: z
    .object({
      width: z.number(),
      color: z.string(),
      radius: z.number(),
      sides: z.array(z.enum(['t', 'r', 'b', 'l'])).optional(),
    })
    .optional(),
  opacity: z.number().optional(),
  font_family: z.string().optional(),
});
export type BlockStyle = z.infer<typeof BlockStyleSchema>;

const BlockBaseSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  style: BlockStyleSchema.default({}),
  visible_if: z.string().optional(),
  locked: z.boolean().optional(),
  rel_frame: z
    .object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      container_h: z.number(),
    })
    .optional(),
});

export const TextBlockSchema = BlockBaseSchema.extend({
  type: z.literal('text'),
  content: z.string(),
});

export const FieldPairBlockSchema = BlockBaseSchema.extend({
  type: z.literal('field_pair'),
  label: z.string(),
  value: z.string(),
  layout: z.enum(['inline', 'stacked']).default('inline'),
  label_width: z.number().optional(),
});

export const ImageBlockSchema = BlockBaseSchema.extend({
  type: z.literal('image'),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('asset'), asset_id: z.string() }),
    z.object({ kind: z.literal('company_logo') }),
    z.object({ kind: z.literal('company_signature') }),
    z.object({ kind: z.literal('data_url'), data_url: z.string() }),
    z.object({ kind: z.literal('field'), field_key: z.string() }),
  ]),
  fit: z.enum(['contain', 'cover']).default('contain'),
});

export const ShapeBlockSchema = BlockBaseSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse', 'line']),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  stroke_width: z.number().optional(),
});

export const DividerBlockSchema = BlockBaseSchema.extend({
  type: z.literal('divider'),
  thickness: z.number().default(1),
  color: z.string().default('theme.border'),
  dashed: z.boolean().optional(),
});

export const SpacerBlockSchema = BlockBaseSchema.extend({
  type: z.literal('spacer'),
  height: z.number().default(12),
});

export const TableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  value: z.string(),
  width: z.number().default(2),
  align: z.enum(['left', 'center', 'right']).default('left'),
});
export type TableColumn = z.infer<typeof TableColumnSchema>;

export const TableBlockSchema = BlockBaseSchema.extend({
  type: z.literal('table'),
  columns: z.array(TableColumnSchema),
  show_serial: z.boolean().default(true),
  header_style: BlockStyleSchema.default({}),
  row_style: BlockStyleSchema.default({}),
  striped: z.boolean().default(true),
  repeat_header: z.boolean().default(true),
  min_rows: z.number().optional(),
  table_design: z
    .enum(['card', 'horizontal_only', 'grid', 'invisible', 'minimalist'])
    .default('card')
    .optional(),
  border_color: z.string().optional(),
});

export const TotalsBlockSchema = BlockBaseSchema.extend({
  type: z.literal('totals'),
  rows: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      emphasis: z.boolean().optional(),
      visible_if: z.string().optional(),
    })
  ),
  show_amount_in_words: z.boolean().default(true),
});

export const TaxSummaryBlockSchema = BlockBaseSchema.extend({
  type: z.literal('tax_summary'),
});

export const HsnSummaryBlockSchema = BlockBaseSchema.extend({
  type: z.literal('hsn_summary'),
});

export const UpiQrBlockSchema = BlockBaseSchema.extend({
  type: z.literal('upi_qr'),
  amount_key: z.string().default('grand_total'),
  caption: z.string().optional(),
  size: z.number().default(90),
});

export const SignatureBlockSchema = BlockBaseSchema.extend({
  type: z.literal('signature'),
  source: z.enum(['company_signature', 'none']).default('company_signature'),
  caption: z.string().default('Authorised Signatory'),
});

export const CustomKvBlockSchema = BlockBaseSchema.extend({
  type: z.literal('custom_kv'),
  source: z.enum(['company', 'client']).default('company'),
  columns: z.union([z.literal(1), z.literal(2)]).default(2),
});

export const BankDetailsBlockSchema = BlockBaseSchema.extend({
  type: z.literal('bank_details'),
  title: z.string().default('Bank & Payment Details'),
});

export const BlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  FieldPairBlockSchema,
  ImageBlockSchema,
  ShapeBlockSchema,
  DividerBlockSchema,
  SpacerBlockSchema,
  TableBlockSchema,
  TotalsBlockSchema,
  TaxSummaryBlockSchema,
  HsnSummaryBlockSchema,
  UpiQrBlockSchema,
  SignatureBlockSchema,
  CustomKvBlockSchema,
  BankDetailsBlockSchema,
]);
export type Block = z.infer<typeof BlockSchema>;

export const FrameSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
});
export type Frame = z.infer<typeof FrameSchema>;

export const FixedBlockSchema = z.intersection(
  BlockSchema,
  z.object({
    frame: FrameSchema,
    z: z.number().default(1),
  })
);
export type FixedBlock = z.infer<typeof FixedBlockSchema>;

export const BodyRowSchema = z.object({
  id: z.string(),
  cols: z.array(
    z.object({
      id: z.string(),
      span: z.number().min(1).max(12),
      blocks: z.array(BlockSchema),
    })
  ),
  gap: z.number().default(12),
  keep_together: z.boolean().default(false),
  min_presence_ahead: z.number().optional(),
  visible_if: z.string().optional(),
});
export type BodyRow = z.infer<typeof BodyRowSchema>;

export const PageSetupSchema = z.object({
  size: z.enum(['A4', 'A5', 'LETTER', 'THERMAL_80', 'CUSTOM']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  width: z.number().default(595.28),
  height: z.number().default(841.89),
  margin: z.number().default(24),
});
export type PageSetup = z.infer<typeof PageSetupSchema>;

export const ThemeSchema = z.object({
  font_family: z.enum(['Inter', 'Roboto', 'NotoSans', 'RobotoMono']).default('Inter'),
  base_font_size: z.number().default(9),
  colors: z.object({
    primary: z.string().default('#5B3FD9'),
    accent: z.string().default('#B8892E'),
    text: z.string().default('#111827'),
    muted: z.string().default('#6B7280'),
    border: z.string().default('#E5E7EB'),
    table_header_bg: z.string().default('#F3F0FF'),
    table_stripe_bg: z.string().default('#FAFAFC'),
  }),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const TemplateConfigSchema = z.object({
  currency: z.literal('INR').default('INR'),
  locale: z.literal('en-IN').default('en-IN'),
  tax_mode: z.enum(['exclusive', 'inclusive', 'none']).default('exclusive'),
  gst_preset: z.enum(['standard', 'composition', 'none']).default('standard'),
  sequence: z.object({
    series: z.string().default('INV'),
    pattern: z.string().default('INV/{FY}/{SEQ:4}'),
    reset: z.enum(['never', 'fiscal_year', 'monthly']).default('fiscal_year'),
  }),
  rounding: z.object({
    line_dp: z.number().default(2),
    mode: z.enum(['half_up', 'half_even', 'down', 'up']).default('half_up'),
    grand_total: z.enum(['none', 'nearest_1', 'nearest_0_50']).default('nearest_1'),
    show_round_off_line: z.boolean().default(true),
  }),
  amount_words: z.object({
    enabled: z.boolean().default(true),
    style: z.enum(['indian', 'international']).default('indian'),
    prefix: z.string().default('Rupees'),
    suffix: z.string().default('Only'),
  }),
  due_days: z.number().optional(),
  watermark: z
    .object({
      draft: z.boolean().default(true),
      cancelled: z.boolean().default(true),
    })
    .optional(),
});
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

export const TemplateDefinitionSchema = z.object({
  schema_version: z.literal(1).default(1),
  page: PageSetupSchema,
  theme: ThemeSchema,
  config: TemplateConfigSchema,
  fields: z.array(FieldDefSchema),
  computed: z.array(ComputedDefSchema),
  layout: z.object({
    zones: z.object({
      header: z.object({
        height: z.number().default(110),
        background: z.string().optional(),
        blocks: z.array(FixedBlockSchema).default([]),
      }),
      footer: z.object({
        height: z.number().default(44),
        background: z.string().optional(),
        blocks: z.array(FixedBlockSchema).default([]),
      }),
      left: z.object({
        width: z.number().default(0),
        background: z.string().optional(),
        blocks: z.array(FixedBlockSchema).default([]),
      }),
      right: z.object({
        width: z.number().default(0),
        background: z.string().optional(),
        blocks: z.array(FixedBlockSchema).default([]),
      }),
    }),
    body: z.object({
      row_gap: z.number().default(12),
      rows: z.array(BodyRowSchema).default([]),
    }),
    continuation: z
      .object({
        mode: z.enum(['repeat_page_1', 'custom_page_2']).default('repeat_page_1'),
        zones: z
          .object({
            header: z.object({
              height: z.number().default(72),
              background: z.string().optional(),
              blocks: z.array(FixedBlockSchema).default([]),
            }),
            footer: z.object({
              height: z.number().default(40),
              background: z.string().optional(),
              blocks: z.array(FixedBlockSchema).default([]),
            }),
          })
          .optional(),
      })
      .optional(),
  }),
});
export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;

export const TemplateSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable(),
  name: z.string(),
  doc_type: DocTypeSchema,
  draft_definition: TemplateDefinitionSchema,
  current_version_id: z.string().optional(),
  has_unpublished_changes: z.boolean().default(false),
  thumbnail_asset_id: z.string().optional(),
  archived: z.boolean().default(false),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Template = z.infer<typeof TemplateSchema>;

export const TemplateVersionSchema = z.object({
  id: z.string(),
  template_id: z.string(),
  version_no: z.number(),
  definition: TemplateDefinitionSchema,
  definition_hash: z.string(),
  created_at: z.number(),
});
export type TemplateVersion = z.infer<typeof TemplateVersionSchema>;

export interface TaxSummaryRow {
  rate: Decimal;
  taxable: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  total_tax: Decimal;
}

export interface HsnSummaryRow {
  hsn_sac: string;
  taxable: Decimal;
  rate: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  total_tax: Decimal;
}

export interface ComputedResult {
  doc: Record<string, Decimal | string>;
  items: Array<Record<string, Decimal | string>>;
  summaries: {
    tax?: TaxSummaryRow[];
    hsn?: HsnSummaryRow[];
  };
}

export interface PaymentEntry {
  id: string;
  date: ISODate;
  amount: Decimal;
  mode: 'cash' | 'upi' | 'bank' | 'card' | 'cheque' | 'other';
  reference?: string;
}

export interface DocumentRecord {
  id: string;
  company_id: string;
  template_id: string;
  template_version_id: string;
  doc_type: DocType;
  status: 'draft' | 'finalized' | 'cancelled';
  series: string;
  number?: string;
  seq_value?: number;
  period?: string;
  issue_date: ISODate;
  due_date?: ISODate;
  client_id?: string;
  place_of_supply?: string;
  values: Record<string, string>;
  items: Array<Record<string, string>>;
  computed?: ComputedResult;
  snapshot?: {
    company: Company;
    client?: Client;
  };
  pdf_asset_id?: string;
  grand_total: Decimal;
  client_name?: string;
  payment: {
    status: 'unpaid' | 'partial' | 'paid' | 'na';
    paid_amount: Decimal;
    entries: PaymentEntry[];
  };
  converted_from_id?: string;
  finalized_at?: number;
  cancelled_at?: number;
  cancel_reason?: string;
  created_at: number;
  updated_at: number;
}

export interface Sequence {
  id: string;
  company_id: string;
  series: string;
  period: string;
  last_value: number;
  updated_at: number;
}

export interface Asset {
  id: string;
  kind: 'image' | 'pdf' | 'font' | 'thumbnail';
  mime: string;
  size: number;
  hash: string;
  blob: Blob;
  width?: number;
  height?: number;
  created_at: number;
}
