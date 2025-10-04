
export type AssetEntry = {
  symbol: string;
  name: string;
  category:
    | 'forex'
    | 'indices'
    | 'crypto'
    | 'commodities'
    | 'synthetics';
};

export const ASSETS: AssetEntry[] = [
  // Forex
  { symbol: 'frxEURUSD', name: 'EUR/USD', category: 'forex' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD', category: 'forex' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY', category: 'forex' },
  { symbol: 'frxUSDCHF', name: 'USD/CHF', category: 'forex' },
  { symbol: 'frxUSDCAD', name: 'USD/CAD', category: 'forex' },
  { symbol: 'frxAUDUSD', name: 'AUD/USD', category: 'forex' },
  { symbol: 'frxNZDUSD', name: 'NZD/USD', category: 'forex' },

  // Indices
  { symbol: 'OTC_FTSE', name: 'UK 100', category: 'indices' },
  { symbol: 'OTC_SPC', name: 'US 500', category: 'indices' },
  { symbol: 'OTC_NDX', name: 'US Tech 100', category: 'indices' },
  { symbol: 'OTC_DJI', name: 'Wall Street 30', category: 'indices' },

  // Crypto
  { symbol: 'cryBTCUSD', name: 'BTC/USD', category: 'crypto' },
  { symbol: 'cryETHUSD', name: 'ETH/USD', category: 'crypto' },

  // Commodities
  { symbol: 'frxXAUUSD', name: 'Gold/USD', category: 'commodities' },
  { symbol: 'frxXAGUSD', name: 'Silver/USD', category: 'commodities' },
  { symbol: 'OTC_OIL', name: 'Oil', category: 'commodities' },

  // Synthetic Indices (Boom, Crash, Volatility)
  { symbol: 'BOOM300N', name: 'Boom 300 Index', category: 'synthetics' },
  { symbol: 'BOOM500', name: 'Boom 500 Index', category: 'synthetics' },
  { symbol: 'BOOM600', name: 'Boom 600 Index', category: 'synthetics' },
  { symbol: 'BOOM900', name: 'Boom 900 Index', category: 'synthetics' },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index', category: 'synthetics' },

  { symbol: 'CRASH300N', name: 'Crash 300 Index', category: 'synthetics' },
  { symbol: 'CRASH500', name: 'Crash 500 Index', category: 'synthetics' },
  { symbol: 'CRASH600', name: 'Crash 600 Index', category: 'synthetics' },
  { symbol: 'CRASH900', name: 'Crash 900 Index', category: 'synthetics' },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'synthetics' },

  { symbol: 'R_10', name: 'Volatility 10 Index', category: 'synthetics' },
  { symbol: 'R_25', name: 'Volatility 25 Index', category: 'synthetics' },
  { symbol: 'R_50', name: 'Volatility 50 Index', category: 'synthetics' },
  { symbol: 'R_75', name: 'Volatility 75 Index', category: 'synthetics' },
  { symbol: 'R_100', name: 'Volatility 100 Index', category: 'synthetics' },

  { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ15V', name: 'Volatility 15 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ30V', name: 'Volatility 30 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ90V', name: 'Volatility 90 (1s) Index', category: 'synthetics' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'synthetics' },

  { symbol: 'stpRNG', name: 'Step Index 100', category: 'synthetics' },
  { symbol: 'stpRNG2', name: 'Step Index 200', category: 'synthetics' },
  { symbol: 'stpRNG3', name: 'Step Index 300', category: 'synthetics' },
  { symbol: 'stpRNG4', name: 'Step Index 400', category: 'synthetics' },
  { symbol: 'stpRNG5', name: 'Step Index 500', category: 'synthetics' },
];
