import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getMeetings, getSupabaseClient } from '../services/supabase';
import { Meeting } from '../types';

export const useMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMeetings();
      setMeetings(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to Supabase Realtime for live status updates
  const subscribeToRealtime = useCallback(async () => {
    try {
      const client = await getSupabaseClient();
      const channel = client
        .channel('meetings_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meetings' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMeetings((prev) => [payload.new as Meeting, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setMeetings((prev) =>
                prev.map((m) =>
                  m.id === (payload.new as Meeting).id
                    ? (payload.new as Meeting)
                    : m
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setMeetings((prev) =>
                prev.filter((m) => m.id !== (payload.old as Meeting).id)
              );
            }
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;
    } catch {
      // Realtime not available — polling fallback
    }
  }, []);

  useEffect(() => {
    loadMeetings();
    subscribeToRealtime();

    // Refresh on app foreground
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') loadMeetings();
      }
    );

    return () => {
      subscription.remove();
      realtimeChannelRef.current?.unsubscribe();
    };
  }, [loadMeetings, subscribeToRealtime]);

  return { meetings, loading, error, refresh: loadMeetings };
};
