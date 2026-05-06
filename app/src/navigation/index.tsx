import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import RecordingScreen from '../screens/RecordingScreen';
import MeetingDetailScreen from '../screens/MeetingDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { getCurrentUser, hasSupabaseCredentials } from '../services/supabase';
import {
  registerBackgroundProcessing,
  requestNotificationPermission,
} from '../background/processingTask';
import { Meeting } from '../types';

type Screen =
  | { name: 'loading' }
  | { name: 'auth' }
  | { name: 'home' }
  | { name: 'recording' }
  | { name: 'detail'; meetingId: string }
  | { name: 'settings' };

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const hasCreds = await hasSupabaseCredentials();
      if (!hasCreds) {
        setScreen({ name: 'auth' });
        return;
      }
      const user = await getCurrentUser();
      if (!user) {
        setScreen({ name: 'auth' });
        return;
      }
      // Register background tasks
      await requestNotificationPermission();
      await registerBackgroundProcessing();
      setScreen({ name: 'home' });
    } catch {
      setScreen({ name: 'auth' });
    }
  };

  const handleAuthenticated = async () => {
    await requestNotificationPermission();
    await registerBackgroundProcessing();
    setScreen({ name: 'home' });
  };

  if (screen.name === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (screen.name === 'auth') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (screen.name === 'home') {
    return (
      <HomeScreen
        onMeetingPress={(meeting: Meeting) =>
          setScreen({ name: 'detail', meetingId: meeting.id })
        }
        onStartRecording={() => setScreen({ name: 'recording' })}
        onOpenSettings={() => setScreen({ name: 'settings' })}
      />
    );
  }

  if (screen.name === 'recording') {
    return (
      <RecordingScreen
        onDone={() => setScreen({ name: 'home' })}
        onCancel={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'detail') {
    return (
      <MeetingDetailScreen
        meetingId={screen.meetingId}
        onBack={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setScreen({ name: 'home' })}
        onSignOut={() => setScreen({ name: 'auth' })}
      />
    );
  }

  return null;
};
