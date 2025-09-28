import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import BaseModal from './BaseModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleLogout = async () => {
    console.log('🔥 Logout button pressed!');

    try {
      console.log('🔒 Starting logout process...');
      console.log('📡 Supabase client:', supabase ? 'Available' : 'Not available');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Supabase logout error:', error);
        Alert.alert('Logout Error', error.message || 'Failed to logout. Please try again.');
        return;
      }

      console.log('✅ Supabase logout successful');
      onClose(); // Close modal first
      console.log('🚀 Redirecting to login...');
      router.replace('/');

    } catch (error) {
      console.error('❌ Unexpected logout error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <BaseModal visible={visible} onClose={onClose} height={200}>
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: '#FF6B6B' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 150,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});