
type OpenTrade = {
  contractId: number;
  symbol: string;
  entry: number;
  stake: number;
  startTime: number;
  status: 'open' | 'closed';
  pnl: number;
  currentSpot?: number;
};

type TradeLog = {
  contractId: number;
  symbol: string;
  entry: number;
  exit: number;
  stake: number;
  startTime: number;
  endTime: number;
  pnl: number;
  result: 'win' | 'loss';
};

type Listener = () => void;

class TradeStore {
  private state: {
    open: OpenTrade[];
    logs: TradeLog[];
  } = {
    open: [],
    logs: [],
  };

  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  get() {
    return this.state;
  }

  addOpenTrade(t: OpenTrade) {
    // Avoid duplicates
    const exists = this.state.open.some((x) => x.contractId === t.contractId);
    if (!exists) {
      this.state.open = [t, ...this.state.open];
      this.emit();
    }
  }

  updateOpenContract(contractId: number, patch: Partial<OpenTrade>) {
    let changed = false;
    this.state.open = this.state.open.map((t) => {
      if (t.contractId === contractId) {
        changed = true;
        return { ...t, ...patch };
      }
      return t;
    });
    if (changed) this.emit();
  }

  closeContractToLog(contractId: number, info: { exit: number; endTime: number; pnl: number; result: 'win' | 'loss' }) {
    const t = this.state.open.find((x) => x.contractId === contractId);
    if (!t) return;
    this.state.open = this.state.open.filter((x) => x.contractId !== contractId);
    const log: TradeLog = {
      contractId,
      symbol: t.symbol,
      entry: t.entry,
      exit: info.exit,
      stake: t.stake,
      startTime: t.startTime,
      endTime: info.endTime,
      pnl: info.pnl,
      result: info.result,
    };
    this.state.logs = [log, ...this.state.logs].slice(0, 200);
    this.emit();
  }

  getBestPairs(limit = 5) {
    const map: Record<string, number> = {};
    for (const l of this.state.logs) {
      map[l.symbol] = (map[l.symbol] || 0) + l.pnl;
    }
    const arr = Object.entries(map).map(([symbol, pnl]) => ({ symbol, pnl }));
    arr.sort((a, b) => b.pnl - a.pnl);
    return arr.slice(0, limit);
  }
}

export const tradeStore = new TradeStore();
