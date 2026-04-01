import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const lightColors = {
  background: '#ECE9E1',
  card: '#F4F1EA',
  text: '#1F1F1D',
  muted: '#756C60',
  border: '#DCD6CB',
  primary: '#4F5D33',
  accent: '#B86D2D',
  glowA: 'rgba(184,109,45,0.16)',
  glowB: 'rgba(79,93,51,0.12)',
};

const darkColors = {
  background: '#1A1916',
  card: '#25231F',
  text: '#F2EFE8',
  muted: '#B6ADA0',
  border: '#3B372F',
  primary: '#8E9A63',
  accent: '#D08A4A',
  glowA: 'rgba(208,138,74,0.2)',
  glowB: 'rgba(142,154,99,0.16)',
};

const typography = {
  display: 'SpaceGrotesk_500Medium',
  heading: 'SpaceGrotesk_500Medium',
  body: 'SpaceGrotesk_500Medium',
  label: 'SpaceGrotesk_500Medium',
  mono: 'SpaceGrotesk_500Medium',
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@fixgrid_theme');
        if (storedTheme !== null) {
          setIsDark(storedTheme === 'dark');
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      await AsyncStorage.setItem('@fixgrid_theme', nextTheme ? 'dark' : 'light');
    } catch (e) {}
  };

  const setTheme = async (dark) => {
    try {
      setIsDark(Boolean(dark));
      await AsyncStorage.setItem('@fixgrid_theme', dark ? 'dark' : 'light');
    } catch (e) {}
  };

  const value = useMemo(
    () => ({
      isDark,
      toggleTheme,
      setTheme,
      colors: isDark ? darkColors : lightColors,
      typography,
    }),
    [isDark]
  );
  
  if (!isLoaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
