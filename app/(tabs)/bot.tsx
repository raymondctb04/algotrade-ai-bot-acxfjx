
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
  confidence: number;
  bollingerPosition: string;
  trendStrength: number;
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

// Bollinger Bands calculation for mean reversion
function calcBollingerBands(values: number[], period = 20, stdDev = 2) {
  if (values.length < period) return { upper: null, middle: null, lower: null };
  
  const recentValues = values.slice(-period);
  const sma = recentValues.reduce((a, b) => a + b, 0) / period;
  
  const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
}

// Mean reversion signal check
function checkMeanReversion(price: number, bollingerBands: any, rsi: number) {
  if (!bollingerBands.upper || !bollingerBands.lower) return { isOversold: false, isOverbought: false, position: 'middle' };
  
  const isOversold = price <= bollingerBands.lower && rsi < 30;
  const isOverbought = price >= bollingerBands.upper && rsi > 70;
  
  let position = 'middle';
  if (price <= bollingerBands.lower) position = 'lower';
  else if (price >= bollingerBands.upper) position = 'upper';
  
  return { isOversold, isOverbought, position };
}

// Calculate trend strength using multiple EMAs
function calcTrendStrength(closes: number[]) {
  if (closes.length < 50) return 0;
  
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  
  if (!ema9 || !ema21 || !ema50) return 0;
  
  // Calculate trend alignment score (0-100)
  let score = 0;
  
  // EMA alignment (bullish: 9 > 21 > 50, bearish: 9 < 21 < 50)
  if (ema9 > ema21 && ema21 > ema50) score += 40; // Strong bullish alignment
  else if (ema9 < ema21 && ema21 < ema50) score -= 40; // Strong bearish alignment
  else if (ema9 > ema21) score += 20; // Partial bullish
  else if (ema9 < ema21) score -= 20; // Partial bearish
  
  // Price momentum
  const currentPrice = closes[closes.length - 1];
  const priceVsEma9 = ((currentPrice - ema9) / ema9) * 100;
  score += Math.max(-30, Math.min(30, priceVsEma9 * 10));
  
  return Math.max(-100, Math.min(100, score));
}

// Dynamic position sizing based on ATR and account risk
function calculatePositionSize(accountBalance: number, atr: number, riskPercentage = 0.01) {
  const riskAmount = accountBalance * riskPercentage;
  const positionSize = Math.max(0.35, Math.min(100, riskAmount / (atr * 100))); // Min $0.35, Max $100
  return positionSize;
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
      console.log('Starting enhanced bot with', { assetsCount: assets.length, provider: config.apiProvider });
      if (config.apiProvider === 'deriv') {
        await deriv.ensureConnected();
        await deriv.subscribeSymbols(assets);
        // Subscribe candles for the required timeframes
        await deriv.subscribeCandlesMultiple(assets, TF_LIST.map((t) => t.sec));
      }
      console.log('Enhanced bot started successfully');
      setRunning(true);
    } catch (e) {
      console.log('Failed to start bot', e);
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
      setRunning(false);
    } finally {
      setStoppingBot(false);
    }
  };

  // Enhanced signal evaluation with trend, mean reversion, and ATR
  useEffect(() => {
    if (!running) return;
    
    const timer = setInterval(() => {
      try {
        const now = Date.now();
        const newSignals: Signal[] = [];

        for (const symbol of assets) {
          const perTF = TF_LIST.map((tf) => {
            const candles = deriv.getCandles(symbol, tf.sec);
            const closes = candles.map((c: any) => Number(c.close));
            const highs = candles.map((c: any) => Number(c.high));
            const lows = candles.map((c: any) => Number(c.low));
            return { tf, candles, closes, highs, lows };
          });

          perTF.forEach(({ tf, candles, closes, highs, lows }) => {
            if (candles.length < 60) return; // ensure enough data

            // Calculate all indicators
            const ema9Series = seriesEma(closes, 9);
            const ema21Series = seriesEma(closes, 21);
            const e9prev = ema9Series[ema9Series.length - 2];
            const e21prev = ema21Series[ema21Series.length - 2];
            const e9 = ema9Series[ema9Series.length - 1];
            const e21 = ema21Series[ema21Series.length - 1];
            
            if (e9 == null || e21 == null || e9prev == null || e21prev == null) return;

            const crossUp = (e9prev as number) <= (e21prev as number) && (e9 as number) > (e21 as number);
            const crossDown = (e9prev as number) >= (e21prev as number) && (e9 as number) < (e21 as number);

            // MACD + RSI
            const macd = calcMACD(closes);
            const rsi = calcRSI(closes, 14);
            if (macd.macd == null || macd.signal == null || rsi == null) return;

            // Bollinger Bands for mean reversion
            const bollingerBands = calcBollingerBands(closes, 20, 2);
            const currentPrice = closes[closes.length - 1];
            const meanReversion = checkMeanReversion(currentPrice, bollingerBands, rsi);

            // Trend strength
            const trendStrength = calcTrendStrength(closes);

            // ATR for volatility and position sizing
            const atr = calcATR(highs, lows, closes, 14) || 0;
            const accountBalance = 1000; // Default account balance for position sizing
            const dynamicStake = calculatePositionSize(accountBalance, atr, 0.01);

            // Enhanced signal logic combining trend, mean reversion, and volatility
            const macdAlignLong = (macd.macd as number) > (macd.signal as number);
            const macdAlignShort = (macd.macd as number) < (macd.signal as number);
            
            // Calculate confidence score (0-100)
            let confidence = 0;
            
            // Trend component (40% weight)
            if (trendStrength > 30) confidence += 40;
            else if (trendStrength > 0) confidence += 20;
            else if (trendStrength < -30) confidence += 40; // Strong bearish also good for shorts
            else if (trendStrength < 0) confidence += 20;

            // Mean reversion component (30% weight)
            if (meanReversion.isOversold || meanReversion.isOverbought) confidence += 30;
            else if (meanReversion.position !== 'middle') confidence += 15;

            // Technical confluence (30% weight)
            if (macdAlignLong && rsi > 45 && rsi < 75) confidence += 15;
            if (macdAlignShort && rsi > 25 && rsi < 55) confidence += 15;
            if (atr > 0) confidence += 15; // Volatility present

            // Prevent duplicates per symbol+tf until next opposite cross
            const key = `${symbol}::${tf.sec}`;
            const lastSide = lastCrossSideRef.current[key];

            const entry = closes[closes.length - 1];
            const swingLow = getSwingLow(lows, 10) ?? entry - atr;
            const swingHigh = getSwingHigh(highs, 10) ?? entry + atr;

            // Enhanced LONG signal: Trend + Mean Reversion + Technical confluence
            if (crossUp && macdAlignLong && 
                (trendStrength > 0 || meanReversion.isOversold) && 
                confidence >= 60) {
              if (lastSide !== 'up') {
                const atrSL = entry - (atr * 1.5); // 1.5x ATR for stop loss
                const sl = Math.min(swingLow, atrSL);
                const risk = Math.max(1e-6, entry - sl);
                const tp = entry + 2 * risk; // 1:2 risk-reward

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
                  confidence,
                  bollingerPosition: meanReversion.position,
                  trendStrength,
                });
                lastCrossSideRef.current[key] = 'up';
              }
            } 
            // Enhanced SHORT signal: Trend + Mean Reversion + Technical confluence
            else if (crossDown && macdAlignShort && 
                     (trendStrength < 0 || meanReversion.isOverbought) && 
                     confidence >= 60) {
              if (lastSide !== 'down') {
                const atrSL = entry + (atr * 1.5); // 1.5x ATR for stop loss
                const sl = Math.max(swingHigh, atrSL);
                const risk = Math.max(1e-6, sl - entry);
                const tp = entry - 2 * risk; // 1:2 risk-reward

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
                  sl,
                  tp,
                  confidence,
                  bollingerPosition: meanReversion.position,
                  trendStrength,
                });
                lastCrossSideRef.current[key] = 'down';
              }
            }
          });
        }

        if (newSignals.length) {
          setSignals((prev) => {
            const merged = [...newSignals, ...prev];
            return merged.slice(0, 80);
          });

          // Auto-trade with dynamic position sizing
          if (config.apiProvider === 'deriv' && (config.apiToken || '').length > 0 && (config.derivAppId || '').length > 0) {
            newSignals.forEach(async (s) => {
              try {
                // Use higher confidence signals for larger stakes
                const adjustedStake = s.confidence >= 80 ? 
                  Math.min(config.tradeStake * 1.5, 100) : 
                  config.tradeStake || 1;

                if (s.type === 'LONG') {
                  await deriv.buyRise(s.symbol, adjustedStake);
                } else {
                  await deriv.buyFall(s.symbol, adjustedStake);
                }
                console.log(`Executed ${s.type} trade for ${s.symbol} with confidence ${s.confidence}%`);
              } catch (e) {
                console.log('Auto trade failed for signal', s.symbol, s.type, e);
              }
            });
          }
        }
      } catch (error) {
        console.log('Error in enhanced signal evaluation:', error);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [running, assets, config.apiProvider, config.apiToken, config.derivAppId, config.tradeStake, deriv]);

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
        <Text style={commonStyles.title}>Enhanced Multi-Strategy Trading Bot</Text>
        <Text style={commonStyles.text}>
          {canRun ? 'Advanced bot with trend following, mean reversion, and ATR-based risk management.' : 'Add assets on the Assets tab first.'}
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Enhanced Trading Strategy</Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Trend Following</Text>: EMA 9/21 crossover with trend strength analysis
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Mean Reversion</Text>: Bollinger Bands with RSI oversold/overbought levels
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Volatility (ATR)</Text>: Dynamic stop-loss and position sizing
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>MACD Confluence</Text>: Signal line crossover confirmation
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Confidence Scoring</Text>: Multi-indicator confluence (60%+ required)
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Risk Management</Text>: 1.5x ATR stop-loss, 1:2 risk-reward ratio
          </Text>
          <Text style={styles.strategyText}>
            • <Text style={styles.highlight}>Dynamic Sizing</Text>: Higher stakes for high-confidence signals
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bot Controls</Text>
          <View style={styles.row}>
            {!running ? (
              <Button 
                text={startingBot ? "Starting..." : "Start Enhanced Bot"} 
                onPress={handleStartBot} 
                style={[styles.chip, startingBot && { opacity: 0.6 }]}
                disabled={startingBot}
              />
            ) : (
              <Button 
                text={stoppingBot ? "Stopping..." : "Stop Bot"} 
                onPress={handleStopBot} 
                style={[styles.chip, { backgroundColor: colors.error }, stoppingBot && { opacity: 0.6 }]}
                disabled={stoppingBot}
              />
            )}
            <Button text="Open Settings" onPress={handleOpenSettings} style={[styles.chip, { backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.helper}>
            Assets: {assets.length ? assets.join(', ') : 'None'} | Base Stake: ${config.tradeStake || 1}
          </Text>
          <Text style={styles.helper}>
            Deriv Status: {deriv?.status} {deriv?.lastError ? `• ${deriv.lastError}` : ''}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Enhanced Signals</Text>
          {!signals.length ? (
            <Text style={styles.helper}>No signals yet. Start the bot to begin enhanced signal generation.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {signals.map((s) => (
                <View key={`${s.symbol}-${s.t}-${s.type}-${s.timeframe}`} style={[
                  styles.signalRow,
                  { borderLeftWidth: 4, borderLeftColor: s.confidence >= 80 ? colors.accent : colors.primary }
                ]}>
                  <Text style={styles.signalText}>
                    {new Date(s.t).toLocaleTimeString()} • {s.symbol} • {s.timeframe} • {s.type} • Entry: {s.entry.toFixed(5)}
                  </Text>
                  <Text style={styles.signalTextSmall}>
                    Confidence: <Text style={{ color: s.confidence >= 80 ? colors.accent : colors.primary }}>{s.confidence}%</Text> • 
                    RSI: {s.rsi.toFixed(1)} • Trend: {s.trendStrength.toFixed(1)} • BB: {s.bollingerPosition}
                  </Text>
                  <Text style={styles.signalTextSmall}>
                    MACD: {s.macd.toFixed(5)} vs {s.macdSignal.toFixed(5)} • ATR: {s.atr.toFixed(5)} • SL: {s.sl.toFixed(5)} • TP: {s.tp.toFixed(5)}
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
                    #{t.contractId} • {t.symbol} • {t.contractType || '—'} • Entry: {t.entry.toFixed(5)} • Stake: ${t.stake}
                  </Text>
                  <Text style={[styles.tradeText, { color: t.pnl >= 0 ? colors.accent : colors.error }]}>
                    PnL: ${t.pnl?.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trade History</Text>
          {!logs.length ? (
            <Text style={styles.helper}>No closed trades yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {logs.slice(0, 20).map((l) => (
                <View key={l.contractId} style={styles.tradeRow}>
                  <Text style={styles.tradeText}>
                    #{l.contractId} • {l.symbol} • {l.result.toUpperCase()} • 
                    <Text style={{ color: l.pnl >= 0 ? colors.accent : colors.error }}> ${l.pnl.toFixed(2)}</Text> • 
                    {new Date(l.endTime).toLocaleTimeString()}
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
    boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
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
    color: colors.accent,
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
    fontSize: 13,
  },
  signalRow: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grey,
    padding: 12,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  signalText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  signalTextSmall: {
    color: colors.text,
    opacity: 0.9,
    fontSize: 12,
    marginTop: 4,
  },
  tradeRow: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grey,
    padding: 12,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  tradeText: {
    color: colors.text,
    fontSize: 13,
  },
});
