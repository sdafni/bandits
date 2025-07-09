import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { getBandits, toggleBanditLike } from '@/app/services/bandits';
import BanditCard from '@/components/BanditCard';
import { Database } from '@/lib/database.types';
type Bandit = Database['public']['Tables']['bandits']['Row'];

export default function BanditsScreen() {
  const [bandits, setBandits] = useState<Bandit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBandits();
  }, []);

  const loadBandits = async () => {
    try {
      const data = await getBandits();
      setBandits(data);
    } catch (error) {
      console.error('Error loading bandits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string, currentLikeStatus: boolean) => {
    try {
      await toggleBanditLike(id, currentLikeStatus);
      setBandits(bandits.map(bandit => 
        bandit.id === id ? { ...bandit, is_liked: !currentLikeStatus } : bandit
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const filteredBandits = bandits.filter(bandit => 
    bandit.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.mainContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by city..."
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {filteredBandits.map((bandit) => (
            <BanditCard
              key={bandit.id}
              bandit={bandit}
              onLike={() => handleLike(bandit.id, bandit.is_liked)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    margin: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
}); 