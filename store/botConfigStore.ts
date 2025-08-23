
import { BotConfig } from '../types/Bot';

type Listener = (next: BotConfig) => void;

const defaultConfig: BotConfig = {
  assetClass: 'forex',
  riskTolerance: 'moderate',
  timeframe: '5m',
  assets: [],
  riskPerTrade: 0.01,
  confluenceThreshold: 0.8,
  apiProvider: 'deriv',
  apiToken: '',
  derivAppId: '',
  tradeStake: 1,
};

class BotConfigStore {
  private state: BotConfig = defaultConfig;
  private listeners = new Set<Listener>();

  get() {
    return this.state;
  }

  set(next: Partial<BotConfig>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  addAssets(vs: string[]) {
    const set = new Set(this.state.assets);
    vs.forEach((s) => set.add(s));
    this.state = { ...this.state, assets: Array.from(set) };
    this.emit();
  }

  removeAsset(symbol: string) {
    this.state = {
      ...this.state,
      assets: this.state.assets.filter((a) => a !== symbol),
    };
    this.emit();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.state));
    console.log('BotConfig updated:', this.state);
  }
}

export const botConfigStore = new BotConfigStore();
