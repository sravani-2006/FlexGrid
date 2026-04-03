import React, { useState, useEffect } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { pickImage, uploadImage } from '../utils/storage';
import { useVolunteerStats } from '../hooks/useVolunteerStats';

const BADGES = [
  { id: 'b1', icon: '🔧', label: 'First Fix', desc: 'Resolved your first complaint', earned: true },
  { id: 'b2', icon: '⭐', label: '5-Star Volunteer', desc: 'Received 5 upvotes on a fix', earned: true },
  { id: 'b3', icon: '🚀', label: 'Fast Responder', desc: 'Completed within 2 hours', earned: true },
  { id: 'b4', icon: '🌿', label: 'Eco Champion', desc: 'Fixed 3 environmental issues', earned: false },
  { id: 'b5', icon: '👑', label: 'Community Hero', desc: 'Top volunteer of the month', earned: false },
  { id: 'b6', icon: '💎', label: 'Diamond Fixer', desc: 'Completed 50 tasks', earned: false },
];

const VolunteerProfileScreen = ({ navigation }) => {
  const { colors, typography, toggleTheme, isDark } = useTheme();
  const { showToast } = useToast();
  const { logout, user, profile: authProfile, refreshProfile } = useAuth();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { stats, refresh: refreshStats } = useVolunteerStats();

  const impactStats = [
    { icon: 'hammer-outline', label: 'Issues Fixed', value: `${stats.completedTasks || 0}`, color: '#4F5D33' },
    { icon: 'cash-outline', label: 'Rewards Earned', value: `₹${(stats.totalEarned || 0).toLocaleString('en-IN')}`, color: '#047857' },
    { icon: 'trophy-outline', label: 'Volunteer Rank', value: stats.rank || 'Unranked', color: '#1D4ED8' },
    { icon: 'flash-outline', label: 'XP Points', value: `${stats.xpPoints || 0}`, color: '#7C3AED' },
  ];

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (data) setProfile(data);
      }
    };

    fetchProfileData();
    
    AsyncStorage.getItem('@settings_notifications').then(val => {
      if (val !== null) setNotificationsOn(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (authProfile) {
      setProfile((prev) => ({ ...(prev || {}), ...authProfile }));
    }
  }, [authProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      await refreshStats();

      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (data) setProfile(data);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpload = async () => {
    const uri = await pickImage();

    if (!uri) {
      console.log("No image selected");
      return;
    }

    const url = await uploadImage(uri);
    console.log("FINAL URL:", url);

    const { data: { user } } = await supabase.auth.getUser();
    if (url && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (!error) {
        setProfile(prev => ({ ...prev, avatar_url: url }));
        await refreshProfile();
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (logout) logout();
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text, fontFamily: typography.heading }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => showToast('Profile editing coming soon')}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarRing, { borderColor: colors.primary, overflow: 'hidden' }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>
                  {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'SV'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.primary }]}
            onPress={handleUpload}
          >
            <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            <Text style={[styles.photoBtnText, { fontFamily: typography.label }]}>Update Photo</Text>
          </TouchableOpacity>
          <Text style={[styles.volunteerName, { color: colors.text, fontFamily: typography.heading }]}>
            {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Volunteer'}
          </Text>
          <Text style={[styles.volunteerCollege, { color: colors.muted, fontFamily: typography.body }]}>
            {profile?.college || 'FixGrid Campus Chapter'}
          </Text>
          <View style={styles.idRow}>
            <MaterialCommunityIcons name="id-card" size={14} color={colors.muted} />
            <Text style={[styles.volunteerID, { color: colors.muted, fontFamily: typography.mono }]}>
              ID: {profile?.volunteer_id || `VOL-${(user?.id || '000000').slice(0, 8).toUpperCase()}`}
            </Text>
          </View>
          <View style={[styles.joinedPill, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.muted} />
            <Text style={[styles.joinedText, { color: colors.muted, fontFamily: typography.body }]}>
              Joined {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.rankBadge, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.rankText, { color: colors.primary, fontFamily: typography.label }]}>⭐ Rank {stats.rank || 'Unranked'} Volunteer</Text>
          </View>
        </View>

        {/* Impact Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>My Impact</Text>
        <View style={styles.statsGrid}>
          {impactStats.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color, fontFamily: typography.heading }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.muted, fontFamily: typography.body }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>Badges</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map((b) => (
            <View
              key={b.id}
              style={[
                styles.badgeCard,
                { backgroundColor: b.earned ? colors.card : colors.background, borderColor: b.earned ? colors.border : colors.border, opacity: b.earned ? 1 : 0.45 },
              ]}
            >
              <Text style={styles.badgeIcon}>{b.icon}</Text>
              <Text style={[styles.badgeLabel, { color: colors.text, fontFamily: typography.label }]}>{b.label}</Text>
              <Text style={[styles.badgeDesc, { color: colors.muted, fontFamily: typography.body }]}>{b.desc}</Text>
              {b.earned && (
                <View style={[styles.earnedPill, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.earnedText, { color: colors.primary }]}>Earned</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>Settings</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Dark Mode */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#1E293B' }]}>
                <Ionicons name="moon-outline" size={16} color="#94A3B8" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text, fontFamily: typography.label }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={async () => {
                await Haptics.selectionAsync();
                toggleTheme();
              }}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={isDark ? colors.primary : '#FFFFFF'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#FEF9C3' }]}>
                <Ionicons name="notifications-outline" size={16} color="#92400E" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text, fontFamily: typography.label }]}>Notifications</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={async (v) => {
                await Haptics.selectionAsync();
                setNotificationsOn(v);
                await AsyncStorage.setItem('@settings_notifications', v.toString());
                
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                   await supabase.from('profiles').update({ notifications: v }).eq('id', user.id).catch(() => {});
                }
                showToast(v ? 'Notifications enabled' : 'Notifications disabled');
              }}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={notificationsOn ? colors.primary : '#FFFFFF'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          {/* Bank Details */}
          <TouchableOpacity style={styles.settingRow} onPress={() => showToast('Bank details coming soon')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="card-outline" size={16} color="#047857" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text, fontFamily: typography.label }]}>Bank Details</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

          {/* Help */}
          <TouchableOpacity style={styles.settingRow} onPress={() => showToast('Help & support')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="help-circle-outline" size={16} color="#1D4ED8" />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text, fontFamily: typography.label }]}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#FCA5A5' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
          <Text style={[styles.logoutText, { fontFamily: typography.label }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.muted, fontFamily: typography.mono }]}>
          FixGrid Volunteer Network · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  editBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  avatarRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarInitials: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  volunteerName: { fontSize: 20, fontWeight: '800' },
  volunteerCollege: { fontSize: 12, marginTop: 4 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  photoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  volunteerID: { fontSize: 12 },
  joinedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  joinedText: { fontSize: 11 },
  rankBadge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
  rankText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47.5%', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  badgeCard: { width: '47.5%', borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  badgeIcon: { fontSize: 26, marginBottom: 6 },
  badgeLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeDesc: { fontSize: 10, textAlign: 'center', marginTop: 3, lineHeight: 14 },
  earnedPill: { marginTop: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  earnedText: { fontSize: 10, fontWeight: '700' },
  settingsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingDivider: { height: 1, marginHorizontal: 14 },
  logoutBtn: {
    height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16,
  },
  logoutText: { color: '#B91C1C', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 10, letterSpacing: 2 },
});

export default VolunteerProfileScreen;
