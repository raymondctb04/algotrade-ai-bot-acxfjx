
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import useBotConfig from '../../hooks/useBotConfig';

type Signal = {
  t: number;
  symbol: string;
  confluence: number;
  entry: number;
  type: 'LONG' | 'FLAT';
};

type SeriesMap = Record<string, number[]>;

function sma(arr: number[], len: number) {
  if (arr.length < len) return null;
  let sum = 0;
  for (let i = arr.length - len; i < arr.length; i++) sum += arr[i];
  return sum / len;
}

function rsi(arr: number[], period = 14) {
  if (arr.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = arr.length - period; i < arr.length; i++) {
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
  const [running, setRunning] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const seriesRef = useRef<SeriesMap>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const assets = config.assets;
  const confluenceThreshold = config.confluenceThreshold || 0.8;

  const canRun = assets.length > 0;

  const start = () => {
    if (!canRun) {
      console.log('No assets configured');
      return;
    }
    console.log('Bot started');
    setRunning(true);
  };
  const stop = () => {
    console.log('Bot stopped');
    setRunning(false);
  };

  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    // initialize series
    assets.forEach((s) => {
      if (!seriesRef.current[s]) {
        const base = 100 + Math.random() * 50;
        seriesRef.current[s] = Array.from({ length: 50 }, (_, i) => base + Math.sin(i / 5) * 2 + Math.random());
      }
    });

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const nextSignals: Signal[] = [];

      assets.forEach((symbol) => {
        const arr = seriesRef.current[symbol];
        const last = arr[arr.length - 1];
        const drift = (Math.random() - 0.5) * 0.6;
        const next = Math.max(0.1, last + drift);
        arr.push(next);
        if (arr.length > 500) arr.shift();

        // Simplified strategy checks
        const smaFast = sma(arr, 10);
        const smaSlow = sma(arr, 30);
        const momentumUp = smaFast !== null && smaSlow !== null ? smaFast > smaSlow : false;

        const r = rsi(arr, 14) ?? 50;
        const scalpOK = r < 35;

        // Mean reversion: price < smaSlow by a tolerance
        const meanOK = smaSlow !== null ? next < smaSlow * 0.995 : false;

        let score = 0;
        let checks = 0;

        checks += 1; if (momentumUp) score += 1;
        checks += 1; if (scalpOK) score += 1;
        checks += 1; if (meanOK) score += 1;

        const confluence = score / Math.max(checks, 1);
        const shouldLong = confluence >= confluenceThreshold;

        if (shouldLong) {
          nextSignals.push({
            t: now,
            symbol,
            confluence,
            entry: next,
            type: 'LONG',
          });
        } else if (Math.random() < 0.05) {
          // occasionally log flat to show activity
          nextSignals.push({
            t: now,
            symbol,
            confluence,
            entry: next,
            type: 'FLAT',
          });
        }
      });

      if (nextSignals.length) {
        setSignals((prev) => {
          const merged = [...nextSignals, ...prev];
          return merged.slice(0, 50);
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, assets, confluenceThreshold]);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Bot</Text>
        <Text style={commonStyles.text}>
          {canRun ? 'Press Start to begin simulated signal generation.' : 'Add assets on the Assets tab first.'}
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
          </View>
          <Text style={styles.helper}>
            Assets: {assets.length ? assets.join(', ') : 'None'} | Threshold: {Math.round(confluenceThreshold * 100)}%
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Signals</Text>
          {!signals.length ? (
            <Text style={styles.helper}>No signals yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {signals.map((s) => (
                <View key={`${s.symbol}-${s.t}-${s.type}`} style={styles.signalRow}>
                  <Text style={styles.signalText}>
                    {new Date(s.t).toLocaleTimeString()} • {s.symbol} • {s.type} • conf {Math.round(s.confluence * 100)}% • {s.entry.toFixed(3)}
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
});
