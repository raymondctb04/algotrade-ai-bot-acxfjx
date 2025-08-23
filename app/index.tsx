
import { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import Button from '../components/Button';
import { commonStyles, buttonStyles, colors } from '../styles/commonStyles';
import BottomSheetSettings from '../components/BottomSheetSettings';
import Donut from '../components/Donut';
import CodeBlock from '../components/CodeBlock';
import useBotConfig from '../hooks/useBotConfig';
import { BotConfig } from '../types/Bot';
import { getPythonSample, getPineSample } from '../data/snippets';

export default function MainScreen() {
  const {
    config,
    setAssetClass,
    setRiskTolerance,
    setTimeframe,
    setAssets,
    setRiskPerTrade,
    setConfluenceThreshold,
    setApiProvider,
    setApiToken,
  } = useBotConfig();

  const [showPython, setShowPython] = useState(false);
  const [showPine, setShowPine] = useState(false);

  const readiness = useMemo(() => {
    // Simple readiness: percentage of key fields filled
    const fields = [
      config.assetClass,
      config.riskTolerance,
      config.timeframe,
      config.assets.length > 0 ? 'ok' : '',
      config.confluenceThreshold ? 'ok' : '',
      config.riskPerTrade ? 'ok' : '',
    ];
    const filled = fields.filter(Boolean).length;
    const pct = Math.round((filled / fields.length) * 100);
    // Distribute across modules for a visual, not exact science
    const chunk = Math.max(10, Math.min(100, pct));
    return {
      trend: Math.min(100, Math.round(chunk * 0.95)),
      mean: Math.min(100, Math.round(chunk * 0.9)),
      arbitrage: Math.min(100, Math.round(chunk * 0.6)),
      sentiment: Math.min(100, Math.round(chunk * 0.65)),
      scalping: Math.min(100, Math.round(chunk * 0.85)),
      overall: pct,
    };
  }, [config]);

  const pythonCode = useMemo(() => getPythonSample(config), [config]);
  const pineCode = useMemo(() => getPineSample(config), [config]);

  console.log('Config state', config);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Hybrid Trading Bot Designer</Text>
        <Text style={commonStyles.text}>
          Answer a few questions to tailor your bot. You can adjust details in Settings anytime.
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Clarifying Questions</Text>
          <Text style={styles.q}>1. Asset class (crypto, stocks, forex)?</Text>
          <View style={styles.row}>
            <Button text="Crypto" onPress={() => setAssetClass('crypto')} style={styles.chip} />
            <Button text="Stocks" onPress={() => setAssetClass('stocks')} style={styles.chip} />
            <Button text="Forex" onPress={() => setAssetClass('forex')} style={styles.chip} />
          </View>
          <Text style={styles.q}>2. Risk tolerance?</Text>
          <View style={styles.row}>
            <Button text="Conservative" onPress={() => setRiskTolerance('conservative')} style={styles.chip} />
            <Button text="Moderate" onPress={() => setRiskTolerance('moderate')} style={styles.chip} />
            <Button text="Aggressive" onPress={() => setRiskTolerance('aggressive')} style={styles.chip} />
          </View>
          <Text style={styles.q}>3. Timeframe?</Text>
          <View style={styles.row}>
            <Button text="5m" onPress={() => setTimeframe('5m')} style={styles.chip} />
            <Button text="15m" onPress={() => setTimeframe('15m')} style={styles.chip} />
            <Button text="1h" onPress={() => setTimeframe('1h')} style={styles.chip} />
            <Button text="1d" onPress={() => setTimeframe('1d')} style={styles.chip} />
          </View>
          <Text style={styles.q}>4. Specific assets?</Text>
          <View style={styles.rowWrap}>
            <Button text="BTC/USDT" onPress={() => setAssets(['BTCUSDT'])} style={styles.chip} />
            <Button text="ETH/USDT" onPress={() => setAssets(['ETHUSDT'])} style={styles.chip} />
            <Button text="EUR/USD" onPress={() => setAssets(['EURUSD'])} style={styles.chip} />
            <Button text="AAPL" onPress={() => setAssets(['AAPL'])} style={styles.chip} />
          </View>
          <Text style={styles.q}>5. Confluence threshold and risk per trade?</Text>
          <View style={styles.row}>
            <Button text="Confluence ≥ 80%" onPress={() => setConfluenceThreshold(0.8)} style={styles.chip} />
            <Button text="Risk 1%" onPress={() => setRiskPerTrade(0.01)} style={styles.chip} />
            <Button text="Risk 2%" onPress={() => setRiskPerTrade(0.02)} style={styles.chip} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Architecture Overview</Text>
          <Text style={styles.list}>- Data Layer: market data feeds (exchange/WebSocket/REST), sentiment sources</Text>
          <Text style={styles.list}>- Feature Engine: indicators (MA, MACD, RSI, CMO, BB, ATR), volatility, volume, S/R</Text>
          <Text style={styles.list}>- Strategy Suite: Trend, Mean Reversion, Arbitrage/Stat, Sentiment/ML, Scalping</Text>
          <Text style={styles.list}>- Signal Orchestrator: multi-indicator confluence (e.g., 80%)</Text>
          <Text style={styles.list}>- Risk Manager: SL/TP, ATR-adaptive stops, position sizing</Text>
          <Text style={styles.list}>- Backtester: walk-forward, parameter sweeps, performance metrics</Text>
          <Text style={styles.list}>- Broker API: execution, account balance, rate limits</Text>
          <Text style={styles.list}>- Monitoring: logs, alerts, performance dashboards</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Readiness</Text>
          <View style={styles.donutRow}>
            <Donut size={90} strokeWidth={12} value={readiness.trend} label="Trend" />
            <Donut size={90} strokeWidth={12} value={readiness.mean} label="Mean" />
            <Donut size={90} strokeWidth={12} value={readiness.arbitrage} label="Arb" />
            <Donut size={90} strokeWidth={12} value={readiness.sentiment} label="Sent" />
            <Donut size={90} strokeWidth={12} value={readiness.scalping} label="Scalp" />
          </View>
          <Text style={[commonStyles.text, { marginTop: 8 }]}>Overall: {readiness.overall}%</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Generate Sample Code</Text>
          <View style={styles.row}>
            <Button
              text={showPython ? 'Hide Python' : 'Generate Python Sample'}
              onPress={() => setShowPython((s) => !s)}
              style={buttonStyles.instructionsButton}
            />
          </View>
          {showPython && (
            <CodeBlock
              language="python"
              code={pythonCode}
              note="Python example using pandas and ta. Replace placeholders with your API keys. Backtesting framework shown as an option."
            />
          )}
          <View style={styles.row}>
            <Button
              text={showPine ? 'Hide Pine' : 'Generate Pine Script'}
              onPress={() => setShowPine((s) => !s)}
              style={buttonStyles.instructionsButton}
            />
          </View>
          {showPine && (
            <CodeBlock
              language="pine"
              code={pineCode}
              note="TradingView Pine Script v5 example combining trend/mean/sentiment proxies. Add to chart and test."
            />
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Risk & Ethics</Text>
          <Text style={commonStyles.text}>
            Trading involves substantial risk. Past performance does not guarantee future results.
            Use small position sizes (e.g., 1-2% risk per trade), test extensively on historical data,
            and validate on paper trading before going live. Avoid market manipulation or unfair practices.
          </Text>
          <Text style={[commonStyles.text, { opacity: 0.8 }]}>
            Note: react-native-maps is not supported on web in Natively.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.fabContainer}>
        <Button
          text="Settings"
          onPress={() => {
            (window as any).openSettingsSheet?.();
          }}
          style={styles.fab}
        />
      </View>

      <BottomSheetSettings
        config={config}
        onChange={(next: Partial<BotConfig>) => {
          if (next.assetClass) setAssetClass(next.assetClass);
          if (next.riskTolerance) setRiskTolerance(next.riskTolerance);
          if (next.timeframe) setTimeframe(next.timeframe);
          if (next.assets) setAssets(next.assets);
          if (typeof next.riskPerTrade === 'number') setRiskPerTrade(next.riskPerTrade);
          if (typeof next.confluenceThreshold === 'number') setConfluenceThreshold(next.confluenceThreshold);
          if (next.apiProvider) setApiProvider(next.apiProvider);
          if (typeof next.apiToken !== 'undefined') setApiToken(next.apiToken);
        }}
      />
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
  q: {
    color: colors.text,
    fontSize: 14,
    opacity: 0.9,
    marginTop: 6,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
  },
  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  bottomSpacer: {
    height: 28,
  },
  list: {
    color: colors.text,
    opacity: 0.9,
    marginBottom: 4,
    fontSize: 14,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fab: {
    backgroundColor: colors.accent,
    width: 140,
  },
});
