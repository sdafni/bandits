import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getBandits } from '@/app/services/bandits';
import { EventFilters, getCurrentLocation, getEventGenres, getEvents, getUniqueNeighborhoods } from '@/app/services/events';
import { useCity } from '@/contexts/CityContext';
import { Database } from '@/lib/database.types';

type Event = Database['public']['Tables']['event']['Row'];
type Bandit = Database['public']['Tables']['bandits']['Row'];

const CustomSearchInput = ({ value, onChangeText, placeholder }: { 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder: string;
}) => (
  <View style={styles.searchWrapper}>
    <View style={styles.searchInputContainer}>
      <Text style={styles.placeholder}>{placeholder}</Text>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    </View>
  </View>
);

const FilterButton = ({ title, isActive, onPress }: {
  title: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.filterButton, 
      isActive && styles.pickerContainerSelected
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.filterButtonText, 
      { color: isActive ? '#000000' : '#666' }
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const FilterPicker = ({ 
  selectedValue, 
  onValueChange, 
  items, 
  placeholder 
}: {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedValue !== '';
  const selectedItem = items.find(item => item.value === selectedValue);
  
  return (
    <View style={[
      styles.pickerContainer, 
      isSelected ? styles.pickerContainerSelected : styles.pickerContainerDefault
    ]}>
      <TouchableOpacity
        style={styles.pickerTouchable}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[
          styles.pickerText,
          { color: isSelected ? '#000000' : '#666' }
        ]}>
          {selectedItem ? selectedItem.label : placeholder}
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
                  styles.modalItemClear
                ]}
                onPress={() => {
                  onValueChange('');
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  styles.modalItemTextClear
                ]}>
                  Any {placeholder}
                </Text>
              </TouchableOpacity>
              {items.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.modalItem,
                    selectedValue === item.value && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedValue === item.value && styles.modalItemTextSelected
                  ]}>
                    {item.label}
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

const EventCard = ({ event }: { event: Event }) => (
  <View style={styles.eventCard}>
    <Text style={styles.eventName}>{event.name}</Text>
    <Text style={styles.eventAddress}>{event.address}</Text>
    <Text style={styles.eventGenre}>{event.genre}</Text>
    <Text style={styles.eventDescription}>{event.description}</Text>
    <Text style={styles.eventTime}>
      {new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()}
    </Text>
  </View>
);

export default function CityGuideScreen() {
  const { banditId } = useLocalSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [bandits, setBandits] = useState<Bandit[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Filter states
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [selectedBandit, setSelectedBandit] = useState<string>('');
  const [nearMeActive, setNearMeActive] = useState(false);
  
  // Get selected city from global context
  const { selectedCity } = useCity();

  useEffect(() => {
    loadInitialData();
  }, []);

  // Set the bandit filter when banditId is provided in URL params
  useEffect(() => {
    if (banditId) {
      setSelectedBandit(banditId as string);
    } else {
      // Clear the bandit filter when no banditId is provided
      setSelectedBandit('');
    }
  }, [banditId]);

  useEffect(() => {
    loadEvents();
  }, [searchQuery, selectedGenre, selectedCity, selectedNeighborhood, selectedBandit, nearMeActive, userLocation]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load filter options for events
      const [neighborhoodsData, genresData, banditsData] = await Promise.all([
        getUniqueNeighborhoods(),
        getEventGenres(),
        getBandits()
      ]);
      
      setNeighborhoods(neighborhoodsData);
      setGenres(genresData);
      setBandits(banditsData);
      
      // Get user location
      const location = await getCurrentLocation();
      setUserLocation(location);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const filters: EventFilters = {};
      
      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }
      
      if (selectedGenre) {
        filters.genre = selectedGenre;
      }
      
      if (selectedCity) {
        filters.city = selectedCity;
      }
      
      if (selectedNeighborhood) {
        filters.neighborhood = selectedNeighborhood;
      }
      
      if (selectedBandit) {
        filters.banditId = selectedBandit;
      }
      
      if (nearMeActive && userLocation) {
        filters.userLat = userLocation.lat;
        filters.userLng = userLocation.lng;
        filters.radiusKm = 5;
      }
      
      const eventsData = await getEvents(filters);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    }
  };

  const handleNearMeToggle = () => {
    setNearMeActive(!nearMeActive);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedNeighborhood('');
    setSelectedBandit('');
    setNearMeActive(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          Explore {selectedCity || 'All Cities'}
        </Text>
      </View>
      
      {/* Search Bar */}
      <CustomSearchInput 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search description..."
      />
      
      {/* Filters Section */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          {/* Genre Filter */}
          <FilterPicker
            selectedValue={selectedGenre}
            onValueChange={setSelectedGenre}
            items={genres.map(genre => ({ label: genre, value: genre }))}
            placeholder="Genre"
          />
          
          {/* Neighborhood Filter */}
          <FilterPicker
            selectedValue={selectedNeighborhood}
            onValueChange={setSelectedNeighborhood}
            items={neighborhoods.map(neighborhood => ({ label: neighborhood, value: neighborhood }))}
            placeholder="District"
          />
          
          {/* Near Me Filter */}
          <FilterButton
            title="Near Me (5km)"
            isActive={nearMeActive}
            onPress={handleNearMeToggle}
          />
        </View>
        

        
        {/* Clear Filters - only show when filters are active */}
        {(selectedBandit || selectedGenre || selectedNeighborhood || nearMeActive) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Events List */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {events.length === 0 ? (
            <Text style={styles.noEventsText}>No events found</Text>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
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
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    marginTop: 13,
    marginBottom: 13,
    marginHorizontal: 16,
    height: 64,
  },
  searchInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  searchInput: {
    fontSize: 12,
    padding: 0,
    color: '#000000',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 13,
    paddingTop: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 13,
  },


  pickerContainer: {
    marginTop: 0,
    marginBottom: 0,
    minWidth: 100,
    maxWidth: 120,
    flex: 1,
    borderRadius: 30,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 0,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerContainerDefault: {
    backgroundColor: '#FFFFFF',
  },
  pickerContainerSelected: {
    backgroundColor: '#E3F2FD',
  },
  pickerTouchable: {
    height: 44,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pickerText: {
    fontSize: 12,
    color: '#666',
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
    width: '80%',
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
  modalItemClear: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  modalItemTextClear: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  filterButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginTop: 0,
    height: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 11,
  },
  eventCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventGenre: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
}); 