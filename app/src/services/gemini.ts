import * as SecureStore from 'expo-secure-store';
import { ActionItem, TopicSection } from '../types';

const GEMINI_KEY_STORE = 'gemini_api_key';
const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Key management ───────────────────────────────────────────────────────────
export const saveGeminiKey = async (key: string) =>
  SecureStore.setItemAsync(GEMINI_KEY_STORE, key);

export const getGeminiKey = async (): Promise<string> => {
  const key = await SecureStore.getItemAsync(GEMINI_KEY_STORE);
  if (!key) throw new Error('Gemini API key not configured. Go to Settings.');
  return key;
};

// ─── Core request helper ──────────────────────────────────────────────────────
const geminiRequest = async (prompt: string): Promise<string> => {
  const key = await getGeminiKey();
  const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
};

// ─── Safe JSON parser ─────────────────────────────────────────────────────────
const parseJsonSafe = <T>(text: string, fallback: T): T => {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn('Gemini JSON parse failed:', text);
    return fallback;
  }
};

// ─── 1. Meeting Summary ───────────────────────────────────────────────────────
export const generateSummary = async (transcript: string): Promise<string> => {
  const prompt = `You are an expert meeting analyst. Given the following meeting transcript, write a clear, concise summary of 3–5 sentences covering the main purpose, key decisions, and overall outcome of the meeting.

TRANSCRIPT:
${transcript}

OUTPUT: Plain text only. No bullet points. No markdown.`;

  return geminiRequest(prompt);
};

// ─── 2. Meeting Notes ─────────────────────────────────────────────────────────
export const generateNotes = async (transcript: string): Promise<string[]> => {
  const prompt = `You are an expert meeting analyst. Given the following meeting transcript, generate structured meeting notes as a JSON array of bullet point strings. Each bullet should capture an important point, decision, or piece of information from the meeting.

TRANSCRIPT:
${transcript}

OUTPUT: Valid JSON array of strings only. Example: ["Point 1", "Point 2", "Point 3"]
Do NOT include any other text or markdown.`;

  const raw = await geminiRequest(prompt);
  return parseJsonSafe<string[]>(raw, []);
};

// ─── 3. Topic-wise Discussion Summary ────────────────────────────────────────
export const generateTopics = async (
  transcript: string
): Promise<TopicSection[]> => {
  const prompt = `You are an expert meeting analyst. Analyze the following meeting transcript and identify distinct topics discussed. For each topic, provide a title and 2–4 key discussion points.

TRANSCRIPT:
${transcript}

OUTPUT: Valid JSON array matching this schema:
[
  {
    "title": "Topic Title",
    "points": ["Discussion point 1", "Discussion point 2"]
  }
]
Do NOT include any other text or markdown.`;

  const raw = await geminiRequest(prompt);
  return parseJsonSafe<TopicSection[]>(raw, []);
};

// ─── 4. Key Actionables ───────────────────────────────────────────────────────
export const generateActionables = async (
  transcript: string
): Promise<ActionItem[]> => {
  const prompt = `You are an expert meeting analyst. Extract all action items, tasks, and responsibilities from the following meeting transcript. For each, identify who is responsible (use "Unassigned" if unclear) and what they need to do.

TRANSCRIPT:
${transcript}

OUTPUT: Valid JSON array matching this schema:
[
  {
    "owner": "Person Name or Unassigned",
    "description": "Clear description of the action item"
  }
]
Do NOT include any other text or markdown.`;

  const raw = await geminiRequest(prompt);
  const items = parseJsonSafe<Array<{ owner: string; description: string }>>(
    raw,
    []
  );

  return items.map((item, index) => ({
    id: `action_${index}_${Date.now()}`,
    owner: item.owner || 'Unassigned',
    description: item.description,
    completed: false,
  }));
};

// ─── Generate all insights in parallel ───────────────────────────────────────
export const generateAllInsights = async (transcript: string) => {
  const [summary, notes, topics, actionables] = await Promise.all([
    generateSummary(transcript),
    generateNotes(transcript),
    generateTopics(transcript),
    generateActionables(transcript),
  ]);

  return { summary, notes, topics, actionables };
};
