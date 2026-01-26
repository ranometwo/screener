chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("screener.in") || tab.url.includes("tradingview.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
    }
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