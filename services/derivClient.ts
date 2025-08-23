
import { derivStore } from '../store/derivStore';
import { tradeStore } from '../store/tradeStore';
import { botConfigStore } from '../store/botConfigStore';

type DerivMessage =
  | { msg_type: 'authorize'; authorize: { loginid: string } }
  | { msg_type: 'tick'; tick: { symbol: string; quote: number; epoch: number; id?: string } }
  | { msg_type: 'ticks'; ticks: any }
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
    };

    this.ws.onclose = (e) => {
      console.log('Deriv WS closed', e.code, e.reason);
      this.connected = false;
      this.authorized = false;
      derivStore.set({ status: 'disconnected' });
      this.pending.forEach((p) => p.reject(new Error('Socket closed')));
      this.pending.clear();
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
      console.log('Deriv error:', msg.error?.code, msg.error?.message, msg.error?.details);
      derivStore.set({ lastError: msg.error?.message || 'Deriv error' });
      return;
    }

    if (msg.msg_type === 'authorize') {
      this.authorized = true;
      console.log('Deriv authorized as', (msg as any).authorize?.loginid);
      derivStore.set({ status: 'authorized' });
    }

    if (msg.msg_type === 'tick' && msg.tick) {
      const { symbol, quote, epoch } = msg.tick;
      derivStore.updateTick(symbol, quote, epoch);
    }

    if (msg.msg_type === 'proposal_open_contract') {
      const poc = (msg as any).proposal_open_contract;
      const contractId: number = poc?.contract_id;
      if (!contractId) return;

      // Update open trade status in store
      const isSold = poc.is_sold;
      const currentSpot = poc.current_spot || 0;
      const entrySpot = poc.entry_spot || 0;
      const pnl = (poc.profit || 0);
      const symbol = poc.underlying || 'UNKNOWN';
      tradeStore.updateOpenContract(contractId, {
        currentSpot,
        pnl,
        status: isSold ? 'closed' : 'open',
      });

      if (isSold) {
        // Move to logs
        tradeStore.closeContractToLog(contractId, {
          exit: currentSpot,
          endTime: Date.now(),
          pnl,
          result: pnl >= 0 ? 'win' : 'loss',
        });
        // Unsubscribe to this contract updates
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
    if (this.tickSubs.has(symbol)) return; // already
    const res: any = await this.send({ ticks: symbol, subscribe: 1 });
    const subId = res?.tick?.id || res?.subscription?.id || (res?.echo_req && res?.echo_req.req_id) || undefined;
    if (subId) {
      this.tickSubs.set(symbol, subId);
    }
    console.log('Subscribed ticks', symbol);
  }

  async unsubscribeTicks(symbol: string) {
    const id = this.tickSubs.get(symbol);
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
      console.log('Bought contract', contract_id, symbol);

      // Track as open trade
      const entry = derivStore.getLastPrice(symbol)?.quote || 0;
      tradeStore.addOpenTrade({
        contractId: contract_id,
        symbol,
        entry,
        stake: stakeUSD,
        startTime: Date.now(),
        status: 'open',
        pnl: 0,
      });

      // Subscribe to proposal_open_contract updates
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
}

export const derivClient = new DerivClient();
