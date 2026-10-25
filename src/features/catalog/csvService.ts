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

    parsedClients.push({
      name,
      gstin: gstinIdx >= 0 ? r[gstinIdx]?.trim().toUpperCase() : undefined,
      phone: phoneIdx >= 0 ? r[phoneIdx]?.trim() : undefined,
      address: addrIdx >= 0 ? r[addrIdx]?.trim() : undefined,
      state_code: stateIdx >= 0 ? r[stateIdx]?.trim() : undefined,
    });
  }

  return parsedClients;
}
