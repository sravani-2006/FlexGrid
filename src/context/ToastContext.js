import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const { colors, typography } = useTheme();
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success');
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const showToast = (text, toastType = 'success') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(text);
    setType(toastType);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2200);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          type === 'error' ? styles.error : { backgroundColor: colors.text },
          {
            opacity,
            transform: [{ translateY }],
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.toastText, { fontFamily: typography.label }]}>{message}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    zIndex: 999,
    elevation: 8,
  },
  success: {
    backgroundColor: '#047857',
  },
  error: {
    backgroundColor: '#B91C1C',
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
