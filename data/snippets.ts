
import { BotConfig } from '../types/Bot';

const riskToAtr = (risk: number) => {
  if (risk <= 0.005) return 1.0;
  if (risk <= 0.01) return 1.5;
  if (risk <= 0.02) return 2.0;
  return 2.5;
};

// Python sample disabled per requirements
export function getPythonSample_REMOVED_DO_NOT_USE(config: BotConfig) {
  return '# Python code generation has been removed in this build.';
}

export function getPineSample(config: BotConfig) {
  const confluence = Math.round((config.confluenceThreshold || 0.8) * 100);

  return `//@version=5
indicator("Hybrid Bot (Trend+Mean+Scalp)", overlay=true, timeframe="", timeframe_gaps=true)

// Inputs
confluenceThreshold = input.float(${confluence} / 100.0, "Confluence Threshold", minval=0.1, maxval=1.0, step=0.05)
riskPerTrade = input.float(${config.riskPerTrade}, "Risk per Trade", minval=0.001, maxval=0.05, step=0.001)

// Trend: MA, MACD, RSI, CMO
sma50 = ta.sma(close, 50)
sma100 = ta.sma(close, 100)
macd = ta.macd(close, 12, 26, 9)
macdLine = macd[0]
signalLine = macd[1]
rsi = ta.rsi(close, 14)
cmo = ta.cmo(close, 14)
volMa20 = ta.sma(volume, 20)
volRatio = volume / (volMa20 + 1e-9)

// Mean Reversion: BB + RSI and volatility proxy
basis = ta.sma(close, 20)
dev = 2.0 * ta.stdev(close, 20)
bb_low = basis - dev
bb_high = basis + dev
natr = ta.atr(14) / close

// Scalping quick checks
scalpRSI = rsi < 35
scalpMACD = macdLine > signalLine

// Trend conditions
condMA = sma50 > sma100
condMACDUp = macdLine > signalLine and rsi < 40
condCMO = cmo > -50
condVol = volRatio > 1.1

// Mean conditions
condBB = close <= bb_low and rsi < 30
condVolFilter = natr > 0.003

// Scalp conditions
condScalp = scalpRSI and scalpMACD

// Aggregate confluence
score = 0.0
checks = 0.0

score += condMA ? 1 : 0
checks += 1
score += condMACDUp ? 1 : 0
checks += 1
score += condCMO ? 1 : 0
checks += 1
score += condVol ? 1 : 0
checks += 1

score += condBB ? 1 : 0
checks += 1
score += condVolFilter ? 1 : 0
checks += 1

score += condScalp ? 1 : 0
checks += 1

confluence = score / math.max(checks, 1)
longSignal = confluence >= confluenceThreshold

// ATR-based SL/TP
atr = ta.atr(14)
atrMult = ${riskToAtr(config.riskPerTrade)}
entry = close
sl = entry - atr * atrMult
tp = entry + atr * atrMult * 1.5

plot(sma50, color=color.new(color.teal, 0), title="SMA50")
plot(sma100, color=color.new(color.orange, 0), title="SMA100")
plot(bb_low, color=color.new(color.fuchsia, 0), title="BB Low")
plot(bb_high, color=color.new(color.fuchsia, 0), title="BB High")

plotshape(longSignal, title="Long Signal", style=shape.labelup, text="LONG", color=color.new(color.green, 0), location=location.belowbar, size=size.tiny)
plot(sl, title="SL", color=color.new(color.red, 0))
plot(tp, title="TP", color=color.new(color.green, 0))

// Strategy example toggle
isStrategy = input.bool(false, "Run as Strategy (paper)")
if isStrategy
    strategy.entry("Long", strategy.long, when=longSignal)
    strategy.exit("Exit", "Long", stop=sl, limit=tp)
`;
}
