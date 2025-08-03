import { Database } from '@/lib/database.types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Event = Database['public']['Tables']['event']['Row'];

interface EventCardProps {
  event: Event;
  onLike: () => void;
  isLiked: boolean;
}

export default function EventCard({ event, onLike, isLiked }: EventCardProps) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventName}>{event.name}</Text>
        <TouchableOpacity onPress={onLike} style={styles.likeButton}>
          <Text style={[styles.heartIcon, isLiked && styles.heartIconLiked]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.eventAddress}>{event.address}</Text>
      <Text style={styles.eventGenre}>{event.genre}</Text>
      <Text style={styles.eventDescription}>{event.description}</Text>
      <Text style={styles.eventTime}>
        {new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  likeButton: {
    padding: 4,
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
    marginBottom: 4,
  },
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventGenre: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
}); 