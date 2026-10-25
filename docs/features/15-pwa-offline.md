# 15 — PWA, Offline Engine & Storage Durability

> Zero-network capability after first visit via `vite-plugin-pwa`, prompt-to-update service worker, install banners (Android/Desktop `beforeinstallprompt` + iOS Home Screen guide), and `navigator.storage.persist()` eviction protection.

## 1. Overview
Ensures INGEN works reliably in shops, clinics, and warehouses with zero internet connectivity while protecting IndexedDB from browser storage eviction.

## 2. Web App Manifest (`vite.config.ts`)
- `name`: `"INGEN — GST Invoice & Document Studio"`
- `short_name`: `"INGEN"`
- `display`: `"standalone"`
- `background_color`: `"#0B0B14"`
- `theme_color`: `"#0B0B14"` (dynamically updated `<meta name="theme-color">` to `#F8F7FC` in Pearl light mode)
- `icons`: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`
- `shortcuts`: `"New Invoice"` (`/documents/new`), `"Templates"` (`/templates`), `"Backup"` (`/backup`)

## 3. Service Worker & Update Strategy
- Uses Workbox `generateSW` with `registerType: 'prompt'`.
- Precaches all HTML, JS, CSS, self-hosted `.ttf` fonts, and worker bundles.
- Never reloads mid-edit: when a new version is available, displays a non-blocking Sonner toast (`"Update available — Reload when ready"`).

## 4. Storage Durability & Quota Monitoring
- Calls `navigator.storage.persist()` on first company setup and first finalized document.
- Settings displays real-time storage usage (`navigator.storage.estimate()`) and persistence status badge (`Persistent Storage Active` vs `Install app & backup regularly`).

## 5. Technical Implementation & On-Launch Device Guide
- **Files:** `vite.config.ts`, `src/pwa/usePwaInstall.ts`, `src/pwa/PwaInstallPromptModal.tsx`, `src/pwa/StorageDurabilityCard.tsx`.
- **Launch Device Detection (`usePwaInstall.ts`):** Automatically evaluates user agent and screen traits (`isMobile`, `isIOS`, `isAndroid`, `isMac`, `isWindows`, `isChrome`, `isSafari`, `isEdge`) and standalone state (`window.matchMedia('(display-mode: standalone)').matches`, `(navigator as any).standalone`).
- **Interactive PWA Installation Coachmark & Modal (`PwaInstallPromptModal.tsx`):**
  - Triggers automatically upon first visit / app launch when running in a regular browser tab.
  - **Dynamic Directional Visual Arrow Coachmark:**
    - **Android Mobile:** Bouncing arrow pointing top-right to browser menu (`⋮`) with instructions to tap and select "Install app" / "Add to Home screen".
    - **iOS iPhone:** Bouncing arrow pointing bottom-center to Safari's Share button (`[↑]`) with instructions to tap "Add to Home Screen".
    - **iOS iPad:** Bouncing arrow pointing top-right to Safari's Share button.
    - **Desktop (Chrome / Edge / Brave):** Bouncing arrow pointing top-right directly at the browser omnibox / search bar install icon (`⊕` / `⬇`).
  - Native 1-click install button (`beforeinstallprompt`) on Chromium Desktop & Android Chrome.
  - 1-click switch between the dynamic visual arrow pointer and the comprehensive step-by-step documentation modal.
  - Standalone status chips and direct access points in Desktop Sidebar (`Install Desktop App`), Mobile Header (`Install` pill), and Mobile More Drawer.

## 6. Acceptance Criteria
- [x] App loads and generates PDFs with DevTools Network set to **Offline**.
- [x] Manifest and service worker pass PWA installability checks.
- [x] Launch detection displays tailored PWA instructions for mobile (iOS/Android) and desktop (Mac/Windows/Chromium) with 1-click install when supported.
