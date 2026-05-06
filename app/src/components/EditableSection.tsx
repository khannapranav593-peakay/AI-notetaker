import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface EditableSectionProps {
  label?: string;
  value: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  placeholder?: string;
  style?: object;
  labelStyle?: object;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  label,
  value,
  isEditing,
  onChangeText,
  multiline = true,
  placeholder = 'Tap to edit...',
  style,
  labelStyle,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.textTertiary }, labelStyle]}>
          {label.toUpperCase()}
        </Text>
      )}
      {isEditing ? (
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.primary + '55',
              backgroundColor: theme.primary + '08',
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          textAlignVertical="top"
          scrollEnabled={false}
        />
      ) : (
        <Text style={[styles.text, { color: theme.text }]}>
          {value || (
            <Text style={{ color: theme.textTertiary, fontStyle: 'italic' }}>
              No content yet
            </Text>
          )}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
  input: {
    fontSize: 15,
    lineHeight: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
});

export default EditableSection;
