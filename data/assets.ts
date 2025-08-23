
export type AssetEntry = {
  symbol: string;
  displayName: string;
  category:
    | 'forex'
    | 'indices'
    | 'crypto'
    | 'boom'
    | 'crash'
    | 'volatility'
    | 'volatility_1s';
};

export const ASSETS: AssetEntry[] = [
  // Forex
  { symbol: 'frxEURUSD', displayName: 'EUR/USD', category: 'forex' },
  { symbol: 'frxGBPUSD', displayName: 'GBP/USD', category: 'forex' },
  { symbol: 'frxUSDJPY', displayName: 'USD/JPY', category: 'forex' },
  { symbol: 'frxUSDCHF', displayName: 'USD/CHF', category: 'forex' },
  { symbol: 'frxUSDCAD', displayName: 'USD/CAD', category: 'forex' },
  { symbol: 'frxAUDUSD', displayName: 'AUD/USD', category: 'forex' },
  { symbol: 'frxNZDUSD', displayName: 'NZD/USD', category: 'forex' },

  // Indices
  { symbol: 'OTC_FTSE', displayName: 'UK 100', category: 'indices' },
  { symbol: 'OTC_SPC', displayName: 'US 500', category: 'indices' },
  { symbol: 'OTC_NDX', displayName: 'US Tech 100', category: 'indices' },
  { symbol: 'OTC_DJI', displayName: 'Wall Street 30', category: 'indices' },

  // Crypto
  { symbol: 'cryBTCUSD', displayName: 'BTC/USD', category: 'crypto' },
  { symbol: 'cryETHUSD', displayName: 'ETH/USD', category: 'crypto' },

  // Boom
  { symbol: 'BOOM300N', displayName: 'Boom 300 Index', category: 'boom' },
  { symbol: 'BOOM500', displayName: 'Boom 500 Index', category: 'boom' },
  { symbol: 'BOOM600', displayName: 'Boom 600 Index', category: 'boom' },
  { symbol: 'BOOM900', displayName: 'Boom 900 Index', category: 'boom' },
  { symbol: 'BOOM1000', displayName: 'Boom 1000 Index', category: 'boom' },

  // Crash
  { symbol: 'CRASH300N', displayName: 'Crash 300 Index', category: 'crash' },
  { symbol: 'CRASH500', displayName: 'Crash 500 Index', category: 'crash' },
  { symbol: 'CRASH600', displayName: 'Crash 600 Index', category: 'crash' },
  { symbol: 'CRASH900', displayName: 'Crash 900 Index', category: 'crash' },
  { symbol: 'CRASH1000', displayName: 'Crash 1000 Index', category: 'crash' },

  // Volatility
  { symbol: 'R_10', displayName: 'Volatility 10 Index', category: 'volatility' },
  { symbol: 'R_25', displayName: 'Volatility 25 Index', category: 'volatility' },
  { symbol: 'R_50', displayName: 'Volatility 50 Index', category: 'volatility' },
  { symbol: 'R_75', displayName: 'Volatility 75 Index', category: 'volatility' },
  { symbol: 'R_100', displayName: 'Volatility 100 Index', category: 'volatility' },

  // Volatility (1s)
  { symbol: '1HZ10V', displayName: 'Volatility 10 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ15V', displayName: 'Volatility 15 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ25V', displayName: 'Volatility 25 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ30V', displayName: 'Volatility 30 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ50V', displayName: 'Volatility 50 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ75V', displayName: 'Volatility 75 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ90V', displayName: 'Volatility 90 (1s) Index', category: 'volatility_1s' },
  { symbol: '1HZ100V', displayName: 'Volatility 100 (1s) Index', category: 'volatility_1s' },

  // Step indices (mapped to volatility category for grouping)
  { symbol: 'stpRNG', displayName: 'Step Index 100', category: 'volatility' },
  { symbol: 'stpRNG2', displayName: 'Step Index 200', category: 'volatility' },
  { symbol: 'stpRNG3', displayName: 'Step Index 300', category: 'volatility' },
  { symbol: 'stpRNG4', displayName: 'Step Index 400', category: 'volatility' },
  { symbol: 'stpRNG5', displayName: 'Step Index 500', category: 'volatility' },
];
