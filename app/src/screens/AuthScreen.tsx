import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { saveSupabaseCredentials, signIn, signUp } from '../services/supabase';
import * as SecureStore from 'expo-secure-store';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup' | 'setup'>('setup');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetupSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      Alert.alert('Missing Fields', 'Please enter your Supabase URL and anon key.');
      return;
    }
    setLoading(true);
    try {
      await saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
      setMode('login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password.trim());
      } else {
        await signUp(email.trim(), password.trim());
        Alert.alert('Account Created', 'Check your email to confirm your account, then sign in.');
        setMode('login');
        setLoading(false);
        return;
      }
      onAuthenticated();
    } catch (e: any) {
      Alert.alert('Authentication Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoEmoji}>🎙️</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>AI Notetaker</Text>
          <Text style={[styles.tagline, { color: theme.textTertiary }]}>
            Smart meeting intelligence
          </Text>
        </View>

        {/* Form card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
          ]}
        >
          {mode === 'setup' ? (
            <>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Connect Supabase
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>
                Your data is stored in your own Supabase project
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://xxx.supabase.co"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={supabaseKey}
                onChangeText={setSupabaseKey}
                placeholder="anon / public key"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleSetupSupabase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Continue →</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
                style={styles.switchMode}
              >
                <Text style={[styles.switchText, { color: theme.primary }]}>
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('setup')}
                style={styles.switchMode}
              >
                <Text style={[styles.switchText, { color: theme.textTertiary }]}>
                  ← Change Supabase connection
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 32,
  },
  logoArea: {
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 13,
  },
});

export default AuthScreen;
