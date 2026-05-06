import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useMeetings } from '../hooks/useMeetings';
import MeetingCard from '../components/MeetingCard';
import { deleteMeeting } from '../services/supabase';
import { Meeting } from '../types';

interface HomeScreenProps {
  onMeetingPress: (meeting: Meeting) => void;
  onStartRecording: () => void;
  onOpenSettings: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onMeetingPress,
  onStartRecording,
  onOpenSettings,
}) => {
  const { theme } = useTheme();
  const { meetings, loading, refresh } = useMeetings();

  const handleLongPress = (meeting: Meeting) => {
    Alert.alert(
      'Delete Meeting',
      `Delete "${meeting.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeeting(meeting.id);
              refresh();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const processingCount = meetings.filter(
    (m) =>
      m.status === 'transcribing' ||
      m.status === 'processing' ||
      m.status === 'uploading'
  ).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Meetings</Text>
          {processingCount > 0 && (
            <Text style={[styles.processingBanner, { color: theme.primary }]}>
              ✨ {processingCount} processing in background…
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onOpenSettings}
          style={[styles.settingsBtn, { backgroundColor: theme.surface }]}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Meeting list */}
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <MeetingCard
            meeting={item}
            onPress={() => {
              if (item.status === 'completed') {
                onMeetingPress(item);
              } else if (item.status === 'error') {
                Alert.alert('Processing Error', item.error_message ?? 'Unknown error occurred');
              } else {
                Alert.alert(
                  'Processing',
                  `This meeting is still being processed (${item.status}). Check back in a moment.`
                );
              }
            }}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎙️</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No meetings yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                Tap the button below to start{'\n'}recording your first meeting
              </Text>
            </View>
          ) : null
        }
      />

      {/* Record FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          onPress={onStartRecording}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.fabIcon}>🎙️</Text>
          <Text style={styles.fabText}>New Recording</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  processingBanner: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 20,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  fabIcon: { fontSize: 20 },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default HomeScreen;
