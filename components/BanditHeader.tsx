import { Database } from '@/lib/database.types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  onCategoryPress,
}: BanditHeaderProps) {
  const {
    id,
    name,
    family_name,
    age,
    occupation,
    image_url,
    face_image_url,
    rating,
    is_liked,
    bandit_tags,
  } = bandit as any;

  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  const isListVariant = variant === 'list';
  const displayImage = isListVariant
    ? face_image_url || image_url
    : image_url;

  const imageHeight = isListVariant ? 238 : undefined;
  const containerPadding = isListVariant ? 0 : 16;

  const content = (
    <>
      {/* IMAGE */}
      <View
        style={[
          styles.imageContainer,
          isListVariant && styles.listImageContainer,
        ]}
      >
        <Image
          source={{ uri: displayImage }}
          style={[
            styles.mainImage,
            isListVariant
              ? { height: imageHeight }
              : { aspectRatio: imageAspectRatio },
            isListVariant && styles.listImage,
          ]}
          onLoad={() => {
            if (!isListVariant) {
              setImageAspectRatio(0.8);
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
              <Image
                source={require('@/assets/icons/Alecive-Flatwoken-Apps-Google-Maps.512.png')}
                style={styles.mapIcon}
              />
            </Pressable>
          </>
        )}
      </View>

      {/* INFO */}
      <View
        style={[
          styles.infoContainer,
          isListVariant && styles.listInfoContainer,
        ]}
      >
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{`${name} ${family_name}`}</Text>
          <Text style={styles.descriptionLine}>
            {`(${age} y/o, local banDit)`}
          </Text>
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

      {/* CATEGORIES + VIBES */}
      <View style={isListVariant ? styles.listCategoriesWrapper : undefined}>
        <EventCategories
          categories={categories}
          onCategoryPress={onCategoryPress}
        />
        {/* Bandit Tags made invisible. */}
        {/* {bandit_tags?.length > 0 && (
          <View style={styles.vibesContainer}>
            {bandit_tags.map((bt: any) => {
              const tagName = bt.tags?.name;
              if (!tagName) return null;

              return (
                <TagChip
                  key={tagName}
                  label={`${TAG_EMOJI_MAP[tagName] ?? ''} ${tagName}`}
                />
              );
            })}
          </View>
        )} */}
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: containerPadding },
        isListVariant && styles.listContainer,
      ]}
    >
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    borderRadius: 20,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
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
  },
  listImageContainer: {
    marginBottom: 0,
  },
  mainImage: {
    width: '100%',
    borderRadius: 20,
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
  },
  mapButtonTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  mapIcon: {
    width: 47,
    height: 47,
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
    marginBottom: 16,
  },
  listInfoContainer: {
    height: 80,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 0,
  },
  listCategoriesWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
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
    fontSize: 14,
    fontWeight: '700',
  },
  likeButton: {
    marginLeft: 8,
  },
  vibesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 14,
  },
});
