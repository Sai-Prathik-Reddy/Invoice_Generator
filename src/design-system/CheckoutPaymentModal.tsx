import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  CreditCard,
  QrCode,
  Banknote,
  Send,
  Printer,
  CheckCircle2,
  Phone,
  Languages,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Select, MoneyText } from './components';
import {
  formatWhatsAppInvoiceMessage,
  openWhatsAppChat,
} from '../features/share/whatsappShare';
import { SOUNDBOX_LANGUAGES, announceBillTotal } from '../core/soundbox';

export interface CheckoutPaymentModalProps {
  open: boolean;
  onClose: () => void;
  grandTotal: string;
  companyName: string;
  companyUpiVpa?: string;
  clientName?: string;
  clientPhone?: string;
  invoiceNumber: string;
  issueDate: string;
  items: Array<{ name: string; qty: string | number; rate: string | number }>;
  onFinalizeInvoice: (isPaid: boolean, paymentDetails: {
    paymentMode: string;
    amountTendered?: number;
    changeReturned?: number;
  }) => Promise<void>;
  onDirectPrint?: () => void;
}

export function CheckoutPaymentModal({
  open,
  onClose,
  grandTotal,
  companyName,
  companyUpiVpa,
  clientName = 'Customer',
  clientPhone = '',
  invoiceNumber,
  issueDate,
  items,
  onFinalizeInvoice,
  onDirectPrint,
}: CheckoutPaymentModalProps) {
  const numTotal = Number(grandTotal || 0);

  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [cashTendered, setCashTendered] = useState<string>(String(Math.ceil(numTotal)));
  const [sharePhone, setSharePhone] = useState(clientPhone);
  const [shareLanguage, setShareLanguage] = useState('en-IN');
  const [upiQrSvg, setUpiQrSvg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync client phone when opened
  useEffect(() => {
    if (open) {
      setSharePhone(clientPhone || '');
      setCashTendered(String(Math.ceil(numTotal)));
      setIsSubmitting(false);
    }
  }, [open, clientPhone, numTotal]);

  // Generate UPI QR SVG when in UPI mode
  useEffect(() => {
    if (!companyUpiVpa || !open) return;
    const cleanTotal = numTotal.toFixed(2);
    const upiLink = `upi://pay?pa=${companyUpiVpa.trim()}&pn=${encodeURIComponent(companyName)}&am=${cleanTotal}&cu=INR&tn=Invoice%20${invoiceNumber}`;
    QRCode.toString(upiLink, { type: 'svg', margin: 1, width: 180 }, (err, svg) => {
      if (!err && svg) setUpiQrSvg(svg);
    });
  }, [companyUpiVpa, companyName, numTotal, invoiceNumber, open]);

  if (!open) return null;

  const numTendered = Number(cashTendered) || 0;
  const changeToReturn = Math.max(0, numTendered - numTotal);

  const quickDenominations = [
    { label: `Exact ₹${Math.ceil(numTotal)}`, val: Math.ceil(numTotal) },
    { label: '₹100', val: 100 },
    { label: '₹200', val: 200 },
    { label: '₹500', val: 500 },
    { label: '₹1,000', val: 1000 },
    { label: '₹2,000', val: 2000 },
  ].filter((d) => d.val >= Math.floor(numTotal) || d.val === Math.ceil(numTotal));

  // WhatsApp Message Preview
  const whatsappText = formatWhatsAppInvoiceMessage({
    customerName: clientName,
    companyName,
    invoiceNumber,
    date: issueDate,
    grandTotal,
    isPaid: paymentMode !== 'credit',
    paymentMode: paymentMode.toUpperCase(),
    upiVpa: companyUpiVpa,
    items,
    language: shareLanguage,
  });

  const handleExecuteCheckout = async (isPaid: boolean, shouldShareWhatsApp = false) => {
    try {
      setIsSubmitting(true);
      await onFinalizeInvoice(isPaid, {
        paymentMode,
        amountTendered: paymentMode === 'cash' ? numTendered : numTotal,
        changeReturned: paymentMode === 'cash' ? changeToReturn : 0,
      });

      // Voice Soundbox Announcement
      announceBillTotal(grandTotal);

      // Trigger WhatsApp if selected
      if (shouldShareWhatsApp) {
        openWhatsAppChat(sharePhone, whatsappText);
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-gold/40 bg-slate-950 text-foreground shadow-2xl p-4 sm:p-6 space-y-4 max-h-[94dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gold">
              POS Fast Checkout
            </span>
            <h3 className="font-display font-bold text-lg text-foreground">
              Collect Payment & Finalize
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grand Total Display */}
        <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center space-y-1">
          <div className="text-xs text-gold/90 font-medium">Grand Total Payable</div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-gold tracking-tight font-mono">
            ₹{numTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {items.length} line items • Invoice #{invoiceNumber}
          </div>
        </div>

        {/* Payment Mode Selector Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">
            Select Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'upi', label: 'UPI QR', icon: QrCode },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'credit', label: 'Khata/Later', icon: Clock },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id as typeof paymentMode)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-gold bg-gold/25 text-gold shadow-xs'
                      : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Tender & Change Return Calculator */}
        {paymentMode === 'cash' && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Cash Tender Calculator</span>
              <span className="text-muted-foreground">Return exact change</span>
            </div>

            {/* Quick Denomination Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {quickDenominations.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setCashTendered(String(d.val))}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    Number(cashTendered) === d.val
                      ? 'bg-gold text-slate-950 shadow-xs'
                      : 'border border-border bg-slate-900/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Cash Received (₹)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="font-mono text-base font-bold h-10"
                />
              </div>

              {/* Change Return Banner */}
              <div
                className={`rounded-xl border p-2 flex flex-col justify-center items-center ${
                  changeToReturn > 0
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="text-[10px] font-medium uppercase tracking-wider">
                  Change to Return
                </div>
                <div className="text-xl font-bold font-mono">
                  ₹{changeToReturn.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* On-Screen Instant UPI QR Code */}
        {paymentMode === 'upi' && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-150">
            {companyUpiVpa ? (
              <>
                <div className="bg-white p-2.5 rounded-xl shadow-lg border border-border">
                  <div
                    dangerouslySetInnerHTML={{ __html: upiQrSvg }}
                    className="w-36 h-36 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  />
                </div>
                <div className="text-center space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">
                    Scan with Google Pay, PhonePe, Paytm
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    UPI ID: {companyUpiVpa}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-xs text-amber-300 space-y-1">
                <p>No UPI ID configured for this company.</p>
                <p className="text-[11px] text-muted-foreground">
                  You can set your UPI ID in Company Settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Share Settings */}
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share Invoice via WhatsApp</span>
            </span>
            <div className="flex items-center gap-1">
              <Languages className="w-3 h-3 text-muted-foreground" />
              <select
                aria-label="WhatsApp Language"
                value={shareLanguage}
                onChange={(e) => setShareLanguage(e.target.value)}
                className="bg-transparent text-[11px] text-gold font-semibold focus:outline-none cursor-pointer"
              >
                {SOUNDBOX_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-foreground">
                    {l.native}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="tel"
              placeholder="Customer Phone / WhatsApp Number..."
              value={sharePhone}
              onChange={(e) => setSharePhone(e.target.value)}
              className="pl-9 text-xs h-9 font-mono"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-border/80 space-y-2">
          {/* Main Action: Finalize & Share WhatsApp */}
          <Button
            type="button"
            variant="gold"
            disabled={isSubmitting}
            onClick={() => handleExecuteCheckout(paymentMode !== 'credit', Boolean(sharePhone.trim()))}
            className="w-full text-xs sm:text-sm font-bold h-11 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>
              {isSubmitting
                ? 'Processing Invoice...'
                : paymentMode === 'credit'
                ? 'Send Bill as Unpaid (Payment Request)'
                : 'Mark as Paid & Generate Bill'}
            </span>
          </Button>

          {/* Secondary Action Strip: Direct Print / Finalize Without WhatsApp */}
          <div className="flex items-center gap-2">
            {onDirectPrint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDirectPrint}
                className="flex-1 text-xs h-9 border-border text-foreground hover:bg-muted"
                title="Direct Thermal Print (80mm / 58mm / A4)"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Receipt</span>
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleExecuteCheckout(paymentMode !== 'credit', false)}
              className="flex-1 text-xs h-9"
            >
              Finalize (No WhatsApp)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
