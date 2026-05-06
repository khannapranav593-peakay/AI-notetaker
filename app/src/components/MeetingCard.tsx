import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Meeting, MeetingStatus } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  onPress: () => void;
  onLongPress: () => void;
}

const STATUS_CONFIG: Record<MeetingStatus, { label: string; emoji: string }> = {
  recording: { label: 'Recording', emoji: '🔴' },
  uploading: { label: 'Uploading', emoji: '⬆️' },
  transcribing: { label: 'Transcribing', emoji: '📝' },
  processing: { label: 'Generating insights', emoji: '✨' },
  completed: { label: 'Done', emoji: '✅' },
  error: { label: 'Error', emoji: '⚠️' },
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onPress,
  onLongPress,
}) => {
  const { theme } = useTheme();
  const status = STATUS_CONFIG[meeting.status];
  const isCompleted = meeting.status === 'completed';
  const isError = meeting.status === 'error';
  const isProcessing = !isCompleted && !isError;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: isError
            ? theme.error + '44'
            : isCompleted
            ? theme.border
            : theme.primary + '33',
          shadowColor: theme.primary,
        },
      ]}
    >
      {/* Left accent bar */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: isError
              ? theme.error
              : isCompleted
              ? theme.success
              : theme.primary,
          },
        ]}
      />

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {meeting.title}
        </Text>

        {/* Date */}
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {formatDate(meeting.created_at)}
        </Text>

        {/* Footer row */}
        <View style={styles.footer}>
          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isError
                  ? theme.error + '18'
                  : isCompleted
                  ? theme.success + '18'
                  : theme.primary + '18',
              },
            ]}
          >
            <Text style={styles.statusEmoji}>{status.emoji}</Text>
            <Text
              style={[
                styles.statusText,
                {
                  color: isError
                    ? theme.error
                    : isCompleted
                    ? theme.success
                    : theme.primary,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>

          {/* Duration */}
          {meeting.duration_seconds > 0 && (
            <Text style={[styles.duration, { color: theme.textTertiary }]}>
              {formatDuration(meeting.duration_seconds)}
            </Text>
          )}
        </View>

        {/* Processing pulse indicator */}
        {isProcessing && (
          <View style={styles.processingRow}>
            <View
              style={[styles.processingDot, { backgroundColor: theme.primary }]}
            />
            <View
              style={[
                styles.processingDot,
                { backgroundColor: theme.primary, opacity: 0.6 },
              ]}
            />
            <View
              style={[
                styles.processingDot,
                { backgroundColor: theme.primary, opacity: 0.3 },
              ]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusEmoji: {
    fontSize: 11,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    fontWeight: '500',
  },
  processingRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default MeetingCard;
