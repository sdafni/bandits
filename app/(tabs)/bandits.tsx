import { mockBandits } from '@/app/data/mockBandits';
import { BanditCard } from '@/components/BanditCard';
import { ThemedView } from '@/components/ThemedView';
import { ScrollView, StyleSheet } from 'react-native';

export default function BanditsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mockBandits.map((bandit) => (
          <BanditCard key={bandit.id} bandit={bandit} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
}); 