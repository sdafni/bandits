import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

export function ModeHeader() {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.container}>
      <Text style={styles.c_700_24}>
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
  c_700_24: {
    fontWeight: '700',
    fontSize: 24,
    color: '#3C3C3C'
  },
}); 