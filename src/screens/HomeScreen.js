import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const HomeScreen = ({ navigation }) => {
  const { colors, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.circleDeco, { backgroundColor: 'rgba(0,0,0,0.03)' }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="grid" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.heading }]}>FixGrid</Text>
          <Text style={[styles.subtitle, { color: colors.primary, fontFamily: typography.label }]}>PROACTIVE COMMUNITY SERVICE</Text>
          
          <Text style={[styles.description, { color: colors.muted, fontFamily: typography.body }]}>
            The all-in-one platform for Citizens to report issues and Volunteer Students to resolve them for rewards.
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 12 }]}
            onPress={() => navigation.navigate('CitizenLogin')}
          >
            <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.btnTitle, { color: '#FFFFFF', fontFamily: typography.heading }]}>
              Citizen Portal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2 }]}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Ionicons name="school-outline" size={20} color={colors.primary} />
            <Text style={[styles.btnTitle, { color: colors.primary, fontFamily: typography.heading }]}>
              Volunteer Portal
            </Text>
          </TouchableOpacity>

          <Text style={[styles.secureText, { color: colors.muted, fontFamily: typography.body }]}>
            Secure Sign-In with Google
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', overflow: 'hidden' },
  circleDeco: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -120,
    right: -140,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 120 },
  logoWrap: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  title: { fontSize: 44, fontWeight: '900', letterSpacing: -1.5 },
  subtitle: { fontSize: 13, marginTop: 12, textAlign: 'center', letterSpacing: 1.5, fontWeight: '700' },
  description: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 12,
  },
  bottomSection: { width: '100%', alignItems: 'center' },
  button: {
    width: '100%',
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnTitle: { fontSize: 18, fontWeight: '700' },
  secureText: { fontSize: 13, marginTop: 16, fontWeight: '500' },
});

export default HomeScreen;