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
    
    Logger.debug(`[BSE Resolve] Starting resolution for: ${rawTicker}`);

    try {
      // Use background script to fetch to avoid CORS
      const result = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'FETCH_PAGE', url: `https://www.screener.in/company/${rawTicker}/` }, resolve);
      });

      if (!result || !result.success) {
          Logger.warn(`[BSE Resolve] Fetch failed for ${rawTicker}: ${result?.error}`);
          return { ticker: rawTicker, exchange: 'BSE' };
      }

      const { text: html, url: finalUrl, status } = result.data;
      Logger.debug(`[BSE Resolve] Fetch status: ${status} for ${rawTicker}`);
      
      let resolved = null;

      // Strategy 1: Parse for BSE link in company-links (User provided logic - Most Reliable)
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const links = doc.querySelectorAll('.company-links a[href*="bseindia.com/stock-share-price"]');
        Logger.debug(`[BSE Resolve] Found ${links.length} BSE links in DOM`);
        
        for (const link of links) {
          const href = link.getAttribute("href");
          Logger.debug(`[BSE Resolve] Checking link: ${href}`);
          // Format: /stock-share-price/company-name/symbol/code/
          const match = href.match(/stock-share-price\/[^/]+\/([^/]+)\//);
          if (match) {
            resolved = match[1].toUpperCase();
            Logger.debug(`[BSE Resolve] Match found via Strategy 1: ${resolved}`);
            break;
          }
        }
      } catch (parseErr) {
        Logger.warn("[BSE Resolve] Error parsing HTML for BSE link:", parseErr);
      }

      // Strategy 2: Check redirect URL (Screener slug)
      // If we were redirected from /company/12345/ to /company/SYMBOL/, use SYMBOL
      if (!resolved) {
         try {
             if (finalUrl && !finalUrl.includes(rawTicker)) {
                Logger.debug(`[BSE Resolve] Checking redirect URL: ${finalUrl}`);
                const match = finalUrl.match(/\/company\/([^/]+)\//);
                if (match) {
                  resolved = match[1].toUpperCase();
                  Logger.debug(`[BSE Resolve] Match found via Strategy 2: ${resolved}`);
                }
             }
         } catch (e) { Logger.warn("[BSE Resolve] Strategy 2 error:", e); }
      }

      // Strategy 3: Original internal link regex (Fallback)
      if (!resolved) {
          Logger.debug(`[BSE Resolve] Attempting Strategy 3 (Fallback Regex)`);
          const match = html.match(/company\/([A-Z0-9]+)\/consolidated/) || html.match(/company\/([A-Z0-9]+)\//);
          if (match) {
            resolved = match[1].toUpperCase();
            Logger.debug(`[BSE Resolve] Match found via Strategy 3: ${resolved}`);
          } 
      }
      
      resolved = resolved || rawTicker;
      Logger.debug(`[BSE Resolve] Final resolved symbol for ${rawTicker}: ${resolved}`);
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
  },

  async getStockExchange(symbol) {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}`;

    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'FETCH_PAGE', url }, resolve);
        });

        if (!result || !result.success) {
            Logger.warn(`[Exchange Resolve] Fetch failed for ${symbol}: ${result?.error}`);
            return null;
        }

        const data = JSON.parse(result.data.text);
        
        // Filter results for Indian exchanges
        const quote = data.quotes.find(q => q.symbol.includes(symbol));
        
        if (quote) {
            if (quote.exchange === 'NSI') return 'NSE';
            if (quote.exchange === 'BSE') return 'BSE';
            return quote.exchange; // Return actual exchange if different
        }
        return null; // Not Found
    } catch (error) {
        Logger.error("Error fetching exchange data:", error);
        return null;
    }
  }
};
