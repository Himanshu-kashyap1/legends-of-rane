/**
 * SVG Escaping, Typography, and Gradient Helpers for Card Rendering
 */

/**
 * Safely escapes XML/SVG special characters to prevent injection attacks and SVG parsing errors.
 * @param {any} text
 * @returns {string}
 */
export function escapeSvg(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncates text with an ellipsis if it exceeds maxLength.
 * @param {string} text
 * @param {number} [maxLength=24]
 * @returns {string}
 */
export function truncateText(text, maxLength = 24) {
  if (!text) return '';
  const str = String(text);
  if (str.length <= maxLength) return escapeSvg(str);
  return escapeSvg(str.slice(0, maxLength - 1) + '…');
}

/**
 * Generates common SVG gradient and filter definitions.
 * @returns {string}
 */
export function getCommonSvgDefs() {
  return `
    <defs>
      <!-- Dark Fantasy Gradient Background -->
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#090d16" />
      </linearGradient>

      <!-- Golden Border Gradient -->
      <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24" />
        <stop offset="50%" stop-color="#d97706" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>

      <!-- Glass Panel Gradient -->
      <linearGradient id="glassPanel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
      </linearGradient>

      <!-- Progress Bar Gradient -->
      <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#818cf8" />
      </linearGradient>

      <!-- Gold Progress Bar Gradient -->
      <linearGradient id="goldBar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fcd34d" />
        <stop offset="100%" stop-color="#f59e0b" />
      </linearGradient>

      <!-- Drop Shadow Filter -->
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6" />
      </filter>
    </defs>
  `;
}

export default {
  escapeSvg,
  truncateText,
  getCommonSvgDefs
};
