import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Share, Alert, TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  getMeeting, getTranscript, getSpeakers,
  getInsights, updateMeeting, upsertInsights,
  updateSpeakerName,
} from '../services/supabase';
import {
  Meeting, Transcript, Speaker, MeetingInsights, ActionItem, TopicSection,
} from '../types';
import SpeakerBadge from '../components/SpeakerBadge';
import ActionCard from '../components/ActionCard';
import EditableSection from '../components/EditableSection';

type Tab = 'summary' | 'notes' | 'topics' | 'actions' | 'transcript';

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'notes', label: 'Notes' },
  { key: 'topics', label: 'Topics' },
  { key: 'actions', label: 'Actions' },
  { key: 'transcript', label: 'Transcript' },
];

interface MeetingDetailScreenProps {
  meetingId: string;
  onBack: () => void;
}

const MeetingDetailScreen: React.FC<MeetingDetailScreenProps> = ({ meetingId, onBack }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [insights, setInsights] = useState<MeetingInsights | null>(null);

  // Edit state
  const [editSummary, setEditSummary] = useState('');
  const [editNotes, setEditNotes] = useState<string[]>([]);
  const [editTopics, setEditTopics] = useState<TopicSection[]>([]);
  const [editActions, setEditActions] = useState<ActionItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, t, s, i] = await Promise.all([
      getMeeting(meetingId),
      getTranscript(meetingId),
      getSpeakers(meetingId),
      getInsights(meetingId),
    ]);
    setMeeting(m);
    setTranscript(t);
    setSpeakers(s);
    setInsights(i);
    if (i) {
      setEditSummary(i.summary ?? '');
      setEditNotes(i.notes ?? []);
      setEditTopics(i.topics ?? []);
      setEditActions(i.actionables ?? []);
    }
    setLoading(false);
  }, [meetingId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      await upsertInsights(meetingId, {
        summary: editSummary,
        notes: editNotes,
        topics: editTopics,
        actionables: editActions,
      });
      setInsights((prev) => prev ? {
        ...prev,
        summary: editSummary,
        notes: editNotes,
        topics: editTopics,
        actionables: editActions,
      } : prev);
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Save Error', e.message);
    }
  };

  const handleShare = async (content: string, title: string) => {
    await Share.share({ message: `${title}\n\n${content}` });
  };

  const handleShareAll = async () => {
    if (!insights) return;
    const text = [
      `📋 MEETING: ${meeting?.title}`,
      '',
      '📝 SUMMARY',
      insights.summary,
      '',
      '📌 KEY NOTES',
      ...(insights.notes ?? []).map((n) => `• ${n}`),
      '',
      '🗂 TOPICS',
      ...(insights.topics ?? []).flatMap((t) => [
        `\n${t.title}`,
        ...t.points.map((p) => `  • ${p}`),
      ]),
      '',
      '✅ ACTION ITEMS',
      ...(insights.actionables ?? []).map((a) => `• [${a.owner}] ${a.description}`),
    ].join('\n');
    await Share.share({ message: text });
  };

  const handleSpeakerRename = async (speakerId: string, newName: string) => {
    await updateSpeakerName(speakerId, newName);
    setSpeakers((prev) =>
      prev.map((s) => (s.id === speakerId ? { ...s, display_name: newName } : s))
    );
  };

  const handleToggleAction = (id: string) => {
    setEditActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const speakerMap = Object.fromEntries(speakers.map((s) => [s.label, s]));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Meeting Summary</Text>
              <TouchableOpacity onPress={() => handleShare(editSummary, '📝 Meeting Summary')}>
                <Text style={[styles.shareBtn, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
            <EditableSection
              value={editSummary}
              isEditing={isEditing}
              onChangeText={setEditSummary}
              placeholder="Summary will appear here after processing..."
            />
          </View>
        );

      case 'notes':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Meeting Notes</Text>
              <TouchableOpacity onPress={() => handleShare(editNotes.map((n) => `• ${n}`).join('\n'), '📌 Meeting Notes')}>
                <Text style={[styles.shareBtn, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
            {isEditing ? (
              <EditableSection
                value={editNotes.join('\n')}
                isEditing={true}
                onChangeText={(t) => setEditNotes(t.split('\n'))}
                placeholder="One note per line..."
              />
            ) : (
              editNotes.map((note, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{note}</Text>
                </View>
              ))
            )}
          </View>
        );

      case 'topics':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Topic Breakdown</Text>
              <TouchableOpacity onPress={() => handleShare(
                editTopics.map((t) => `${t.title}\n${t.points.map((p) => `  • ${p}`).join('\n')}`).join('\n\n'),
                '🗂 Topics'
              )}>
                <Text style={[styles.shareBtn, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
            {editTopics.map((topic, ti) => (
              <View key={ti} style={[styles.topicCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.topicAccent, { backgroundColor: theme.primary }]} />
                <View style={styles.topicContent}>
                  <Text style={[styles.topicTitle, { color: theme.text }]}>{topic.title}</Text>
                  {topic.points.map((p, pi) => (
                    <View key={pi} style={styles.bulletRow}>
                      <View style={[styles.bullet, { backgroundColor: theme.textTertiary }]} />
                      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        );

      case 'actions':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Action Items</Text>
              <TouchableOpacity onPress={() => handleShare(
                editActions.map((a) => `[${a.owner}] ${a.description}${a.completed ? ' ✓' : ''}`).join('\n'),
                '✅ Action Items'
              )}>
                <Text style={[styles.shareBtn, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
            {editActions.map((action) => (
              <ActionCard
                key={action.id}
                item={action}
                isEditing={isEditing}
                onToggleComplete={handleToggleAction}
                onEditOwner={() => {}}
                onEditDescription={() => {}}
              />
            ))}
          </View>
        );

      case 'transcript':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Transcript</Text>
              <TouchableOpacity onPress={() => handleShare(transcript?.full_text ?? '', '📄 Transcript')}>
                <Text style={[styles.shareBtn, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.speakerRow}>
              {speakers.map((s) => (
                <SpeakerBadge key={s.id} speaker={s} onRename={handleSpeakerRename} />
              ))}
            </View>
            {(transcript?.utterances ?? []).map((u, i) => {
              const speaker = speakerMap[u.speaker];
              return (
                <View key={i} style={[styles.utterance, { borderLeftColor: speaker?.color ?? theme.border }]}>
                  <Text style={[styles.utteranceSpeaker, { color: speaker?.color ?? theme.textTertiary }]}>
                    {speaker?.display_name ?? `Speaker ${u.speaker}`}
                  </Text>
                  <Text style={[styles.utteranceText, { color: theme.text }]}>{u.text}</Text>
                </View>
              );
            })}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backBtn, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShareAll} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: theme.primary }]}>Share All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            style={[styles.editBtn, { backgroundColor: isEditing ? theme.primary : theme.surface }]}
          >
            <Text style={{ color: isEditing ? '#FFF' : theme.text, fontWeight: '600', fontSize: 14 }}>
              {isEditing ? 'Save' : '✏️ Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.meetingTitle, { color: theme.text }]} numberOfLines={2}>
        {meeting?.title}
      </Text>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab.key ? theme.primary : theme.surface,
                borderColor: activeTab === tab.key ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? '#FFF' : theme.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {renderTabContent()}
      </ScrollView>
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
    paddingBottom: 8,
  },
  backBtn: { fontSize: 16, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 15, fontWeight: '500' },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  meetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 8,
    letterSpacing: -0.3,
  },
  tabBar: { flexGrow: 0, paddingLeft: 20 },
  tabBarContent: { paddingRight: 20, gap: 8, paddingBottom: 12 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabContent: { padding: 20, gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  shareBtn: { fontSize: 14, fontWeight: '500' },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22 },
  topicCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 0,
  },
  topicAccent: { width: 3 },
  topicContent: { flex: 1, padding: 14, gap: 8 },
  topicTitle: { fontSize: 15, fontWeight: '600' },
  speakerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  utterance: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, gap: 4 },
  utteranceSpeaker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  utteranceText: { fontSize: 14, lineHeight: 21 },
});

export default MeetingDetailScreen;
