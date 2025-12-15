import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VibeFilterModalProps {
  visible: boolean;
  tags: string[];
  selectedTags: string[];
  tagEmojiMap: Record<string, string>;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}

export default function VibeFilterModal({
  visible,
  tags,
  selectedTags,
  tagEmojiMap,
  onToggleTag,
  onClear,
  onClose,
  onApply,
}: VibeFilterModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen" // ✅ IMPORTANT
      onRequestClose={onClose}
    >
      {/* BACKDROP */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* BOTTOM SHEET */}
      <View style={styles.sheet}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Filter by Vibes</Text>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {tags.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={styles.row}
                onPress={() => onToggleTag(tag)}
              >
                <Text style={styles.emoji}>
                  {tagEmojiMap[tag] ?? ''}
                </Text>

                <Text style={styles.label}>{tag}</Text>

                <Text style={styles.checkbox}>
                  {selected ? '☑️' : '⬜️'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onApply} style={styles.applyButton}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  sheet: {
    marginTop: 'auto', // ✅ pushes to bottom
    maxHeight: '66%',  // ✅ 2/3 screen
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  closeButton: {
    padding: 8,
  },

  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },

  /* LIST */
  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  emoji: {
    fontSize: 18,
    marginRight: 10,
  },

  label: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },

  checkbox: {
    fontSize: 18,
  },

  /* FOOTER */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },

  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  clearText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  applyButton: {
    backgroundColor: '#000',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
