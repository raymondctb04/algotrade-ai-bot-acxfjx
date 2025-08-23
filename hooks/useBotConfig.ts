
import { useEffect, useState } from 'react';
import { BotConfig, AssetClass, RiskTolerance, Timeframe, ApiProvider } from '../types/Bot';
import { botConfigStore } from '../store/botConfigStore';

export default function useBotConfig() {
  const [config, setConfigState] = useState<BotConfig>(botConfigStore.get());

  useEffect(() => {
    const unsub = botConfigStore.subscribe((next) => setConfigState(next));
    return unsub;
  }, []);

  const setConfig = (next: Partial<BotConfig>) => botConfigStore.set(next);
  const setAssetClass = (v: AssetClass) => botConfigStore.set({ assetClass: v });
  const setRiskTolerance = (v: RiskTolerance) => botConfigStore.set({ riskTolerance: v });
  const setTimeframe = (v: Timeframe) => botConfigStore.set({ timeframe: v });
  const setAssets = (v: string[]) => botConfigStore.set({ assets: v });
  const addAssets = (vs: string[]) => botConfigStore.addAssets(vs);
  const removeAsset = (symbol: string) => botConfigStore.removeAsset(symbol);
  const setRiskPerTrade = (v: number) => botConfigStore.set({ riskPerTrade: v });
  const setConfluenceThreshold = (v: number) => botConfigStore.set({ confluenceThreshold: v });
  const setApiProvider = (v: ApiProvider) => botConfigStore.set({ apiProvider: v });
  const setApiToken = (v: string) => botConfigStore.set({ apiToken: v });
  const setDerivAppId = (v: string) => botConfigStore.set({ derivAppId: v });
  const setTradeStake = (v: number) => botConfigStore.set({ tradeStake: v });

  return {
    config,
    setConfig,
    setAssetClass,
    setRiskTolerance,
    setTimeframe,
    setAssets,
    addAssets,
    removeAsset,
    setRiskPerTrade,
    setConfluenceThreshold,
    setApiProvider,
    setApiToken,
    setDerivAppId,
    setTradeStake,
  };
}
