
import { useState } from 'react';
import { BotConfig, AssetClass, RiskTolerance, Timeframe, ApiProvider } from '../types/Bot';

export default function useBotConfig() {
  const [config, setConfig] = useState<BotConfig>({
    assetClass: 'crypto',
    riskTolerance: 'moderate',
    timeframe: '15m',
    assets: [],
    riskPerTrade: 0.01,
    confluenceThreshold: 0.8,
    apiProvider: 'paper',
    apiToken: '',
  });

  const setAssetClass = (v: AssetClass) => setConfig((c) => ({ ...c, assetClass: v }));
  const setRiskTolerance = (v: RiskTolerance) => setConfig((c) => ({ ...c, riskTolerance: v }));
  const setTimeframe = (v: Timeframe) => setConfig((c) => ({ ...c, timeframe: v }));
  const setAssets = (v: string[]) => setConfig((c) => ({ ...c, assets: v }));
  const setRiskPerTrade = (v: number) => setConfig((c) => ({ ...c, riskPerTrade: v }));
  const setConfluenceThreshold = (v: number) => setConfig((c) => ({ ...c, confluenceThreshold: v }));
  const setApiProvider = (v: ApiProvider) => setConfig((c) => ({ ...c, apiProvider: v }));
  const setApiToken = (v: string) => setConfig((c) => ({ ...c, apiToken: v }));

  return {
    config,
    setAssetClass,
    setRiskTolerance,
    setTimeframe,
    setAssets,
    setRiskPerTrade,
    setConfluenceThreshold,
    setApiProvider,
    setApiToken,
  };
}
