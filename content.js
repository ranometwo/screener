// ---------------- Utility Functions ----------------

// Extracts the ticker from a URL (e.g. "/company/TBI/consolidated/" returns "TBI")
function extractTickerFromUrl(url) {
  const match = url.match(/\/company\/([^/]+)\//);
  return match ? match[1].toUpperCase() : null;
}

// Checks localStorage to see if the button for the given ticker was already clicked
function isButtonClicked(ticker) {
  return localStorage.getItem(`tv_clicked_${ticker}`) === "true";
}

// Creates a TradingView button for a given ticker (or a resolved symbol)
function createTVButton(ticker, resolvedSymbol = null) {
  const isNumeric = /^\d+$/.test(ticker);
  const label = resolvedSymbol || ticker.substring(0, 4);
  const symbol = resolvedSymbol || (isNumeric ? `BSE:${ticker}` : `NSE:${ticker}`);

  const button = document.createElement("button");
  button.textContent = label.substring(0, 4); // Limit label to 4 characters
  button.style.cssText = `
    padding: 4px 8px;
    margin: 0 1px;
    font-size: 12px;
    font-family: inherit;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: ${isButtonClicked(ticker) ? "#d0e8ff" : "#fff"};
    cursor: pointer;
    transition: background-color 0.3s ease;
  `;
  
  button.addEventListener("click", () => {
    const url = `https://in.tradingview.com/chart/XYvjskbW/?symbol=${encodeURIComponent(symbol)}`;
    window.open(url, "_blank");
    localStorage.setItem(`tv_clicked_${ticker}`, "true");
    button.style.backgroundColor = "#d0e8ff";
  });
  
  return button;
}

// For numeric tickers (BSE), fetch the symbol from the stock's individual page
async function resolveBSETickerSymbol(ticker) {
  try {
    const res = await fetch(`/company/${ticker}/`);
    const html = await res.text();
    const div = document.createElement("div");
    div.innerHTML = html;
    // Find the link with BSE symbol in the company links section 
    const links = div.querySelectorAll('.company-links a[href*="bseindia.com/stock-share-price"]');
    for (const link of links) {
      const href = link.getAttribute("href");
      const match = href.match(/stock-share-price\/[^/]+\/([^/]+)\//);
      if (match) return match[1].toUpperCase();
    }
  } catch (err) {
    console.warn("Could not resolve BSE ticker symbol:", err);
  }
  return null;
}

// ---------------- Parent Check ----------------

// Determines whether the TV button should be added based on the table’s parent section.
// If a table is within a parent section with an id, process only if the id is "peers".
function shouldProcessTable(table) {
  const parentSection = table.closest("section");
  if (parentSection) {
    return parentSection.id === "peers";
  }
  return true;
}

// ---------------- Table Footer Adjustment ----------------

// Adjusts the footer rows by inserting an empty cell at the beginning of each row.
function adjustTableFooter(table) {
  const tfoot = table.querySelector("tfoot");
  if (!tfoot || tfoot.dataset.footerAdjusted) return;
  tfoot.dataset.footerAdjusted = "true";
  tfoot.querySelectorAll("tr").forEach(tr => {
    const td = document.createElement("td");
    td.innerHTML = "";
    tr.insertBefore(td, tr.firstChild);
  });
}

// ---------------- Data Table Processing ----------------

// Processes any table with class "data-table" by adding a TV column in headers 
// and inserting TV buttons in each data row.
async function processDataTable(table) {
  // Skip if already processed.
  if (!table || table.dataset.tvProcessed) return;

  // Check for parent section. If there is one and its id is not "peers", skip processing.
  if (!shouldProcessTable(table)) return;
  
  table.dataset.tvProcessed = "true";

  // Process all header rows (rows with TH elements) outside the footer.
  const allRows = table.querySelectorAll("tr");
  allRows.forEach(row => {
    if (row.closest("tfoot")) return; // skip footer rows
    if (row.querySelectorAll("th").length > 0 && !row.querySelector("th.tv-col")) {
      const th = document.createElement("th");
      th.className = "tv-col";
      th.textContent = "TV";
      row.insertBefore(th, row.firstElementChild);
    }
  });

  // Process data rows in TBODY (rows without TH cells).
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  Array.from(tbody.rows).forEach(async (row) => {
    if (row.querySelector("th") || row.querySelector("td.tv-col")) return;

    const link = row.querySelector("a[href*='/company/']");
    const ticker = link ? extractTickerFromUrl(link.getAttribute("href")) : null;
    if (!ticker) return;

    const cell = document.createElement("td");
    cell.className = "tv-col";

    if (/^\d+$/.test(ticker)) {
      const symbol = await resolveBSETickerSymbol(ticker);
      cell.appendChild(createTVButton(ticker, symbol));
    } else {
      cell.appendChild(createTVButton(ticker));
    }
    row.insertBefore(cell, row.firstElementChild);
  });

  // Adjust the footer so that its cells are shifted right.
  adjustTableFooter(table);
}

// Polls for any new "data-table" elements that might be loaded asynchronously.
function waitForDataTables() {
  const intervalId = setInterval(() => {
    const tables = document.querySelectorAll("table.data-table");
    if (tables.length > 0) {
      tables.forEach(table => processDataTable(table));
    }
    // Optionally, stop polling after a certain number of attempts or if no new tables appear.
  }, 500);
}

// ---------------- Stock Page Specific Handling ----------------

// Adds the TV button in the company links section on stock pages.
function processCompanyLinksSection() {
  const companyLinksDiv = document.querySelector(".company-links");
  if (!companyLinksDiv || companyLinksDiv.querySelector(".tv-stock-btn")) return;

  const nseOrBseLink = Array.from(companyLinksDiv.querySelectorAll("a")).find(a =>
    a.href.includes("nseindia.com/get-quotes") || a.href.includes("bseindia.com")
  );

  if (nseOrBseLink) {
    const rawTicker = extractTickerFromUrl(window.location.pathname) || "NSE";
    let symbol = "NSE:" + rawTicker;
    
    if (nseOrBseLink.href.includes("bseindia.com")) {
      const match = nseOrBseLink.href.match(/stock-share-price\/[^/]+\/([^/]+)\//);
      if (match && match[1]) {
        const bseSymbol = match[1].toUpperCase();
        symbol = "BSE:" + bseSymbol;
      }
    }

    const btn = createTVButton(rawTicker, symbol.split(":")[1]);
    btn.classList.add("tv-stock-btn");
    companyLinksDiv.insertBefore(btn, nseOrBseLink.nextSibling);
  }
}

// ---------------- Initialization ----------------

// Initializes the extension by processing the company links (for stock pages)
// and any data tables (list pages or peer sections). 
function init() {
  const url = window.location.href;

  // Run only on URLs that contain "screen", "screens", or "company"
  if (/\/(screen|screens|company|people)\//.test(url)) {
    // Process the company links section on stock pages.
    if (document.querySelector(".company-links")) {
      processCompanyLinksSection();
    }

    // Immediately process any available data tables (main list or peers).
    document.querySelectorAll("table.data-table").forEach(table => processDataTable(table));

    // Start polling for any tables that might be loaded dynamically.
    waitForDataTables();
  } else {
    console.log("URL does not match target paths. Script not initialized.");
  }
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
