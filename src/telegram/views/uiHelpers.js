import { calculateProgressPercent } from '../../engine/progression/progressionEngine.js';

/**
 * Formats a visual Unicode progress bar.
 * @param {number} current - Current progress value
 * @param {number} required - Target/required value
 * @param {number} [length=10] - Number of characters in the bar
 * @returns {string} e.g. "██████░░░░ 60%"
 */
export function formatProgressBar(current, required, length = 10) {
  const percent = calculateProgressPercent(current, required);
  const safeLength = Math.max(5, Math.min(20, length));
  const filledCount = Math.min(safeLength, Math.max(0, Math.round((percent / 100) * safeLength)));
  const emptyCount = safeLength - filledCount;

  const filledChars = '█'.repeat(filledCount);
  const emptyChars = '░'.repeat(emptyCount);

  return `${filledChars}${emptyChars} ${percent}%`;
}

/**
 * Formats large numbers with thousands separators.
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-US');
}

/**
 * Escapes characters that have special meaning in Telegram Markdown (legacy mode).
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdown(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/([_*`\[\]()])/g, '\\$1');
}

export default {
  formatProgressBar,
  formatNumber,
  escapeMarkdown
};
