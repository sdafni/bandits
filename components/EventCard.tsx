import { Database } from '@/lib/database.types';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Event = Database['public']['Tables']['event']['Row'];

interface EventCardProps {
  event: Event;
  onLike: () => void;
  isLiked: boolean;
  // New variant props for different behaviors
  buttonType?: 'like' | 'remove';
  buttonText?: string;
  showButton?: boolean;
  variant?: 'default' | 'horizontal';
  imageHeight?: number;
  onPress?: () => void;
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
  onPress
}: EventCardProps) {
  const isHorizontal = variant === 'horizontal';

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default navigation to event detail page
      router.push(`/event/${event.id}`);
    }
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation(); // Prevent card press when like button is pressed
    onLike();
  };

  const cardContent = (
    <>
      {/* Event Image */}
      {event.image_url && (
        <View style={[
          styles.imageContainer, 
          isHorizontal && styles.imageContainerHorizontal,
          ...(imageHeight ? [{ height: imageHeight }] : [])
        ]}>
          <Image
            source={{ uri: event.image_url }}
            style={styles.eventImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image failed to load:', event.image_url, error);
            }}
          />
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{event.rating.toFixed(1)}</Text>
            <Text style={styles.starText}>★</Text>
          </View>
        </View>
      )}
      
      <View style={[
        styles.eventContent,
        isHorizontal && styles.eventContentHorizontal
      ]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{event.name}</Text>
          {showButton && (
            buttonType === 'remove' ? (
              <TouchableOpacity onPress={handleLikePress} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>
                  {buttonText || 'Remove'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLikePress} style={styles.likeButton}>
                <Text style={[styles.heartIcon, isLiked && styles.heartIconLiked]}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <Text style={styles.eventDescription} numberOfLines={3} ellipsizeMode="tail">{event.description}</Text>
        <View style={styles.bottomInfo}>
          <Text style={styles.eventAddress}>{event.address}</Text>
          <View style={styles.timeContainer}>
            <Text style={styles.eventDate}>
              {new Date(event.start_time).getDate()}/{new Date(event.start_time).getMonth() + 1}
            </Text>
            <Text style={styles.eventTime}>
              {new Date(event.start_time).getHours().toString().padStart(2, '0')}:{new Date(event.start_time).getMinutes().toString().padStart(2, '0')}-{new Date(event.end_time).getHours().toString().padStart(2, '0')}:{new Date(event.end_time).getMinutes().toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <Pressable 
      style={[
        styles.eventCard,
        !isHorizontal && { maxHeight: 280 },
        isHorizontal && styles.eventCardHorizontal
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
  eventCardHorizontal: {
    width: 192,
    height: 400,
    marginRight: 16,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  likeButton: {
    padding: 4,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
    marginTop: 2,
    flex: 1,
    minHeight: 0,
  },
  bottomInfo: {
    flexShrink: 0,
  },
  eventTime: {
    fontSize: 16,
    color: '#FF0000',
    fontWeight: 'bold',
  },
  timeContainer: {
    marginTop: 4,
  },
  eventDate: {
    fontSize: 10,
    color: '#999',
    marginBottom: 1,
  },
  eventImage: {
    width: '100%',
    height: '90%',
    borderRadius: 8,
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  eventContentHorizontal: {
    flex: 1,
    padding: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 0,
  },
  imageContainerHorizontal: {
    width: '100%',
    height: 256,
    marginBottom: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
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
}); 