import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_ANON_KEY = 'supabase_anon_key';

// ─── Lazy Supabase client ─────────────────────────────────────────────────────
let _client: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = async () => {
  if (_client) return _client;
  const url = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
  const key = await SecureStore.getItemAsync(SUPABASE_ANON_KEY);
  if (!url || !key) throw new Error('Supabase credentials not configured');
  _client = createClient(url, key);
  return _client;
};

export const resetSupabaseClient = () => {
  _client = null;
};

// ─── Credential management ────────────────────────────────────────────────────
export const saveSupabaseCredentials = async (url: string, key: string) => {
  await SecureStore.setItemAsync(SUPABASE_URL_KEY, url);
  await SecureStore.setItemAsync(SUPABASE_ANON_KEY, key);
  resetSupabaseClient();
};

export const hasSupabaseCredentials = async (): Promise<boolean> => {
  const url = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
  const key = await SecureStore.getItemAsync(SUPABASE_ANON_KEY);
  return !!(url && key);
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export const signIn = async (email: string, password: string) => {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const client = await getSupabaseClient();
  await client.auth.signOut();
};

export const getCurrentUser = async () => {
  const client = await getSupabaseClient();
  const { data } = await client.auth.getUser();
  return data.user;
};

// ─── Meeting CRUD ─────────────────────────────────────────────────────────────
import { Meeting, MeetingStatus, Transcript, Speaker, MeetingInsights } from '../types';

export const createMeeting = async (title: string): Promise<Meeting> => {
  const client = await getSupabaseClient();
  const user = await getCurrentUser();
  const { data, error } = await client
    .from('meetings')
    .insert({ title, user_id: user?.id, status: 'recording' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateMeeting = async (
  id: string,
  updates: Partial<Meeting>
): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client.from('meetings').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client.from('meetings').delete().eq('id', id);
  if (error) throw error;
};

export const getMeetings = async (): Promise<Meeting[]> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const getMeeting = async (id: string): Promise<Meeting | null> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
};

export const getPendingMeetings = async (): Promise<Meeting[]> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('meetings')
    .select('*')
    .in('status', ['uploading', 'transcribing', 'processing']);
  if (error) return [];
  return data ?? [];
};

// ─── Transcript CRUD ──────────────────────────────────────────────────────────
export const upsertTranscript = async (
  meetingId: string,
  fullText: string,
  utterances: any[]
): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client.from('transcripts').upsert({
    meeting_id: meetingId,
    full_text: fullText,
    utterances,
  });
  if (error) throw error;
};

export const getTranscript = async (meetingId: string): Promise<Transcript | null> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('transcripts')
    .select('*')
    .eq('meeting_id', meetingId)
    .single();
  if (error) return null;
  return data;
};

// ─── Speaker CRUD ─────────────────────────────────────────────────────────────
export const upsertSpeakers = async (
  meetingId: string,
  speakers: Omit<Speaker, 'id'>[]
): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client.from('speakers').upsert(
    speakers.map((s) => ({ ...s, meeting_id: meetingId })),
    { onConflict: 'meeting_id,label' }
  );
  if (error) throw error;
};

export const getSpeakers = async (meetingId: string): Promise<Speaker[]> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('speakers')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('label');
  if (error) return [];
  return data ?? [];
};

export const updateSpeakerName = async (
  speakerId: string,
  displayName: string
): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client
    .from('speakers')
    .update({ display_name: displayName })
    .eq('id', speakerId);
  if (error) throw error;
};

// ─── Insights CRUD ────────────────────────────────────────────────────────────
export const upsertInsights = async (
  meetingId: string,
  insights: Omit<MeetingInsights, 'id' | 'meeting_id'>
): Promise<void> => {
  const client = await getSupabaseClient();
  const { error } = await client.from('meeting_insights').upsert({
    meeting_id: meetingId,
    ...insights,
  });
  if (error) throw error;
};

export const getInsights = async (
  meetingId: string
): Promise<MeetingInsights | null> => {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('meeting_insights')
    .select('*')
    .eq('meeting_id', meetingId)
    .single();
  if (error) return null;
  return data;
};

// ─── Audio Storage ────────────────────────────────────────────────────────────
export const uploadAudioToStorage = async (
  userId: string,
  meetingId: string,
  fileUri: string
): Promise<string> => {
  const client = await getSupabaseClient();
  const path = `${userId}/${meetingId}/recording.m4a`;

  // Read file as ArrayBuffer
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await client.storage
    .from('recordings')
    .upload(path, blob, { contentType: 'audio/m4a', upsert: true });

  if (error) throw error;
  return path;
};

export const getAudioUrl = async (storagePath: string): Promise<string> => {
  const client = await getSupabaseClient();
  const { data } = await client.storage
    .from('recordings')
    .createSignedUrl(storagePath, 3600); // 1 hour signed URL
  if (!data?.signedUrl) throw new Error('Could not generate signed URL');
  return data.signedUrl;
};
