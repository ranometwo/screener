import { Store } from './store.js';
import { Logger } from './logger.js';
import { ICONS } from './constants.js';
import { Utils } from './utils.js';
import { SidebarInstance } from './sidebar.js';

export const Injector = {
  observer: null,

  init() { 
    this.process(); 
    
    // Use MutationObserver instead of polling
    this.observer = new MutationObserver((mutations) => {
      // Check if nodes were added that might be tables
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) this.process();
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  },

  process(force) {
    // Only add buttons on Screen pages
    if (!window.location.href.includes('/screens/')) return;

    document.querySelectorAll("table.data-table").forEach(table => {
      this.injectHeaders(table, force);
      this.injectRows(table);
    });
  },

  injectHeaders(table, force) {
    let theadRow = table.querySelector("thead tr");
    if (!theadRow) {
      const firstRow = table.querySelector("tr");
      if (firstRow && firstRow.querySelector("th")) {
        theadRow = firstRow;
      }
    }

    if (!theadRow) return;

    let wlHeader = theadRow.querySelector('.et-head-wl');
    if (!Store.state.settings.showColWatchlist && wlHeader) wlHeader.remove();
    if (Store.state.settings.showColWatchlist && !wlHeader) {
      wlHeader = document.createElement("th");
      wlHeader.className = 'et-head-wl';
      wlHeader.innerText = "WList";
      wlHeader.style = "width:50px; font-size:13px; text-align:center;";
      theadRow.insertBefore(wlHeader, theadRow.firstChild);
    }

    let tvHeader = theadRow.querySelector('.et-head-tv');
    if (!Store.state.settings.showColTv && tvHeader) tvHeader.remove();
    if (Store.state.settings.showColTv && !tvHeader) {
      tvHeader = document.createElement("th");
      tvHeader.className = 'et-head-tv';
      tvHeader.innerText = "TrVw";
      tvHeader.style = "width:50px; font-size:13px; text-align:center;";
      wlHeader ? wlHeader.after(tvHeader) : theadRow.insertBefore(tvHeader, theadRow.firstChild);
    }
  },

  injectRows(table) {
    table.querySelectorAll("tbody tr").forEach(row => {
      const link = row.querySelector("a[href*='/company/']");
      if (!link) return;
      const rawTicker = Utils.extractTickerFromUrl(link.getAttribute("href"));
      if (!rawTicker) return;

      // Watchlist Button
      const wlCell = row.querySelector('.et-col-wl');
      if (!Store.state.settings.showColWatchlist && wlCell) wlCell.remove();
      if (Store.state.settings.showColWatchlist && !wlCell) {
        const td = document.createElement("td");
        td.className = 'et-col-wl';
        td.style = "cursor:pointer; text-align:center;";
        td.innerHTML = `<div style="color:#ccc; transition:0.2s;">${ICONS.plus}</div>`;
        td.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          Store.addSymbol(rawTicker, /^\d+$/.test(rawTicker) ? 'BSE' : 'NSE');
          SidebarInstance.renderContent();
          td.innerHTML = `<div style="color:var(--et-green, #4caf50); transform:scale(1.2);">${ICONS.plus}</div>`;
          if (!Store.state.isOpen) SidebarInstance.toggle();
        };
        row.insertBefore(td, row.firstChild);
      }

      // TV Button
      const tvCell = row.querySelector('.et-col-tv');
      if (!Store.state.settings.showColTv && tvCell) tvCell.remove();
      if (Store.state.settings.showColTv && !tvCell) {
        const td = document.createElement("td");
        td.className = 'et-col-tv';
        td.style.textAlign = 'center';
        const isVisited = Store.isVisited(rawTicker);
        const bg = isVisited ? '#673ab7' : '#2962ff';
        const btn = document.createElement('a');
        btn.innerText = rawTicker.substring(0, 4);
        btn.style.cssText = `display:inline-block; background:${bg}; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:3px; text-decoration:none; cursor:pointer; min-width:38px; text-align:center;`;

        btn.onclick = async (e) => {
          e.preventDefault(); e.stopPropagation();
          Logger.debug(`[Injector] TV Button clicked for ${rawTicker}`);
          Store.markVisited(rawTicker);
          btn.style.background = '#673ab7';
          btn.innerText = "...";
          const resolved = await Utils.resolveSymbol(rawTicker);
          Logger.debug(`[Injector] Resolved ${rawTicker} to ${resolved.ticker} (${resolved.exchange})`);
          btn.innerText = rawTicker.substring(0, 4);
          window.open(`https://in.tradingview.com/chart/?symbol=${resolved.exchange}:${resolved.ticker}`, '_blank');
        };
        td.appendChild(btn);
        
        const ref = row.querySelector('.et-col-wl') ? row.querySelector('.et-col-wl').nextSibling : row.firstChild;
        row.insertBefore(td, ref);
      }
    });
  }
};
