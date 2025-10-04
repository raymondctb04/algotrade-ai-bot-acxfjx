
import { useEffect, useState } from 'react';
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
    try {
      const cfg = botConfigStore.get();
      if (!cfg.derivAppId) throw new Error('Missing Deriv App ID');
      await derivClient.connect(cfg.derivAppId);
      if (cfg.apiToken && !derivClient.authorized) {
        await derivClient.authorize(cfg.apiToken);
      }
    } catch (error) {
      console.log('Failed to ensure connection:', error);
      derivStore.set({ lastError: `Connection failed: ${(error as any).message}` });
      throw error;
    }
  };

  const subscribeSymbols = async (symbols: string[]) => {
    try {
      await ensureConnected();
      await derivClient.subscribeMultiple(symbols);
    } catch (error) {
      console.log('Failed to subscribe to symbols:', error);
      throw error;
    }
  };

  const subscribeCandlesMultiple = async (symbols: string[], granularities: number[]) => {
    try {
      await ensureConnected();
      await derivClient.subscribeCandlesMultiple(symbols, granularities);
    } catch (error) {
      console.log('Failed to subscribe to candles:', error);
      throw error;
    }
  };

  const unsubscribeAll = async () => {
    try {
      await derivClient.unsubscribeAll();
    } catch (error) {
      console.log('Failed to unsubscribe all:', error);
      // Don't throw here as this is cleanup
    }
  };

  const buyRise = async (symbol: string, stake: number) => {
    try {
      await ensureConnected();
      return await derivClient.buyRise(symbol, stake);
    } catch (error) {
      console.log('Failed to buy rise:', error);
      throw error;
    }
  };

  const buyFall = async (symbol: string, stake: number) => {
    try {
      await ensureConnected();
      return await derivClient.buyFall(symbol, stake);
    } catch (error) {
      console.log('Failed to buy fall:', error);
      throw error;
    }
  };

  return {
    ...state,
    ensureConnected,
    subscribeSymbols,
    subscribeCandlesMultiple,
    unsubscribeAll,
    buyRise,
    buyFall,
    getLastPrice: (s: string) => derivStore.getLastPrice(s),
    getSeries: (s: string) => derivStore.getSeries(s),
    getCandles: (s: string, g: number) => derivStore.getCandles(s, g),
  };
}
