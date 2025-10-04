
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../styles/commonStyles';
import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

interface DonutProps {
  size?: number;
  strokeWidth?: number;
  value: number;
  label?: string;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  labelText: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.8,
    marginTop: 2,
  },
});

export default function Donut({ size = 100, strokeWidth = 8, value, label }: DonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.grey}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.3}
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={value >= 0 ? colors.accent : colors.error}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.valueText}>{Math.abs(value).toFixed(1)}%</Text>
        {label && <Text style={styles.labelText}>{label}</Text>}
      </View>
    </View>
  );
}
