
type Tick = { quote: number; epoch: number };
type Candle = { open: number; high: number; low: number; close: number; epoch: number };
type Status = 'disconnected' | 'connecting' | 'connected' | 'authorized' | 'error';

type Listener = () => void;

class DerivStore {
  private state: {
    status: Status;
    lastError?: string;
    ticks: Record<string, Tick[]>;
    lastPrice: Record<string, Tick>;
    candles: Record<string, Record<number, Candle[]>>; // symbol -> granularity -> candles
  } = {
    status: 'disconnected',
    ticks: {},
    lastPrice: {},
    candles: {},
  };

  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  set(next: Partial<typeof this.state>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  updateTick(symbol: string, price: number, epoch: number) {
    const ticks = this.state.ticks[symbol] ? [...this.state.ticks[symbol]] : [];
    ticks.push({ quote: price, epoch });
    if (ticks.length > 1000) ticks.shift();
    this.state.ticks[symbol] = ticks;
    this.state.lastPrice[symbol] = { quote: price, epoch };
    this.emit();
  }

  setCandles(symbol: string, granularity: number, candles: Candle[]) {
    const byGran = this.state.candles[symbol] ? { ...this.state.candles[symbol] } : {};
    byGran[granularity] = candles;
    this.state.candles[symbol] = byGran;
    this.emit();
  }

  updateCandle(symbol: string, granularity: number, c: Candle) {
    const byGran = this.state.candles[symbol] ? { ...this.state.candles[symbol] } : {};
    const arr = byGran[granularity] ? [...byGran[granularity]] : [];
    if (arr.length && arr[arr.length - 1].epoch === c.epoch) {
      arr[arr.length - 1] = c; // update last
    } else {
      arr.push(c);
      if (arr.length > 1000) arr.shift();
    }
    byGran[granularity] = arr;
    this.state.candles[symbol] = byGran;
    this.emit();
  }

  get() {
    return this.state;
  }

  getLastPrice(symbol: string) {
    return this.state.lastPrice[symbol];
  }

  getSeries(symbol: string) {
    return this.state.ticks[symbol] || [];
  }

  getCandles(symbol: string, granularity: number) {
    return (this.state.candles[symbol] && this.state.candles[symbol][granularity]) || [];
  }

  clear() {
    this.state = { status: 'disconnected', ticks: {}, lastPrice: {}, candles: {} } as any;
    this.emit();
  }
}

export const derivStore = new DerivStore();
