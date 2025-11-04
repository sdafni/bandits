import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BottomNavigationProps {
  onProfilePress: () => void;
  onTakePartPress: () => void;
}

export default function BottomNavigation({ onProfilePress, onTakePartPress }: BottomNavigationProps) {
  const colorScheme = useColorScheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault,
      }
    ]}>
      <TouchableOpacity style={styles.button} onPress={onProfilePress}>
        <IconSymbol name="person.circle" size={24} color={Colors[colorScheme ?? 'light'].text} />
        <Text style={[styles.buttonText, { color: Colors[colorScheme ?? 'light'].text }]}>
          Profile
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onTakePartPress}>
        <IconSymbol name="person.2.circle" size={24} color={Colors[colorScheme ?? 'light'].text} />
        <Text style={[styles.buttonText, { color: Colors[colorScheme ?? 'light'].text }]}>
          Take Part indeed
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    minHeight: 70,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});