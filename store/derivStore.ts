
type Tick = { quote: number; epoch: number };
type Status = 'disconnected' | 'connecting' | 'connected' | 'authorized' | 'error';

type Listener = () => void;

class DerivStore {
  private state: {
    status: Status;
    lastError?: string;
    ticks: Record<string, Tick[]>;
    lastPrice: Record<string, Tick>;
  } = {
    status: 'disconnected',
    ticks: {},
    lastPrice: {},
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

  get() {
    return this.state;
  }

  getLastPrice(symbol: string) {
    return this.state.lastPrice[symbol];
  }

  getSeries(symbol: string) {
    return this.state.ticks[symbol] || [];
  }

  clear() {
    this.state = { status: 'disconnected', ticks: {}, lastPrice: {} };
    this.emit();
  }
}

export const derivStore = new DerivStore();
