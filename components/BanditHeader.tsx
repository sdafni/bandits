import { Database } from '@/lib/database.types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EventCategories from './EventCategories';
import { ThemedText } from './ThemedText';

type Bandit = Database['public']['Tables']['bandit']['Row'];

interface EventCategory {
  genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
  count: number;
}

interface BanditHeaderProps {
  bandit: Bandit;
  categories: EventCategory[];
  onLike?: (id: string, currentLikeStatus: boolean) => void;
  variant?: 'list' | 'detail';
  showActionButtons?: boolean;
  onCategoryPress?: (genre: string) => void;
}

export default function BanditHeader({
  bandit,
  categories,
  onLike,
  variant = 'detail',
  showActionButtons = true,
  onCategoryPress
}: BanditHeaderProps) {
  const { id, name, family_name, age, city, occupation, image_url, face_image_url, rating, is_liked } = bandit;
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  const isListVariant = variant === 'list';
  const displayImage = isListVariant ? (face_image_url || image_url) : image_url;
  const imageHeight = isListVariant ? 238 : undefined; // Use aspect ratio for detail view
  const containerPadding = isListVariant ? 0 : 16; // No padding for list variant

  const content = (
    <>
      <View style={[
        styles.imageContainer,
        isListVariant && styles.listImageContainer
      ]}>
        <Image
          source={{ uri: displayImage }}
          style={[
            styles.mainImage,
            isListVariant ? { height: imageHeight } : { aspectRatio: imageAspectRatio },
            isListVariant && styles.listImage
          ]}
          onLoad={(event) => {
            if (!isListVariant && event.nativeEvent) {
              // For detail view, we still calculate aspect ratio, but this might need adjustment
              // since we're dealing with TypeScript issues. Let's use a simpler approach.
              setImageAspectRatio(0.8); // Taller aspect ratio (width/height < 1 = taller image)
            }
          }}
        />
        
        {showActionButtons && (
          <>
            <Pressable
              style={styles.exploreButton}
              onPress={() => router.push(`/cityGuide?banditId=${id}`)}
            >
              <Text style={styles.plusSign}>+</Text>
              <Text style={styles.exploreText}>CITY GUIDE</Text>
            </Pressable>
            <Pressable
              style={styles.mapButtonTopLeft}
              onPress={() => router.push(`/cityMap?banditId=${id}`)}
            >
              <ImageBackground
                source={require('@/assets/images/cityButtonB.png')}
                style={styles.mapButtonBackground}
                imageStyle={styles.mapButtonBackgroundImage}
                resizeMode="cover"
                onError={(error) => console.error('Map button image failed to load:', error)}
              />
            </Pressable>
          </>
        )}
      </View>

      <View style={[
        styles.infoContainer,
        isListVariant && styles.listInfoContainer
      ]}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{`${name} ${family_name}, ${city}`}</Text>
          <Text style={styles.descriptionLine}>{`(${age} y/o, local banDit)`}</Text>
          <Text style={styles.occupation}>{occupation}</Text>
        </View>

        {!isListVariant && (
          <View style={styles.ratingContainer}>
            <ThemedText style={styles.stars}>⭐️</ThemedText>
            <ThemedText style={styles.rating}>{rating}</ThemedText>
            {onLike && (
              <Pressable 
                onPress={() => onLike(id, is_liked)}
                style={styles.likeButton}
              >
                <ThemedText>{is_liked ? '❤️' : '🤍'}</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={isListVariant ? styles.listCategoriesWrapper : undefined}>
        <EventCategories 
          categories={categories} 
          onCategoryPress={onCategoryPress}
        />
      </View>
    </>
  );

  return (
    <View style={[
      styles.container, 
      { paddingHorizontal: containerPadding },
      isListVariant && styles.listContainer
    ]}>
      {isListVariant ? (
        <TouchableOpacity 
          onPress={() => router.push(`/bandit/${id}`)}
          activeOpacity={0.8}
          style={styles.touchableContainer}
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    borderRadius: 20,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  touchableContainer: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  listImageContainer: {
    marginBottom: 0,
    overflow: 'visible',
  },
  mainImage: {
    width: '100%',
    borderRadius: 20,
    opacity: 1,
    zIndex: 1,
  },
  listImage: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  exploreButton: {
    position: 'absolute',
    right: 16,
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 2,
  },
  mapButtonTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 100,
    height: 70,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 2,
    overflow: 'hidden',
  },
  mapButtonBackground: {
    width: '100%',
    height: '100%',
  },
  mapButtonBackgroundImage: {
    borderRadius: 20,
  },
  exploreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  plusSign: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listInfoContainer: {
    height: 80, // 30% of 340px total height
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 0,
  },
  listCategoriesWrapper: {
    paddingHorizontal: 16,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontWeight: '700',
    fontSize: 17,
    color: '#222',
    marginBottom: 4,
  },
  descriptionLine: {
    fontWeight: '400',
    fontSize: 12,
    color: '#3C3C3C',
    marginBottom: 4,
  },
  occupation: {
    fontWeight: '600',
    fontSize: 13,
    color: '#3C3C3C',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    fontSize: 16,
  },
  rating: {
    fontFamily: 'Caros-Bold',
    fontSize: 14,
    color: '#000000',
  },
  likeButton: {
    marginLeft: 8,
  },
});
