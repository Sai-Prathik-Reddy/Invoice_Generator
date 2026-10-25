import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, X, Check, Play } from 'lucide-react';
import { Button, Select } from './components';
import {
  SOUNDBOX_LANGUAGES,
  getSoundboxSettings,
  saveSoundboxSettings,
  speakText,
  formatBillAnnouncementText,
  type SoundboxSettings,
} from '../core/soundbox';

export function SoundboxSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<SoundboxSettings>(getSoundboxSettings());

  useEffect(() => {
    if (open) {
      setSettings(getSoundboxSettings());
    }
  }, [open]);

  if (!open) return null;

  const handleUpdate = (patch: Partial<SoundboxSettings>) => {
    const updated = saveSoundboxSettings(patch);
    setSettings(updated);
  };

  const handleTestVoice = () => {
    const sample = formatBillAnnouncementText('435', settings.language);
    speakText(sample, settings.language);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl border border-gold/40 bg-slate-950/95 text-foreground shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/20 border border-gold/40 text-gold flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-foreground">
                POS Soundbox & Voice
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Voice announcements for barcode scans and bill totals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">
            Announcement Feedback Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'voice', label: 'Voice Speech', icon: Volume2 },
              { id: 'beep', label: 'Beep Only', icon: Bell },
              { id: 'mute', label: 'Mute', icon: VolumeX },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = settings.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleUpdate({ mode: m.id as SoundboxSettings['mode'] })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-gold bg-gold/20 text-gold shadow-xs'
                      : 'border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selector */}
        {settings.mode === 'voice' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Announcement Language
              </label>
              <Select
                value={settings.language}
                onChange={(e) => handleUpdate({ language: e.target.value })}
                className="text-xs h-9"
              >
                {SOUNDBOX_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} — {l.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20 text-xs cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground">Announce Item Name on Scan</div>
                  <div className="text-[11px] text-muted-foreground">
                    Speaks item name (e.g. "Parle-G") instead of beep
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.announceScanItem}
                  onChange={(e) => handleUpdate({ announceScanItem: e.target.checked })}
                  className="rounded border-border text-gold focus:ring-gold"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20 text-xs cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground">Announce Bill Total on Finalize</div>
                  <div className="text-[11px] text-muted-foreground">
                    Speaks grand total (e.g. "Bill total: ₹435")
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.announceBillTotal}
                  onChange={(e) => handleUpdate({ announceBillTotal: e.target.checked })}
                  className="rounded border-border text-gold focus:ring-gold"
                />
              </label>
            </div>

            {/* Test Voice Button */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestVoice}
                className="w-full text-xs border-gold/40 text-gold bg-gold/10 hover:bg-gold/20 h-8"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                <span>Test Voice Sample</span>
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border/80 flex justify-end">
          <Button variant="gold" size="sm" onClick={onClose} className="text-xs font-semibold px-4">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
