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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F3F3',
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3C3C3C',
    letterSpacing: 0.2,
  },

  pressed: {
    backgroundColor: '#F0F0F0',
  },

});
