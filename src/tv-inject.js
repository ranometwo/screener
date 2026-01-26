(function() {
  // Injected Script: Runs in the page context of TradingView.
  // Accesses the internal `TradingViewApi` or `TradingView` object to switch symbols 
  // without a full page reload.
  
  document.addEventListener("change_tradingview_symbol", function(event) {
    const { symbol, exchange } = event.detail;
    
    const tvApi = window.TradingViewApi || window.TradingView;

    if (tvApi) {
      try {
        let interval = 'D';
        if (tvApi.getSymbolInterval) {
           interval = tvApi.getSymbolInterval().interval;
        }

        const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;
        
        // Method 1: TradingViewApi.changeSymbol (Standard for some charts)
        if (tvApi.changeSymbol) {
             tvApi.changeSymbol(fullSymbol, interval);
        } 
        // Method 2: Widget API (ChartWidgetApi)
        else if (tvApi.chart && tvApi.chart().setSymbol) {
             tvApi.chart().setSymbol(fullSymbol);
        } 
        
      } catch (err) {
        console.error("[EvenTrade] Soft nav error:", err);
      }
    }
  });
})();
