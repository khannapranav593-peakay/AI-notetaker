import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import {
  AssemblyTranscriptResponse,
  AssemblyUploadResponse,
  Utterance,
} from '../types';

const ASSEMBLY_KEY_STORE = 'assemblyai_api_key';
const BASE_URL = 'https://api.assemblyai.com';

// ─── Key management ───────────────────────────────────────────────────────────
export const saveAssemblyKey = async (key: string) =>
  SecureStore.setItemAsync(ASSEMBLY_KEY_STORE, key);

export const getAssemblyKey = async (): Promise<string> => {
  const key = await SecureStore.getItemAsync(ASSEMBLY_KEY_STORE);
  if (!key) throw new Error('AssemblyAI API key not configured. Go to Settings.');
  return key;
};

const headers = async () => ({
  Authorization: await getAssemblyKey(),
  'Content-Type': 'application/json',
});

// ─── Upload audio directly to AssemblyAI ─────────────────────────────────────
/**
 * Uploads a local file to AssemblyAI's CDN and returns the hosted audio_url.
 * Uses fetch with blob upload for React Native compatibility.
 */
export const uploadAudioToAssembly = async (
  fileUri: string,
  onProgress?: (pct: number) => void
): Promise<string> => {
  const key = await getAssemblyKey();

  // Read as base64 then convert to blob
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('Audio file not found');

  const fileBlob = await fetch(fileUri).then((r) => r.blob());

  const response = await fetch(`${BASE_URL}/v1/upload`, {
    method: 'POST',
    headers: {
      Authorization: key,
      'Content-Type': 'application/octet-stream',
      'Transfer-Encoding': 'chunked',
    },
    body: fileBlob,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI upload failed: ${err}`);
  }

  const data: AssemblyUploadResponse = await response.json();
  return data.upload_url;
};

// ─── Submit transcription job ─────────────────────────────────────────────────
export const submitTranscription = async (audioUrl: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/v2/transcript`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speakers_expected: null, // auto-detect
      punctuate: true,
      format_text: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI transcript submit failed: ${err}`);
  }

  const data: AssemblyTranscriptResponse = await response.json();
  return data.id;
};

// ─── Poll transcription status ────────────────────────────────────────────────
export const pollTranscription = async (
  transcriptId: string
): Promise<AssemblyTranscriptResponse> => {
  const response = await fetch(`${BASE_URL}/v2/transcript/${transcriptId}`, {
    headers: await headers(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI poll failed: ${err}`);
  }

  return response.json();
};

// ─── Wait for completion (used in background task) ────────────────────────────
export const waitForTranscription = async (
  transcriptId: string,
  onStatus?: (status: string) => void,
  maxAttempts = 180 // 30 minutes max
): Promise<AssemblyTranscriptResponse> => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await pollTranscription(transcriptId);
    onStatus?.(result.status);

    if (result.status === 'completed') return result;
    if (result.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${result.error}`);
    }

    // Wait 10 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error('Transcription timed out after 30 minutes');
};

// ─── Parse utterances from AssemblyAI response ───────────────────────────────
export const parseUtterances = (
  response: AssemblyTranscriptResponse
): Utterance[] => {
  if (!response.utterances) return [];
  return response.utterances.map((u) => ({
    speaker: u.speaker,
    text: u.text,
    start: u.start,
    end: u.end,
  }));
};

// ─── Extract unique speaker labels ───────────────────────────────────────────
export const extractSpeakerLabels = (utterances: Utterance[]): string[] => {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const u of utterances) {
    if (!seen.has(u.speaker)) {
      seen.add(u.speaker);
      labels.push(u.speaker);
    }
  }
  return labels.sort();
};

// ─── Format transcript as readable text ──────────────────────────────────────
export const formatTranscriptText = (utterances: Utterance[]): string => {
  return utterances
    .map((u) => `[Speaker ${u.speaker}]: ${u.text}`)
    .join('\n\n');
};
