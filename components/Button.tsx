
import { colors } from '../styles/commonStyles';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  text: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function Button({ text, onPress, style, textStyle, disabled }: ButtonProps) {
  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );
}
