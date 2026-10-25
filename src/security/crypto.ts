const VERIFIER_PLAINTEXT = 'INGEN_VAULT_VERIFIED_V1';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveAesKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = 250000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function createVaultVerifier(password: string): Promise<{
  salt: string;
  iterations: number;
  verifier_iv: string;
  verifier_ct: string;
  key: CryptoKey;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250000;
  const key = await deriveAesKeyFromPassword(password, salt, iterations);

  const enc = new TextEncoder();
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(VERIFIER_PLAINTEXT)
  );

  return {
    salt: bytesToBase64(salt),
    iterations,
    verifier_iv: bytesToBase64(iv),
    verifier_ct: bytesToBase64(new Uint8Array(ctBuf)),
    key,
  };
}

export async function verifyVaultPassword(
  password: string,
  config: { salt: string; iterations: number; verifier_iv: string; verifier_ct: string }
): Promise<CryptoKey | null> {
  try {
    const salt = base64ToBytes(config.salt);
    const iv = base64ToBytes(config.verifier_iv);
    const ct = base64ToBytes(config.verifier_ct);
    const key = await deriveAesKeyFromPassword(password, salt, config.iterations);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ct as unknown as BufferSource
    );
    const text = new TextDecoder().decode(plainBuf);
    return text === VERIFIER_PLAINTEXT ? key : null;
  } catch {
    return null;
  }
}

export async function enrollBiometricQuickUnlock(companyName = 'INGEN User'): Promise<string | null> {
  if (!window.PublicKeyCredential) return null;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'INGEN Invoice Studio' },
        user: {
          id: userId,
          name: companyName,
          displayName: companyName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return null;
    return bytesToBase64(new Uint8Array(cred.rawId));
  } catch {
    return null;
  }
}

export async function verifyBiometricAssertion(credentialIdB64: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = base64ToBytes(credentialIdB64);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: rawId as unknown as BufferSource,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

export async function encryptBytesWithPassword(
  plainBytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250000;
  const key = await deriveAesKeyFromPassword(password, salt, iterations);

  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plainBytes as unknown as BufferSource
  );
  const ctBytes = new Uint8Array(ctBuf);

  // Header: "INGN" (4B) + version=1 (1B) + salt (16B) + iv (12B) = 33 bytes
  const out = new Uint8Array(33 + ctBytes.byteLength);
  out.set([0x49, 0x4e, 0x47, 0x4e, 0x01], 0);
  out.set(salt, 5);
  out.set(iv, 21);
  out.set(ctBytes, 33);
  return out;
}

export async function decryptBytesWithPassword(
  containerBytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  if (
    containerBytes.byteLength < 34 ||
    containerBytes[0] !== 0x49 ||
    containerBytes[1] !== 0x4e ||
    containerBytes[2] !== 0x47 ||
    containerBytes[3] !== 0x4e
  ) {
    throw new Error('Invalid .ingen backup file format');
  }

  const salt = containerBytes.slice(5, 21);
  const iv = containerBytes.slice(21, 33);
  const ct = containerBytes.slice(33);
  const key = await deriveAesKeyFromPassword(password, salt, 250000);

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ct as unknown as BufferSource
    );
    return new Uint8Array(plainBuf);
  } catch {
    throw new Error('Incorrect backup password or corrupted archive');
  }
}
