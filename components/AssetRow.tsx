
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';
import Button from './Button';
import { AssetEntry } from '../data/assets';

interface Props {
  entry: AssetEntry;
  selected: boolean;
  onAdd: () => void;
  onRemove: () => void;
  price?: number;
  time?: number;
}

export default function AssetRow({ entry, selected, onAdd, onRemove, price, time }: Props) {
  const timeText = time ? new Date(time * 1000).toLocaleTimeString() : '';
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.symbol}>{entry.displayName}</Text>
        <Text style={styles.sub}>{entry.symbol}</Text>
        <Text style={styles.price}>
          {price !== undefined ? `$${price.toFixed(5)} ${time ? `@ ${timeText}` : ''}` : '—'}
        </Text>
      </View>
      {selected ? (
        <Button text="Remove" onPress={onRemove} style={[styles.action, { backgroundColor: '#c62828' }]} />
      ) : (
        <Button text="Add" onPress={onAdd} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.background,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.25)',
  },
  symbol: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  sub: {
    color: colors.text,
    opacity: 0.75,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: colors.accent,
    fontSize: 14,
    marginTop: 4,
  },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    width: 120,
  },
});
