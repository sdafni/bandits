import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface ReviewCardProps {
  review: {
    user_id: string;
    review: string;
    rating: number;
    created_at?: string;
  };
  userProfile?: {
    name: string;
    image_url?: string;
  };
}

export default function ReviewCard({ review, userProfile }: ReviewCardProps) {
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
          <Image
            source={{ uri: userProfile?.image_url || 'https://via.placeholder.com/40x40' }}
            style={styles.userImage}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userProfile?.name || 'Anonymous'}</Text>
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
  userImage: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    marginRight: 8,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Caros',
    fontWeight: '500',
    fontSize: 10,
    color: '#3C3C3C',
    marginBottom: 2,
  },
  timeAgo: {
    fontFamily: 'Caros',
    fontWeight: '300',
    fontSize: 6,
    color: '#868686',
  },
  rating: {
    fontSize: 9,
    marginLeft: 4,
  },
  reviewText: {
    fontFamily: 'Caros',
    fontWeight: '300',
    fontSize: 7,
    color: '#3C3C3C',
    lineHeight: 10,
  },
}); 