/**
 * Callback Data Encoder & Parser
 *
 * Telegram restricts callback_data to a strict 64-byte payload.
 * Structure: `action:ownerId:targetId:meta`
 *
 * Examples:
 * - `nav_profile:987654321` (Private action owned by 987654321)
 * - `gather:987654321:forest_oak` (Gathering action owned by 987654321)
 * - `raid:pub:titan` (Public action, ownerId 'pub' indicates anyone can click)
 */

export const MAX_CALLBACK_BYTES = 64;
export const PUBLIC_OWNER_ID = 'pub';

/**
 * Encodes structured parameters into a compact callback string.
 * @param {Object} params
 * @param {string} params.action - Action identifier
 * @param {string|number} [params.ownerId='pub'] - Telegram user ID of authorized owner ('pub' for public)
 * @param {string} [params.targetId=''] - Optional entity ID
 * @param {string} [params.meta=''] - Optional extra parameters
 * @returns {string}
 */
export function encodeCallback({ action, ownerId = PUBLIC_OWNER_ID, targetId = '', meta = '' }) {
  if (!action || typeof action !== 'string') {
    throw new Error('Callback encoding requires a valid action string');
  }

  const cleanAction = action.trim();
  const cleanOwner = String(ownerId || PUBLIC_OWNER_ID).trim();
  const cleanTarget = String(targetId || '').trim();
  const cleanMeta = String(meta || '').trim();

  const parts = [cleanAction, cleanOwner];
  if (cleanTarget || cleanMeta) {
    parts.push(cleanTarget);
  }
  if (cleanMeta) {
    parts.push(cleanMeta);
  }

  const payload = parts.join(':');
  const byteLength = Buffer.byteLength(payload, 'utf8');

  if (byteLength > MAX_CALLBACK_BYTES) {
    throw new Error(`Callback payload exceeds 64 bytes (${byteLength} bytes): ${payload}`);
  }

  return payload;
}

/**
 * Parses and validates raw callback_data string from Telegram.
 * @param {string} rawString
 * @returns {{ action: string, ownerId: string, targetId: string, meta: string, isPublic: boolean, isValid: boolean }}
 */
export function parseCallback(rawString) {
  if (!rawString || typeof rawString !== 'string' || !rawString.trim()) {
    return {
      action: '',
      ownerId: '',
      targetId: '',
      meta: '',
      isPublic: false,
      isValid: false
    };
  }

  const parts = rawString.split(':');
  if (parts.length < 2) {
    return {
      action: parts[0] || '',
      ownerId: PUBLIC_OWNER_ID,
      targetId: '',
      meta: '',
      isPublic: true,
      isValid: Boolean(parts[0] && parts[0].trim())
    };
  }

  const [action, ownerId, targetId = '', meta = ''] = parts;
  const isPublic = ownerId === PUBLIC_OWNER_ID || ownerId === '0' || ownerId === 'all';
  const isValid = Boolean(action && action.trim() && ownerId && ownerId.trim());

  return {
    action: action || '',
    ownerId: ownerId || '',
    targetId: targetId || '',
    meta: meta || '',
    isPublic,
    isValid
  };
}

export default {
  encodeCallback,
  parseCallback,
  MAX_CALLBACK_BYTES,
  PUBLIC_OWNER_ID
};
