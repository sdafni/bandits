import { Database } from '@/lib/database.types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getEventBanditRecommendations } from '@/app/services/events';

type Event = Database['public']['Tables']['event']['Row'];
type BanditRecommendation = Pick<Database['public']['Tables']['bandit']['Row'], 'id' | 'image_url'>;

interface EventCardProps {
  event: Event;
  onLike: () => void;
  isLiked: boolean;
  buttonType?: 'like' | 'remove';
  buttonText?: string;
  showButton?: boolean;
  variant?: 'default' | 'horizontal' | 'grid';
  imageHeight?: number;
  onPress?: () => void;
  banditId?: string;
  showRecommendations?: boolean;
}

export default function EventCard({
  event,
  onLike,
  isLiked,
  buttonType = 'like',
  buttonText,
  showButton = true,
  variant = 'default',
  imageHeight,
  onPress,
  banditId,
  showRecommendations = false,
}: EventCardProps) {
  const router = useRouter();
  const isHorizontal = variant === 'horizontal';
  const isGrid = variant === 'grid';
  const [recommendingBandits, setRecommendingBandits] = useState<BanditRecommendation[]>([]);

  const imageUri =
    (event.image_url && event.image_url.trim()) ||
    'https://zubcakeamyfqatdmleqx.supabase.co/storage/v1/object/public/banditsassets4/assets/jazzInjazz.png';

  useEffect(() => {
    if (showRecommendations) {
      const fetchRecommendations = async () => {
        try {
          const bandits = await getEventBanditRecommendations(event.id);
          setRecommendingBandits(bandits);
        } catch (error) {
          console.error('Error fetching bandit recommendations:', error);
        }
      };
      fetchRecommendations();
    }
  }, [event.id, showRecommendations]);

  const handleCardPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const url = banditId
      ? (`/event/${event.id}?banditId=${banditId}` as const)
      : (`/event/${event.id}` as const);
    router.push(url as any);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    onLike();
  };

  const cardContent = (
    <>
      <View
        style={[
          styles.imageContainer,
          isHorizontal && styles.imageContainerHorizontal,
          isGrid && styles.imageContainerGrid,
          !isHorizontal && !isGrid && styles.imageContainerDefault,
          ...(imageHeight ? [{ height: imageHeight }] : []),
        ]}
      >
        <Image
          source={{ uri: imageUri }}
          style={isHorizontal ? styles.eventImageHorizontal : styles.eventImageCover}
          resizeMode="cover"
          onError={(error) => {
            console.error('Image failed to load:', event.image_url || 'default image', error);
          }}
        />
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

      <View style={[styles.eventContent, isHorizontal && styles.eventContentHorizontal, isGrid && styles.eventContentGrid]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName} numberOfLines={isGrid ? 2 : undefined}>
            {event.name || ''}
          </Text>
          {showButton &&
            (buttonType === 'remove' ? (
              <TouchableOpacity onPress={handleLikePress} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>{buttonText || 'Remove'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLikePress} style={styles.likeButton}>
                <Text style={[styles.heartIcon, isLiked && styles.heartIconLiked]}>{isLiked ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            ))}
        </View>

        {!!event.genre && (
          <Text style={styles.eventGenre} numberOfLines={1}>
            {event.genre}
          </Text>
        )}

        <Text
          style={[styles.eventDescription, isGrid && styles.eventDescriptionGrid]}
          numberOfLines={isGrid ? 3 : 3}
          ellipsizeMode="tail"
        >
          {event.description || ''}
        </Text>

        <View style={[styles.bottomInfo, isGrid && styles.bottomInfoGrid]}>
          <Text style={styles.eventAddress} numberOfLines={isGrid ? 2 : 0}>
            {event.address || ''}
          </Text>
          {event.timing_info && typeof event.timing_info === 'string' && event.timing_info.trim() && (
            <View style={styles.timeContainer}>
              <Text style={styles.eventTime}>{event.timing_info}</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <Pressable
      style={[
        styles.eventCard,
        isHorizontal && styles.eventCardHorizontal,
        isGrid && styles.eventCardGrid,
        !isHorizontal && !isGrid && Platform.OS === 'android' && styles.eventCardAndroid,
      ]}
      onPress={handleCardPress}
    >
      {cardContent}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  eventCardAndroid: {
    minHeight: 300,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  eventCardHorizontal: {
    width: 192,
    height: 320,
    marginRight: 8,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardGrid: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 0,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
    gap: 8,
  },
  likeButton: {
    padding: 4,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  heartIcon: {
    fontSize: 20,
  },
  heartIconLiked: {
    fontSize: 20,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 0,
    flex: 1,
  },
  eventGenre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 4,
    marginBottom: 2,
  },
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
    marginTop: 2,
    flex: 1,
    minHeight: 0,
    maxHeight: 100,
  },
  eventDescriptionGrid: {
    flex: 0,
    maxHeight: undefined,
    marginBottom: 8,
  },
  bottomInfo: {
    flexShrink: 0,
  },
  bottomInfoGrid: {
    paddingTop: 2,
  },
  eventTime: {
    fontSize: 16,
    color: '#FF0000',
    fontWeight: 'bold',
  },
  timeContainer: {
    marginTop: 4,
  },
  eventImageCover: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  eventImageHorizontal: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    paddingHorizontal: 2,
    justifyContent: 'space-between',
  },
  eventContentHorizontal: {
    flex: 1,
    padding: 3,
  },
  eventContentGrid: {
    flex: 0,
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
    flexShrink: 0,
    backgroundColor: '#EAEAEA',
  },
  imageContainerDefault: {
    aspectRatio: 4 / 3,
    height: Platform.OS === 'android' ? 160 : undefined,
  },
  imageContainerHorizontal: {
    width: '100%',
    height: 205,
    marginBottom: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  imageContainerGrid: {
    aspectRatio: 4 / 3,
    marginBottom: 0,
    borderRadius: 0,
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
});
