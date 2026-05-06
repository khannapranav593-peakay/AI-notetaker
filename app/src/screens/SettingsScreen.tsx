import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, Switch,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { THEMES } from '../theme/colors';
import { ThemeName } from '../types';
import { saveAssemblyKey } from '../services/assemblyai';
import { saveGeminiKey } from '../services/gemini';
import { saveSupabaseCredentials, signOut } from '../services/supabase';

interface SettingsScreenProps {
  onBack: () => void;
  onSignOut: () => void;
}

const ASSEMBLY_KEY = 'assemblyai_api_key';
const GEMINI_KEY = 'gemini_api_key';
const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_ANON_KEY = 'supabase_anon_key';

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onSignOut }) => {
  const { theme, themeName, setTheme } = useTheme();
  const [assemblyKey, setAssemblyKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await SecureStore.getItemAsync(ASSEMBLY_KEY);
      const g = await SecureStore.getItemAsync(GEMINI_KEY);
      const su = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
      const sk = await SecureStore.getItemAsync(SUPABASE_ANON_KEY);
      if (a) setAssemblyKey(a);
      if (g) setGeminiKey(g);
      if (su) setSupabaseUrl(su);
      if (sk) setSupabaseKey(sk);
    })();
  }, []);

  const handleSave = async () => {
    try {
      await saveAssemblyKey(assemblyKey.trim());
      await saveGeminiKey(geminiKey.trim());
      if (supabaseUrl.trim() && supabaseKey.trim()) {
        await saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          onSignOut();
        },
      },
    ]);
  };

  const renderInput = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string,
    hint?: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.textTertiary }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint && <Text style={[styles.hint, { color: theme.textTertiary }]}>{hint}</Text>}
    </View>
  );

  const themeNames: ThemeName[] = ['ocean', 'mint', 'lavender', 'graphite'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backBtn, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* API Keys section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>API Keys</Text>

          {renderInput('AssemblyAI API Key', assemblyKey, setAssemblyKey,
            'sk-xxxx', 'Get from assemblyai.com → Settings → API Keys')}
          {renderInput('Gemini API Key', geminiKey, setGeminiKey,
            'AIza-xxxx', 'Get from aistudio.google.com')}
          {renderInput('Supabase URL', supabaseUrl, setSupabaseUrl,
            'https://xxxx.supabase.co', '')}
          {renderInput('Supabase Anon Key', supabaseKey, setSupabaseKey,
            'eyJhbGci...', 'Project Settings → API → anon key')}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saved ? theme.success : theme.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Keys'}</Text>
          </TouchableOpacity>
        </View>

        {/* Color Theme section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Color Theme</Text>
          <View style={styles.themeGrid}>
            {themeNames.map((name) => {
              const palette = THEMES[name];
              const isSelected = themeName === name;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => setTheme(name)}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: isSelected ? palette.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.themeSwatches}>
                    <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: palette.accent }]} />
                    <View style={[styles.swatch, { backgroundColor: palette.background }]} />
                  </View>
                  <Text style={[styles.themeLabel, { color: isSelected ? palette.primary : theme.text }]}>
                    {palette.label}
                  </Text>
                  {isSelected && <Text style={[styles.check, { color: palette.primary }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: theme.error + '44' }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutText, { color: theme.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: theme.textTertiary }]}>
          AI Notetaker v1.0.0
        </Text>
      </ScrollView>
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
  backBtn: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  hint: { fontSize: 11, lineHeight: 16 },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    alignItems: 'center',
  },
  themeSwatches: { flexDirection: 'row', gap: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  themeLabel: { fontSize: 13, fontWeight: '600' },
  check: { fontSize: 16, position: 'absolute', top: 8, right: 10 },
  signOutBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});

export default SettingsScreen;
