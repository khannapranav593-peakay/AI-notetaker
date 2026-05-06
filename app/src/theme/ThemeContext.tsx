import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, ThemeName } from '../types';
import { THEMES } from './colors';

const THEME_KEY = '@ai_notetaker_theme';

interface ThemeContextValue {
  theme: ColorPalette;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.ocean,
  themeName: 'ocean',
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('ocean');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored && stored in THEMES) {
        setThemeName(stored as ThemeName);
      }
    });
  }, []);

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem(THEME_KEY, name);
  };

  return (
    <ThemeContext.Provider
      value={{ theme: THEMES[themeName], themeName, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
