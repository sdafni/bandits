import { Database } from '@/lib/database.types';
import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

type Bandit = Database['public']['Tables']['bandits']['Row'];

interface BanditCardProps {
  bandit: Bandit;
  onLike?: (id: string, currentLikeStatus: boolean) => void;
}

export default function BanditCard({ bandit, onLike }: BanditCardProps) {
  const { id, name, age, city, occupation, image_url, rating, is_liked } = bandit;

  return (
    <ThemedView style={styles.card}>
      <Image source={{ uri: image_url }} style={styles.image} />
      <ThemedView style={styles.content}>
        <ThemedText style={styles.name}>{name}</ThemedText>
        <ThemedText style={styles.details}>{`${age} years • ${city}`}</ThemedText>
        <ThemedText style={styles.occupation}>{occupation}</ThemedText>
        <ThemedView style={styles.footer}>
          <ThemedText style={styles.rating}>Rating: {rating}/10</ThemedText>
          {onLike && (
            <Pressable onPress={() => onLike(id, is_liked)}>
              <ThemedText style={styles.heart}>{is_liked ? '❤️' : '🤍'}</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  image: {
    width: 120,
    height: 120,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    marginBottom: 4,
  },
  occupation: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
  },
  heart: {
    fontSize: 20,
  },
}); 