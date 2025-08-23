
import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import Donut from '../../components/Donut';
import Button from '../../components/Button';
import useBotConfig from '../../hooks/useBotConfig';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const { config } = useBotConfig();

  const readiness = useMemo(() => {
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

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Hybrid Bot Dashboard</Text>
        <Text style={commonStyles.text}>
          Configure assets and hit Start on the Bot tab to generate signals.
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Readiness</Text>
          <View style={styles.donutRow}>
            <Donut size={90} strokeWidth={12} value={readiness.trend} label="Trend" />
            <Donut size={90} strokeWidth={12} value={readiness.mean} label="Mean" />
            <Donut size={90} strokeWidth={12} value={readiness.arbitrage} label="Arb" />
            <Donut size={90} strokeWidth={12} value={readiness.sentiment} label="Sent" />
            <Donut size={90} strokeWidth={12} value={readiness.scalping} label="Scalp" />
          </View>
          <Text style={[styles.center, { marginTop: 8 }]}>Overall: {readiness.overall}%</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.row}>
            <Button text="Open Settings" onPress={() => (window as any).openSettingsSheet?.()} style={styles.chip} />
            <Button text="Manage Assets" onPress={() => router.push('/(tabs)/assets')} style={styles.chip} />
            <Button text="Go to Bot" onPress={() => router.push('/(tabs)/bot')} style={styles.chip} />
          </View>
          <Text style={styles.helper}>
            Selected assets: {config.assets.length ? config.assets.join(', ') : 'None'}
          </Text>
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
  center: {
    color: colors.text,
    textAlign: 'center',
  },
  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
