import { Pressable, StyleSheet, Text } from 'react-native';

interface TagChipProps {
  label: string;
  onPress?: () => void;
}

export default function TagChip({ label, onPress }: TagChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    marginRight: 8,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3C3C3C',
  },
});
