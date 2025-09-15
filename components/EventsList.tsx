import { Database } from '@/lib/database.types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import EventCard from './EventCard';

type Event = Database['public']['Tables']['event']['Row'];

interface EventsListProps {
  events: Event[];
  loading: boolean;
  error: string | null;
  onEventPress: (event: Event) => void;
  banditId: string;
  title?: string;
  variant?: 'default' | 'horizontal';
  showButton?: boolean;
  imageHeight?: number;
}

export default function EventsList({
  events,
  loading,
  error,
  onEventPress,
  banditId,
  title = "Bandit Events & Locations",
  variant = 'horizontal',
  showButton = false,
  imageHeight = 154,
}: EventsListProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No events with valid locations found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>{title}</Text>
      
      <ScrollView 
        horizontal={variant === 'horizontal'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={variant === 'horizontal' ? styles.eventsContainer : undefined}
      >
        {events.map((event) => (
          <EventCard 
            key={event.id} 
            event={event} 
            onLike={() => {}} // No like functionality in map view
            isLiked={false}
            variant={variant}
            showButton={showButton}
            imageHeight={imageHeight}
            banditId={banditId}
            onPress={() => onEventPress(event)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerText: {
    fontFamily: 'Caros',
    fontWeight: '800',
    fontSize: 24,
    color: '#3C3C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
  eventsContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
});
