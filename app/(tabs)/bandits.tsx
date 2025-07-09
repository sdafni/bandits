import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getBandits, toggleBanditLike } from '@/app/services/bandits';
import BanditCard from '@/components/BanditCard';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Database } from '@/lib/database.types';
type Bandit = Database['public']['Tables']['bandits']['Row'];

export default function BanditsScreen() {
  const [bandits, setBandits] = useState<Bandit[]>([]);
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

  return (
    <ParallaxScrollView
      headerImage={<View />}
      headerBackgroundColor={{
        light: '#ffffff',
        dark: '#000000',
      }}
    >
      <View style={styles.container}>
        {bandits.map((bandit) => (
          <BanditCard
            key={bandit.id}
            bandit={bandit}
            onLike={() => handleLike(bandit.id, bandit.is_liked)}
          />
        ))}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
}); 