import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getBanditById, getBanditTags } from '@/app/services/bandits';
import { getBanditEventCategories } from '@/app/services/events';
import { getBanditReviews } from '@/app/services/reviews';

import BanditHeader from '@/components/BanditHeader';
import ReviewCard from '@/components/ReviewCard';
import TagChip from '@/components/TagChip';

import { TAG_EMOJI_MAP } from '@/constants/tagNameToEmoji';
import { Database } from '@/lib/database.types';

type Bandit = Database['public']['Tables']['bandit']['Row'];

interface EventCategory {
  genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
  count: number;
}

export default function BanditScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [bandit, setBandit] = useState<Bandit | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [reviews, setReviews] = useState<
    Database['public']['Tables']['user_bandit']['Row'][]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBanditData = async () => {
      try {
        setLoading(true);

        // Bandit
        const banditData = await getBanditById(id as string);
        if (!banditData) throw new Error('Bandit not found');
        setBandit(banditData);

        // Categories (what they recommend)
        try {
          const categoriesData = await getBanditEventCategories(id as string);
          setCategories(categoriesData);
        } catch {
          setCategories([]);
        }

        // Vibes (how it feels)
        try {
          const tagData = await getBanditTags(id as string);
          setTags(tagData);
        } catch {
          setTags([]);
        }

        // Reviews
        try {
          const reviewsData = await getBanditReviews(id as string);
          setReviews(reviewsData);
        } catch {
          setReviews([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bandit');
      } finally {
        setLoading(false);
      }
    };

    fetchBanditData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !bandit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ?? 'Bandit not found'}</Text>
      </View>
    );
  }

  const handleCategoryPress = (genre: string) => {
    router.push(`/cityGuide?banditId=${id}&genre=${genre}`);
  };

  const handleVibePress = (tag: string) => {
    router.push(`/cityGuide?vibe=${encodeURIComponent(tag)}`);
  };

  const handleAskMePress = () => {
    const phoneNumber = '+972544717932';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;

    Linking.canOpenURL(whatsappUrl).then((supported) => {
      supported
        ? Linking.openURL(whatsappUrl)
        : Alert.alert('Error', 'WhatsApp is not installed');
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER + CATEGORIES */}
        <BanditHeader
          bandit={bandit}
          categories={categories}
          variant="detail"
          showActionButtons
          onCategoryPress={handleCategoryPress}
        />

        {/* VIBES (directly under Categories) */}
        {tags.length > 0 && (
          <View style={styles.vibesSection}>
            <Text style={styles.vibesLabel}>Vibes</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vibesContainer}
            >
              {tags.map((tag, index) => (
                <TagChip
                key={index}
                label={`${TAG_EMOJI_MAP[tag] ?? '✨'} ${tag}`}
                />
              
              ))}
            </ScrollView>
          </View>
        )}

        {/* DESCRIPTION */}
        <Text style={styles.description}>{bandit.description}</Text>

        {/* WHY FOLLOW */}
        <Text style={styles.whyFollowLabel}>
          {`Why follow ${bandit.name}?`}
        </Text>

        {bandit.why_follow && (
          <Text style={styles.why_follow}>
            {bandit.why_follow
              .split('.')
              .filter((s) => s.trim())
              .map((sentence, i) => (
                <Text key={i}>{`\n• ${sentence.trim()}.`}</Text>
              ))}
          </Text>
        )}

        {/* REVIEWS */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>
            Reviews <Text style={styles.reviewsCount}>({reviews.length})</Text>
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reviewsContainer}
          >
            {reviews.map((review, index) => (
              <ReviewCard key={index} review={review} />
            ))}
          </ScrollView>
        </View>

        {/* CTA */}
        <Pressable style={styles.askMeButton} onPress={handleAskMePress}>
          <Text style={styles.askMeText}>Ask me</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 8,
  },
  whyFollowLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#3C3C3C',
    marginBottom: 10,
  },
  why_follow: {
    fontSize: 14,
    color: '#3C3C3C',
    marginLeft: 16,
    marginBottom: 8,
  },

  reviewsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  reviewsTitle: {
    fontFamily: 'Caros',
    fontWeight: '800',
    fontSize: 22,
    color: '#3C3C3C',
    marginBottom: 12,
  },
  reviewsCount: {
    fontFamily: 'Caros',
    fontWeight: '400',
    fontSize: 14,
    color: '#FFB800',
  },
  reviewsContainer: {
    paddingHorizontal: 8,
  },
  vibesSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  
  vibesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 6,
  },
  
  vibesContainer: {
    paddingVertical: 4,
  },
  
  askMeButton: {
    backgroundColor: '#ff0000',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  askMeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Caros',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});
