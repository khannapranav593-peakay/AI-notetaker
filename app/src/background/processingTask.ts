import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import {
  getPendingMeetings,
  updateMeeting,
  upsertTranscript,
  upsertSpeakers,
  upsertInsights,
  getAudioUrl,
} from '../services/supabase';
import {
  pollTranscription,
  parseUtterances,
  extractSpeakerLabels,
  formatTranscriptText,
  submitTranscription,
} from '../services/assemblyai';
import { generateAllInsights } from '../services/gemini';
import { getSpeakerColor } from '../theme/colors';

export const PROCESSING_TASK_NAME = 'AI_NOTETAKER_PROCESSING';

// ─── Register background task definition ─────────────────────────────────────
TaskManager.defineTask(PROCESSING_TASK_NAME, async () => {
  try {
    await processPendingMeetings();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Register background fetch ────────────────────────────────────────────────
export const registerBackgroundProcessing = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(PROCESSING_TASK_NAME, {
      minimumInterval: 10, // 10 seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.log('Background fetch registration skipped:', e);
  }
};

// ─── Core processing loop ─────────────────────────────────────────────────────
export const processPendingMeetings = async () => {
  const pendingMeetings = await getPendingMeetings();
  if (pendingMeetings.length === 0) return;

  // Show notification
  await showProcessingNotification(pendingMeetings.length);

  const processingPromises = pendingMeetings.map((meeting) =>
    processSingleMeeting(meeting).catch((e) =>
      updateMeeting(meeting.id, {
        status: 'error',
        error_message: e.message,
      })
    )
  );

  await Promise.all(processingPromises);
  await dismissProcessingNotification();
};

// ─── Process one meeting ──────────────────────────────────────────────────────
const processSingleMeeting = async (meeting: any) => {
  // STEP 1: Already have assembly_transcript_id → poll status
  if (
    meeting.status === 'transcribing' &&
    meeting.assembly_transcript_id
  ) {
    const result = await pollTranscription(meeting.assembly_transcript_id);

    if (result.status === 'completed') {
      // Save transcript
      const utterances = parseUtterances(result);
      const fullText = result.text ?? formatTranscriptText(utterances);
      await upsertTranscript(meeting.id, fullText, utterances);

      // Save speakers
      const labels = extractSpeakerLabels(utterances);
      const speakers = labels.map((label, i) => ({
        meeting_id: meeting.id,
        label,
        display_name: `Speaker ${label}`,
        color: getSpeakerColor(i),
      }));
      await upsertSpeakers(meeting.id, speakers);

      // Move to processing phase
      await updateMeeting(meeting.id, { status: 'processing' });

      // Generate AI insights
      const insights = await generateAllInsights(fullText);
      await upsertInsights(meeting.id, insights);
      await updateMeeting(meeting.id, { status: 'completed' });
    } else if (result.status === 'error') {
      await updateMeeting(meeting.id, {
        status: 'error',
        error_message: result.error ?? 'Transcription failed',
      });
    }
    // If still processing, leave as-is until next background cycle
    return;
  }

  // STEP 2: Status is 'uploading' but no transcript id yet
  // (This shouldn't normally happen from background — uploading happens in foreground)
  // Skip and let foreground handle it
};

// ─── Notifications ────────────────────────────────────────────────────────────
const NOTIFICATION_ID = 'processing_notification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const showProcessingNotification = async (count: number) => {
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'AI Notetaker',
      body: `Processing ${count} meeting${count > 1 ? 's' : ''}…`,
      data: {},
    },
    trigger: null,
  });
};

const dismissProcessingNotification = async () => {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
};

export const requestNotificationPermission = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};
