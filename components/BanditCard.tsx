import { Database } from '@/lib/database.types';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

type Bandit = Database['public']['Tables']['bandits']['Row'];

interface BanditCardProps {
  bandit: Bandit;
  onLike?: (id: string, currentLikeStatus: boolean) => void;
}

export default function BanditCard({ bandit, onLike }: BanditCardProps) {
  const { id, name, age, city, occupation, image_url, rating, is_liked } = bandit;

  return (
    <View style={styles.card}>
      {/* Main Image */}
      <Image
        source={{ uri: image_url }}
        style={styles.mainImage}
      />
      
      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          <ThemedText style={styles.mainInfo}>
            <ThemedText style={styles.bold}>{name}</ThemedText>
            <ThemedText style={styles.bold}>, {age} years</ThemedText>
            <ThemedText style={styles.bold}>, {city}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.occupation}>{occupation}</ThemedText>
        </View>

        {/* Center Logo */}
        <View style={styles.centerSection}>
          <Image
            source={require('@/assets/images/banditour-logo.png')}
            style={styles.logo}
          />
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden', // This ensures the image respects the border radius
    marginVertical: 8,
  },
  mainImage: {
    width: '100%',
    height: 150, // Reduced from 200 to 150 (25% decrease)
    borderRadius: 30,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  leftSection: {
    flex: 2, // Give more space to the text sections
  },
  centerSection: {
    flex: 1, // Give the center section a flex value
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
  },
  rightSection: {
    flex: 2, // Give more space to the text sections
    alignItems: 'flex-end',
  },
  mainInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  bold: {
    fontFamily: 'Caros-ExtraBold',
    color: '#000000',
  },
  occupation: {
    fontFamily: 'Caros-Regular',
    fontSize: 12,
    color: '#777777',
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
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