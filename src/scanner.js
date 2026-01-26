import { Utils } from './utils.js';
import { Store } from './store.js';

export const Scanner = {
  isScanning: false,

  async fetchUrl(url) {
    const res = await fetch(url);
    const text = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/html');
  },

  extractFromDoc(doc) {
    const symbols = [];
    const rows = doc.querySelectorAll("table.data-table tbody tr");
    rows.forEach(row => {
      const link = row.querySelector("a[href*='/company/']");
      if (link) {
        const ticker = Utils.extractTickerFromUrl(link.getAttribute("href"));
        if (ticker) symbols.push({ ticker, exchange: /^\d+$/.test(ticker) ? "BSE" : "NSE" });
      }
    });
    return symbols;
  },

  async scanAllPages(onProgress) {
    this.isScanning = true;
    let url = window.location.href;
    let count = 0;
    let page = 1;

    try {
      while (url && this.isScanning && page <= 50) {
        if (onProgress) onProgress(`Scanning Page ${page}...`);
        
        const doc = await this.fetchUrl(url);
        const symbols = this.extractFromDoc(doc);

        symbols.forEach(s => {
          if (Store.addSymbol(s.ticker, s.exchange)) count++;
        });

        // Find next link
        const nextLink = doc.querySelector("div.pagination a[rel='next']") ||
          Array.from(doc.querySelectorAll("a")).find(a => a.innerText.includes("Next"));

        url = nextLink ? nextLink.href : null;
        page++;
        
        await new Promise(r => setTimeout(r, 500)); // Rate limit
      }
    } catch (e) {
      console.error("Scanning failed:", e);
    }

    this.isScanning = false;
    return count;
  }
};
