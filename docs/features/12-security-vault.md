# 12 — Secure Vault (At-Rest Encryption & Biometric Unlock)

> Optional zero-knowledge at-rest encryption (`AES-256-GCM` DEK wrapped by a `PBKDF2-SHA-256` password KEK and optional WebAuthn PRF biometric KEK). Forgotten password with no enrolled biometric means permanent, unrecoverable data loss by design.

## 1. Overview
Protects all business records and PDF/image assets at rest in IndexedDB using native Web Crypto APIs, with fast fingerprint/Face ID unlock where supported.

## 2. Cryptographic Key Hierarchy
1. **Data Encryption Key (DEK):** Random 256-bit `AES-GCM` key generated once when enabling the Vault. Held only in memory while unlocked.
2. **Password KEK:** Derived from user password via `PBKDF2-SHA-256` (`600,000` iterations, random 16-byte salt). Wraps the raw DEK bytes via `AES-256-GCM` (`wrapped_dek_password: { iv, ct }`).
3. **Biometric KEK (Optional):** Uses a WebAuthn platform credential (`authenticatorAttachment: 'platform'`, `userVerification: 'required'`).
   - When the browser supports the WebAuthn **PRF** extension (`extensions: { prf: { eval: { first: prfSalt } } }`), derives a 256-bit KEK via `HKDF-SHA-256` to wrap the DEK (`biometric.wrapped_dek`).
   - When WebAuthn is available for local presence verification or password-only is chosen, provides seamless fallback to password entry.
4. **No Recovery Backdoor:** The plaintext password and DEK are never stored anywhere. Enabling the Vault requires explicit user confirmation: *"I understand that if I forget my password, my data cannot be recovered."*

## 3. Repository Encryption Rule (Avoiding IDB Auto-Commit)
IndexedDB transactions automatically close if you `await` a non-IDB Promise (such as `crypto.subtle.encrypt`).
- **Rule:** Repositories always encrypt payloads **before** opening `db.transaction()`, and decrypt payloads **after** the transaction reads complete.
- While unlocked, repositories maintain an in-memory decrypted map so dashboard metrics, sorting, and catalog autocomplete remain instantaneous.

## 4. Functional Requirements
- **FR-12.1:** Enabling Vault on an existing database encrypts all existing records and asset blobs in batches with a progress bar.
- **FR-12.2:** Changing the Vault password only re-wraps the 32-byte DEK (`O(1)` time, no full-DB re-encryption needed).
- **FR-12.3:** Auto-lock clears the in-memory DEK and decrypted cache after `auto_lock_minutes` (default 5 min) of background inactivity or manual **Lock Now**.

## 5. Technical Implementation
- **Files:** `src/security/crypto.ts`, `src/security/vaultStore.ts`, `src/security/webauthn.ts`, `src/features/settings/VaultLockScreen.tsx`, `src/features/settings/VaultSettingsCard.tsx`.

## 6. Acceptance Criteria
- [ ] Correct password unlocks DEK and decrypts records; wrong password fails `AES-GCM` authentication tag verification immediately.
- [ ] Locked state renders `<VaultLockScreen />` and prevents reading any sensitive data.
