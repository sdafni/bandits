import { Pressable, StyleSheet, Text, View } from 'react-native';

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

export default function EventCategories({ categories, selectedGenre, onCategoryPress }: EventCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.categoriesContainer}>
        {categories.map((category, index) => (
          <View key={category.genre} style={styles.categoryItem}>
            <Pressable
              style={[
                styles.categoryBadge,
                selectedGenre === category.genre && styles.categoryBadgeSelected
              ]}
              onPress={() => onCategoryPress?.(category.genre)}
            >
              <Text style={styles.categoryIcon}>{getGenreIcon(category.genre)}</Text>
              <Text style={[
                styles.categoryText,
                selectedGenre === category.genre && styles.categoryTextSelected
              ]}>
                {category.count} {category.genre.toUpperCase()}
              </Text>
            </Pressable>
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