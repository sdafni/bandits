import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bandit } from '@/app/types/bandit';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface BanditCardProps {
  bandit: Bandit;
}

export function BanditCard({ bandit }: BanditCardProps) {
  const [isLiked, setIsLiked] = useState(bandit.isLiked);
  const [rating, setRating] = useState(bandit.rating);

  return (
    <ThemedView style={styles.card}>
      <Image
        source={{ uri: bandit.image }}
        style={styles.image}
        contentFit="cover"
      />
      
      <View style={styles.footer}>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">{bandit.name}</ThemedText>
          <ThemedText style={styles.occupation}>{bandit.occupation}</ThemedText>
        </View>

        <Image 
          source={{ uri: 'https://picsum.photos/100/100' }}
          style={styles.centerImage}
          contentFit="cover"
        />

        <View style={styles.actions}>
          <View style={styles.rating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
              >
                <IconSymbol
                  size={20}
                  name={star <= rating ? 'star.fill' : 'star'}
                  color={star <= rating ? '#FFD700' : '#666'}
                />
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => setIsLiked(!isLiked)}>
            <IconSymbol
              size={24}
              name={isLiked ? 'heart.fill' : 'heart'}
              color={isLiked ? '#FF6B6B' : '#666'}
            />
          </Pressable>
        </View>
        
      </View>


    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: '100%',
    height: 200,
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  info: {
    flex: 1,
    alignItems: 'flex-start',
  },
  occupation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  centerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  rating: {
    flexDirection: 'row',
    gap: 2,
  },
}); 