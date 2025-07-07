import { StyleSheet, Text, View } from 'react-native';

export default function BanditsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bandits</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 