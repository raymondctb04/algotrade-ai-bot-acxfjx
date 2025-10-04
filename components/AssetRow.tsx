
import { colors } from '../styles/commonStyles';
import { View, Text, StyleSheet } from 'react-native';
import { AssetEntry } from '../data/assets';
import Button from './Button';

interface Props {
  entry: AssetEntry;
  selected: boolean;
  onAdd: () => void;
  onRemove: () => void;
  price?: number;
  time?: number;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
  },
  selectedContainer: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  leftSection: {
    flex: 1,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  name: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
    marginTop: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
  },
  time: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    marginTop: 2,
  },
  buttonSection: {
    minWidth: 80,
  },
});

export default function AssetRow({ entry, selected, onAdd, onRemove, price, time }: Props) {
  return (
    <View style={[styles.container, selected && styles.selectedContainer]}>
      <View style={styles.leftSection}>
        <Text style={styles.symbol}>{entry.symbol}</Text>
        <Text style={styles.name}>{entry.name}</Text>
      </View>
      
      {price !== undefined && (
        <View style={styles.priceSection}>
          <Text style={styles.price}>{price.toFixed(5)}</Text>
          {time && (
            <Text style={styles.time}>
              {new Date(time * 1000).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.buttonSection}>
        {selected ? (
          <Button
            text="Remove"
            onPress={onRemove}
            style={{ backgroundColor: colors.error, paddingHorizontal: 12 }}
            textStyle={{ fontSize: 14 }}
          />
        ) : (
          <Button
            text="Add"
            onPress={onAdd}
            style={{ backgroundColor: colors.accent, paddingHorizontal: 16 }}
            textStyle={{ fontSize: 14 }}
          />
        )}
      </View>
    </View>
  );
}
