import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ActionItem } from '../types';

interface ActionCardProps {
  item: ActionItem;
  isEditing: boolean;
  onToggleComplete: (id: string) => void;
  onEditOwner: (id: string, owner: string) => void;
  onEditDescription: (id: string, description: string) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  item,
  isEditing,
  onToggleComplete,
  onEditOwner,
  onEditDescription,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: item.completed ? theme.success + '44' : theme.border,
          borderLeftColor: item.completed ? theme.success : theme.accent,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onToggleComplete(item.id)}
        style={[
          styles.checkbox,
          {
            borderColor: item.completed ? theme.success : theme.border,
            backgroundColor: item.completed ? theme.success : 'transparent',
          },
        ]}
        activeOpacity={0.7}
      >
        {item.completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.ownerChip, { backgroundColor: theme.primary + '18' }]}>
          <Text style={[styles.ownerText, { color: theme.primary }]}>
            👤 {item.owner}
          </Text>
        </View>
        <Text
          style={[
            styles.description,
            {
              color: item.completed ? theme.textTertiary : theme.text,
              textDecorationLine: item.completed ? 'line-through' : 'none',
            },
          ]}
        >
          {item.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  ownerChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
});

export default ActionCard;
