
import { colors, commonStyles } from '../../styles/commonStyles';
import Button from '../../components/Button';
import AssetRow from '../../components/AssetRow';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import useDeriv from '../../hooks/useDeriv';
import { ASSETS, AssetEntry } from '../../data/assets';
import useBotConfig from '../../hooks/useBotConfig';
import { useEffect, useMemo, useState } from 'react';

type Category = 'forex' | 'crypto' | 'indices' | 'commodities' | 'synthetics';

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
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
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grey,
  },
  categoryButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
  selectedAssetsCard: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  assetsList: {
    gap: 8,
  },
  helper: {
    color: colors.text,
    opacity: 0.8,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default function AssetsScreen() {
  const deriv = useDeriv();
  const { config, updateConfig } = useBotConfig();
  const [selectedCategory, setSelectedCategory] = useState<Category>('forex');

  const filteredAssets = useMemo(() => {
    return ASSETS.filter(asset => asset.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    // Subscribe to ticks for selected assets to show live prices
    if (config.assets.length > 0) {
      deriv.subscribeSymbols(config.assets).catch(e => {
        console.log('Failed to subscribe to asset ticks:', e);
      });
    }
  }, [config.assets, deriv]);

  const handleAddGroup = (cat: Category) => {
    const categoryAssets = ASSETS.filter(a => a.category === cat).map(a => a.symbol);
    const newAssets = [...new Set([...config.assets, ...categoryAssets])];
    updateConfig({ assets: newAssets });
  };

  const categories: { key: Category; label: string; count: number }[] = [
    { key: 'forex', label: 'Forex', count: ASSETS.filter(a => a.category === 'forex').length },
    { key: 'crypto', label: 'Crypto', count: ASSETS.filter(a => a.category === 'crypto').length },
    { key: 'indices', label: 'Indices', count: ASSETS.filter(a => a.category === 'indices').length },
    { key: 'commodities', label: 'Commodities', count: ASSETS.filter(a => a.category === 'commodities').length },
    { key: 'synthetics', label: 'Synthetics', count: ASSETS.filter(a => a.category === 'synthetics').length },
  ];

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Asset Management</Text>
        <Text style={commonStyles.text}>
          Select assets for your enhanced trading bot to monitor and trade
        </Text>

        <View style={[styles.sectionCard, config.assets.length > 0 && styles.selectedAssetsCard]}>
          <Text style={styles.sectionTitle}>
            Selected Assets ({config.assets.length})
          </Text>
          {config.assets.length === 0 ? (
            <Text style={styles.helper}>
              No assets selected. Choose assets from the categories below.
            </Text>
          ) : (
            <View style={styles.assetsList}>
              {config.assets.map(symbol => {
                const asset = ASSETS.find(a => a.symbol === symbol);
                const tick = deriv.getLastPrice(symbol);
                return asset ? (
                  <AssetRow
                    key={symbol}
                    entry={asset}
                    selected={true}
                    onAdd={() => {}}
                    onRemove={() => {
                      updateConfig({
                        assets: config.assets.filter(s => s !== symbol)
                      });
                    }}
                    price={tick?.quote}
                    time={tick?.epoch}
                  />
                ) : null;
              })}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Asset Categories</Text>
          <View style={styles.categoryRow}>
            {categories.map(cat => (
              <Button
                key={cat.key}
                text={`${cat.label} (${cat.count})`}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.key && styles.categoryButtonActive
                ]}
                textStyle={[
                  styles.categoryButtonText,
                  selectedCategory === cat.key && styles.categoryButtonTextActive
                ]}
              />
            ))}
          </View>
          
          <Button
            text={`Add All ${categories.find(c => c.key === selectedCategory)?.label} Assets`}
            onPress={() => handleAddGroup(selectedCategory)}
            style={{ backgroundColor: colors.accent, marginBottom: 16 }}
          />

          <View style={styles.assetsList}>
            {filteredAssets.map(asset => {
              const isSelected = config.assets.includes(asset.symbol);
              const tick = deriv.getLastPrice(asset.symbol);
              return (
                <AssetRow
                  key={asset.symbol}
                  entry={asset}
                  selected={isSelected}
                  onAdd={() => {
                    if (!isSelected) {
                      updateConfig({
                        assets: [...config.assets, asset.symbol]
                      });
                    }
                  }}
                  onRemove={() => {
                    updateConfig({
                      assets: config.assets.filter(s => s !== asset.symbol)
                    });
                  }}
                  price={tick?.quote}
                  time={tick?.epoch}
                />
              );
            })}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
