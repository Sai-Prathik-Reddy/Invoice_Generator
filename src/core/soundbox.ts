/**
 * INGEN Multilingual POS Soundbox Engine
 *
 * Provides voice announcements and sound feedback for:
 * 1. Barcode scanning (speaks item name)
 * 2. Bill generation/finalization (announces bill total in local language)
 *
 * Uses the native Web Speech Synthesis API and Web Audio API. 100% offline, zero hardware cost.
 */

export interface SoundboxSettings {
  enabled: boolean;
  mode: 'voice' | 'beep' | 'mute';
  language: string; // e.g. 'en-IN', 'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'mr-IN'
  announceScanItem: boolean;
  announceBillTotal: boolean;
  speechRate: number; // 0.8 to 1.4 (default 1.05)
}

export const SOUNDBOX_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)', native: 'English', currency: 'Rupees' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी', currency: 'रुपये' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు', currency: 'రూపాయలు' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்', currency: 'ரூபாய்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ', currency: 'ರೂಪಾಯಿ' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी', currency: 'रुपये' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা', currency: 'টাকা' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી', currency: 'રૂપિયા' },
  { code: 'en-US', label: 'English (US / Global)', native: 'English (US)', currency: 'Dollars' },
  { code: 'es-ES', label: 'Spanish', native: 'Español', currency: 'pesos' },
  { code: 'fr-FR', label: 'French', native: 'Français', currency: 'euros' },
  { code: 'ar-SA', label: 'Arabic', native: 'العربية', currency: 'ريال' },
] as const;

const SETTINGS_STORAGE_KEY = 'ingen_soundbox_settings';

export const DEFAULT_SOUNDBOX_SETTINGS: SoundboxSettings = {
  enabled: true,
  mode: 'voice',
  language: 'en-IN',
  announceScanItem: true,
  announceBillTotal: true,
  speechRate: 1.05,
};

export function getSoundboxSettings(): SoundboxSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUNDBOX_SETTINGS;
    return { ...DEFAULT_SOUNDBOX_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SOUNDBOX_SETTINGS;
  }
}

export function saveSoundboxSettings(settings: Partial<SoundboxSettings>): SoundboxSettings {
  try {
    const current = getSoundboxSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SOUNDBOX_SETTINGS;
  }
}

function findBestVoice(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact language match (e.g. 'te-IN')
  const exact = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
  if (exact) return exact;

  // 2. Prefix match (e.g. 'te' for 'te-IN')
  const prefix = langCode.split('-')[0]?.toLowerCase();
  const langMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix || 'en'));
  if (langMatch) return langMatch;

  // 3. Fallback to default
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Format total bill announcement text according to selected language
 */
export function formatBillAnnouncementText(amount: string | number, langCode: string): string {
  const rounded = Math.round(Number(amount) || 0);
  switch (langCode) {
    case 'hi-IN':
      return `बिल राशि: ${rounded} रुपये`;
    case 'te-IN':
      return `బిల్లు మొత్తం: ${rounded} రూపాయలు`;
    case 'ta-IN':
      return `பில் தொகை: ${rounded} ரூபாய்`;
    case 'kn-IN':
      return `ಬಿಲ್ ಮೊತ್ತ: ${rounded} ರೂಪಾಯಿ`;
    case 'mr-IN':
      return `बिल रक्कम: ${rounded} रुपये`;
    case 'bn-IN':
      return `বিলের পরিমাণ: ${rounded} টাকা`;
    case 'gu-IN':
      return `બિલ રકમ: ${rounded} રૂપિયા`;
    case 'es-ES':
      return `Total de la factura: ${rounded}`;
    case 'fr-FR':
      return `Total de la facture: ${rounded}`;
    case 'ar-SA':
      return `إجمالي الفاتورة: ${rounded}`;
    default:
      return `Bill total: ${rounded} Rupees`;
  }
}

/**
 * Speak any text using the Web Speech Synthesis API
 */
export function speakText(text: string, customLang?: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const settings = getSoundboxSettings();
  if (!settings.enabled || settings.mode === 'mute') return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance to avoid queue lag

    const langCode = customLang || settings.language || 'en-IN';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = settings.speechRate || 1.05;

    const voice = findBestVoice(langCode);
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Soundbox speech synthesis error:', err);
  }
}

/**
 * Announce an item name when scanned
 */
export function announceItemScan(itemName: string) {
  const settings = getSoundboxSettings();
  if (!settings.enabled) return;

  if (settings.mode === 'voice' && settings.announceScanItem && itemName.trim()) {
    // Speak concise item name (strip trailing size details if too long)
    const cleanName = itemName.trim().split(/\s*[-–|]\s*/)[0] || itemName;
    speakText(cleanName);
  }
}

/**
 * Announce bill total when finalized
 */
export function announceBillTotal(amount: string | number) {
  const settings = getSoundboxSettings();
  if (!settings.enabled) return;

  if (settings.mode === 'voice' && settings.announceBillTotal) {
    const text = formatBillAnnouncementText(amount, settings.language);
    speakText(text, settings.language);
  }
}
