
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import Donut from '../../components/Donut';
import useBotConfig from '../../hooks/useBotConfig';
import { tradeStore } from '../../store/tradeStore';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    maxWidth: 900,
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.8,
    textAlign: 'center',
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
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  recentTrade: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grey,
    padding: 12,
    marginBottom: 8,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
  },
  tradeText: {
    color: colors.text,
    fontSize: 14,
  },
  profitText: {
    fontWeight: '600',
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { config } = useBotConfig();
  const [trades, setTrades] = useState(tradeStore.get().logs);
  const [openTrades, setOpenTrades] = useState(tradeStore.get().open);

  useEffect(() => {
    const unsub = tradeStore.subscribe(() => {
      const state = tradeStore.get();
      setTrades(state.logs);
      setOpenTrades(state.open);
    });
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
    
    const currentPnL = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      totalTrades,
      wins,
      losses,
      winRate,
      totalPnL,
      avgPnL,
      currentPnL,
      openPositions: openTrades.length,
    };
  }, [trades, openTrades]);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Trading Dashboard</Text>
        <Text style={commonStyles.text}>
          Monitor your enhanced trading bot performance and statistics
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {stats.totalTrades}
            </Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.winRate >= 50 ? colors.accent : colors.error }]}>
              {stats.winRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.totalPnL >= 0 ? colors.accent : colors.error }]}>
              ${stats.totalPnL.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total P&L</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.openPositions}
            </Text>
            <Text style={styles.statLabel}>Open Positions</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceRow}>
            <Donut
              size={120}
              strokeWidth={10}
              value={stats.winRate}
              label="Win Rate"
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statValue, { fontSize: 18, marginBottom: 8 }]}>
                Current P&L: <Text style={{ color: stats.currentPnL >= 0 ? colors.accent : colors.error }}>
                  ${stats.currentPnL.toFixed(2)}
                </Text>
              </Text>
              <Text style={styles.statLabel}>
                Average P&L per trade: ${stats.avgPnL.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>
                Wins: {stats.wins} | Losses: {stats.losses}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.buttonRow}>
            <Button
              text="Start Trading Bot"
              onPress={() => router.push('/bot')}
              style={{ backgroundColor: colors.accent, flex: 1, minWidth: 140 }}
            />
            <Button
              text="Manage Assets"
              onPress={() => router.push('/assets')}
              style={{ backgroundColor: colors.primary, flex: 1, minWidth: 140 }}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Trades</Text>
          {trades.length === 0 ? (
            <Text style={[styles.statLabel, { textAlign: 'center', marginTop: 20 }]}>
              No trades yet. Start the bot to begin trading.
            </Text>
          ) : (
            <View>
              {trades.slice(0, 5).map((trade) => (
                <View key={trade.contractId} style={styles.recentTrade}>
                  <Text style={styles.tradeText}>
                    {trade.symbol} • {trade.result.toUpperCase()} • 
                    <Text style={[styles.profitText, { color: trade.pnl >= 0 ? colors.accent : colors.error }]}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </Text>
                  </Text>
                  <Text style={[styles.tradeText, { opacity: 0.7, fontSize: 12 }]}>
                    {new Date(trade.endTime).toLocaleString()}
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
