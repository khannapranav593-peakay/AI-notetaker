import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRecording } from '../hooks/useRecording';
import AudioWaveform from '../components/AudioWaveform';
import { createMeeting, updateMeeting, getCurrentUser, uploadAudioToStorage } from '../services/supabase';
import { uploadAudioToAssembly, submitTranscription } from '../services/assemblyai';
import { processPendingMeetings } from '../background/processingTask';

interface RecordingScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

const pad = (n: number) => n.toString().padStart(2, '0');
const formatTimer = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

const RecordingScreen: React.FC<RecordingScreenProps> = ({ onDone, onCancel }) => {
  const { theme } = useTheme();
  const { state, startRecording, pauseRecording, resumeRecording, stopRecording, reset } = useRecording();
  const [phase, setPhase] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const meetingIdRef = useRef<string | null>(null);

  useEffect(() => {
    handleStart();
  }, []);

  const handleStart = async () => {
    const ok = await startRecording();
    if (ok) setPhase('recording');
  };

  const handleStop = async () => {
    const fileUri = await stopRecording();
    if (!fileUri) { Alert.alert('Error', 'Recording failed.'); return; }
    setTitleModalVisible(true);
  };

  const handleSubmit = async (title: string) => {
    setTitleModalVisible(false);
    setPhase('uploading');
    try {
      const user = await getCurrentUser();
      const durationSec = Math.floor(state.durationMs / 1000);
      const meeting = await createMeeting(title || `Meeting — ${new Date().toLocaleDateString()}`);
      meetingIdRef.current = meeting.id;

      await updateMeeting(meeting.id, { status: 'uploading', duration_seconds: durationSec });

      // Upload to Supabase Storage first
      const storagePath = await uploadAudioToStorage(user!.id, meeting.id, state.uri!);
      await updateMeeting(meeting.id, { audio_storage_path: storagePath, status: 'transcribing' });

      // Upload to AssemblyAI and submit
      const audioUrl = await uploadAudioToAssembly(state.uri!);
      const transcriptId = await submitTranscription(audioUrl);
      await updateMeeting(meeting.id, { assembly_transcript_id: transcriptId, status: 'transcribing' });

      // Kick off background processing
      processPendingMeetings().catch(() => {});

      setPhase('done');
      onDone();
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
      setPhase('idle');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (state.isRecording) {
            Alert.alert('Cancel Recording', 'Stop and discard this recording?', [
              { text: 'Keep Recording', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: () => { reset(); onCancel(); } },
            ]);
          } else { onCancel(); }
        }}>
          <Text style={[styles.cancelBtn, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Recording</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Waveform area */}
      <View style={styles.waveformArea}>
        <AudioWaveform
          isActive={state.isRecording && !state.isPaused}
          meteringLevel={state.meteringLevel}
          height={80}
        />
      </View>

      {/* Timer */}
      <View style={styles.timerArea}>
        <View style={[styles.recordDot, { backgroundColor: state.isRecording && !state.isPaused ? theme.error : theme.textTertiary }]} />
        <Text style={[styles.timer, { color: theme.text }]}>
          {formatTimer(state.durationMs)}
        </Text>
      </View>

      {phase === 'uploading' && (
        <Text style={[styles.uploadLabel, { color: theme.primary }]}>
          Uploading and submitting for transcription…
        </Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Pause/Resume */}
        {state.isRecording && (
          <TouchableOpacity
            onPress={state.isPaused ? resumeRecording : pauseRecording}
            style={[styles.secondaryBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
              {state.isPaused ? '▶ Resume' : '⏸ Pause'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Stop */}
        {state.isRecording && (
          <TouchableOpacity
            onPress={handleStop}
            style={[styles.stopBtn, { backgroundColor: theme.error }]}
            activeOpacity={0.85}
          >
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        )}
      </View>

      {/* Title modal */}
      <Modal visible={titleModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Name this meeting</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              placeholder="e.g. Weekly Standup"
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              onPress={() => handleSubmit(meetingTitle)}
            >
              <Text style={styles.modalBtnText}>Process Meeting →</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  cancelBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  waveformArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  timerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  timer: { fontSize: 52, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  uploadLabel: { textAlign: 'center', fontSize: 14, paddingBottom: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: 48 },
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  stopSquare: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#FFFFFF' },
  secondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 28,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16 },
  modalBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default RecordingScreen;
