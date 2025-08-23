
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import useBotConfig from '../../hooks/useBotConfig';
import useDeriv from '../../hooks/useDeriv';
import CodeBlock from '../../components/CodeBlock';
import { getPineSample } from '../../data/snippets';
import { tradeStore } from '../../store/tradeStore';

type Signal = {
  t: number;
  symbol: string;
  confluence: number;
  entry: number;
  type: 'LONG' | 'SHORT';
};

function sma(arr: number[], len: number) {
  if (arr.length < len) return null;
  let sum = 0;
  for (let i = arr.length - len; i < arr.length; i++) sum += arr[i];
  return sum / len;
}

function rsi(arr: number[], period = 14) {
  if (arr.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = arr.length - period + 1; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = losses === 0 ? 100 : gains / (losses || 1e-9);
  const val = 100 - 100 / (1 + rs);
  return Math.max(0, Math.min(100, val));
}

export default function BotScreen() {
  const { config } = useBotConfig();
  const deriv = useDeriv();
  const [running, setRunning] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [showPine, setShowPine] = useState(false);
  const [openTrades, setOpenTrades] = useState(tradeStore.get().open);
  const [logs, setLogs] = useState(tradeStore.get().logs);

  const assets = config.assets;
  const confluenceThreshold = config.confluenceThreshold || 0.8;
  const canRun = assets.length > 0;

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
      console.log('No assets configured');
      return;
    }
    try {
      await deriv.subscribeSymbols(assets);
      console.log('Bot started');
      setRunning(true);
    } catch (e) {
      console.log('Failed to start bot', e);
    }
  };
  const stop = () => {
    console.log('Bot stopped');
    setRunning(false);
  };

  // Signal engine: evaluate from live ticks every second
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const nextSignals: Signal[] = [];

      assets.forEach((symbol) => {
        const series = deriv.getSeries(symbol).map((t) => t.quote);
        if (series.length < 30) return;

        const last = series[series.length - 1];
        const smaFast = sma(series, 10);
        const smaSlow = sma(series, 30);
        const momentumUp = smaFast !== null && smaSlow !== null ? smaFast > smaSlow : false;
        const momentumDown = smaFast !== null && smaSlow !== null ? smaFast < smaSlow : false;

        const r = rsi(series, 14) ?? 50;
        const scalpLongOK = r < 35;
        const scalpShortOK = r > 65;

        const meanLongOK = smaSlow !== null ? last < smaSlow * 0.995 : false;
        const meanShortOK = smaSlow !== null ? last > smaSlow * 1.005 : false;

        // LONG confluence
        let scoreL = 0;
        let checksL = 0;
        checksL += 1; if (momentumUp) scoreL += 1;
        checksL += 1; if (scalpLongOK) scoreL += 1;
        checksL += 1; if (meanLongOK) scoreL += 1;
        const confL = scoreL / Math.max(checksL, 1);

        // SHORT confluence
        let scoreS = 0;
        let checksS = 0;
        checksS += 1; if (momentumDown) scoreS += 1;
        checksS += 1; if (scalpShortOK) scoreS += 1;
        checksS += 1; if (meanShortOK) scoreS += 1;
        const confS = scoreS / Math.max(checksS, 1);

        if (confL >= confluenceThreshold) {
          nextSignals.push({
            t: now,
            symbol,
            confluence: confL,
            entry: last,
            type: 'LONG',
          });
        } else if (confS >= confluenceThreshold) {
          nextSignals.push({
            t: now,
            symbol,
            confluence: confS,
            entry: last,
            type: 'SHORT',
          });
        }
      });

      if (nextSignals.length) {
        setSignals((prev) => {
          const merged = [...nextSignals, ...prev];
          return merged.slice(0, 50);
        });

        // Auto-trade on Deriv when configured
        if (config.apiProvider === 'deriv' && (config.apiToken || '').length > 0 && (config.derivAppId || '').length > 0) {
          nextSignals.forEach(async (s) => {
            try {
              if (s.type === 'LONG') {
                await deriv.buyRise(s.symbol, config.tradeStake || 1);
              } else {
                await deriv.buyFall(s.symbol, config.tradeStake || 1);
              }
            } catch (e) {
              console.log('Auto trade failed', e);
            }
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [running, assets, confluenceThreshold, config.apiProvider, config.apiToken, config.derivAppId, config.tradeStake]); // eslint-disable-line

  const pine = useMemo(() => getPineSample(config), [config]);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Bot</Text>
        <Text style={commonStyles.text}>
          {canRun ? 'Press Start to begin signal generation and auto-trading (Deriv).' : 'Add assets on the Assets tab first.'}
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <View style={styles.row}>
            {!running ? (
              <Button text="Start Bot" onPress={start} style={styles.chip} />
            ) : (
              <Button text="Stop Bot" onPress={stop} style={[styles.chip, { backgroundColor: '#c62828' }]} />
            )}
            <Button text="Open Settings" onPress={() => (window as any).openSettingsSheet?.()} style={styles.chip} />
            <Button text={showPine ? 'Hide Pine Script' : 'Show Pine Script'} onPress={() => setShowPine(v => !v)} style={styles.chip} />
          </View>
          <Text style={styles.helper}>
            Assets: {assets.length ? assets.join(', ') : 'None'} | Threshold: {Math.round(confluenceThreshold * 100)}% | Stake: ${config.tradeStake || 1}
          </Text>
          <Text style={styles.helper}>
            Deriv: {deriv?.status} {deriv?.lastError ? `• ${deriv.lastError}` : ''}
          </Text>
        </View>

        {showPine ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pine Script</Text>
            <CodeBlock code={pine} language="pine" />
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Signals</Text>
          {!signals.length ? (
            <Text style={styles.helper}>No signals yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {signals.map((s) => (
                <View key={`${s.symbol}-${s.t}-${s.type}`} style={styles.signalRow}>
                  <Text style={styles.signalText}>
                    {new Date(s.t).toLocaleTimeString()} • {s.symbol} • {s.type} • conf {Math.round(s.confluence * 100)}% • {s.entry.toFixed(5)}
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
