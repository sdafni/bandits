import { Database } from '@/lib/database.types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import EventCard from './EventCard';

type Event = Database['public']['Tables']['event']['Row'];

interface EventListProps {
  events: Event[];
  onEventLike?: (eventId: string) => void;
  likedEventIds?: Set<string>;
  emptyMessage?: string;
  variant?: 'vertical' | 'horizontal';
  showRecommendations?: boolean;
  banditId?: string;
  // EventCard specific props
  buttonType?: 'like' | 'remove';
  buttonText?: string;
  showButton?: boolean;
  imageHeight?: number;
  onEventPress?: (event: Event) => void;
  // ScrollView props
  scrollViewStyle?: any;
  contentContainerStyle?: any;
  // Loading and error states (from EventsList)
  loading?: boolean;
  error?: string | null;
  title?: string;
}

export default function EventList({
  events,
  onEventLike,
  likedEventIds = new Set(),
  emptyMessage = 'No events found',
  variant = 'vertical',
  showRecommendations = false,
  banditId,
  buttonType = 'like',
  buttonText,
  showButton = true,
  imageHeight,
  onEventPress,
  scrollViewStyle,
  contentContainerStyle,
  loading = false,
  error = null,
  title
}: EventListProps) {
  const isHorizontal = variant === 'horizontal';

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Handle empty state
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const scrollViewProps = isHorizontal
    ? {
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        contentContainerStyle: [styles.horizontalContentContainer, contentContainerStyle]
      }
    : {
        style: [styles.verticalScrollView, scrollViewStyle],
        contentContainerStyle: [styles.verticalContentContainer, contentContainerStyle]
      };

  const content = (
    <ScrollView {...scrollViewProps}>
      <View style={isHorizontal ? styles.horizontalContainer : styles.verticalContainer}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onLike={() => onEventLike?.(event.id)}
            isLiked={likedEventIds.has(event.id)}
            variant={isHorizontal ? 'horizontal' : 'default'}
            showRecommendations={showRecommendations}
            banditId={banditId}
            buttonType={buttonType}
            buttonText={buttonText}
            showButton={showButton}
            imageHeight={imageHeight}
            onPress={onEventPress ? () => onEventPress(event) : undefined}
          />
        ))}
      </View>
    </ScrollView>
  );

  // If title is provided, wrap in container with header
  if (title) {
    return (
      <View style={styles.containerWithTitle}>
        <Text style={styles.headerText}>{title}</Text>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  containerWithTitle: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  verticalScrollView: {
    flex: 1,
  },
  verticalContentContainer: {
    flexGrow: 1,
  },
  verticalContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 11,
  },
  horizontalContentContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  horizontalContainer: {
    flexDirection: 'row',
    gap: 16,
  },
});
