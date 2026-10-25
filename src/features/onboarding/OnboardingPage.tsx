import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Sparkles, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Button, GlassCard, IngenLogo, Input, PageHeader, Select } from '../../design-system/components';
import { INDIAN_STATES, validateAndParseGstin } from '../../core/validate/gstin';
import { saveCompany, storeAssetBlob } from '../../db/repos';
import { compressAndNormalizeImage } from '../../core/assets/compress';
import { useAppStore } from '../../app/useAppStore';
import type { Company, CustomFieldValue } from '../../core/schema/types';
import { toast } from 'sonner';

export function CompanyProfileForm({
  initialCompany,
  isOnboarding = false,
  onSaved,
}: {
  initialCompany?: Company | null;
  isOnboarding?: boolean;
  onSaved?: (company: Company) => void;
}) {
  const navigate = useNavigate();
  const { refreshCompany } = useAppStore();

  const [name, setName] = useState(initialCompany?.name ?? '');
  const [legalName, setLegalName] = useState(initialCompany?.legal_name ?? '');
  const [gstin, setGstin] = useState(initialCompany?.gstin ?? '');
  const [gstinHint, setGstinHint] = useState<string>('');
  const [pan, setPan] = useState(initialCompany?.pan ?? '');
  const [phone, setPhone] = useState(initialCompany?.phone ?? '');
  const [email, setEmail] = useState(initialCompany?.email ?? '');
  const [line1, setLine1] = useState(initialCompany?.address.line1 ?? '');
  const [city, setCity] = useState(initialCompany?.address.city ?? '');
  const [stateCode, setStateCode] = useState(initialCompany?.address.state_code ?? '36');
  const [pincode, setPincode] = useState(initialCompany?.address.pincode ?? '');
  const [upiVpa, setUpiVpa] = useState(initialCompany?.upi?.vpa ?? '');
  const [upiName, setUpiName] = useState(initialCompany?.upi?.payee_name ?? '');
  const [bankName, setBankName] = useState(initialCompany?.bank?.bank_name ?? '');
  const [accountNo, setAccountNo] = useState(initialCompany?.bank?.account_no ?? '');
  const [ifsc, setIfsc] = useState(initialCompany?.bank?.ifsc ?? '');
  const [logoAssetId, setLogoAssetId] = useState<string | undefined>(initialCompany?.logo_asset_id);
  const [signatureAssetId, setSignatureAssetId] = useState<string | undefined>(
    initialCompany?.signature_asset_id
  );
  const [customFields, setCustomFields] = useState<CustomFieldValue[]>(
    initialCompany?.custom_fields ?? []
  );
  const [saving, setSaving] = useState(false);

  const handleGstinChange = (raw: string) => {
    const up = raw.toUpperCase();
    setGstin(up);
    if (!up) {
      setGstinHint('');
      return;
    }
    const res = validateAndParseGstin(up);
    if (res.stateCode) {
      setStateCode(res.stateCode);
    }
    if (res.pan) {
      setPan(res.pan);
    }
    if (res.valid) {
      setGstinHint(`Verified GSTIN • ${res.stateName} (${res.stateCode}) • PAN: ${res.pan}`);
    } else {
      setGstinHint(res.error || 'Invalid GSTIN');
    }
  };

  const handleAddCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      {
        key: `custom_${prev.length + 1}`,
        label: '',
        value: '',
        show_on_pdf: true,
      },
    ]);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'signature'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAndNormalizeImage(file);
      if (!dataUrl) {
        toast.error('Could not process image file');
        return;
      }
      const res = await fetch(dataUrl);
      const pngBlob = await res.blob();
      const asset = await storeAssetBlob(pngBlob, 'image');
      if (target === 'logo') {
        setLogoAssetId(asset.id);
        toast.success('Business logo stored locally as binary Blob');
      } else {
        setSignatureAssetId(asset.id);
        toast.success('Signature image stored locally');
      }
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your Business / Trade Name');
      return;
    }
    setSaving(true);
    try {
      const stateObj = INDIAN_STATES.find((s) => s.code === stateCode);
      const cleanedCustomFields = customFields
        .filter((f) => f.label.trim())
        .map((f) => ({
          ...f,
          key:
            f.label
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '') || f.key,
        }));

      const saved = await saveCompany({
        id: initialCompany?.id,
        name: name.trim(),
        legal_name: legalName.trim() || undefined,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        address: {
          line1: line1.trim(),
          city: city.trim(),
          state: stateObj?.name ?? 'Telangana',
          state_code: stateCode,
          pincode: pincode.trim(),
          country: 'India',
        },
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        logo_asset_id: logoAssetId,
        signature_asset_id: signatureAssetId,
        upi: upiVpa.trim()
          ? {
              vpa: upiVpa.trim(),
              payee_name: upiName.trim() || name.trim(),
            }
          : undefined,
        bank:
          bankName.trim() || accountNo.trim()
            ? {
                account_name: name.trim(),
                bank_name: bankName.trim(),
                account_no: accountNo.trim(),
                ifsc: ifsc.trim().toUpperCase(),
              }
            : undefined,
        currency: 'INR',
        locale: 'en-IN',
        fy_start_month: 4,
        custom_fields: cleanedCustomFields,
        archived: false,
      });

      await refreshCompany();
      toast.success(isOnboarding ? 'Welcome to INGEN! Business profile created.' : 'Business profile saved.');
      if (onSaved) {
        onSaved(saved);
      } else if (isOnboarding) {
        navigate('/');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <Building2 className="w-5 h-5 text-gold" />
          <h2 className="font-display text-lg font-bold">1. Business Identity & GST</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Business / Trade Name *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Fabrics & Co."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              GSTIN (Optional — auto-fills State & PAN)
            </label>
            <Input
              value={gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="36AABCU9603R1ZV"
              maxLength={15}
              className="font-mono uppercase"
            />
            {gstinHint ? (
              <p className="mt-1 text-[11px] text-gold">{gstinHint}</p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Street Address
            </label>
            <Input
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Plot 42, Jubilee Hills, Road No. 36"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Hyderabad"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">PIN Code</label>
              <Input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="500033"
                maxLength={6}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              State (Drives CGST/SGST vs IGST)
            </label>
            <Select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              {INDIAN_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code} — {st.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@business.in"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* UPI QR, Bank Details & Branding Assets */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-bold">
            2. Dynamic UPI QR, Bank & Branding
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              UPI ID / VPA (Generates scannable QR on invoices)
            </label>
            <Input
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              placeholder="merchant@okicici or 9876543210@ybl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              UPI Payee Name
            </label>
            <Input
              value={upiName}
              onChange={(e) => setUpiName(e.target.value)}
              placeholder={name || 'Business Name'}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Bank Name
            </label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="HDFC Bank"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Account Number
              </label>
              <Input
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="50200012345678"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                IFSC Code
              </label>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Business Logo (Stored as IndexedDB Binary Blob)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'logo')}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Authorised Signature Image (Optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'signature')}
            />
          </div>
        </div>
      </GlassCard>

      {/* Proprietary Custom Business Fields */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="font-display text-lg font-bold">
              3. Proprietary / Custom Business Fields
            </h2>
            <p className="text-xs text-muted-foreground">
              Add any extra licence or registration numbers (e.g. FSSAI No., Drug Licence No., MSME Udyam, CIN) to print automatically on your PDFs.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomField}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add Field</span>
          </Button>
        </div>

        {customFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No custom company fields yet. Click &ldquo;Add Field&rdquo; to add proprietary business details.
          </p>
        ) : (
          <div className="space-y-2.5">
            {customFields.map((cf, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Field Label (e.g. FSSAI Licence No.)"
                    value={cf.label}
                    onChange={(e) => {
                      const next = [...customFields];
                      next[idx] = { ...cf, label: e.target.value };
                      setCustomFields(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Value (e.g. 13621011000452)"
                    value={cf.value}
                    onChange={(e) => {
                      const next = [...customFields];
                      next[idx] = { ...cf, value: e.target.value };
                      setCustomFields(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="flex items-center justify-end gap-3">
        {isOnboarding ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/backup')}
          >
            <ShieldCheck className="w-4 h-4 text-gold" />
            <span>Restore from .ingen Backup</span>
          </Button>
        ) : null}
        <Button type="submit" variant="gold" size="lg" disabled={saving}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{saving ? 'Saving…' : isOnboarding ? 'Launch INGEN Studio' : 'Save Business Profile'}</span>
        </Button>
      </div>
    </form>
  );
}

export function OnboardingPage() {
  const { activeCompany } = useAppStore();
  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div className="flex items-center justify-between">
        <IngenLogo size={40} showWordmark />
        <span className="rounded-full border border-gold/30 bg-gold-surface px-3 py-1 text-xs font-medium text-gold">
          100% Local-First • Offline Ready
        </span>
      </div>
      <PageHeader
        title="Set up your Business Profile"
        subtitle="Your data stays strictly on your device in IndexedDB. Configure your GST, UPI QR, and proprietary fields."
      />
      <CompanyProfileForm initialCompany={activeCompany} isOnboarding />
    </div>
  );
}
