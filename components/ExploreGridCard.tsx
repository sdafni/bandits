import { getEventBanditRecommendations } from '@/app/services/events';
import { Database } from '@/lib/database.types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Event = Database['public']['Tables']['event']['Row'];
type BanditRecommendation = Pick<Database['public']['Tables']['bandit']['Row'], 'id' | 'image_url'>;

const FALLBACK_IMAGE =
  'https://zubcakeamyfqatdmleqx.supabase.co/storage/v1/object/public/banditsassets4/assets/jazzInjazz.png';

interface ExploreGridCardProps {
  event: Event;
  onLike: () => void;
  isLiked: boolean;
  onPress?: () => void;
  banditId?: string;
  showRecommendations?: boolean;
}

/** Desktop-only Explore grid card. Do not use on Local banDit or My Spots. */
export default function ExploreGridCard({
  event,
  onLike,
  isLiked,
  onPress,
  banditId,
  showRecommendations = false,
}: ExploreGridCardProps) {
  const router = useRouter();
  const [recommendingBandits, setRecommendingBandits] = useState<BanditRecommendation[]>([]);

  const imageUri = (event.image_url && event.image_url.trim()) || FALLBACK_IMAGE;

  useEffect(() => {
    if (!showRecommendations) return;
    void (async () => {
      try {
        const bandits = await getEventBanditRecommendations(event.id);
        setRecommendingBandits(bandits);
      } catch (error) {
        console.error('Error fetching bandit recommendations:', error);
      }
    })();
  }, [event.id, showRecommendations]);

  const handleCardPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const url = banditId ? `/event/${event.id}?banditId=${banditId}` : `/event/${event.id}`;
    router.push(url as any);
  };

  const handleLikePress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onLike();
  };

  return (
    <Pressable style={styles.card} onPress={handleCardPress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingText}>{(event.rating || 0).toFixed(1)}</Text>
          <Text style={styles.starText}>★</Text>
        </View>
        {showRecommendations && recommendingBandits.length > 0 && (
          <View style={styles.recommendationsContainer}>
            {recommendingBandits.map((bandit, index) => (
              <TouchableOpacity
                key={bandit.id}
                style={[styles.banditIcon, { zIndex: recommendingBandits.length - index }]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/bandit/${bandit.id}` as any);
                }}
              >
                <Image source={{ uri: bandit.image_url }} style={styles.banditIconImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {event.name || ''}
          </Text>
          <TouchableOpacity onPress={handleLikePress} style={styles.likeButton}>
            <Text style={styles.heartIcon}>{isLiked ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {!!event.genre && (
          <Text style={styles.genre} numberOfLines={1}>
            {event.genre}
          </Text>
        )}

        <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
          {event.description || ''}
        </Text>

        <Text style={styles.address} numberOfLines={2}>
          {event.address || ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#EAEAEA',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  ratingContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 4,
  },
  starText: {
    color: 'white',
    fontSize: 16,
  },
  recommendationsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  banditIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
    marginLeft: -12,
    overflow: 'hidden',
  },
  banditIconImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  likeButton: {
    padding: 4,
  },
  heartIcon: {
    fontSize: 20,
  },
  genre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 4,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
});
