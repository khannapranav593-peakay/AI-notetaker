// ─── Meeting Status ──────────────────────────────────────────────────────────
export type MeetingStatus =
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'processing'
  | 'completed'
  | 'error';

// ─── Speaker ─────────────────────────────────────────────────────────────────
export interface Speaker {
  id: string;
  meeting_id: string;
  label: string; // "A", "B", "C"
  display_name: string; // user-editable, e.g. "John Doe"
  color: string;
}

// ─── Utterance ────────────────────────────────────────────────────────────────
export interface Utterance {
  speaker: string; // "A", "B", "C"
  text: string;
  start: number; // ms
  end: number; // ms
}

// ─── Meeting ──────────────────────────────────────────────────────────────────
export interface Meeting {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  duration_seconds: number;
  status: MeetingStatus;
  error_message?: string;
  audio_storage_path?: string;
  assembly_transcript_id?: string;
}

// ─── Transcript ───────────────────────────────────────────────────────────────
export interface Transcript {
  id: string;
  meeting_id: string;
  full_text: string;
  utterances: Utterance[];
}

// ─── Topic Section ────────────────────────────────────────────────────────────
export interface TopicSection {
  title: string;
  points: string[];
}

// ─── Action Item ──────────────────────────────────────────────────────────────
export interface ActionItem {
  id: string;
  owner: string;
  description: string;
  completed: boolean;
}

// ─── Meeting Insights ─────────────────────────────────────────────────────────
export interface MeetingInsights {
  id: string;
  meeting_id: string;
  summary: string;
  notes: string[]; // bullet points
  topics: TopicSection[];
  actionables: ActionItem[];
}

// ─── Color Theme ─────────────────────────────────────────────────────────────
export type ThemeName = 'ocean' | 'mint' | 'lavender' | 'graphite';

export interface ColorPalette {
  name: ThemeName;
  label: string;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  cardGradientStart: string;
  cardGradientEnd: string;
}

// ─── AssemblyAI Response types ────────────────────────────────────────────────
export interface AssemblyUploadResponse {
  upload_url: string;
}

export interface AssemblyTranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  utterances?: AssemblyUtterance[];
  error?: string;
}

export interface AssemblyUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: AssemblyWord[];
}

export interface AssemblyWord {
  text: string;
  start: number;
  end: number;
  speaker: string;
  confidence: number;
}

// ─── Gemini Structured Responses ─────────────────────────────────────────────
export interface GeminiNotesResponse {
  notes: string[];
}

export interface GeminiTopicsResponse {
  topics: TopicSection[];
}

export interface GeminiActionablesResponse {
  actionables: Array<{
    owner: string;
    description: string;
  }>;
}
