
import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import useBotConfig from '../../hooks/useBotConfig';
import { ASSETS, AssetEntry } from '../../data/assets';
import AssetRow from '../../components/AssetRow';

type Category =
  | 'forex'
  | 'indices'
  | 'crypto'
  | 'boom'
  | 'crash'
  | 'volatility'
  | 'volatility_1s'
  | 'all';

export default function AssetsScreen() {
  const { config, addAssets, removeAsset } = useBotConfig();
  const [filter, setFilter] = useState<Category>('all');

  const filteredAssets = useMemo(() => {
    if (filter === 'all') return ASSETS;
    return ASSETS.filter((a) => a.category === filter);
  }, [filter]);

  const handleAddGroup = (cat: Category) => {
    console.log('Adding group', cat);
    const symbols = (cat === 'all' ? ASSETS : ASSETS.filter(a => a.category === cat)).map(a => a.symbol);
    addAssets(symbols);
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Assets</Text>
        <Text style={commonStyles.text}>Select and manage assets for your strategies.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.row}>
            <Button text="All" onPress={() => setFilter('all')} style={styles.chip} />
            <Button text="Forex" onPress={() => setFilter('forex')} style={styles.chip} />
            <Button text="Indices" onPress={() => setFilter('indices')} style={styles.chip} />
            <Button text="Crypto" onPress={() => setFilter('crypto')} style={styles.chip} />
            <Button text="Boom" onPress={() => setFilter('boom')} style={styles.chip} />
            <Button text="Crash" onPress={() => setFilter('crash')} style={styles.chip} />
            <Button text="Volatility" onPress={() => setFilter('volatility')} style={styles.chip} />
            <Button text="Volatility (1s)" onPress={() => setFilter('volatility_1s')} style={styles.chip} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Add Groups</Text>
          <View style={styles.row}>
            <Button text="Add All Forex" onPress={() => handleAddGroup('forex')} style={styles.chip} />
            <Button text="Add Indices" onPress={() => handleAddGroup('indices')} style={styles.chip} />
            <Button text="Add Crypto" onPress={() => handleAddGroup('crypto')} style={styles.chip} />
          </View>
          <View style={styles.row}>
            <Button text="Add Boom" onPress={() => handleAddGroup('boom')} style={styles.chip} />
            <Button text="Add Crash" onPress={() => handleAddGroup('crash')} style={styles.chip} />
            <Button text="Add Volatility" onPress={() => handleAddGroup('volatility')} style={styles.chip} />
            <Button text="Add Volatility (1s)" onPress={() => handleAddGroup('volatility_1s')} style={styles.chip} />
          </View>
          <View style={styles.row}>
            <Button text="Add Everything" onPress={() => handleAddGroup('all')} style={styles.chip} />
            <Button text="Open Settings" onPress={() => (window as any).openSettingsSheet?.()} style={styles.chip} />
          </View>
          <Text style={styles.helper}>
            Selected: {config.assets.length ? config.assets.join(', ') : 'None'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Browse Assets</Text>
          <View style={{ gap: 8 }}>
            {filteredAssets.map((a: AssetEntry) => (
              <AssetRow
                key={a.symbol}
                entry={a}
                selected={config.assets.includes(a.symbol)}
                onAdd={() => addAssets([a.symbol])}
                onRemove={() => removeAsset(a.symbol)}
              />
            ))}
          </View>
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
});
