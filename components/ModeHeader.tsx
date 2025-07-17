import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

export function ModeHeader() {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.caros_700_24,
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
  caros_700_24: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 
  },
}); 