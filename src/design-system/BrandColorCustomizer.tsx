import React, { useState } from 'react';
import { Sparkles, RotateCcw, Check, Palette } from 'lucide-react';
import { useAppStore } from '../app/useAppStore';
import { Button, GlassCard, Input, StatusPill } from './components';
import { toast } from 'sonner';

export interface BrandPreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  gold: string;
}

export const BRAND_COLOR_PRESETS: BrandPreset[] = [
  {
    id: 'default',
    name: 'Amethyst & Gold (Default INGEN)',
    description: 'Royal amethyst purple with champagne gold accents',
    primary: '#7C5CFF',
    gold: '#E8C27A',
  },
  {
    id: 'emerald_bronze',
    name: 'Emerald & Bronze',
    description: 'Deep forest green with warm bronze accents',
    primary: '#059669',
    gold: '#D97706',
  },
  {
    id: 'sapphire_amber',
    name: 'Sapphire & Amber',
    description: 'Corporate executive blue with vibrant amber gold',
    primary: '#2563EB',
    gold: '#F59E0B',
  },
  {
    id: 'ruby_champagne',
    name: 'Crimson Ruby & Champagne',
    description: 'Rich velvet ruby with bright champagne gold',
    primary: '#E11D48',
    gold: '#D4AF37',
  },
  {
    id: 'cyan_tangerine',
    name: 'Electric Cyan & Tangerine',
    description: 'High-contrast modern tech cyan with warm tangerine',
    primary: '#0284C7',
    gold: '#EA580C',
  },
  {
    id: 'midnight_rose',
    name: 'Midnight Indigo & Rose',
    description: 'Sleek indigo midnight with vivid neon rose',
    primary: '#6366F1',
    gold: '#F43F5E',
  },
];

export function BrandColorCustomizer() {
  const { brandColors, setBrandColors } = useAppStore();

  const currentPrimary = brandColors?.primary ?? '#7C5CFF';
  const currentGold = brandColors?.gold ?? '#E8C27A';

  const [primaryInput, setPrimaryInput] = useState(currentPrimary);
  const [goldInput, setGoldInput] = useState(currentGold);

  // Sync state if store updates externally
  React.useEffect(() => {
    setPrimaryInput(brandColors?.primary ?? '#7C5CFF');
    setGoldInput(brandColors?.gold ?? '#E8C27A');
  }, [brandColors]);

  const handleSelectPreset = async (preset: BrandPreset) => {
    setPrimaryInput(preset.primary);
    setGoldInput(preset.gold);
    if (preset.id === 'default') {
      await setBrandColors(null);
      toast.success('Reset to default INGEN Amethyst & Gold palette');
    } else {
      await setBrandColors({ primary: preset.primary, gold: preset.gold });
      toast.success(`Applied ${preset.name} theme`);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    const validPrimary = hexPattern.test(primaryInput) ? primaryInput : '#7C5CFF';
    const validGold = hexPattern.test(goldInput) ? goldInput : '#E8C27A';

    await setBrandColors({ primary: validPrimary, gold: validGold });
    toast.success('Custom brand colors applied and saved!');
  };

  const handleReset = async () => {
    setPrimaryInput('#7C5CFF');
    setGoldInput('#E8C27A');
    await setBrandColors(null);
    toast.info('Restored default INGEN Amethyst & Gold theme');
  };

  const isCustomActive = Boolean(brandColors?.primary || brandColors?.gold);

  return (
    <GlassCard className="p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-gold" />
            <h2 className="font-display text-lg font-bold">Custom Brand Color Preferences</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Customize the application theme to match your company branding. Colors apply immediately to buttons, tabs, accents, and invoices.
          </p>
        </div>

        {isCustomActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            <span>Reset to Default</span>
          </Button>
        )}
      </div>

      {/* Curated Brand Color Presets */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
          Curated Luxury Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BRAND_COLOR_PRESETS.map((preset) => {
            const isSelected =
              preset.id === 'default'
                ? !isCustomActive
                : brandColors?.primary?.toLowerCase() === preset.primary.toLowerCase() &&
                  brandColors?.gold?.toLowerCase() === preset.gold.toLowerCase();

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2.5 relative group ${
                  isSelected
                    ? 'border-gold bg-gold-surface ring-2 ring-gold/50 shadow-md'
                    : 'border-border bg-card/60 hover:bg-card/90 hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-xs text-foreground group-hover:text-gold transition-colors">
                    {preset.name}
                  </div>
                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gold text-gold-foreground text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-snug">
                  {preset.description}
                </p>

                {/* Swatches preview */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                      style={{ backgroundColor: preset.primary }}
                      title={`Primary: ${preset.primary}`}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {preset.primary}
                    </span>
                  </div>
                  <span className="text-muted-foreground/40 text-xs">•</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                      style={{ backgroundColor: preset.gold }}
                      title={`Accent: ${preset.gold}`}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {preset.gold}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color Pickers & Hex Editor */}
      <form onSubmit={handleApplyCustom} className="space-y-4 pt-2 border-t border-border/60">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
          Custom Brand Palette (Hex &amp; Native Color Picker)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Primary Color Picker */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Primary Brand Color</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Main buttons, links &amp; headers
              </span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={primaryInput}
                onChange={(e) => setPrimaryInput(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                aria-label="Pick Primary Color"
              />
              <Input
                value={primaryInput}
                onChange={(e) => setPrimaryInput(e.target.value)}
                placeholder="#7C5CFF"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Gold / Accent Color Picker */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Accent &amp; Highlight Color</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Badges, active tabs &amp; gold text
              </span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={goldInput}
                onChange={(e) => setGoldInput(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                aria-label="Pick Accent / Gold Color"
              />
              <Input
                value={goldInput}
                onChange={(e) => setGoldInput(e.target.value)}
                placeholder="#E8C27A"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>

        {/* Live UI Preview Strip */}
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Live Preview with Current Palette
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="primary" size="sm">
              Primary Button
            </Button>
            <Button type="button" variant="gold" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Accent CTA
            </Button>
            <Button type="button" variant="outline" size="sm">
              Outline
            </Button>
            <StatusPill status="paid" />
            <StatusPill status="finalized" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="gold" className="cursor-pointer">
            <Sparkles className="w-4 h-4" />
            <span>Apply Custom Brand Colors</span>
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
