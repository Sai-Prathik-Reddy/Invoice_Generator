# 00 — App Shell, Navigation & Bootstrap

> Responsive glass shell (`AppSidebar` on desktop, floating `BottomNav` + center `CreateFab` on mobile), global command palette (`Cmd+K`), Vault lock gate, and idempotent startup bootstrap.

## 1. Overview
Provides the top-level chrome, route layout, theme provider, lock-screen gate, offline/update banners, and deterministic startup initialization outside React `useEffect`.

## 2. User Stories
- **US-00.1:** As a mobile user, I want a bottom navigation bar with a prominent center `+` button so I can create an invoice with one thumb tap.
- **US-00.2:** As a desktop user, I want a collapsible left sidebar and `Cmd/Ctrl + K` quick switcher to jump between invoices, clients, and templates.
- **US-00.3:** As a user with multiple businesses, I want to switch the active company from the shell header/sidebar and immediately scope all data.

## 3. UX & Flows

### Route Map
| Path | Screen | Shell |
|---|---|---|
| `/onboarding` | First-run setup wizard | Chromeless |
| `/` | Dashboard | Standard Shell |
| `/documents` | Documents list & filters | Standard Shell |
| `/documents/new` | Document Generator (new draft) | Focus Header |
| `/documents/:id` | Document Detail / Preview / Share | Standard Shell |
| `/documents/:id/edit` | Document Generator (edit draft) | Focus Header |
| `/templates` | Template Gallery & My Templates | Standard Shell |
| `/templates/:id/builder` | Fullscreen Template Builder | Builder Chrome |
| `/catalog` | Clients & Items (`?tab=clients\|items`) | Standard Shell |
| `/backup` | Backup, Restore & Secure Vault | Standard Shell |
| `/settings` | Company profile, Appearance, Storage | Standard Shell |
| `/dev/design` | Design System Showcase | Standard Shell |

## 4. Functional Requirements
- **FR-00.1:** `bootstrapApp()` runs once before `createRoot().render()` to open Dexie, seed starter templates if empty, read `settings.ui` and `settings.vault`, and register the service worker.
- **FR-00.2:** If `settings.vault.enabled === true` and the in-memory DEK is locked, render `<VaultLockScreen />` over all routes.
- **FR-00.3:** If no `Company` exists, redirect to `/onboarding` (except `/dev/design` and `/backup` for restore).
- **FR-00.4:** Safe-area insets (`env(safe-area-inset-bottom)`) pad the mobile `BottomNav` for iOS home indicators.

## 5. Technical Implementation
- **Files:** `src/app/bootstrap.ts`, `src/app/router.tsx`, `src/design-system/AppShell.tsx`, `src/design-system/AppSidebar.tsx`, `src/design-system/BottomNav.tsx`, `src/design-system/CreateSheet.tsx`.
- **Bootstrap Signature:**
  ```ts
  export interface BootstrapState {
    hasCompany: boolean;
    activeCompanyId: ID<'cmp'> | null;
    vaultEnabled: boolean;
    theme: 'dark' | 'light' | 'system';
  }
  export async function bootstrapApp(): Promise<BootstrapState>;
  ```

## 6. Edge Cases & Error Handling
- React 19 `StrictMode` double-invocation is avoided by calling `bootstrapApp()` at module entry with a singleton promise guard.
- Corrupted IndexedDB or blocked storage shows a clear recovery screen with a "Restore from `.ingen` backup" button.

## 7. Security & Privacy
- `visibilitychange` listener starts a timer when hidden; after `vault.auto_lock_minutes`, `vaultStore.lock()` zeroes the in-memory DEK and clears decrypted caches.

## 8. Testing & Acceptance Criteria
- [ ] Desktop renders collapsible sidebar; mobile (`<768px`) renders 5-slot bottom nav + center FAB.
- [ ] Theme toggle switches `html.dark` without flash of unstyled content.
- [ ] `Cmd+K` opens quick navigation and search.
