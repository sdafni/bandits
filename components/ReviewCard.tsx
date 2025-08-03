import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ReviewCardProps {
  review: {
    user_id: string;
    review: string;
    rating: number;
    created_at?: string;
    user_name: string;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating);
  };

  const getTimeAgo = (createdAt?: string) => {
    if (!createdAt) return 'recently';
    
    const now = new Date();
    const reviewDate = new Date(createdAt);
    const diffInDays = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.user_name || 'Anonymous'}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(review.created_at)}</Text>
          </View>
        </View>
        <Text style={styles.rating}>{renderStars(review.rating)}</Text>
      </View>
      <Text style={styles.reviewText}>{review.review}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EAEAEA',
    borderRadius: 15,
    padding: 12,
    marginBottom: 8,
    marginRight: 12,
    width: 163,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Caros',
    fontWeight: '500',
    fontSize: 12, // Increased by 10% from 11, rounded up
    color: '#3C3C3C',
    marginBottom: 2,
  },
  timeAgo: {
    fontFamily: 'Caros',
    fontWeight: '300',
    fontSize: 8, // Increased by 10% from 6.6, rounded up
    color: '#868686',
  },
  rating: {
    fontSize: 11, // Increased by 10% from 9.9, rounded up
    marginLeft: 4,
  },
  reviewText: {
    fontFamily: 'Caros',
    fontWeight: '300',
    fontSize: 9, // Increased by 10% from 7.7, rounded up
    color: '#3C3C3C',
    lineHeight: 12, // Increased by 10% from 11, rounded up
  },
}); 