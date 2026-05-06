import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  meteringLevel: number; // 0..1 normalized
  uri: string | null;
  error: string | null;
}

const INITIAL_STATE: RecordingState = {
  isRecording: false,
  isPaused: false,
  durationMs: 0,
  meteringLevel: 0,
  uri: null,
  error: null,
};

export const useRecording = () => {
  const [state, setState] = useState<RecordingState>(INITIAL_STATE);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedMs = useRef<number>(0);

  const requestPermission = async (): Promise<boolean> => {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  };

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState((s) => ({
          ...s,
          error: 'Microphone permission denied',
        }));
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ios: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          },
          android: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
          },
        },
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            // Metering is in dBFS (-160 to 0). Normalize to 0..1
            const normalized = Math.max(0, (status.metering + 60) / 60);
            setState((s) => ({ ...s, meteringLevel: normalized }));
          }
        },
        50 // update every 50ms for smooth waveform
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      accumulatedMs.current = 0;

      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          durationMs: accumulatedMs.current + (Date.now() - startTimeRef.current),
        }));
      }, 1000);

      setState({ ...INITIAL_STATE, isRecording: true });
      return true;
    } catch (e: any) {
      setState((s) => ({ ...s, error: e.message }));
      return false;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      accumulatedMs.current += Date.now() - startTimeRef.current;
      if (timerRef.current) clearInterval(timerRef.current);
      setState((s) => ({ ...s, isPaused: true, meteringLevel: 0 }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e.message }));
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          durationMs: accumulatedMs.current + (Date.now() - startTimeRef.current),
        }));
      }, 1000);
      setState((s) => ({ ...s, isPaused: false }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e.message }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      setState((s) => ({
        ...s,
        isRecording: false,
        isPaused: false,
        uri,
        meteringLevel: 0,
      }));
      return uri ?? null;
    } catch (e: any) {
      setState((s) => ({ ...s, error: e.message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recordingRef.current = null;
    accumulatedMs.current = 0;
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
  };
};
