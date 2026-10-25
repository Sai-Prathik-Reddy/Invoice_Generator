/**
 * CSV Import & Export Service for Inventory Items and Clients
 *
 * Lightweight, zero-dependency CSV parser and generator for browser environments.
 */

import type { Item, Client } from '../../core/schema/types';

// Helper to escape CSV field values
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to parse CSV text into array of rows
export function parseCsvText(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Trigger browser file download from string content
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // Add BOM for Excel UTF-8 compatibility
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Inventory Items CSV ---

export function exportInventoryToCsv(items: Item[]): string {
  const headers = [
    'Item Name',
    'Barcode',
    'Selling Rate',
    'GST Rate (%)',
    'Unit',
    'HSN/SAC',
    'Stock Quantity',
    'Low Stock Alert Level',
  ];

  const rows = items.map((it) => [
    escapeCsvCell(it.name),
    escapeCsvCell(it.barcode || ''),
    escapeCsvCell(it.rate),
    escapeCsvCell(it.tax_rate),
    escapeCsvCell(it.unit || 'NOS'),
    escapeCsvCell(it.hsn_sac || ''),
    escapeCsvCell(it.stock_qty ?? 0),
    escapeCsvCell(it.low_stock_threshold ?? 5),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Returns a ready-to-use sample CSV template for Inventory Items
 */
export function getInventorySampleCsvTemplate(): string {
  return [
    'Item Name,Barcode,Selling Rate,GST Rate (%),Unit,HSN/SAC,Stock Quantity,Low Stock Alert Level',
    'India Gate Basmati Rice 1kg,8901030383700,145.00,5,KG,1006,50,10',
    'Fortune Sunlite Sunflower Oil 1L,8906007281058,155.00,5,PKT,1512,35,5',
    'Lifebuoy Total Soap 125g,8901030383701,42.00,18,NOS,3401,60,12',
    'Amul Taaza Milk 500ml,8901262150056,27.00,0,PKT,0401,40,8',
    'Tata Salt 1kg,8901262010054,28.00,0,PKT,2501,80,15',
    'Aashirvaad Shudh Chakki Atta 5kg,8901030467891,240.00,5,PKT,1101,25,5',
    'Cadbury Dairy Milk Silk 60g,7622201745431,80.00,18,NOS,1806,45,10',
    'Surf Excel Detergent Powder 1kg,8901030911842,140.00,18,PKT,3402,30,5',
  ].join('\n');
}

export function downloadInventorySampleCsv(): void {
  downloadFile(getInventorySampleCsvTemplate(), 'sample_inventory_template.csv');
}

export interface CsvColumnSpec {
  key: string;
  label: string;
  required: boolean;
  example: string;
  description: string;
}

export const INVENTORY_CSV_COLUMNS: CsvColumnSpec[] = [
  { key: 'name', label: 'Item Name', required: true, example: 'Basmati Rice 1kg', description: 'Product or service title' },
  { key: 'barcode', label: 'Barcode / SKU', required: false, example: '8901030383700', description: 'EAN-13, UPC, or custom barcode' },
  { key: 'rate', label: 'Selling Rate (₹)', required: true, example: '145.00', description: 'Base selling price per unit in rupees' },
  { key: 'tax_rate', label: 'GST Rate (%)', required: false, example: '5', description: 'GST slab: 0, 5, 12, 18, or 28 (defaults to 18)' },
  { key: 'unit', label: 'Unit', required: false, example: 'KG', description: 'NOS, KG, PKT, PCS, BOX, LTR, etc. (defaults to NOS)' },
  { key: 'hsn_sac', label: 'HSN / SAC', required: false, example: '1006', description: '4 or 6 digit GST tariff classification code' },
  { key: 'stock_qty', label: 'Stock Quantity', required: false, example: '50', description: 'Starting stock on hand (defaults to 0)' },
  { key: 'low_stock_threshold', label: 'Low Stock Alert Level', required: false, example: '10', description: 'Triggers low stock alert when inventory reaches this count' },
];

export function parseInventoryCsv(csvText: string): Array<{
  name: string;
  barcode?: string;
  rate: string;
  tax_rate: string;
  unit: string;
  hsn_sac?: string;
  stock_qty: number;
  low_stock_threshold: number;
}> {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) return [];

  // Check header indices
  const header = rows[0]!.map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const barcodeIdx = header.findIndex((h) => h.includes('bar') || h.includes('sku') || h.includes('code'));
  const rateIdx = header.findIndex((h) => h.includes('rate') || h.includes('price'));
  const taxIdx = header.findIndex((h) => h.includes('gst') || h.includes('tax'));
  const unitIdx = header.findIndex((h) => h.includes('unit'));
  const hsnIdx = header.findIndex((h) => h.includes('hsn') || h.includes('sac'));
  const stockIdx = header.findIndex((h) => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
  const lowStockIdx = header.findIndex((h) => h.includes('low') || h.includes('alert') || h.includes('threshold'));

  const parsedItems = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const name = nameIdx >= 0 ? r[nameIdx]?.trim() : r[0]?.trim();
    if (!name) continue;

    const barcode = barcodeIdx >= 0 ? r[barcodeIdx]?.trim() : undefined;
    const rate = rateIdx >= 0 && r[rateIdx] ? r[rateIdx]?.trim() : '0';
    const tax_rate = taxIdx >= 0 && r[taxIdx] ? r[taxIdx]?.trim() : '18';
    const unit = unitIdx >= 0 && r[unitIdx] ? r[unitIdx]?.trim().toUpperCase() : 'NOS';
    const hsn_sac = hsnIdx >= 0 ? r[hsnIdx]?.trim() : undefined;
    const stock_qty = stockIdx >= 0 ? Number(r[stockIdx]) || 0 : 0;
    const low_stock_threshold = lowStockIdx >= 0 ? Number(r[lowStockIdx]) || 5 : 5;

    parsedItems.push({
      name,
      barcode: barcode || undefined,
      rate,
      tax_rate,
      unit,
      hsn_sac: hsn_sac || undefined,
      stock_qty,
      low_stock_threshold,
    });
  }

  return parsedItems;
}

// --- Clients CSV ---

export function exportClientsToCsv(clients: Client[]): string {
  const headers = ['Client Name', 'GSTIN', 'Phone Number', 'Billing Address', 'State Code'];

  const rows = clients.map((c) => [
    escapeCsvCell(c.name),
    escapeCsvCell(c.gstin || ''),
    escapeCsvCell(c.phone || ''),
    escapeCsvCell(c.billing_address?.line1 || ''),
    escapeCsvCell(c.billing_address?.state_code || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Returns a ready-to-use sample CSV template for Clients / Customers
 */
export function getClientsSampleCsvTemplate(): string {
  return [
    'Client Name,GSTIN,Phone Number,Billing Address,State Code',
    'Ramesh Trading Co,36AAAAA0000A1Z5,9876543210,"Shop 12, Market Yard, Hyderabad",36',
    'Priya Sharma,,9123456780,"Flat 402, Green Valley Apartments, Hyderabad",36',
    'Sri Balaji Supermarket,29ABCDE1234F1Z5,9988776655,"104 Brigade Road, Bangalore",29',
    'Krishna Kirana Store,27AABCK5678D1Z2,9822001122,"Shop 5, MG Road, Pune",27',
    'Ananya Patel,,9898012345,"B-12 Navrangpura, Ahmedabad",24',
  ].join('\n');
}

export function downloadClientsSampleCsv(): void {
  downloadFile(getClientsSampleCsvTemplate(), 'sample_clients_template.csv');
}

export const CLIENTS_CSV_COLUMNS: CsvColumnSpec[] = [
  { key: 'name', label: 'Client / Party Name', required: true, example: 'Ramesh Trading Co', description: 'Business entity or customer full name' },
  { key: 'gstin', label: 'GSTIN', required: false, example: '36AAAAA0000A1Z5', description: '15-digit GST identification number for B2B (leave blank for B2C)' },
  { key: 'phone', label: 'Phone Number', required: false, example: '9876543210', description: '10-digit mobile number for WhatsApp & billing' },
  { key: 'address', label: 'Billing Address', required: false, example: 'Shop 12, Market Yard', description: 'Shop, street, locality or postal address' },
  { key: 'state_code', label: 'State Code', required: false, example: '36', description: '2-digit Indian GST state code (e.g., 36 for Telangana, 27 for Maharashtra)' },
];

export function parseClientsCsv(csvText: string): Array<{
  name: string;
  gstin?: string;
  phone?: string;
  address?: string;
  state_code?: string;
}> {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) return [];

  const header = rows[0]!.map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const gstinIdx = header.findIndex((h) => h.includes('gstin'));
  const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile'));
  const addrIdx = header.findIndex((h) => h.includes('addr'));
  const stateIdx = header.findIndex((h) => h.includes('state'));

  const parsedClients = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const name = nameIdx >= 0 ? r[nameIdx]?.trim() : r[0]?.trim();
    if (!name) continue;

    const gstin = gstinIdx >= 0 ? r[gstinIdx]?.trim().toUpperCase() : undefined;
    const phone = phoneIdx >= 0 ? r[phoneIdx]?.trim() : undefined;
    const address = addrIdx >= 0 ? r[addrIdx]?.trim() : undefined;
    const state_code = stateIdx >= 0 ? r[stateIdx]?.trim() : undefined;

    parsedClients.push({
      name,
      gstin: gstin || undefined,
      phone: phone || undefined,
      address: address || undefined,
      state_code: state_code || undefined,
    });
  }

  return parsedClients;
}
