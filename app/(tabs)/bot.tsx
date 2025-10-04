
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import useBotConfig from '../../hooks/useBotConfig';
import useDeriv from '../../hooks/useDeriv';
import { tradeStore } from '../../store/tradeStore';

// Timeframe mapping (seconds)
const TF: Record<string, number> = {
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
};

const TF_LIST: Array<{ key: keyof typeof TF; sec: number; label: string }> = [
  { key: '5m', sec: 300, label: '5m' },
  { key: '15m', sec: 900, label: '15m' },
  { key: '1h', sec: 3600, label: '1h' },
  { key: '4h', sec: 14400, label: '4h' },
];

export type Signal = {
  t: number;
  symbol: string;
  timeframe: string;
  entry: number;
  type: 'LONG' | 'SHORT';
  rsi: number;
  macd: number;
  macdSignal: number;
  atr: number;
  sl: number;
  tp: number;
};

function ema(values: number[], period: number) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let emaPrev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    emaPrev = values[i] * k + emaPrev * (1 - k);
  }
  return emaPrev;
}

function seriesEma(values: number[], period: number) {
  const out: Array<number | null> = [];
  let emaPrev: number | null = null;
  const k = 2 / (period + 1);
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    if (i + 1 === period) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      emaPrev = seed;
      out.push(seed);
    } else if (emaPrev != null) {
      emaPrev = values[i] * k + emaPrev * (1 - k);
      out.push(emaPrev);
    }
  }
  return out;
}

function calcMACD(values: number[], fast = 12, slow = 26, signal = 9) {
  if (values.length < slow + signal) return { macd: null as number | null, signal: null as number | null };
  const emaFast = seriesEma(values, fast);
  const emaSlow = seriesEma(values, slow);
  const macdLine: Array<number | null> = values.map((_, i) => {
    const f = emaFast[i];
    const s = emaSlow[i];
    return f != null && s != null ? (f as number) - (s as number) : null;
    
  });
  const macdVals = macdLine.map((v) => (v == null ? null : (v as number)));
  const macdClean = macdVals.filter((v): v is number => v != null);
  if (macdClean.length < signal) return { macd: null, signal: null };
  const sigSeries = seriesEma(macdClean, signal);
  const macdLast = macdClean[macdClean.length - 1] ?? null;
  const sigLast = sigSeries[sigSeries.length - 1] ?? null;
  return { macd: macdLast as number | null, signal: sigLast as number | null };
}

function calcRSI(values: number[], period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gains += change;
    else if (change < 0) losses -= change;
  }
  const rs = gains / Math.max(1e-9, losses);
  const rsi = 100 - 100 / (1 + rs);
  return Math.max(0, Math.min(100, rsi));
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14) {
  const n = highs.length;
  if (n < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < n; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

function getSwingLow(lows: number[], lookback = 10) {
  if (lows.length < lookback) return null;
  return Math.min(...lows.slice(-lookback));
}
function getSwingHigh(highs: number[], lookback = 10) {
  if (highs.length < lookback) return null;
  return Math.max(...highs.slice(-lookback));
}

export default function BotScreen() {
  const { config } = useBotConfig();
  const deriv = useDeriv();
  const [running, setRunning] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [openTrades, setOpenTrades] = useState(tradeStore.get().open);
  const [logs, setLogs] = useState(tradeStore.get().logs);
  const [startingBot, setStartingBot] = useState(false);
  const [stoppingBot, setStoppingBot] = useState(false);

  const assets = config.assets;
  const canRun = assets.length > 0;

  // remember last crossover side per symbol+timeframe
  const lastCrossSideRef = useRef<Record<string, 'up' | 'down' | undefined>>({});

  useEffect(() => {
    const unsub = tradeStore.subscribe(() => {
      const s = tradeStore.get();
      setOpenTrades(s.open);
      setLogs(s.logs);
    });
    return unsub;
  }, []);

  const start = async () => {
    if (!canRun) {
      console.log('Start blocked: No assets configured.');
      return;
    }
    
    setStartingBot(true);
    try {
      console.log('Starting bot with', { assetsCount: assets.length, provider: config.apiProvider });
      if (config.apiProvider === 'deriv') {
        await deriv.ensureConnected();
        await deriv.subscribeSymbols(assets);
        // Subscribe candles for the required timeframes
        await deriv.subscribeCandlesMultiple(assets, TF_LIST.map((t) => t.sec));
      }
      console.log('Bot started successfully');
      setRunning(true);
    } catch (e) {
      console.log('Failed to start bot', e);
      // Don't throw here, just log the error
    } finally {
      setStartingBot(false);
    }
  };

  const stop = async () => {
    console.log('Stopping bot...');
    setStoppingBot(true);
    try {
      if (config.apiProvider === 'deriv') {
        await deriv.unsubscribeAll();
      }
      lastCrossSideRef.current = {};
      setRunning(false);
      console.log('Bot stopped successfully');
    } catch (e) {
      console.log('Error stopping bot', e);
      // Still set running to false even if unsubscribe fails
      setRunning(false);
    } finally {
      setStoppingBot(false);
    }
  };

  // Evaluate signals on intervals based on candles
  useEffect(() => {
    if (!running) return;
    
    const timer = setInterval(() => {
      try {
        const now = Date.now();
        const newSignals: Signal[] = [];

        for (const symbol of assets) {
          // Pull candles for all timeframes
          const perTF = TF_LIST.map((tf) => {
            const candles = deriv.getCandles(symbol, tf.sec);
            const closes = candles.map((c: any) => Number(c.close));
            const highs = candles.map((c: any) => Number(c.high));
            const lows = candles.map((c: any) => Number(c.low));
            return { tf, candles, closes, highs, lows };
          });

          perTF.forEach(({ tf, candles, closes, highs, lows }) => {
            if (candles.length < 60) return; // ensure enough data

            // 9/21 EMA
            const ema9Series = seriesEma(closes, 9);
            const ema21Series = seriesEma(closes, 21);
            const e9prev = ema9Series[ema9Series.length - 2];
            const e21prev = ema21Series[ema21Series.length - 2];
            const e9 = ema9Series[ema9Series.length - 1];
            const e21 = ema21Series[ema21Series.length - 1];
            if (e9 == null || e21 == null || e9prev == null || e21prev == null) return;

            const crossUp = (e9prev as number) <= (e21prev as number) && (e9 as number) > (e21 as number);
            const crossDown = (e9prev as number) >= (e21prev as number) && (e9 as number) < (e21 as number);

            // MACD + RSI confluence
            const macd = calcMACD(closes);
            const rsi = calcRSI(closes, 14);
            if (macd.macd == null || macd.signal == null || rsi == null) return;
            const macdAlignLong = (macd.macd as number) > (macd.signal as number);
            const macdAlignShort = (macd.macd as number) < (macd.signal as number);
            const rsiLong = (rsi as number) > 50;
            const rsiShort = (rsi as number) < 50;

            // Prevent duplicates per symbol+tf until next opposite cross
            const key = `${symbol}::${tf.sec}`;
            const lastSide = lastCrossSideRef.current[key];

            const atr = calcATR(highs, lows, closes, 14) || 0;
            const entry = closes[closes.length - 1];
            // Swings
            const swingLow = getSwingLow(lows, 10) ?? entry - atr; // fallback
            const swingHigh = getSwingHigh(highs, 10) ?? entry + atr;

            if (crossUp && macdAlignLong && rsiLong) {
              if (lastSide !== 'up') {
                // SL = min(swing, ATR-based)
                const atrSL = entry - atr;
                const sl = Math.min(swingLow, atrSL);
                const risk = Math.max(1e-6, entry - sl);
                const tp = entry + 2 * risk;
                newSignals.unshift({
                  t: now,
                  symbol,
                  timeframe: tf.label,
                  entry,
                  type: 'LONG',
                  rsi: rsi as number,
                  macd: macd.macd as number,
                  macdSignal: macd.signal as number,
                  atr,
                  sl,
                  tp,
                });
                lastCrossSideRef.current[key] = 'up';
              }
            } else if (crossDown && macdAlignShort && rsiShort) {
              if (lastSide !== 'down') {
                const atrSL = entry + atr;
                const slSwing = swingHigh;
                const slAtrBased = atrSL;
                const chosenSL = Math.min(slSwing - entry, slAtrBased - entry) === slSwing - entry ? slSwing : slAtrBased;
                const risk = Math.max(1e-6, chosenSL - entry);
                const tp = entry - 2 * risk;
                newSignals.unshift({
                  t: now,
                  symbol,
                  timeframe: tf.label,
                  entry,
                  type: 'SHORT',
                  rsi: rsi as number,
                  macd: macd.macd as number,
                  macdSignal: macd.signal as number,
                  atr,
                  sl: chosenSL,
                  tp,
                });
                lastCrossSideRef.current[key] = 'down';
              }
            } else {
              // keep last side
            }
          });
        }

        if (newSignals.length) {
          setSignals((prev) => {
            const merged = [...newSignals, ...prev];
            return merged.slice(0, 80);
          });

          // Auto-trade per signal
          if (config.apiProvider === 'deriv' && (config.apiToken || '').length > 0 && (config.derivAppId || '').length > 0) {
            newSignals.forEach(async (s) => {
              try {
                if (s.type === 'LONG') {
                  await deriv.buyRise(s.symbol, config.tradeStake || 1);
                } else {
                  await deriv.buyFall(s.symbol, config.tradeStake || 1);
                }
              } catch (e) {
                console.log('Auto trade failed for signal', s.symbol, s.type, e);
                // Don't throw here, just log the error
              }
            });
          }
        }
      } catch (error) {
        console.log('Error in signal evaluation:', error);
        // Don't throw here, just log the error
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [running, assets, config.apiProvider, config.apiToken, config.derivAppId, config.tradeStake, deriv]); // eslint-disable-line

  const handleStartBot = () => {
    start().catch(error => {
      console.log('Start bot error handled:', error);
    });
  };

  const handleStopBot = () => {
    stop().catch(error => {
      console.log('Stop bot error handled:', error);
    });
  };

  const handleOpenSettings = () => {
    try {
      (globalThis as any).openSettingsSheet?.();
    } catch (error) {
      console.log('Error opening settings:', error);
    }
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>EMA 9/21 MACD+RSI Bot</Text>
        <Text style={commonStyles.text}>
          {canRun ? 'Start to subscribe candles (5m,15m,1h,4h), generate signals, and auto-trade on Deriv.' : 'Add assets on the Assets tab first.'}
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trading Strategy</Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Primary Signal</Text>: 9/21 EMA crossover
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>MACD Confluence</Text>: MACD line vs signal line alignment
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>RSI Filter</Text>: RSI > 50 for longs, RSI < 50 for shorts
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Risk Management</Text>: Stop-loss based on swing/ATR, 1:2 R:R
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Timeframes</Text>: 5m, 15m, 1h, 4h analysis
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Execution</Text>: 1-minute CALL/PUT contracts on Deriv
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <View style={styles.row}>
            {!running ? (
              <Button 
                text={startingBot ? "Starting..." : "Start Bot"} 
                onPress={handleStartBot} 
                style={[styles.chip, startingBot && { opacity: 0.6 }]}
                disabled={startingBot}
              />
            ) : (
              <Button 
                text={stoppingBot ? "Stopping..." : "Stop Bot"} 
                onPress={handleStopBot} 
                style={[styles.chip, { backgroundColor: '#c62828' }, stoppingBot && { opacity: 0.6 }]}
                disabled={stoppingBot}
              />
            )}
            <Button text="Open Settings" onPress={handleOpenSettings} style={styles.chip} />
          </View>
          <Text style={styles.helper}>
            Assets: {assets.length ? assets.join(', ') : 'None'} | Stake: ${config.tradeStake || 1}
          </Text>
          <Text style={styles.helper}>
            Deriv: {deriv?.status} {deriv?.lastError ? `• ${deriv.lastError}` : ''}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Signals</Text>
          {!signals.length ? (
            <Text style={styles.helper}>No signals yet. Start the bot to begin signal generation.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {signals.map((s) => (
                <View key={`${s.symbol}-${s.t}-${s.type}-${s.timeframe}`} style={styles.signalRow}>
                  <Text style={styles.signalText}>
                    {new Date(s.t).toLocaleTimeString()} • {s.symbol} • {s.timeframe} • {s.type} • entry {s.entry.toFixed(5)}
                  </Text>
                  <Text style={styles.signalTextSmall}>
                    RSI {s.rsi.toFixed(1)} • MACD {s.macd.toFixed(5)} vs Sig {s.macdSignal.toFixed(5)} • ATR {s.atr.toFixed(5)} • SL {s.sl.toFixed(5)} • TP {s.tp.toFixed(5)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Open Trades</Text>
          {!openTrades.length ? (
            <Text style={styles.helper}>No open trades.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {openTrades.map((t) => (
                <View key={t.contractId} style={styles.tradeRow}>
                  <Text style={styles.tradeText}>
                    #{t.contractId} • {t.symbol} • {t.contractType || '—'} • Entry {t.entry.toFixed(5)} • Stake ${t.stake} • PnL ${t.pnl?.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trade Logs</Text>
          {!logs.length ? (
            <Text style={styles.helper}>No closed trades yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {logs.slice(0, 20).map((l) => (
                <View key={l.contractId} style={styles.tradeRow}>
                  <Text style={styles.tradeText}>
                    #{l.contractId} • {l.symbol} • {l.result.toUpperCase()} • PnL ${l.pnl.toFixed(2)} • {new Date(l.endTime).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 900,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  strategyText: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  highlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
  },
  helper: {
    color: colors.text,
    opacity: 0.8,
    marginTop: 8,
  },
  signalRow: {
    backgroundColor: '#0b1220',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e2a44',
    padding: 10,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  signalText: {
    color: '#c6d4ef',
  },
  signalTextSmall: {
    color: '#9db2db',
    fontSize: 12,
    marginTop: 4,
  },
  tradeRow: {
    backgroundColor: '#111a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#20325a',
    padding: 10,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  tradeText: {
    color: '#d6e2ff',
  },
});
