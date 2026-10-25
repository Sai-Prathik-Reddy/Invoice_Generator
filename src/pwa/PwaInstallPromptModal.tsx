import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  X,
  CheckCircle2,
  Sparkles,
  WifiOff,
  HardDrive,
  Laptop,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Button, GlassCard, IngenLogo } from '../design-system/components';
import { DeviceInfo } from './usePwaInstall';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: (neverShowThisSession?: boolean) => void;
  device: DeviceInfo;
  canInstallDirectly: boolean;
  onDirectInstall: () => void;
}

export function PwaInstallPromptModal({
  isOpen,
  onClose,
  device,
  canInstallDirectly,
  onDirectInstall,
}: PwaInstallModalProps) {
  // 'pointer' shows dynamic visual spotlight with animated arrows pointing directly at browser controls
  // 'modal' shows comprehensive multi-device step-by-step documentation
  const [viewMode, setViewMode] = useState<'pointer' | 'modal'>('pointer');
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>(
    device.isMobile ? 'mobile' : 'desktop'
  );

  if (!isOpen) return null;

  // Determine specific platform target for the arrow pointer
  const isIPhone = device.isIOS && (typeof window !== 'undefined' && window.innerWidth < 768);
  const isIPad = device.isIOS && !isIPhone;
  const isAndroid = device.isAndroid;
  const isDesktop = !device.isMobile;

  // 1. POINTER COACHMARK OVERLAY (Dynamic directional arrows pointing to browser chrome controls)
  if (viewMode === 'pointer') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
        {/* =========================================================================
            MOBILE ANDROID: Arrow pointing UP-RIGHT at top browser 3-dots (⋮)
           ========================================================================= */}
        {isAndroid && (
          <div className="fixed top-2 right-2 sm:right-4 w-[92vw] max-w-[370px] flex flex-col items-end">
            {/* Animated bouncing arrow pointing to the browser three-dots menu */}
            <div className="flex items-center gap-1.5 pr-2 pb-1.5 text-gold font-bold text-xs animate-bounce">
              <span>Tap menu (⋮) here</span>
              <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold shadow-lg shadow-gold/30">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <GlassCard className="w-full border-gold/50 shadow-2xl p-4 sm:p-5 space-y-3 bg-slate-950/95">
              <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/30 border border-gold/40 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Install App on Android</h3>
                    <p className="text-[10px] text-muted-foreground">Chrome / Edge / Samsung Internet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gold/10 border border-gold/30">
                  <span className="w-5 h-5 rounded-full bg-gold text-gold-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-snug">
                    Tap the <strong>three dots</strong> (<MoreVertical className="inline w-3.5 h-3.5 text-gold -mt-0.5" />) in the top-right corner of Chrome above.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-snug">
                    Tap <strong className="text-gold">&ldquo;Install app&rdquo;</strong> or <strong className="text-foreground">&ldquo;Add to Home screen&rdquo;</strong>.
                  </div>
                </div>
              </div>

              {canInstallDirectly ? (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={onDirectInstall}
                  className="w-full justify-center font-bold shadow-md cursor-pointer h-9 text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  ⚡ 1-Click Install Now
                </Button>
              ) : null}

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('modal')}
                  className="text-muted-foreground hover:text-gold underline cursor-pointer"
                >
                  Detailed instructions
                </button>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="font-semibold text-gold hover:underline cursor-pointer"
                >
                  Got it ✓
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* =========================================================================
            MOBILE iOS (iPhone): Arrow pointing DOWN at bottom Safari Share (⎋)
           ========================================================================= */}
        {isIPhone && (
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92vw] max-w-[370px] flex flex-col items-center">
            <GlassCard className="w-full border-gold/50 shadow-2xl p-4 sm:p-5 space-y-3 bg-slate-950/95">
              <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/30 border border-gold/40 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Install App on iPhone</h3>
                    <p className="text-[10px] text-muted-foreground">Apple Safari</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gold/10 border border-gold/30">
                  <span className="w-5 h-5 rounded-full bg-gold text-gold-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-snug">
                    Tap the <strong>Share button</strong> (<Share2 className="inline w-3.5 h-3.5 text-sky-400 mx-0.5" />) in the Safari toolbar at the bottom.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-snug">
                    Scroll down and tap <strong className="text-gold">&ldquo;Add to Home Screen&rdquo;</strong> (<PlusSquare className="inline w-3.5 h-3.5 text-gold mx-0.5" />).
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('modal')}
                  className="text-muted-foreground hover:text-gold underline cursor-pointer"
                >
                  Detailed instructions
                </button>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="font-semibold text-gold hover:underline cursor-pointer"
                >
                  Got it ✓
                </button>
              </div>
            </GlassCard>

            {/* Bouncing arrow pointing down to Safari's bottom toolbar */}
            <div className="flex items-center gap-1.5 pt-2 text-gold font-bold text-xs animate-bounce">
              <span>Tap Share at the bottom</span>
              <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold shadow-lg shadow-gold/30">
                <ArrowDown className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MOBILE iOS (iPad): Arrow pointing UP-RIGHT at top Safari Share
           ========================================================================= */}
        {isIPad && (
          <div className="fixed top-2 right-12 w-[92vw] max-w-[380px] flex flex-col items-end">
            <div className="flex items-center gap-1.5 pr-2 pb-1.5 text-gold font-bold text-xs animate-bounce">
              <span>Tap Share here</span>
              <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold shadow-lg shadow-gold/30">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <GlassCard className="w-full border-gold/50 shadow-2xl p-4 sm:p-5 space-y-3 bg-slate-950/95">
              <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/30 border border-gold/40 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Install App on iPad</h3>
                    <p className="text-[10px] text-muted-foreground">Apple Safari</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gold/10 border border-gold/30">
                  <span className="w-5 h-5 rounded-full bg-gold text-gold-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-snug">
                    Tap the <strong>Share button</strong> (<Share2 className="inline w-3.5 h-3.5 text-sky-400 mx-0.5" />) in the top Safari bar above.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-snug">
                    Tap <strong className="text-gold">&ldquo;Add to Home Screen&rdquo;</strong> (<PlusSquare className="inline w-3.5 h-3.5 text-gold mx-0.5" />).
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('modal')}
                  className="text-muted-foreground hover:text-gold underline cursor-pointer"
                >
                  Detailed instructions
                </button>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="font-semibold text-gold hover:underline cursor-pointer"
                >
                  Got it ✓
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* =========================================================================
            DESKTOP (Chrome / Edge / Brave / Safari / PC / Mac): Arrow pointing UP at Search/Address Bar
           ========================================================================= */}
        {isDesktop && (
          <div className="fixed top-3 right-6 sm:right-20 w-[92vw] max-w-[420px] flex flex-col items-end">
            {/* Animated bouncing arrow pointing to the browser omnibox install button */}
            <div className="flex items-center gap-2 pr-4 pb-2 text-gold font-bold text-xs animate-bounce">
              <span>Install icon in address bar</span>
              <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold shadow-lg shadow-gold/30">
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <GlassCard className="w-full border-gold/50 shadow-2xl p-5 space-y-3.5 bg-slate-950/95">
              <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/30 border border-gold/40 flex items-center justify-center">
                    <Laptop className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Install Desktop App</h3>
                    <p className="text-[10px] text-muted-foreground">Chrome • Edge • Brave • Safari (Mac/PC)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                  <span className="w-5 h-5 rounded-full bg-gold text-gold-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-relaxed">
                    Look at the <strong>right side of your browser address bar above ↑</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-relaxed">
                    Click the <strong>Install App icon</strong> (<Download className="inline w-3.5 h-3.5 text-gold mx-0.5 -mt-0.5" /> or <span className="font-mono text-gold font-bold">⊕</span>) and click <strong>&ldquo;Install&rdquo;</strong>.
                  </div>
                </div>
              </div>

              {canInstallDirectly ? (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={onDirectInstall}
                  className="w-full justify-center font-bold shadow-md cursor-pointer h-9 text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  ⚡ 1-Click Install to Desktop Now
                </Button>
              ) : null}

              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('modal')}
                  className="text-muted-foreground hover:text-gold underline cursor-pointer text-[11px]"
                >
                  View all device guides
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onClose(true)}
                  className="h-7 text-xs font-bold"
                >
                  Got it ✓
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    );
  }

  // 2. DETAILED MODAL VIEW (If user clicks "Detailed instructions")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <GlassCard className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto border-gold/40 shadow-2xl p-5 sm:p-6 space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onClose(true)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Title */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shrink-0 border border-gold/30">
            <IngenLogo className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-[10px] font-bold text-gold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-gold" />
              <span>Offline-First Progressive Web App</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
              Install INGEN on Your Device
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enjoy a fast, standalone desktop &amp; mobile app with zero-network PDF compilation.
            </p>
          </div>
        </div>

        {/* Switch back to Dynamic Pointer Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setViewMode('pointer')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline cursor-pointer"
          >
            <span>Show live visual arrow pointer</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1-Click Install Button if Supported (Chromium Android & Desktop) */}
        {canInstallDirectly ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-gold/20 via-primary/15 to-gold/20 border border-gold/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="text-left">
              <div className="text-xs font-bold text-gold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                <span>One-Click Install Ready!</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Your browser supports immediate instant installation.
              </div>
            </div>
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onDirectInstall}
              className="w-full sm:w-auto shrink-0 shadow-md font-bold cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Install App Now
            </Button>
          </div>
        ) : null}

        {/* Mobile vs Desktop Tab Toggle */}
        <div className="flex items-center rounded-xl bg-muted/40 p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'mobile'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile (iPhone / Android)</span>
            {device.isMobile && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gold text-gold-foreground font-bold">
                You
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop (PC / Mac)</span>
            {!device.isMobile && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gold text-gold-foreground font-bold">
                You
              </span>
            )}
          </button>
        </div>

        {/* Tab Content: Mobile Instructions */}
        {activeTab === 'mobile' ? (
          <div className="space-y-3">
            {/* iOS Safari Guide */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🍏</span>
                <span className="text-xs font-bold text-foreground">
                  Apple iOS (iPhone &amp; iPad Safari)
                </span>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share button</strong>{' '}
                    <Share2 className="inline w-3.5 h-3.5 text-sky-400 mx-0.5" /> in the bottom or
                    top Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap{' '}
                    <strong className="text-foreground">Add to Home Screen</strong>{' '}
                    <PlusSquare className="inline w-3.5 h-3.5 text-gold mx-0.5" />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner to launch INGEN as a standalone app!
                  </span>
                </li>
              </ol>
            </div>

            {/* Android Guide */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="text-xs font-bold text-foreground">
                  Android (Chrome, Edge &amp; Samsung Internet)
                </span>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the browser menu (three dots{' '}
                    <MoreVertical className="inline w-3.5 h-3.5 text-foreground mx-0.5" />) in the
                    top-right corner.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Tap <strong className="text-foreground">&ldquo;Install app&rdquo;</strong> or{' '}
                    <strong className="text-foreground">&ldquo;Add to Home screen&rdquo;</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Confirm and enjoy offline invoice generation from your home screen.</span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          /* Tab Content: Desktop Instructions */
          <div className="space-y-3">
            {/* Desktop Chrome / Edge */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <span className="text-xs font-bold text-foreground">
                  Google Chrome &amp; Microsoft Edge (Windows / macOS / Linux)
                </span>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Look at the right side of the browser URL / address bar for the{' '}
                    <strong>Install icon</strong> (
                    <Download className="inline w-3.5 h-3.5 text-gold mx-0.5" /> or a small monitor
                    icon).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Click the install icon (or click the three dots menu &ldquo;Cast, Save &amp;
                    Share&rdquo; → &ldquo;Install&rdquo;).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Click <strong>Install</strong> to open INGEN in an independent window without
                    distracting browser tabs.
                  </span>
                </li>
              </ol>
            </div>

            {/* macOS Safari Guide */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🖥️</span>
                <span className="text-xs font-bold text-foreground">
                  macOS Safari (Sonoma 14+)
                </span>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    In the top Apple menu bar, click <strong>File</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Select <strong className="text-foreground">Add to Dock…</strong> and click{' '}
                    <strong>Add</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Launch directly from your macOS Dock with full local-first storage!</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Benefits Badges */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Offline Ready</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              Create and preview invoices without internet connection.
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <HardDrive className="w-3.5 h-3.5 text-gold" />
              <span>Persistent Storage</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              Your data stays securely on your device and won't be cleared.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-border">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Don&apos;t show on startup
          </button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onClose(true)}
            className="cursor-pointer font-bold px-4"
          >
            Got it, Let&apos;s Start!
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
