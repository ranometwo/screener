# Project Progress & State

> **Note:** This file maintains the current state of the project. It **MUST** be updated whenever functionality changes or code is refactored.

## Overview
**Project:** EvenTrade - Screener.in Assistant
**Version:** 3.2 (Keyboard & TV Support)
**Type:** Chrome Extension
**Core Functionality:** Enhances Screener.in with a sidebar for watchlists, TradingView chart integration, and bulk scanning capabilities.

## Architecture
- **Manifest V3**
- **Loader (`src/loader.js`):** Classic script acting as a bridge to dynamically import ES Modules.
- **Entry Point (`src/content.js`):** Orchestrates module initialization (Store, Sidebar, Injector).
- **Modules (`src/`):**
  - **`store.js`:** State management (Watchlists, Settings) using `chrome.storage.sync`.
  - **`sidebar.js`:** UI Component using Shadow DOM.
  - **`injector.js`:** Handles DOM manipulation (Columns, Buttons) using `MutationObserver`.
  - **`scanner.js`:** Logic for page scraping and pagination.
  - **`utils.js` & `constants.js`:** Shared helpers and configuration.
- **Styling:**
  - `assets/style.css`: Injected into the page.
  - Shadow DOM Styles: Encapsulated within `Sidebar`.

## Current Features (v3.1)

### 1. Sidebar & Watchlists
- **Multi-Watchlist Support:** Create, delete, and switch between multiple named watchlists.
- **Symbol Management:** Add/remove symbols.
- **Status Tags:** Toggle colors (Red, Yellow, Green) for each symbol.
- **Navigation:**
    - Click ticker -> Opens Screener.in page.
    - Click TV icon -> Opens TradingView chart.
- **Settings:**
    - Dark Mode toggle (Real-time).
    - Column visibility toggles (WList, TrVw) with real-time updates.
    - Import/Export CSV.

### 2. DOM Integration (Injector)
- **Table Augmentation:** Injects "WList" and "TrVw" columns into `table.data-table`.
- **Performance:** Uses `MutationObserver` to efficiently track DOM changes (No polling).
- **Action Buttons:**
    - **Add Button:** Adds stock to active watchlist.
    - **Chart Button:** Opens TradingView chart (changes color when visited).

### 3. Scanner
- **Page Scan:** Scans current page table for symbols.
- **Deep Scan:** "Scan All (50)" fetches up to 50 pages of results recursively.

### 4. Utilities
- **BSE Resolver:** Resolves numeric BSE codes to symbols via background fetch if needed.

## Recent Changes
- **v3.6 (BSE & Logging):**
  - **CORS Fix:** Moved network requests to background service worker to fix CORS errors on TradingView.
  - **BSE Sidebar Fix:** Sidebar now resolves numeric BSE codes (e.g. `500012`) to symbols (e.g. `ANDHRAPET`) on-click for valid TradingView links.
  - **BSE Keyboard Nav:** Arrow keys now correctly resolve and navigate to BSE symbols on TradingView.
  - **Logging:** Promoted resolution logs to `INFO` level for better debugging visibility.
- **v3.5 (BSE Fix):**
  - **BSE Link Resolution:** Restored robust BSE symbol resolution by parsing `bseindia.com` links from the company page.
- **v3.2 (Keyboard & TV Support):**
  - **Keyboard Navigation:** Arrow Up/Down to navigate watchlist with visual highlight.
  - **Cross-Site Shortcuts:** 'T' (open TV) and 'S' (open Screener) shortcuts.
  - **TradingView Support:** Sidebar now works on `tradingview.com` with context-aware navigation.
  - **Ctrl+Click:** Open symbols in new tab.
  - **Robustness:** Highlight persistence across reloads (URL-sync) and focus retention (sessionStorage).
  - **UI Update:** Resizable Dock on right side (no shadow, drag-to-resize).
  - **TV Support:** Fixed content shift on TradingView using `transform: translateZ(0)` hack. Moved sidebar to `documentElement` to avoid layout issues.
- **v3.4 (Export/Import):**
  - **Export Watchlist:** Single-line comma-separated format (`NSE:TCS, NSE:INFY`) for easy sharing/Copy-Paste.
  - **Enhanced Import:** Supports comma-separated tokens in addition to newlines.
- **v3.3 (Soft Navigation):**
  - **Soft Navigation on TradingView:** Uses `tv-inject.js` (Page Context Injection) to access internal `TradingViewApi`.
  - **Architecture:** Sidebar dispatches `CustomEvent` -> Injected Script calls `changeSymbol` -> Chart updates instantly.
  - **Fallback:** Logic handles UI failures by falling back to standard URL navigation.
- **v3.1 Refactor:**
  - Broke monolithic `content.js` into modular ES6 classes/objects.
  - Implemented `loader.js` for dynamic ES module importing.
  - Replaced `setInterval` with `MutationObserver` in `Injector`.
  - Fixed real-time column toggling bugs.
  - Fixed `Store.applyTheme` bug.

  - **Storage Fix:** Switched to `chrome.storage.local` to bypass 8KB limit, enabling unlimited watchlists with auto-migration from sync.

## Known Issues / Technical Debt
- **BSE Caching:** Resolver cache is in-memory only (resets on reload).

