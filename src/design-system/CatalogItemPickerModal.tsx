import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Minus,
  Check,
  X,
  Barcode as BarcodeIcon,
  ShoppingBag,
} from 'lucide-react';
import type { Item } from '../core/schema/types';
import { Button, Input, MoneyText } from './components';

export interface CatalogItemPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Available items in the shop's catalog */
  catalogItems: Item[];
  /** Current rows in the invoice generator */
  invoiceRows: Array<Record<string, string>>;
  /** Callback to add or increment item in the invoice */
  onAddItem: (item: Item, qtyDelta?: number) => void;
  /** Callback to decrement or remove item from the invoice */
  onDecrementItem: (item: Item) => void;
  /** Callback to open the barcode scanner directly from the picker */
  onOpenBarcodeScanner?: () => void;
}

export function CatalogItemPickerModal({
  open,
  onClose,
  catalogItems,
  invoiceRows,
  onAddItem,
  onDecrementItem,
  onOpenBarcodeScanner,
}: CatalogItemPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGstFilter, setSelectedGstFilter] = useState<string>('all');

  // Map of item name / barcode to current quantity in invoice
  const rowQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of invoiceRows) {
      const name = (row['item_name'] || '').trim().toLowerCase();
      const barcode = (row['barcode'] || '').trim();
      const qty = parseFloat(row['qty'] || '0') || 0;
      if (name) map.set(`name:${name}`, (map.get(`name:${name}`) || 0) + qty);
      if (barcode) map.set(`barcode:${barcode}`, (map.get(`barcode:${barcode}`) || 0) + qty);
    }
    return map;
  }, [invoiceRows]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalogItems.filter((item) => {
      // GST Filter
      if (selectedGstFilter !== 'all' && item.tax_rate !== selectedGstFilter) {
        return false;
      }

      // Search Query Filter
      if (!query) return true;
      const matchName = item.name.toLowerCase().includes(query);
      const matchBarcode = item.barcode ? item.barcode.toLowerCase().includes(query) : false;
      const matchHsn = item.hsn_sac ? item.hsn_sac.toLowerCase().includes(query) : false;
      return matchName || matchBarcode || matchHsn;
    });
  }, [catalogItems, searchQuery, selectedGstFilter]);

  const totalBillItemsCount = useMemo(() => {
    return invoiceRows.reduce((sum, r) => sum + (parseFloat(r['qty'] || '0') || 0), 0);
  }, [invoiceRows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-gold/40 bg-slate-950/95 text-foreground shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/80 bg-slate-900/90 z-20">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                Pick Products from Catalog
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                Tap items to quickly add them to your bill with rate and GST
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenBarcodeScanner ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenBarcodeScanner();
                }}
                className="text-xs h-8 px-2.5 bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25"
                title="Scan product barcode with camera"
              >
                <BarcodeIcon className="w-3.5 h-3.5 mr-1" />
                <span>Camera Scan</span>
              </Button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground hover:text-rose-400 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick GST Filter Bar */}
        <div className="p-3.5 border-b border-border/80 bg-slate-900/40 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by product name, barcode, or HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium shrink-0 mr-1">
              Filter:
            </span>
            {['all', '0', '5', '12', '18', '28'].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSelectedGstFilter(rate)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all shrink-0 ${
                  selectedGstFilter === rate
                    ? 'border-gold bg-gold/25 text-gold'
                    : 'border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {rate === 'all' ? 'All Rates' : `GST ${rate}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-medium">No matching products found</p>
              <p className="text-[11px]">
                {catalogItems.length === 0
                  ? 'Your items catalog is currently empty. Add products in the Items Catalog tab.'
                  : 'Try searching with a different name or barcode number.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const qtyInBill =
                rowQtyMap.get(`barcode:${item.barcode}`) ??
                rowQtyMap.get(`name:${item.name.toLowerCase()}`) ??
                0;
              const isInBill = qtyInBill > 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isInBill
                      ? 'border-gold/60 bg-gold/10 shadow-sm'
                      : 'border-border/80 bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted/70 text-muted-foreground font-mono">
                        {item.unit || 'NOS'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-gold">
                        <MoneyText value={item.rate} />
                      </span>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                        GST {item.tax_rate}%
                      </span>
                      {item.barcode ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-sky-300">
                            <BarcodeIcon className="w-3 h-3" />
                            <span>{item.barcode}</span>
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Quantity and Add to Bill Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isInBill ? (
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-gold/50 rounded-xl p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => onDecrementItem(item)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white flex items-center justify-center cursor-pointer transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs font-bold text-gold">
                          {qtyInBill}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddItem(item, 1)}
                          className="w-7 h-7 rounded-lg bg-gold/30 hover:bg-gold/40 text-gold flex items-center justify-center cursor-pointer transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onAddItem(item, 1)}
                        className="text-xs h-8 px-3 border border-gold/40 text-gold hover:bg-gold/20"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Status & Done Bar */}
        <div className="p-3.5 border-t border-border/80 bg-slate-900/90 flex items-center justify-between z-20">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground font-mono">{totalBillItemsCount}</span>{' '}
            total unit(s) in current invoice
          </div>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold h-8.5 px-4"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            <span>Done</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
