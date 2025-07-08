import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

export function ModeHeader() {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.text,
        { color: Colors[colorScheme ?? 'light'].text }
      ]}>
        Traveler
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
  },
}); 