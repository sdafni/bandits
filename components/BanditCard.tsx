import { Database } from '@/lib/database.types';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

type Bandit = Database['public']['Tables']['bandit']['Row'];

const CARD_RADIUS = 20;

interface BanditCardProps {
  bandit: Bandit;
  onLike?: (id: string, currentLikeStatus: boolean) => void;
}

export default function BanditCard({ bandit, onLike }: BanditCardProps) {
  const { id, name, family_name, age, city, occupation, image_url, rating, is_liked } = bandit;

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        onPress={() => router.push(`/bandit/${bandit.id}`)}
        activeOpacity={0.8}
        style={styles.touchableContainer}
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
              <Text style={styles.caros_700_12}>, {age} </Text>
            </Text>
            <Text style={styles.occupation}>{occupation}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  touchableContainer: {
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  caros_700_12: {
    fontFamily: 'Caros',
    fontWeight: '700',
    color: '#000000',
    fontSize: 16,
  },
  mainImage: {
    width: '100%',
    height: 203, // 60% of 340px total height (40% larger than 145px)
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    opacity: 1
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14, // Increased padding for larger card
    backgroundColor: '#FFFFFF',
    height: 137, // 40% of 340px total height
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