# INGEN — Engineering Conventions

## 1. Repository Layout
```
.
├── docs/                      # specs (this folder)
├── public/                    # icons, fonts (precached), robots.txt
├── src/
│   ├── app/                   # router, providers, bootstrap.ts, error boundary
│   ├── core/                  # PURE TS — no React/Dexie/DOM imports (lint-enforced)
│   │   ├── id/  schema/  formula/  format/  tokens/  sequence/  upi/  validate/  style/
│   ├── db/                    # dexie schema, repos/, cache/
│   ├── security/              # vault, crypto, webauthn
│   ├── backup/                # export/import, container format
│   ├── pdf/                   # worker.ts, api.ts (Comlink), blocks/, fonts.ts, preview/
│   ├── features/              # one folder per feature (see ARCHITECTURE §4)
│   │   └── <feature>/ { routes/, components/, hooks/, store.ts, index.ts }
│   ├── design-system/         # tokens.css, glass, AppShell, nav, custom components
│   ├── components/ui/         # shadcn-generated components (themed)
│   ├── templates/             # starter template JSONs
│   └── lib/                   # small generic helpers (cn, debounce, platform detection)
├── tests/e2e/                 # Playwright
└── vite.config.ts
```

## 2. Dependency Rules (enforced by `eslint-plugin-boundaries` or `import/no-restricted-paths`)
| From | May import |
|---|---|
| `core/` | `core/` only (plus `big.js`, `zod`, `ulid`) |
| `db/` | `core/`, `security/crypto` |
| `pdf/` (worker) | `core/`, `pdf/` |
| `features/*` | `core/`, `db/repos`, `design-system/`, `components/ui/`, `pdf/api`, `lib/` — **not other features' internals** (only their `index.ts`) |
| `components/ui/` | `lib/` |

## 3. TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Types come from zod (`z.infer`). Hand-written duplicates of schema types are not allowed.
- No `any`. When something truly is unknown, use `unknown` and narrow it.
- Money: `Decimal` (string). Any function that accepts or returns money must use `Decimal` and big.js. **Lint rule:** no arithmetic operators on identifiers ending in `amount|total|rate|price|tax` outside `core/formula`.

## 4. Naming
| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `StatCard.tsx` |
| Files (other) | kebab-case | `amount-in-words.ts` |
| Hooks | `useX` | `useActiveCompany` |
| Zustand stores | `useXStore` | `useBuilderStore` |
| Repos | `xRepo` | `documentsRepo.finalize()` |
| JSON keys (persisted) | snake_case | `template_version_id` |
| TS variables | camelCase | `templateVersionId` |
| Test files | `*.test.ts` next to the source; E2E in `tests/e2e/*.spec.ts` | |

Persisted data uses snake_case because it's the stored and exported format. Mapping to camelCase is **not** done; we use the snake_case keys directly in TS for these types.

## 5. UI Rules
- Use only design-system tokens and components. No raw hex colours or arbitrary Tailwind values in feature code (`bg-[#123]` is a review blocker).
- Every interactive element needs a stable `id` or `data-testid` for E2E tests.
- Touch targets ≥ 44 × 44 px. Every action that's available on hover must also be reachable by tap and by keyboard.
- Dialogs use `ResponsiveDialog` (a Dialog on desktop, a Drawer on mobile).
- Money is displayed with `<MoneyText>` (tabular numbers, Indian grouping).
- Destructive actions use a confirm dialog. Irreversible ones (deleting a finalized document, disabling the Vault) require typing a confirmation.

## 6. State & Data
- Persistent data is read with `useLiveQuery` through repo functions and written through repos only.
- Zustand is for builder, session, and vault state, never for mirroring DB tables.
- No side-effecting startup work in `useEffect`; use `app/bootstrap.ts`, which is idempotent.
- Never `await` non-Dexie promises (crypto, fetch, worker) inside `db.transaction()`.

## 7. Testing
| Layer | Tool | Expectation |
|---|---|---|
| `core/` | Vitest | ≥ 95% line coverage; golden fixtures for GST, words, sequences |
| `db/`, `security/`, `backup/` | Vitest + `fake-indexeddb` | Round-trips, transactions, migrations |
| Components | Vitest + Testing Library | Key interactions, a11y roles |
| PDF | Playwright + pdf.js rasterization | Visual baselines for the starter templates |
| E2E | Playwright (Chromium, WebKit, mobile emulation) | Critical flows + offline |

## 8. Git
- Conventional Commits (`feat(generator): …`, `fix(formula): …`, `docs: …`).
- Small PRs, one feature slice each. CI must pass: typecheck, lint, unit tests, build, bundle-size check.
- If a PR changes behaviour defined in `docs/`, it updates the docs in the same PR.

## 9. Security Hygiene
- Never log record payloads, passwords, keys, or PRF outputs.
- No `eval`, `new Function`, or `dangerouslySetInnerHTML` (except shadcn chart CSS variables).
- CSP: `default-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'`.
- No third-party analytics or CDNs at runtime. All assets are self-hosted and precached.
