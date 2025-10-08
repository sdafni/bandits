import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Modal } from 'react-native';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { installState, canPrompt, promptInstall, debugInfo } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Don't show anything if not installable or already installed
  if (installState === 'not-installable' || installState === 'installed') {
    return null;
  }

  const handleInstallClick = async () => {
    if (canPrompt) {
      // Try to show native install prompt
      const success = await promptInstall();
      if (!success) {
        // If prompt failed, show manual instructions
        setShowInstructions(true);
      }
    } else {
      // Show manual instructions
      setShowInstructions(true);
    }
  };

  const getButtonText = () => {
    if (installState === 'ios-safari') {
      return '📱 How to Install';
    }
    return '📱 Install App';
  };

  const getInstructionsText = () => {
    if (installState === 'ios-safari') {
      return (
        <View>
          <Text style={styles.instructionTitle}>Install on iOS</Text>
          <Text style={styles.instructionStep}>1. Tap the Share button (square with arrow) at the bottom</Text>
          <Text style={styles.instructionStep}>2. Scroll down and tap "Add to Home Screen"</Text>
          <Text style={styles.instructionStep}>3. Tap "Add" in the top right</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.instructionTitle}>Install on Android</Text>
        <Text style={styles.instructionStep}>1. Tap the menu (⋮) in the top right corner</Text>
        <Text style={styles.instructionStep}>2. Tap "Install app" or "Add to Home screen"</Text>
        <Text style={styles.instructionStep}>3. Follow the prompts to install</Text>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity style={styles.button} onPress={handleInstallClick}>
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>🐛 Debug Info</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showInstructions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {getInstructionsText()}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={styles.closeButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDebug}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDebug(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.instructionTitle}>PWA Debug Info</Text>
            {debugInfo && Object.entries(debugInfo).map(([key, value]) => (
              <Text key={key} style={styles.debugText}>
                {key}: {String(value)}
              </Text>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDebug(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#fff8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ffddaa',
  },
  button: {
    backgroundColor: '#ff0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  instructionStep: {
    fontSize: 16,
    marginBottom: 12,
    color: '#555555',
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: '#ff0000',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#666666',
    fontSize: 12,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333333',
    fontFamily: 'monospace',
  },
});