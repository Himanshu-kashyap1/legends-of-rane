import { Resvg } from '@resvg/resvg-js';
import { logger } from '../utils/logger.js';

/**
 * High-performance SVG-to-PNG Buffer Renderer powered by @resvg/resvg-js.
 *
 * @param {string} svgString - Valid SVG XML string
 * @param {Object} [options={}] - Resvg options
 * @returns {Buffer} PNG Image Buffer
 */
export function renderSvgToPngBuffer(svgString, options = {}) {
  if (!svgString || typeof svgString !== 'string') {
    throw new Error('Valid SVG string is required for PNG card rendering.');
  }

  try {
    const defaultOptions = {
      fitTo: {
        mode: 'width',
        value: 800
      },
      font: {
        loadSystemFonts: true,
        defaultFontFamily: 'sans-serif'
      },
      logLevel: 'error'
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const resvg = new Resvg(svgString, mergedOptions);
    const pngData = resvg.render();
    return pngData.asPng();
  } catch (err) {
    logger.error('Resvg PNG rendering failed:', err);
    throw new Error(`Card rendering failed: ${err?.message}`);
  }
}

export default {
  renderSvgToPngBuffer
};
