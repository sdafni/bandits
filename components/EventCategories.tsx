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
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        flex: 1,
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
  );
};

export default function EventCategories({ categories, selectedGenre, onCategoryPress }: EventCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  // Calculate items per row to fit all categories in max 2 rows
  const totalItems = categories.length;
  const maxRows = 2;
  const itemsPerRow = Math.ceil(totalItems / maxRows);

  // Calculate flex basis as percentage to ensure items fit
  const flexBasisPercent = (100 / itemsPerRow) - 2; // Subtract 2% for gaps

  return (
    <View style={styles.container}>
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <View key={category.genre} style={[styles.categoryItem, { flexBasis: `${flexBasisPercent}%` }]}>
            <AnimatedCategoryItem
              category={category}
              isSelected={selectedGenre === category.genre}
              onPress={() => onCategoryPress?.(category.genre)}
            />
          </View>
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
    rowGap: 8,
    justifyContent: 'flex-start',
  },
  categoryItem: {
    marginBottom: 8,
    minWidth: 0,
  },
  categoryBadge: {
    backgroundColor: '#ECECEC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 2,
    minHeight: 25,
    maxHeight: 40,
    maxWidth: 150,
    borderWidth: 1,
    borderColor: 'transparent',
    flex: 1,
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