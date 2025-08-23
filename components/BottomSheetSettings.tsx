
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Button from './Button';
import { colors } from '../styles/commonStyles';
import { BotConfig } from '../types/Bot';

interface Props {
  config: BotConfig;
  onChange: (next: Partial<BotConfig>) => void;
}

export default function BottomSheetSettings({ config, onChange }: Props) {
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    (window as any).openSettingsSheet = () => {
      console.log('Opening settings bottom sheet');
      sheetRef.current?.expand();
    };
    return () => {
      (window as any).openSettingsSheet = undefined;
    };
  }, []);

  const snapPoints = useMemo(() => ['30%', '60%', '85%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enablePanDownToClose
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.text }}
      backgroundStyle={{ backgroundColor: colors.backgroundAlt }}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.label}>Asset Class</Text>
        <View style={styles.row}>
          <Button text="Crypto" onPress={() => onChange({ assetClass: 'crypto' })} style={styles.chip} />
          <Button text="Stocks" onPress={() => onChange({ assetClass: 'stocks' })} style={styles.chip} />
          <Button text="Forex" onPress={() => onChange({ assetClass: 'forex' })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Risk Tolerance</Text>
        <View style={styles.row}>
          <Button text="Conservative" onPress={() => onChange({ riskTolerance: 'conservative' })} style={styles.chip} />
          <Button text="Moderate" onPress={() => onChange({ riskTolerance: 'moderate' })} style={styles.chip} />
          <Button text="Aggressive" onPress={() => onChange({ riskTolerance: 'aggressive' })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Timeframe</Text>
        <View style={styles.row}>
          <Button text="5m" onPress={() => onChange({ timeframe: '5m' })} style={styles.chip} />
          <Button text="15m" onPress={() => onChange({ timeframe: '15m' })} style={styles.chip} />
          <Button text="1h" onPress={() => onChange({ timeframe: '1h' })} style={styles.chip} />
          <Button text="1d" onPress={() => onChange({ timeframe: '1d' })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Risk per trade</Text>
        <View style={styles.row}>
          <Button text="1%" onPress={() => onChange({ riskPerTrade: 0.01 })} style={styles.chip} />
          <Button text="2%" onPress={() => onChange({ riskPerTrade: 0.02 })} style={styles.chip} />
          <Button text="0.5%" onPress={() => onChange({ riskPerTrade: 0.005 })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Confluence threshold</Text>
        <View style={styles.row}>
          <Button text="70%" onPress={() => onChange({ confluenceThreshold: 0.7 })} style={styles.chip} />
          <Button text="80%" onPress={() => onChange({ confluenceThreshold: 0.8 })} style={styles.chip} />
          <Button text="90%" onPress={() => onChange({ confluenceThreshold: 0.9 })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Broker / API Provider</Text>
        <View style={styles.row}>
          <Button text="Deriv" onPress={() => onChange({ apiProvider: 'deriv' })} style={styles.chip} />
          <Button text="Paper" onPress={() => onChange({ apiProvider: 'paper' })} style={styles.chip} />
        </View>

        <Text style={styles.label}>Deriv App ID</Text>
        <TextInput
          placeholder="1089"
          placeholderTextColor="#9aa4b2"
          value={config.derivAppId || ''}
          onChangeText={(t) => onChange({ derivAppId: t })}
          style={styles.input}
        />

        <Text style={styles.label}>Deriv API Token</Text>
        <TextInput
          placeholder="Paste your Deriv API token"
          placeholderTextColor="#9aa4b2"
          value={config.apiToken}
          onChangeText={(t) => onChange({ apiToken: t })}
          style={styles.input}
          secureTextEntry
        />

        <Text style={styles.label}>Default Stake (USD)</Text>
        <TextInput
          placeholder="1"
          placeholderTextColor="#9aa4b2"
          keyboardType="numeric"
          value={String(config.tradeStake || 1)}
          onChangeText={(t) => onChange({ tradeStake: Number(t) || 1 })}
          style={styles.input}
        />

        <View style={{ height: 16 }} />
        <Button text="Close" onPress={() => sheetRef.current?.close()} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  label: {
    color: colors.text,
    opacity: 0.9,
    marginTop: 6,
    marginBottom: 6,
  },
  helper: {
    color: colors.text,
    opacity: 0.7,
    fontSize: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
  },
  input: {
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
