
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { colors } from '../styles/commonStyles';
import { BotConfig } from '../types/Bot';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import Button from './Button';

interface Props {
  config: BotConfig;
  onChange: (next: Partial<BotConfig>) => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.backgroundAlt,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    opacity: 0.9,
  },
  buttonContainer: {
    marginTop: 20,
  },
});

export default function BottomSheetSettings({ config, onChange }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    // Expose open method globally
    (globalThis as any).openSettingsSheet = () => {
      bottomSheetRef.current?.expand();
    };
  }, []);

  const snapPoints = useMemo(() => ['25%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  const handleInputChange = (field: keyof BotConfig, value: string) => {
    if (field === 'tradeStake') {
      const numValue = parseFloat(value) || 0;
      onChange({ [field]: numValue });
    } else {
      onChange({ [field]: value });
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.backgroundAlt }}
      handleIndicatorStyle={{ backgroundColor: colors.grey }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Bot Configuration</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deriv API Settings</Text>
          
          <Text style={styles.label}>API Token</Text>
          <TextInput
            style={styles.input}
            value={config.apiToken || ''}
            onChangeText={(text) => handleInputChange('apiToken', text)}
            placeholder="Enter your Deriv API token"
            placeholderTextColor={colors.grey}
            secureTextEntry
          />

          <Text style={styles.label}>App ID</Text>
          <TextInput
            style={styles.input}
            value={config.derivAppId || ''}
            onChangeText={(text) => handleInputChange('derivAppId', text)}
            placeholder="Enter your Deriv App ID"
            placeholderTextColor={colors.grey}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trading Settings</Text>
          
          <Text style={styles.label}>Trade Stake (USD)</Text>
          <TextInput
            style={styles.input}
            value={String(config.tradeStake || 1)}
            onChangeText={(text) => handleInputChange('tradeStake', text)}
            placeholder="1"
            placeholderTextColor={colors.grey}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            text="Close Settings"
            onPress={handleClose}
            style={{ backgroundColor: colors.accent }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}
