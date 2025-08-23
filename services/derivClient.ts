
import { derivStore } from '../store/derivStore';
import { tradeStore } from '../store/tradeStore';
import { botConfigStore } from '../store/botConfigStore';

type DerivMessage =
  | { msg_type: 'authorize'; authorize: { loginid: string } }
  | { msg_type: 'tick'; tick: { symbol: string; quote: number; epoch: number; id?: string; subscription?: { id?: string } } }
  | { msg_type: 'ticks'; ticks: any }
  | { msg_type: 'candles'; candles: any[]; subscription?: { id?: string }; echo_req?: any }
  | { msg_type: 'ohlc'; ohlc: any; subscription?: { id?: string } }
  | { msg_type: 'proposal'; proposal: { id: string; ask_price: number; longcode: string } }
  | { msg_type: 'buy'; buy: { buy_price: number; transaction_id: number; contract_id: number } }
  | { msg_type: 'proposal_open_contract'; proposal_open_contract: any }
  | { msg_type: 'error'; error: { code: string; message: string; details?: any } }
  | { msg_type: string; [k: string]: any };

type PendingRequest = {
  req_id: number;
  resolve: (data: any) => void;
  reject: (err: any) => void;
};

let nextReqId = 1;

class DerivClient {
  ws: WebSocket | null = null;
  pending: Map<number, PendingRequest> = new Map();
  connected = false;
  authorized = false;
  appId: string | undefined;
  token: string | undefined;
  tickSubs: Map<string, string> = new Map(); // symbol -> subscription id
  subscribedSymbols: Set<string> = new Set(); // remember desired subs across reconnects
  candleSubs: Map<string, string> = new Map(); // key: symbol-gran -> sub id
  pocSubs: Set<number> = new Set(); // subscribed contract_ids
  lastConnectTs = 0;

  getEndpoint(appId: string) {
    // Deriv recommended endpoint: wss://ws.derivws.com/websockets/v3?app_id=XXXXX
    return `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`;
  }

  async connect(appId: string) {
    if (this.connected && this.ws) return;
    this.appId = appId;
    this.lastConnectTs = Date.now();
    derivStore.set({ status: 'connecting' });
    const url = this.getEndpoint(appId);
    console.log('Deriv WS connecting:', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Deriv WS connected');
      this.connected = true;
      derivStore.set({ status: 'connected' });
      // Re-authorize if we have token
      if (this.token) {
        this.authorize(this.token).catch((e) => console.log('Authorize on reconnect failed', e));
      }
      // Re-subscribe to tick symbols after connection established
      const symbols = Array.from(this.subscribedSymbols);
      if (symbols.length) {
        console.log('Re-subscribing to symbols after reconnect:', symbols.join(','));
        symbols.forEach((s) => {
          this.tickSubs.delete(s);
          try {
            this.ws?.send(JSON.stringify({ ticks: s, subscribe: 1 }));
          } catch (err) {
            console.log('Resubscribe send error', err);
          }
        });
      }
      // Re-subscribe to candles
      if (this.candleSubs.size) {
        const entries = Array.from(this.candleSubs.keys());
        this.candleSubs.clear();
        entries.forEach((key) => {
          const [symbol, granStr] = key.split('::');
          const gran = Number(granStr);
          try {
            this.ws?.send(JSON.stringify({
              ticks_history: symbol,
              style: 'candles',
              granularity: gran,
              count: 500,
              subscribe: 1,
            }));
          } catch (e) {
            console.log('Resub candle send error', key, e);
          }
        });
      }
    };

    this.ws.onclose = (e) => {
      console.log('Deriv WS closed', e.code, e.reason);
      this.connected = false;
      this.authorized = false;
      derivStore.set({ status: 'disconnected' });
      this.pending.forEach((p) => p.reject(new Error('Socket closed')));
      this.pending.clear();
      // Clear current subscription ids; we'll resubscribe on reconnect
      this.tickSubs.clear();
      // keep candle keys to resubscribe (we clear ids above)
      // try reconnect with small delay
      setTimeout(() => {
        if (this.appId) this.connect(this.appId).catch((err) => console.log('Reconnect failed', err));
      }, 1500);
    };

    this.ws.onerror = (e: any) => {
      console.log('Deriv WS error', e?.message || e);
      derivStore.set({ status: 'error' });
    };

    this.ws.onmessage = (evt) => {
      try {
        const data: DerivMessage = JSON.parse(evt.data);
        this.handleMessage(data);
      } catch (err) {
        console.log('Deriv WS parse error', err);
      }
    };
  }

  send<T = any>(payload: object, expectMsgType?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) {
        reject(new Error('WebSocket not open'));
        return;
      }
      const req_id = nextReqId++;
      const body = { ...payload, req_id };
      const pending: PendingRequest = { req_id, resolve, reject };
      this.pending.set(req_id, pending);
      try {
        this.ws.send(JSON.stringify(body));
      } catch (e) {
        this.pending.delete(req_id);
        reject(e);
      }
    });
  }

  handleMessage(msg: DerivMessage) {
    // Resolve specific requests
    const reqId = (msg as any).req_id;
    if (reqId && this.pending.has(reqId)) {
      const p = this.pending.get(reqId)!;
      this.pending.delete(reqId);
      if ((msg as any).error) {
        p.reject((msg as any).error);
      } else {
        p.resolve(msg);
      }
    }

    if (msg.msg_type === 'error') {
      console.log('Deriv error:', (msg as any).error?.code, (msg as any).error?.message, (msg as any).error?.details);
      derivStore.set({ lastError: (msg as any).error?.message || 'Deriv error' });
      return;
    }

    if (msg.msg_type === 'authorize') {
      this.authorized = true;
      console.log('Deriv authorized as', (msg as any).authorize?.loginid);
      derivStore.set({ status: 'authorized' });
    }

    if (msg.msg_type === 'tick' && (msg as any).tick) {
      const { symbol, quote, epoch, id, subscription } = (msg as any).tick;
      const subId = id || subscription?.id;
      if (subId && !this.tickSubs.get(symbol)) {
        this.tickSubs.set(symbol, subId);
      }
      derivStore.updateTick(symbol, quote, epoch);
    }

    if (msg.msg_type === 'candles') {
      const candlesArr: any[] = (msg as any).candles || [];
      const symbol: string = (msg as any).echo_req?.ticks_history;
      const gran: number = Number((msg as any).echo_req?.granularity || 0);
      const subId = (msg as any).subscription?.id;
      if (symbol && gran) {
        const mapped = candlesArr.map((c: any) => ({
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          epoch: Number(c.epoch),
        }));
        derivStore.setCandles(symbol, gran, mapped);
        if (subId) {
          this.candleSubs.set(`${symbol}::${gran}`, subId);
        }
      }
    }

    if (msg.msg_type === 'ohlc') {
      const o = (msg as any).ohlc;
      const symbol: string = o?.symbol || (msg as any).echo_req?.ticks_history;
      const gran: number = Number(o?.granularity || (msg as any).echo_req?.granularity || 0);
      if (symbol && gran && o) {
        derivStore.updateCandle(symbol, gran, {
          open: Number(o.open),
          high: Number(o.high),
          low: Number(o.low),
          close: Number(o.close),
          epoch: Number(o.open_time || o.epoch || 0),
        });
      }
    }

    if (msg.msg_type === 'proposal_open_contract') {
      const poc = (msg as any).proposal_open_contract;
      const contractId: number = poc?.contract_id;
      if (!contractId) return;

      const isSold = poc.is_sold;
      const currentSpot = poc.current_spot || 0;
      const pnl = (poc.profit || 0);
      const symbol = poc.underlying || 'UNKNOWN';
      tradeStore.updateOpenContract(contractId, {
        currentSpot,
        pnl,
        status: isSold ? 'closed' : 'open',
      });

      if (isSold) {
        tradeStore.closeContractToLog(contractId, {
          exit: currentSpot,
          endTime: Date.now(),
          pnl,
          result: pnl >= 0 ? 'win' : 'loss',
        });
        if (this.ws) {
          this.ws.send(JSON.stringify({ forget: poc.subscription?.id }));
        }
        this.pocSubs.delete(contractId);
      }
    }
  }

  async authorize(token: string) {
    this.token = token;
    const res = await this.send({ authorize: token });
    return res;
  }

  async subscribeTicks(symbol: string) {
    if (this.tickSubs.has(symbol)) return;
    this.subscribedSymbols.add(symbol);
    const res: any = await this.send({ ticks: symbol, subscribe: 1 });
    const subId = (res as any)?.tick?.id || (res as any)?.subscription?.id || (res as any)?.tick?.subscription?.id;
    if (subId) {
      this.tickSubs.set(symbol, subId);
    }
    console.log('Subscribed ticks', symbol);
  }

  async unsubscribeTicks(symbol: string) {
    const id = this.tickSubs.get(symbol);
    this.subscribedSymbols.delete(symbol);
    if (!id) return;
    this.tickSubs.delete(symbol);
    try {
      this.ws?.send(JSON.stringify({ forget: id }));
      console.log('Unsubscribed ticks', symbol);
    } catch (e) {
      console.log('Unsubscribe error', e);
    }
  }

  async subscribeMultiple(symbols: string[]) {
    for (const s of symbols) {
      try {
        await this.subscribeTicks(s);
      } catch (e) {
        console.log('Failed to subscribe', s, e);
      }
    }
  }

  async unsubscribeAllTicks() {
    const all = Array.from(this.tickSubs.keys());
    for (const s of all) {
      await this.unsubscribeTicks(s);
    }
  }

  async subscribeCandles(symbol: string, granularitySec: number, count = 500) {
    const key = `${symbol}::${granularitySec}`;
    if (this.candleSubs.has(key)) return;
    const res: any = await this.send({
      ticks_history: symbol,
      style: 'candles',
      granularity: granularitySec,
      count,
      subscribe: 1,
    });
    const subId = (res as any)?.subscription?.id || (res as any)?.candles?.subscription?.id || (res as any)?.candles?.id;
    if (subId) this.candleSubs.set(key, subId);
    console.log('Subscribed candles', key);
  }

  async unsubscribeCandles(symbol: string, granularitySec: number) {
    const key = `${symbol}::${granularitySec}`;
    const id = this.candleSubs.get(key);
    if (!id) return;
    this.candleSubs.delete(key);
    try {
      this.ws?.send(JSON.stringify({ forget: id }));
      console.log('Unsubscribed candles', key);
    } catch (e) {
      console.log('Unsub candles error', e);
    }
  }

  async subscribeCandlesMultiple(symbols: string[], granularities: number[]) {
    for (const s of symbols) {
      for (const g of granularities) {
        try {
          await this.subscribeCandles(s, g);
        } catch (e) {
          console.log('Failed to sub candle', s, g, e);
        }
      }
    }
  }

  async proposeRise(symbol: string, stakeUSD: number) {
    const payload = {
      proposal: 1,
      amount: stakeUSD,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 'm',
      symbol,
    };
    const res: any = await this.send(payload);
    if (res.error) throw res.error;
    return res.proposal;
  }

  async proposeFall(symbol: string, stakeUSD: number) {
    const payload = {
      proposal: 1,
      amount: stakeUSD,
      basis: 'stake',
      contract_type: 'PUT',
      currency: 'USD',
      duration: 1,
      duration_unit: 'm',
      symbol,
    };
    const res: any = await this.send(payload);
    if (res.error) throw res.error;
    return res.proposal;
  }

  async buyFromProposal(proposalId: string, price: number) {
    const res: any = await this.send({ buy: proposalId, price });
    if (res.error) throw res.error;
    return res.buy;
  }

  async buyRise(symbol: string, stakeUSD: number) {
    try {
      const prop = await this.proposeRise(symbol, stakeUSD);
      const bought = await this.buyFromProposal(prop.id, prop.ask_price);
      const { contract_id } = bought;
      console.log('Bought CALL contract', contract_id, symbol);

      const entry = derivStore.getLastPrice(symbol)?.quote || 0;
      tradeStore.addOpenTrade({
        contractId: contract_id,
        symbol,
        entry,
        stake: stakeUSD,
        startTime: Date.now(),
        status: 'open',
        pnl: 0,
        currentSpot: entry,
        contractType: 'CALL',
      });

      if (!this.pocSubs.has(contract_id)) {
        this.pocSubs.add(contract_id);
        this.ws?.send(JSON.stringify({ proposal_open_contract: 1, contract_id, subscribe: 1 }));
      }
      return contract_id;
    } catch (e) {
      console.log('Buy rise failed', e);
      derivStore.set({ lastError: (e as any)?.message || 'Buy failed' });
      throw e;
    }
  }

  async buyFall(symbol: string, stakeUSD: number) {
    try {
      const prop = await this.proposeFall(symbol, stakeUSD);
      const bought = await this.buyFromProposal(prop.id, prop.ask_price);
      const { contract_id } = bought;
      console.log('Bought PUT contract', contract_id, symbol);

      const entry = derivStore.getLastPrice(symbol)?.quote || 0;
      tradeStore.addOpenTrade({
        contractId: contract_id,
        symbol,
        entry,
        stake: stakeUSD,
        startTime: Date.now(),
        status: 'open',
        pnl: 0,
        currentSpot: entry,
        contractType: 'PUT',
      });

      if (!this.pocSubs.has(contract_id)) {
        this.pocSubs.add(contract_id);
        this.ws?.send(JSON.stringify({ proposal_open_contract: 1, contract_id, subscribe: 1 }));
      }
      return contract_id;
    } catch (e) {
      console.log('Buy fall failed', e);
      derivStore.set({ lastError: (e as any)?.message || 'Buy failed' });
      throw e;
    }
  }
}

export const derivClient = new DerivClient();
