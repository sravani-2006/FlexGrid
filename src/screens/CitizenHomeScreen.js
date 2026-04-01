import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useIssues } from '../hooks/useIssues';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const CitizenHomeScreen = ({ navigation }) => {
  const { colors, typography, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  const { issues, loading: issuesLoading, refresh } = useIssues();
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(6)].map(() => new Animated.Value(20))).current;

  useEffect(() => {
    // Staggered entry animation
    const animations = fadeAnims.map((fade, i) => 
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 500, delay: i * 100, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 500, delay: i * 100, useNativeDriver: true })
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  const myIssues = useMemo(() => {
    if (!user) return [];
    return issues.filter(i => i.user_id === user.id);
  }, [issues, user]);
  
  const resolvedCount = useMemo(() => myIssues.filter(i => i.status === 'resolved').length, [myIssues]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.selectionAsync();
    await refresh();
    setRefreshing(false);
    showToast('Dashboard updated');
  };

  const SectionHeader = ({ title, action, onAction }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: colors.primary, fontFamily: typography.label }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Dynamic Background Accents */}
      <View style={[styles.bgCircle, { backgroundColor: colors.primary + '10', top: -100, right: -100, width: 300, height: 300 }]} />
      <View style={[styles.bgCircle, { backgroundColor: colors.accent + '05', bottom: -50, left: -50, width: 200, height: 200 }]} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted, fontFamily: typography.body }]}>Good Morning,</Text>
            <Text style={[styles.username, { color: colors.text, fontFamily: typography.heading }]}>{profile?.full_name || 'Citizen Hero'}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}
            onPress={() => navigation.navigate('CitizenProfile')}
          >
            <View style={{ width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
              <Image 
                key={profile?.avatar_url}
                source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&q=80' }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Impact Row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
          <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
            <View style={styles.statIconBox}>
                <Ionicons name="megaphone" size={18} color="#1D4ED8" />
            </View>
            <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{myIssues.length}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            </View>
            <Text style={[styles.statValue, { color: '#15803D' }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FDF2F8' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="heart" size={18} color="#BE185D" />
            </View>
            <Text style={[styles.statValue, { color: '#BE185D' }]}>{resolvedCount * 50 + 10}</Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>
        </Animated.View>

        {/* Main Action Hub */}
        <Animated.View style={[styles.mainAction, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
            <TouchableOpacity 
                style={[styles.reportHero, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Report')}
                activeOpacity={0.9}
            >
                <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>Identify a problem?</Text>
                    <Text style={styles.heroSub}>Report it in 30 seconds and let the city fix it.</Text>
                    <View style={styles.heroBtn}>
                        <Text style={styles.heroBtnText}>Start Report</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                    </View>
                </View>
                <View style={styles.heroIconWrap}>
                    <MaterialCommunityIcons name="camera-iris" size={80} color="rgba(255,255,255,0.2)" />
                </View>
            </TouchableOpacity>
        </Animated.View>

        {/* Quick Links */}
        <Animated.View style={[styles.quickLinks, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
             <TouchableOpacity style={[styles.qLink, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Track')}>
                <View style={[styles.qIcon, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="map" size={22} color="#7C3AED" />
                </View>
                <Text style={[styles.qText, { color: colors.text }]}>Fix Map</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.qLink, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={toggleTheme}>
                <View style={[styles.qIcon, { backgroundColor: isDark ? '#1E293B' : '#FEF9C3' }]}>
                    <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={isDark ? '#94A3B8' : '#92400E'} />
                </View>
                <Text style={[styles.qText, { color: colors.text }]}>{isDark ? 'Light' : 'Dark'}</Text>
             </TouchableOpacity>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View style={{ opacity: fadeAnims[4], transform: [{ translateY: slideAnims[4] }] }}>
            <SectionHeader title="Recent Reports" action="View All" onAction={() => navigation.navigate('Track')} />
            {issuesLoading ? (
                 <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : myIssues.length === 0 ? (
                 <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="receipt-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>No recent activity found.</Text>
                 </View>
            ) : (
                myIssues.slice(0, 3).map((issue, idx) => (
                    <TouchableOpacity 
                        key={issue.id} 
                        style={[styles.issueCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('IssueDetails', { issue })}
                    >
                        <View style={[styles.statusLine, { backgroundColor: issue.status === 'resolved' ? '#10B981' : colors.primary }]} />
                        <View style={styles.issueInfo}>
                            <Text style={[styles.issueTitle, { color: colors.text }]} numberOfLines={1}>{issue.title}</Text>
                            <View style={styles.issueMeta}>
                                <Ionicons name="location-outline" size={12} color={colors.muted} />
                                <Text style={[styles.issueLoc, { color: colors.muted }]}>{issue.location_name || 'Unmarked'}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: issue.status === 'resolved' ? '#DCFCE7' : colors.primary + '15' }]}>
                            <Text style={[styles.statusText, { color: issue.status === 'resolved' ? '#15803D' : colors.primary }]}>
                                {issue.status.toUpperCase()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </Animated.View>

        {/* Community Pulse */}
        <Animated.View style={[styles.pulseCard, { opacity: fadeAnims[5], transform: [{ translateY: slideAnims[5] }] }]}>
            <View style={styles.pulseHeader}>
                <Text style={styles.pulseTitle}>Community Pulse</Text>
                <View style={styles.liveDot} />
            </View>
            <Text style={styles.pulseSub}>{issues.filter(i => i.status === 'resolved').length} issues resolved in your area this week!</Text>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '70%', backgroundColor: '#10B981' }]} />
            </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]} 
        onPress={() => navigation.navigate('Report')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgCircle: { position: 'absolute', borderRadius: 999 },
  scrollContent: { padding: 20 },
  header: { 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 25 
  },
  fullAvatar: { width: '100%', height: '100%' },
  greeting: { fontSize: 13, fontWeight: '600' },
  username: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', opacity: 0.6, marginTop: 2 },
  mainAction: { marginBottom: 25 },
  reportHero: { borderRadius: 24, padding: 24, flexDirection: 'row', overflow: 'hidden' },
  heroContent: { flex: 1.5, zIndex: 2 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8, lineHeight: 18 },
  heroBtn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  heroBtnText: { fontWeight: '700', fontSize: 13 },
  heroIconWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', position: 'absolute', right: -10, bottom: -10 },
  quickLinks: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  qLink: { flex: 1, height: 110, borderRadius: 20, borderWidth: 1, padding: 16, justifyContent: 'space-between' },
  qIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qText: { fontSize: 14, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionAction: { fontSize: 13, fontWeight: '700' },
  emptyBox: { height: 120, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  issueCard: { height: 72, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
  statusLine: { position: 'absolute', left: 0, width: 4, height: '100%' },
  issueInfo: { flex: 1 },
  issueTitle: { fontSize: 15, fontWeight: '700' },
  issueMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  issueLoc: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '800' },
  pulseCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 20, marginTop: 12 },
  pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  pulseSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 3 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, elevation: 12 },
});

export default CitizenHomeScreen;
