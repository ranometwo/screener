/**
 * General Utilities
 */
import { Logger } from './logger.js';

export const Utils = {
  extractTickerFromUrl(url) {
    const match = url.match(/\/company\/([^/]+)\//);
    return match ? match[1].toUpperCase() : null;
  },

  // Cache for BSE resolution
  bseCache: new Map(),

  /**
   * Resolves a symbol. If it's all digits, assumes it's a BSE code and tries to fetch the ticker.
   */
  async resolveSymbol(rawTicker) {
    if (!/^\d+$/.test(rawTicker)) return { ticker: rawTicker, exchange: 'NSE' };
    if (this.bseCache.has(rawTicker)) return { ticker: this.bseCache.get(rawTicker), exchange: 'BSE' };
    
    try {
      const res = await fetch(`https://www.screener.in/company/${rawTicker}/`);
      const html = await res.text();
      // Screener usually redirects or has a canonical link. 
      // We can also look for specific patterns in the HTML.
      // The original regex was: /company\/([A-Z0-9]+)\/consolidated/
      const match = html.match(/company\/([A-Z0-9]+)\/consolidated/) || html.match(/company\/([A-Z0-9]+)\//);
      
      const resolved = match ? match[1] : rawTicker;
      this.bseCache.set(rawTicker, resolved);
      return { ticker: resolved, exchange: 'BSE' };
    } catch (e) {
      Logger.error("Error resolving symbol:", e);
      return { ticker: rawTicker, exchange: 'BSE' };
    }
  },

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds.
   */
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
};
