import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getBanditEventCategories } from '@/app/services/events';
import { getBanditReviews } from '@/app/services/reviews';
import BanditHeader from '@/components/BanditHeader';
import ReviewCard from '@/components/ReviewCard';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

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
  const [reviews, setReviews] = useState<Database['public']['Tables']['user_bandit']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanditData = async () => {
      try {
        setLoading(true);
        
        // Fetch bandit data
        const { data: banditData, error: banditError } = await supabase
          .from('bandit')
          .select('*')
          .eq('id', id as string)
          .single();

        if (banditError) throw banditError;
        setBandit(banditData);

        // Fetch event categories for this bandit
        try {
          const categoriesData = await getBanditEventCategories(id as string);
          setCategories(categoriesData);
        } catch (categoriesError) {
          console.warn('Failed to fetch categories:', categoriesError);
          // Don't fail the whole page if categories fail
        }

        // Fetch reviews for this bandit
        try {
          const reviewsData = await getBanditReviews(id as string);
          setReviews(reviewsData);
        } catch (reviewsError) {
          console.warn('Failed to fetch reviews:', reviewsError);
          // Set empty array if no reviews found
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!bandit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Bandit not found</Text>
      </View>
    );
  }




  const handleCategoryPress = (genre: string) => {
    router.push(`/cityGuide?banditId=${id}&genre=${genre}`);
  };

  return (  
    <>
      <Stack.Screen options={{ headerShown: true, title: bandit.name }} />
      
  <View style={styles.container}>
    <BanditHeader
      bandit={bandit}
      categories={categories}
      variant="detail"
      showActionButtons={true}
      onCategoryPress={handleCategoryPress}
    />
    
    <Text style={styles.description}>{bandit.description}</Text>
    
    <Text style={styles.whyFollowLabel}>{`Why follow ${bandit.name}?`}</Text>

        {bandit.why_follow ? (
      <Text style={styles.why_follow}>
        {bandit.why_follow
          .split('.')
          .filter(s => s.trim().length > 0)
          .map((sentence, i) => (
            <Text key={i}>
              {'\n• '}{sentence.trim()}.
            </Text>
          ))}
      </Text>
    ) : null}

    {/* Reviews Section */}
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
          <ReviewCard
            key={index}
            review={review}
          />
        ))}
      </ScrollView>
    </View>
    
  </View>


  
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  whyFollowLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#3C3C3C',
    marginBottom: 10,
  },
  description: {
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 8,
  },
  why_follow: {
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 8,
    marginLeft: 16,
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
});