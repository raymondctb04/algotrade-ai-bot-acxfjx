
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

export default function BottomSheetSettings({ config, onChange }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '75%'], []);

  useEffect(() => {
    // Expose global function to open settings
    (globalThis as any).openSettingsSheet = () => {
      try {
        bottomSheetRef.current?.expand();
      } catch (error) {
        console.log('Error opening settings sheet:', error);
      }
    };

    return () => {
      (globalThis as any).openSettingsSheet = undefined;
    };
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const handleClose = () => {
    try {
      bottomSheetRef.current?.close();
    } catch (error) {
      console.log('Error closing settings sheet:', error);
    }
  };

  const handleInputChange = (field: keyof BotConfig, value: string) => {
    try {
      if (field === 'tradeStake') {
        const numValue = parseFloat(value) || 1;
        onChange({ [field]: numValue });
      } else {
        onChange({ [field]: value });
      }
    } catch (error) {
      console.log('Error handling input change:', error);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={styles.bottomSheet}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Bot Settings</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deriv App ID</Text>
          <TextInput
            style={styles.input}
            value={config.derivAppId || ''}
            onChangeText={(text) => handleInputChange('derivAppId', text)}
            placeholder="Enter Deriv App ID"
            placeholderTextColor={colors.grey}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>API Token</Text>
          <TextInput
            style={styles.input}
            value={config.apiToken || ''}
            onChangeText={(text) => handleInputChange('apiToken', text)}
            placeholder="Enter API Token"
            placeholderTextColor={colors.grey}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
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

        <View style={styles.buttonRow}>
          <Button
            text="Close"
            onPress={handleClose}
            style={styles.closeButton}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: colors.grey,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 44,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: colors.grey,
    minWidth: 120,
  },
});
