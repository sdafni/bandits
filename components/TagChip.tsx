import { Pressable, StyleSheet, Text } from 'react-native';

interface TagChipProps {
  label: string;
  onPress?: () => void;
}

export default function TagChip({ label, onPress }: TagChipProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && onPress && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,

    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',

    marginRight: 8,
    marginBottom: 6,
  },

  pressed: {
    backgroundColor: '#F0F0F0',
  },

  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
});
