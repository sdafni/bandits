import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getBandits, getUniqueCities, toggleBanditLike } from '@/app/services/bandits';
import { getBanditEventCategories } from '@/app/services/events';
import BanditHeader from '@/components/BanditHeader';
import { useCity } from '@/contexts/CityContext';
import { Database } from '@/lib/database.types';
type Bandit = Database['public']['Tables']['bandit']['Row'];

interface EventCategory {
  genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
  count: number;
}

const CityDropdown = ({ cities, selectedCity, onSelectCity }: {
  cities: string[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Show city name as header text if there's only one city
  if (cities.length === 1) {
    return (
      <View style={styles.searchWrapper}>
        <Text style={styles.cityHeaderText}>{cities[0]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.searchWrapper}>
      <TouchableOpacity
        style={styles.citySelectContainer}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.placeholder}>Where to?</Text>
        <Text style={styles.selectedCityText}>
          {selectedCity || 'Select a city'}
        </Text>
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  !selectedCity && styles.modalItemClear
                ]}
                onPress={() => {
                  onSelectCity('');
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  !selectedCity && styles.modalItemTextClear
                ]}>
                  Any City
                </Text>
              </TouchableOpacity>
              {cities.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.modalItem,
                    selectedCity === city && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    onSelectCity(city);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedCity === city && styles.modalItemTextSelected
                  ]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function BanditsScreen() {
  const router = useRouter();
  const [bandits, setBandits] = useState<Bandit[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedCity, setSelectedCity } = useCity();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [banditsData, citiesData] = await Promise.all([
        getBandits(),
        getUniqueCities()
      ]);
      setBandits(banditsData);
      setCities(citiesData);
      
      // Auto-select the city if there's only one
      if (citiesData.length === 1) {
        setSelectedCity(citiesData[0]);
      }

      // Fetch categories for the first bandit (or you could fetch for all bandits)
      if (banditsData.length > 0) {
        try {
          const categoriesData = await getBanditEventCategories(banditsData[0].id);
          setCategories(categoriesData);
        } catch (categoriesError) {
          console.warn('Failed to fetch categories:', categoriesError);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string, currentLikeStatus: boolean) => {
    try {
      await toggleBanditLike(id, currentLikeStatus);
      setBandits(bandits.map(bandit => 
        bandit.id === id ? { ...bandit, is_liked: !currentLikeStatus } : bandit
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCategoryPress = (banditId: string, genre: string) => {
    router.push(`/cityGuide?banditId=${banditId}&genre=${genre}`);
  };

  const filteredBandits = bandits.filter(bandit => {
    const matchesCity = !selectedCity || bandit.city === selectedCity;
    const matchesSearch = !searchTerm || bandit.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return (
    <View style={styles.mainContainer}>
      <CityDropdown 
        cities={cities}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
      />
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bandits..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
        />
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {filteredBandits.map((bandit) => (
            <BanditHeader
              key={bandit.id}
              bandit={bandit}
              categories={categories}
              onLike={() => handleLike(bandit.id, bandit.is_liked)}
              variant="list"
              showActionButtons={true}
              onCategoryPress={(genre) => handleCategoryPress(bandit.id, genre)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchWrapper: {
    marginTop: 13,
    marginBottom: 13,

    marginHorizontal: 16,
    height: 64, // 40 * 1.3 = ~52 (30% increase)
  },
  citySelectContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    minWidth: 200,
    maxWidth: 300,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2, // Slightly reduced opacity for smoother look
    shadowRadius: 8, // Increased from 4 to 8 for smoother dissipation
    elevation: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
    textAlign: 'center',
  },
  selectedCityText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
  },
  cityHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3C3C3C',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 300,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  modalItemSelected: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  modalItemClear: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  modalItemText: {
    fontSize: 14,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalItemTextClear: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  searchBarContainer: {
    marginHorizontal: 16,
    marginBottom: 13,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 11, // Reduced from 16 to 11 (approximately 70%)
  },
}); 