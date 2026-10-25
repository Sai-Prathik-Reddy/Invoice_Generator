import React, { useState } from 'react';
import { Sun, Moon, Sparkles, CheckCircle2, Shield, FileText } from 'lucide-react';
import {
  BrandColorCustomizer,
  Button,
  GlassCard,
  IngenLogo,
  Input,
  MoneyText,
  PageHeader,
  Select,
  StatCard,
  StatusPill,
} from './components';
import { useAppStore } from '../app/useAppStore';
import { amountInWords } from '../core/format';

export function DesignSystemShowcasePage() {
  const { theme, toggleTheme } = useAppStore();
  const [sampleAmount, setSampleAmount] = useState('245800.50');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Obsidian & Pearl — Design System"
        subtitle="INGEN visual tokens, glass surfaces, Indian currency typography, and accessible primitives."
        actions={
          <Button variant="gold" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>Switch to {theme === 'dark' ? 'Pearl Light' : 'Obsidian Dark'}</span>
          </Button>
        }
      />

      {/* Brand & Logo Showcase */}
      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-bold mb-4">1. Brand Mark & Color Palette</h2>
        <div className="flex flex-wrap items-center gap-8 mb-6">
          <IngenLogo size={48} showWordmark />
          <IngenLogo size={36} />
          <IngenLogo size={24} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[
            { name: 'Background', cls: 'bg-background border border-border' },
            { name: 'Primary Amethyst', cls: 'bg-primary text-white' },
            { name: 'Champagne Gold', cls: 'bg-gold text-black' },
            { name: 'Glass Card', cls: 'bg-card border border-border' },
            { name: 'Success Emerald', cls: 'bg-emerald-500 text-black' },
            { name: 'Danger Rose', cls: 'bg-rose-500 text-white' },
          ].map((swatch) => (
            <div key={swatch.name} className="rounded-xl border border-border p-3 space-y-2">
              <div className={`h-12 w-full rounded-lg ${swatch.cls}`} />
              <div className="text-xs font-medium">{swatch.name}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Brand Color Studio / Preferences */}
      <BrandColorCustomizer />

      {/* KPI Stat Cards */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">2. Executive KPI Cards & Indian Grouping</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="This Month Revenue"
            value="245800"
            sublabel="+18.4% vs last month"
            icon={<Sparkles className="w-4 h-4" />}
          />
          <StatCard
            label="Unpaid Balance"
            value="38200"
            sublabel="4 pending invoices"
            accentGold
            icon={<FileText className="w-4 h-4" />}
          />
          <StatCard
            label="Invoices Issued"
            value={42}
            isMoney={false}
            sublabel="FY 2026-27"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatCard
            label="GST Collected"
            value="37494"
            sublabel="CGST + SGST + IGST"
            accentGold
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Interactive Indian Formatter & Amount-in-Words */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="font-display text-lg font-bold">3. Live Indian Currency & Words Engine</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Enter Amount (Decimal String)
            </label>
            <Input
              value={sampleAmount}
              onChange={(e) => setSampleAmount(e.target.value)}
              placeholder="245800.50"
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
            <div className="text-2xl font-display font-bold text-gold">
              <MoneyText value={sampleAmount} />
            </div>
            <div className="text-xs text-muted-foreground">
              {amountInWords(sampleAmount)}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Buttons, Badges & Controls */}
      <GlassCard className="p-6 space-y-5">
        <h2 className="font-display text-lg font-bold">4. Buttons, Status Pills & Form Controls</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary Action</Button>
          <Button variant="gold">Champagne Gold CTA</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destructive</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill status="paid" />
          <StatusPill status="partial" />
          <StatusPill status="unpaid" />
          <StatusPill status="finalized" />
          <StatusPill status="draft" />
          <StatusPill status="cancelled" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Standard Input (GSTIN, Name…)" />
          <Select defaultValue="18">
            <option value="0">GST 0%</option>
            <option value="5">GST 5%</option>
            <option value="12">GST 12%</option>
            <option value="18">GST 18%</option>
            <option value="28">GST 28%</option>
          </Select>
          <Input type="date" defaultValue="2026-10-18" />
        </div>
      </GlassCard>
    </div>
  );
}
