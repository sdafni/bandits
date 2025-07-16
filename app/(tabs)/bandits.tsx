import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getBandits, toggleBanditLike } from '@/app/services/bandits';
import BanditCard from '@/components/BanditCard';
import { Database } from '@/lib/database.types';
type Bandit = Database['public']['Tables']['bandits']['Row'];

const CustomSearchInput = ({ value, onChangeText }: { 
  value: string; 
  onChangeText: (text: string) => void 
}) => (
  <View style={styles.searchWrapper}>
    <View style={styles.searchInputContainer}>
      <Text style={styles.placeholder}>Where to?</Text>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  </View>
);

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
      <CustomSearchInput 
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
  searchWrapper: {
    marginTop: 13,
    marginBottom: 13,

    marginHorizontal: 16,
    height: 64, // 40 * 1.3 = ~52 (30% increase)
  },
  searchInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2, // Slightly reduced opacity for smoother look
    shadowRadius: 8, // Increased from 4 to 8 for smoother dissipation
    elevation: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  searchInput: {
    fontSize: 12,
    padding: 0,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 11, // Reduced from 16 to 11 (approximately 70%)
  },
}); 