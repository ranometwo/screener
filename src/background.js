const ACTION_TITLE = "Toggle EvenTrade Sidebar";
const SUPPORTED_HOSTS = ["screener.in", "tradingview.com", "kite.zerodha.com"];
const SUPPORTED_SITES = [
    { name: "Screener.in", url: "https://www.screener.in/" },
    { name: "TradingView", url: "https://in.tradingview.com/" },
    { name: "Kite (Zerodha)", url: "https://kite.zerodha.com/" }
];
const UNSUPPORTED_TITLE = `EvenTrade works on: ${SUPPORTED_SITES.map(site => site.name).join(", ")}.`;
const UNSUPPORTED_NOTICE_COOLDOWN_MS = 8000;
const unsupportedNoticeByTab = new Map();

function clearUnsupportedBadge(tabId) {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: ACTION_TITLE });
}

function showUnsupportedSiteMessage(tab) {
    const tabId = tab?.id;
    if (!tabId) return;

    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#d32f2f" });
    chrome.action.setTitle({ tabId, title: UNSUPPORTED_TITLE });

    const lastShownAt = unsupportedNoticeByTab.get(tabId) || 0;
    const now = Date.now();
    if (now - lastShownAt < UNSUPPORTED_NOTICE_COOLDOWN_MS) return;

    unsupportedNoticeByTab.set(tabId, now);
    chrome.tabs.create({ url: chrome.runtime.getURL("unsupported.html") });
}

async function ensureSidebarToggle(tab) {
    if (!tab?.id) return;

    const url = tab?.url || "";
    const isSupported = SUPPORTED_HOSTS.some(host => url.includes(host));

    if (!isSupported) {
        showUnsupportedSiteMessage(tab);
        return;
    }

    clearUnsupportedBadge(tab.id);

    try {
        await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
        return;
    } catch (error) {
        const message = error?.message || String(error);
        // If the content script isn't ready/injected yet, inject and retry once.
        if (message.includes("Receiving end does not exist")) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["src/loader.js"]
                });
                // Give the loader a moment to register its listeners.
                await new Promise(resolve => setTimeout(resolve, 50));
                await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
            } catch (retryError) {
                console.warn("[EvenTrade] Failed to inject/toggle sidebar:", retryError);
            }
        } else {
            console.warn("[EvenTrade] Failed to toggle sidebar:", error);
        }
    }
}

chrome.action.onClicked.addListener((tab) => {
    // Fire and forget; errors are handled inside.
    ensureSidebarToggle(tab);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_PAGE') {
        fetch(request.url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                // Check for redirects if needed, but fetch follows them by default usually
                // detailed info about redirect might be needed for Strategy 2
                return response.text().then(text => ({ text, url: response.url, status: response.status }));
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
});
