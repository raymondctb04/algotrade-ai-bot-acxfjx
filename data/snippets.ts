
import { BotConfig } from '../types/Bot';

const riskToAtr = (risk: number) => {
  if (risk <= 0.005) return 1.0;
  if (risk <= 0.01) return 1.5;
  if (risk <= 0.02) return 2.0;
  return 2.5;
};

export function getPythonSample(config: BotConfig) {
  const atrMult = riskToAtr(config.riskPerTrade);
  const tf = config.timeframe;
  const assets = config.assets.length ? config.assets.join(', ') : '["BTCUSDT"]';
  const confluence = Math.round(config.confluenceThreshold * 100);

  return `# Hybrid Trading Bot (Python example)
# Notes:
# - Install: pandas, numpy, ta, websockets or ccxt for exchange APIs, backtrader/zipline for backtesting
# - Replace placeholders with your keys; never commit keys to source control
# - This script shows a modular structure. Expand data feeds/backtester as needed.

import os
import math
import time
import pandas as pd
import numpy as np

# Indicators
import ta
# Optional: import backtrader as bt

# Configuration
ASSET_CLASS = "${config.assetClass}"
TIMEFRAME = "${tf}"
ASSETS = ${assets}
CONFLUENCE_THRESHOLD = ${confluence} / 100.0
RISK_PER_TRADE = ${config.riskPerTrade}
ATR_MULT = ${atrMult}

# API setup (placeholder). For Deriv or Binance, plug their SDKs/REST here
API_PROVIDER = "${config.apiProvider}"
API_TOKEN = os.getenv("API_TOKEN")  # Set at runtime: export API_TOKEN=xxxx

def fetch_ohlc(symbol, timeframe=TIMEFRAME, limit=500):
    # TODO: Replace with real data fetch (e.g., Binance/Deriv)
    # Return a DataFrame with columns: [open, high, low, close, volume]
    # Example placeholder:
    dates = pd.date_range(end=pd.Timestamp.utcnow(), periods=limit, freq="5min")
    df = pd.DataFrame({
        "open": np.random.rand(limit) * 100 + 1000,
        "high": np.random.rand(limit) * 100 + 1010,
        "low": np.random.rand(limit) * 100 + 990,
        "close": np.random.rand(limit) * 100 + 1005,
        "volume": np.random.rand(limit) * 1000 + 1000,
    }, index=dates)
    return df

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    # Trend/Momentum
    df["sma50"] = df["close"].rolling(50).mean()
    df["sma100"] = df["close"].rolling(100).mean()
    macd = ta.trend.MACD(close=df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["rsi"] = ta.momentum.RSIIndicator(close=df["close"]).rsi()
    df["cmo"] = ta.momentum.ChandeMomentumOscillator(close=df["close"]).cmo()
    df["atr"] = ta.volatility.AverageTrueRange(high=df["high"], low=df["low"], close=df["close"]).average_true_range()

    # Mean Reversion
    bb = ta.volatility.BollingerBands(close=df["close"], window=20, window_dev=2)
    df["bb_low"] = bb.bollinger_lband()
    df["bb_high"] = bb.bollinger_hband()

    # Volatility filter (example)
    # Normalized ATR (nATR): atr/close
    df["natr"] = df["atr"] / df["close"]

    # Volume normalization
    df["vol_ma20"] = df["volume"].rolling(20).mean()
    df["vol_ratio"] = df["volume"] / (df["vol_ma20"] + 1e-9)

    return df

def trend_signal(row):
    score = 0
    checks = 0

    # SMA crossover
    checks += 1
    if row["sma50"] > row["sma100"]:
        score += 1

    # MACD up-cross with RSI filter (buy if MACD up-cross and RSI < 40)
    checks += 1
    if row["macd"] > row["macd_signal"] and row["rsi"] < 40:
        score += 1

    # CMO crosses above -50
    checks += 1
    if row["cmo"] > -50:
        score += 1

    # Volume confirmation (vol spike)
    checks += 1
    if row["vol_ratio"] > 1.1:
        score += 1

    return score, checks

def mean_reversion_signal(row, asset_class=ASSET_CLASS):
    score = 0
    checks = 0

    # Bollinger lower band touch with RSI < 30
    checks += 1
    if row["close"] <= row["bb_low"] and row["rsi"] < 30:
        score += 1

    # Volatility filters (example: nATR > 0.005 for forex)
    checks += 1
    if asset_class == "forex":
        if row["natr"] > 0.005:
            score += 1
    else:
        # Use a general threshold for non-forex
        if row["natr"] > 0.003:
            score += 1

    return score, checks

def scalping_signal(row):
    score = 0
    checks = 0
    checks += 1
    if row["rsi"] < 35:
      score += 1
    checks += 1
    if row["macd"] > row["macd_signal"]:
      score += 1
    return score, checks

def aggregate_confluence(row):
    totalScore = 0
    totalChecks = 0

    s, c = trend_signal(row); totalScore += s; totalChecks += c
    s, c = mean_reversion_signal(row); totalScore += s; totalChecks += c
    s, c = scalping_signal(row); totalScore += s; totalChecks += c

    confluence = totalScore / max(totalChecks, 1)
    return confluence

def position_size(balance, atr, entry, risk_per_trade=RISK_PER_TRADE):
    # ATR-based stop: SL = entry - ATR * ATR_MULT
    sl = entry - atr * ATR_MULT
    risk_per_unit = max(entry - sl, 1e-9)
    dollars_at_risk = balance * risk_per_trade
    qty = dollars_at_risk / risk_per_unit
    return max(qty, 0.0), sl

def main():
    starting_balance = 10000.0
    for symbol in ASSETS:
        df = fetch_ohlc(symbol)
        df = compute_features(df)

        # Signal generation
        df["confluence"] = df.apply(aggregate_confluence, axis=1)

        # Example entries when confluence >= threshold
        df["entry_long"] = (df["confluence"] >= CONFLUENCE_THRESHOLD) & (df["atr"] > 0)
        entries = df[df["entry_long"]].copy()

        # Simulate simple positions with ATR SL/TP
        for idx, row in entries.iterrows():
            entry = row["close"]
            atr = row["atr"]
            qty, sl = position_size(starting_balance, atr, entry)
            tp = entry + atr * ATR_MULT * 1.5  # TP 1.5x
            print(f"{symbol} | {idx} | entry={entry:.2f} qty={qty:.4f} SL={sl:.2f} TP={tp:.2f} confluence={row['confluence']:.2f}")

    print("Done.")

if __name__ == "__main__":
    main()
`;
}

export function getPineSample(config: BotConfig) {
  const tf = config.timeframe;
  const confluence = Math.round(config.confluenceThreshold * 100);

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
