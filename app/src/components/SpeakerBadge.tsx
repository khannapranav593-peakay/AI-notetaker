import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Speaker } from '../types';

interface SpeakerBadgeProps {
  speaker: Speaker;
  onRename?: (speakerId: string, newName: string) => void;
  size?: 'sm' | 'md';
}

const SpeakerBadge: React.FC<SpeakerBadgeProps> = ({
  speaker,
  onRename,
  size = 'md',
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState(speaker.display_name);

  const isSmall = size === 'sm';

  const handleSave = () => {
    if (editName.trim() && onRename) {
      onRename(speaker.id, editName.trim());
    }
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => onRename && setModalVisible(true)}
        activeOpacity={onRename ? 0.7 : 1}
        style={[
          styles.badge,
          {
            backgroundColor: speaker.color + '22',
            borderColor: speaker.color + '55',
            paddingHorizontal: isSmall ? 8 : 12,
            paddingVertical: isSmall ? 3 : 5,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: speaker.color, width: isSmall ? 6 : 8, height: isSmall ? 6 : 8 },
          ]}
        />
        <Text
          style={[
            styles.label,
            {
              color: speaker.color,
              fontSize: isSmall ? 11 : 13,
              fontWeight: '600',
            },
          ]}
        >
          {speaker.display_name}
        </Text>
        {onRename && (
          <Text style={[styles.editHint, { color: speaker.color + '99', fontSize: isSmall ? 9 : 11 }]}>
            ✎
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}
          >
            <View style={[styles.modalDot, { backgroundColor: speaker.color }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Rename Speaker {speaker.label}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter name..."
              placeholderTextColor={theme.textTertiary}
              autoFocus
              onSubmitEditing={handleSave}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 100,
  },
  label: {
    letterSpacing: 0.2,
  },
  editHint: {
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default SpeakerBadge;
