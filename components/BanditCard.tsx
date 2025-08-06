import { Database } from '@/lib/database.types';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

type Bandit = Database['public']['Tables']['bandit']['Row'];

interface BanditCardProps {
  bandit: Bandit;
  onLike?: (id: string, currentLikeStatus: boolean) => void;
}

export default function BanditCard({ bandit, onLike }: BanditCardProps) {
  const { id, name, family_name, age, city, occupation, image_url, rating, is_liked } = bandit;

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/bandit/${bandit.id}`)}
      activeOpacity={0.8}
    >
      {/* Main Image */}
      <Image
        source={{ uri: image_url }}
        style={styles.mainImage}
      />
      
      {/* bandit bottom bar */}
      <View style={styles.contentContainer}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          

          <Text style={styles.mainInfo}>
            <Text style={styles.caros_700_12}>{name}</Text>
            <Text style={styles.caros_700_12}>, {age} years</Text>
            <Text style={styles.caros_700_12}>, {city}</Text>
          </Text>
          <Text style={styles.caros_400_8}>{occupation}</Text>
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

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden', // This ensures the image respects the border radius
    marginVertical: 8,
  },
  caros_700_12: {
    fontFamily: 'Caros',
    fontWeight: '700',
    color: '#000000',
  },
  caros_400_8: {
    fontFamily: 'Caros',
    fontWeight: '400',
    color: '#777777',
    fontSize: 8,
  },


  mainImage: {
    width: '100%',
    height: 145,
    borderRadius: 30,
    opacity: 1
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
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
    fontSize: 12, //doesnt work , i overrode ThemedText
    lineHeight: 12,
    letterSpacing: 0,
    marginBottom: 4,
  },
  bold: {
    fontFamily: 'Caros',
    fontWeight: '700',
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