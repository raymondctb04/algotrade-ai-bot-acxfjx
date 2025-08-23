
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors } from '../styles/commonStyles';

interface CodeBlockProps {
  code: string;
  language?: string;
  note?: string;
}

export default function CodeBlock({ code, language, note }: CodeBlockProps) {
  return (
    <View style={styles.card}>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.codeWrap}>
        <Text selectable style={styles.code}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2a44',
    padding: 12,
    width: '100%',
    marginTop: 8,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  note: {
    color: '#c6d4ef',
    marginBottom: 8,
  },
  codeWrap: {
    width: '100%',
  },
  code: {
    color: '#e8f0ff',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
    lineHeight: 18,
    minWidth: 300,
  },
});
