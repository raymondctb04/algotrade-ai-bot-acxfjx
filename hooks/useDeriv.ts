
import { useEffect, useMemo, useState } from 'react';
import { derivClient } from '../services/derivClient';
import { derivStore } from '../store/derivStore';
import { botConfigStore } from '../store/botConfigStore';

export default function useDeriv() {
  const [state, setState] = useState(derivStore.get());

  useEffect(() => {
    const unsub = derivStore.subscribe(() => {
      setState(derivStore.get());
    });
    return unsub;
  }, []);

  const ensureConnected = async () => {
    const cfg = botConfigStore.get();
    if (!cfg.derivAppId) throw new Error('Missing Deriv App ID');
    await derivClient.connect(cfg.derivAppId);
    if (cfg.apiToken && !derivClient.authorized) {
      await derivClient.authorize(cfg.apiToken);
    }
  };

  const subscribeSymbols = async (symbols: string[]) => {
    await ensureConnected();
    for (const s of symbols) {
      await derivClient.subscribeTicks(s);
    }
  };

  const unsubscribeAll = async () => {
    await derivClient.unsubscribeAllTicks();
  };

  const buyRise = async (symbol: string, stake: number) => {
    await ensureConnected();
    return derivClient.buyRise(symbol, stake);
  };

  return {
    ...state,
    ensureConnected,
    subscribeSymbols,
    unsubscribeAll,
    buyRise,
    getLastPrice: (s: string) => derivStore.getLastPrice(s),
    getSeries: (s: string) => derivStore.getSeries(s),
  };
}
