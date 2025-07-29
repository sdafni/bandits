import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getBandits } from '@/app/services/bandits';
import { EventFilters, getCurrentLocation, getEventGenres, getEvents, getUniqueCities, getUniqueNeighborhoods } from '@/app/services/events';
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
  const isSelected = selectedValue !== '';
  const selectedItem = items.find(item => item.value === selectedValue);
  
  return (
    <View style={[
      styles.pickerContainer, 
      isSelected ? styles.pickerContainerSelected : styles.pickerContainerDefault
    ]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={[
          styles.picker,
          { color: isSelected ? '#000000' : '#666' }
        ]}
      >
        <Picker.Item 
          label="All" 
          value="" 
          color="#4CAF50"
        />
        {items.map(item => (
          <Picker.Item key={item.value} label={item.label} value={item.value} />
        ))}
      </Picker>
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
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [selectedBandit, setSelectedBandit] = useState<string>('');
  const [nearMeActive, setNearMeActive] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Set the bandit filter when banditId is provided in URL params
  useEffect(() => {
    if (banditId) {
      setSelectedBandit(banditId as string);
    }
  }, [banditId]);

  useEffect(() => {
    loadEvents();
  }, [searchQuery, selectedGenre, selectedCity, selectedNeighborhood, selectedBandit, nearMeActive, userLocation]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load filter options for events
      const [citiesData, neighborhoodsData, genresData, banditsData] = await Promise.all([
        getUniqueCities(),
        getUniqueNeighborhoods(),
        getEventGenres(),
        getBandits()
      ]);
      
      setCities(citiesData);
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
    setSelectedCity('');
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
      {/* Search Bar */}
      <CustomSearchInput 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search description..."
      />
      
      {/* Filters Section */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          {/* Bandit Filter */}
          <FilterPicker
            selectedValue={selectedBandit}
            onValueChange={setSelectedBandit}
            items={bandits.map(bandit => ({ label: bandit.name, value: bandit.id }))}
            placeholder="All"
          />
          
          {/* Genre Filter */}
          <FilterPicker
            selectedValue={selectedGenre}
            onValueChange={setSelectedGenre}
            items={genres.map(genre => ({ label: genre, value: genre }))}
            placeholder="All"
          />
          
          {/* City Filter */}
          <FilterPicker
            selectedValue={selectedCity}
            onValueChange={setSelectedCity}
            items={cities.map(city => ({ label: city, value: city }))}
            placeholder="All"
          />
          
          {/* Neighborhood Filter */}
          <FilterPicker
            selectedValue={selectedNeighborhood}
            onValueChange={setSelectedNeighborhood}
            items={neighborhoods.map(neighborhood => ({ label: neighborhood, value: neighborhood }))}
            placeholder="All"
          />
          
          {/* Near Me Filter */}
          <FilterButton
            title="Near Me (5km)"
            isActive={nearMeActive}
            onPress={handleNearMeToggle}
          />
        </View>
        

        
        {/* Clear Filters - only show when filters are active */}
        {(selectedBandit || selectedGenre || selectedCity || selectedNeighborhood || nearMeActive) && (
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
    height: 40,
    paddingHorizontal: 12,
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
  picker: {
    height: 40,
    width: '100%',
    color: '#666',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },

  filterButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginTop: 0,
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
    fontSize: 14,
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