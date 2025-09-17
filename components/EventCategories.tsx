import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { EventGenre, getGenreIcon } from '@/constants/Genres';

interface EventCategory {
  genre: EventGenre;
  count: number;
}

interface EventCategoriesProps {
  categories: EventCategory[];
  selectedGenre?: string;
  onCategoryPress?: (genre: string) => void;
}

const AnimatedCategoryItem = ({ category, isSelected, onPress }: {
  category: EventCategory;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <View style={styles.categoryItem}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Pressable
          style={[
            styles.categoryBadge,
            isSelected && styles.categoryBadgeSelected
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.categoryIcon}>{getGenreIcon(category.genre)}</Text>
          <Text style={[
            styles.categoryText,
            isSelected && styles.categoryTextSelected
          ]}>
            {category.count} {category.genre.toUpperCase()}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default function EventCategories({ categories, selectedGenre, onCategoryPress }: EventCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <AnimatedCategoryItem
            key={category.genre}
            category={category}
            isSelected={selectedGenre === category.genre}
            onPress={() => onCategoryPress?.(category.genre)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#ECECEC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 2,
    minHeight: 25,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryBadgeSelected: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF0000',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3C3C3C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryTextSelected: {
    color: '#FF0000',
  },
}); 