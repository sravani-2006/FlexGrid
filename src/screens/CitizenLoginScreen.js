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

const CitizenLoginScreen = ({ navigation }) => {
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
      await signInWithGoogle('citizen');
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
         await signUp(email, password, name, 'citizen');
         showToast('Account created successfully! Check your email to confirm.', 'success');
         // If Supabase is set to auto-confirm, they are logged in automatically via AuthContext listener
      } else {
         await signIn(email, password, 'citizen');
         showToast('Signed in successfully', 'success');
      }
    } catch (error) {
       console.log('[CitizenLogin] Error:', error.message);
       showToast(error.message, 'error');
    } finally {
       setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.glowTop, { backgroundColor: colors.glowB }]} />
      <View style={[styles.glowBottom, { backgroundColor: colors.glowA }]} />
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

        <Text style={[styles.label, { color: colors.primary, fontFamily: typography.label }]}>Citizen Portal</Text>
        <Text style={[styles.heading, { color: colors.text, fontFamily: typography.display }]}>Join Your Local Issue Network</Text>
        <Text style={[styles.subheading, { color: colors.muted, fontFamily: typography.body }]}>Report faster, track updates clearly, and collaborate with your community.</Text>

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
                placeholder="Citizen Name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </>
          ) : null}

          <Text style={[styles.inputLabel, { color: colors.muted, fontFamily: typography.label }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: typography.body }]}
            placeholder="name@example.com"
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

        <TouchableOpacity onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={[styles.adminLink, { color: colors.primary, fontFamily: typography.label }]}>Switch to Volunteer Portal</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardWrap: { flex: 1 },
  glowTop: { position: 'absolute', width: 220, height: 220, borderRadius: 130, right: -80, top: -70 },
  glowBottom: { position: 'absolute', width: 200, height: 200, borderRadius: 120, left: -70, bottom: 90 },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  brand: { fontSize: 19 },
  topSpacer: { width: 24 },
  label: { marginTop: 8, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  heading: { marginTop: 4, fontSize: 42, lineHeight: 46, maxWidth: 330 },
  subheading: { marginTop: 8, fontSize: 14, lineHeight: 22, marginBottom: 16 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1 },
  oauthBtn: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  oauthText: { fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  switchWrap: { borderWidth: 1, borderRadius: 999, padding: 4, flexDirection: 'row', marginBottom: 18 },
  switchBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 999 },
  switchBtnActive: { backgroundColor: '#FFFFFF' },
  switchText: { fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 8, marginTop: 10 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  inputRow: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center' },
  inputControl: { flex: 1, fontSize: 14 },
  submitBtn: { marginTop: 18, borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 5 },
  submitText: { color: '#FFFFFF', fontSize: 18 },
  adminLink: { textAlign: 'center', fontSize: 14, marginTop: 20 },
});

export default CitizenLoginScreen;
