import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useSpaceGrotesk, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { AuthProvider } from './src/context/AuthContext';
import { VolunteerProvider } from './src/context/VolunteerContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  const { isDark, colors, typography } = useTheme();

  useEffect(() => {
    const existingTextDefaults = Text.defaultProps || {};
    const existingInputDefaults = TextInput.defaultProps || {};

    Text.defaultProps = {
      ...existingTextDefaults,
      style: [{ color: colors.text, fontFamily: typography.body }, existingTextDefaults.style],
    };

    TextInput.defaultProps = {
      ...existingInputDefaults,
      placeholderTextColor: colors.muted,
      selectionColor: colors.primary,
      style: [{ color: colors.text, fontFamily: typography.body }, existingInputDefaults.style],
    };
  }, [colors.muted, colors.primary, colors.text, typography.body]);

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};
import { supabase } from './src/lib/supabase';

export default function App() {
  const [spaceGroteskLoaded] = useSpaceGrotesk({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("EVENT:", event);
        console.log("SESSION:", session);

        if (session) {
          console.log("User logged in ✅");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };    
  }, []);

  if (!spaceGroteskLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECE9E1' }}>
        <ActivityIndicator size="large" color="#4F5D33" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <VolunteerProvider>
            <AppContent />
          </VolunteerProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
