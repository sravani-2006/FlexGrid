import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import * as Haptics from 'expo-haptics';

const VolunteerLoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { colors, typography } = useTheme();
  const { showToast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signInWithGoogle('volunteer');
      showToast('Redirecting to Google...', 'info');
    } catch (e) {
      showToast(e.message || 'Google Sign-In failed', 'error');
    }
  };

  const handleSubmit = async () => {
    await Haptics.selectionAsync();

    // Basic Validation
    if (!email || !password || (mode === 'signup' && (!name || !confirmPassword))) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
         await signUp(email, password, name, 'volunteer');
         showToast('Account created successfully! Check your email to confirm.', 'success');
      } else {
         await signIn(email, password, 'volunteer');
         showToast('Signed in successfully', 'success');
      }
    } catch (error) {
       console.log('[VolunteerLogin] Error:', error.message);
       showToast(error.message, 'error');
    } finally {
       setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.glowTop, { backgroundColor: colors.glowA }]} />
      <View style={[styles.glowBottom, { backgroundColor: colors.glowB }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardWrap}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.muted} />
          </TouchableOpacity>
          <Text style={[styles.brand, { color: colors.text, fontFamily: typography.heading }]}>FixGrid</Text>
          <View style={styles.topSpacer} />
        </View>

        <Text style={[styles.label, { color: colors.primary, fontFamily: typography.label }]}>Volunteer Portal</Text>
        <Text style={[styles.heading, { color: colors.text, fontFamily: typography.display }]}>Start Your Mission</Text>
        <Text style={[styles.subheading, { color: colors.muted, fontFamily: typography.body }]}>Join forces to solve issues and earn specialized rewards.</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <TouchableOpacity 
            style={[styles.oauthBtn, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]} 
            onPress={handleGoogleSignIn}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.oauthText, { color: '#000', fontFamily: typography.label }]}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted, fontFamily: typography.label }]}>OR EMAIL</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.switchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'signup' && styles.switchBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.switchText, { color: colors.muted, fontFamily: typography.label }, mode === 'signup' && { color: colors.text }]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'signin' && styles.switchBtnActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.switchText, { color: colors.muted, fontFamily: typography.label }, mode === 'signin' && { color: colors.text }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' ? (
            <>
              <Text style={[styles.inputLabel, { color: colors.muted, fontFamily: typography.label }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: typography.body }]}
                placeholder="Volunteer Name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </>
          ) : null}

          <Text style={[styles.inputLabel, { color: colors.muted, fontFamily: typography.label }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: typography.body }]}
            placeholder="volunteer@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Text style={[styles.inputLabel, { color: colors.muted, fontFamily: typography.label }]}>Password</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputControl, { color: colors.text, fontFamily: typography.body }]}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {mode === 'signup' ? (
            <>
              <Text style={[styles.inputLabel, { color: colors.muted, fontFamily: typography.label }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: typography.body }]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </>
          ) : null}

          <TouchableOpacity 
             style={[styles.submitBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} 
             onPress={handleSubmit}
             disabled={loading}
          >
            <Text style={[styles.submitText, { fontFamily: typography.heading }]}>
              {loading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            </Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity onPress={() => navigation.navigate('CitizenLogin')}>
          <Text style={[styles.adminLink, { color: colors.primary, fontFamily: typography.label }]}>Switch to Citizen Portal</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardWrap: { flex: 1 },
  glowTop: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -70 },
  glowBottom: { position: 'absolute', width: 200, height: 200, borderRadius: 100, left: -70, bottom: 90 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { fontSize: 20, fontWeight: '800' },
  topSpacer: { width: 24 },
  label: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  heading: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  subheading: { fontSize: 14, color: '#64748B', marginTop: 10, marginBottom: 20 },
  card: { borderRadius: 24, padding: 20, borderWidth: 1 },
  oauthBtn: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  oauthText: { fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  switchWrap: { borderWidth: 1, borderRadius: 999, padding: 4, flexDirection: 'row', marginBottom: 18 },
  switchBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 999 },
  switchBtnActive: { backgroundColor: '#FFFFFF' },
  switchText: { fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8, marginTop: 10 },
  input: { borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 14, marginBottom: 12 },
  inputRow: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center' },
  inputControl: { flex: 1, fontSize: 14 },
  submitBtn: { borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  adminLink: { textAlign: 'center', fontSize: 14, marginTop: 30, fontWeight: '600' },
});

export default VolunteerLoginScreen;
