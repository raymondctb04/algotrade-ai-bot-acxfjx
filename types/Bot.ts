
export type AssetClass = 'crypto' | 'stocks' | 'forex';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type ApiProvider = 'deriv' | 'binance' | 'paper';

export interface BotConfig {
  assetClass: AssetClass;
  riskTolerance: RiskTolerance;
  timeframe: Timeframe;
  assets: string[];
  riskPerTrade: number; // 0.01 = 1%
  confluenceThreshold: number; // 0.8 = 80%
  apiProvider: ApiProvider;
  apiToken?: string;
}
