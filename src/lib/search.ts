/**
 * Search normalization and transliteration
 * Uzbek Cyrillic <-> Latin & Russian transliteration + apostrophe stripping
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya', 'ў': 'o', 'ғ': 'g', 'қ': 'q', 'ҳ': 'h'
};

export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';

  let lower = text.toLowerCase();

  // Transliterate cyrillic chars
  let converted = '';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    if (CYRILLIC_TO_LATIN[char] !== undefined) {
      converted += CYRILLIC_TO_LATIN[char];
    } else {
      converted += char;
    }
  }

  // Remove all apostrophe variants: ', ʻ, ʼ, ‘, ’, `, \", backtick
  return converted.replace(/['ʻʼ‘’`"]/g, '').trim();
}

export function formatPhoneNumber(val: string): string {
  // Extract all digits
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  // Standardize 998 prefix
  let clean = digits;
  if (clean.startsWith('998')) {
    clean = clean.slice(3);
  }

  // Max 9 digits for Uzbek numbers
  clean = clean.slice(0, 9);

  let formatted = '+998';
  if (clean.length > 0) formatted += ' ' + clean.slice(0, 2);
  if (clean.length > 2) formatted += ' ' + clean.slice(2, 5);
  if (clean.length > 5) formatted += ' ' + clean.slice(5, 7);
  if (clean.length > 7) formatted += ' ' + clean.slice(7, 9);

  return formatted;
}

export function cleanPhoneDigits(val: string): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

export function buildClientSearchText(client: {
  full_name: string;
  phone: string;
  phone2?: string;
  shop_name?: string;
  market?: string;
}): string {
  const parts = [
    client.full_name,
    client.shop_name || '',
    client.market || '',
    cleanPhoneDigits(client.phone),
    cleanPhoneDigits(client.phone2 || '')
  ];

  return normalizeSearchText(parts.join(' '));
}

export function matchClientSearch(
  client: { full_name: string; phone: string; phone2?: string; shop_name?: string; market?: string },
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeSearchText(query.trim());
  const queryDigits = cleanPhoneDigits(query);

  // If query consists of digits (e.g. "4567" or last digits)
  if (queryDigits.length >= 2) {
    const p1 = cleanPhoneDigits(client.phone);
    const p2 = cleanPhoneDigits(client.phone2 || '');
    if (p1.includes(queryDigits) || p2.includes(queryDigits)) {
      return true;
    }
  }

  const searchable = buildClientSearchText(client);
  return searchable.includes(normalizedQuery);
}

