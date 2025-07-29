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
    style={[styles.filterButton, isActive && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
      {title}
    </Text>
  </TouchableOpacity>
);

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
        placeholder="Search events..."
      />
      
      {/* Filters Section */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Bandit Filter */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBandit}
              onValueChange={setSelectedBandit}
              style={styles.picker}
            >
              <Picker.Item label="All Bandits" value="" />
              {bandits.map(bandit => (
                <Picker.Item key={bandit.id} label={bandit.name} value={bandit.id} />
              ))}
            </Picker>
          </View>
          
          {/* Genre Filter */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGenre}
              onValueChange={setSelectedGenre}
              style={styles.picker}
            >
              <Picker.Item label="All Genres" value="" />
              {genres.map(genre => (
                <Picker.Item key={genre} label={genre} value={genre} />
              ))}
            </Picker>
          </View>
          
          {/* City Filter */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCity}
              onValueChange={setSelectedCity}
              style={styles.picker}
            >
              <Picker.Item label="All Cities" value="" />
              {cities.map(city => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
            </Picker>
          </View>
          
          {/* Neighborhood Filter */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedNeighborhood}
              onValueChange={setSelectedNeighborhood}
              style={styles.picker}
            >
              <Picker.Item label="All Neighborhoods" value="" />
              {neighborhoods.map(neighborhood => (
                <Picker.Item key={neighborhood} label={neighborhood} value={neighborhood} />
              ))}
            </Picker>
          </View>
        </ScrollView>
        
        {/* Near Me Filter */}
        <FilterButton
          title="Near Me (5km)"
          isActive={nearMeActive}
          onPress={handleNearMeToggle}
        />
        
        {/* Clear Filters */}
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
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
    paddingBottom: 16,
  },
  pickerContainer: {
    marginRight: 10,
    minWidth: 120,
  },
  picker: {
    height: 40,
    width: '100%',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#333',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'flex-start',
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