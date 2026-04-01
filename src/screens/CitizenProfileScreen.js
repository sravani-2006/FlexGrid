import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from 'react-native';
import { pickImage, uploadImage } from '../utils/storage';

const CitizenProfileScreen = ({ navigation }) => {
  const { user, logout, role, profile, refreshProfile } = useAuth();
  const { isDark, setTheme, colors, typography } = useTheme();

  const [stats, setStats] = useState({ totalReports: 0, impactScore: 0, upvotes: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fallback toggles for decorative UI Settings
  const [notifications, setNotifications] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Refresh global profile
      await refreshProfile();

      // Fix local settings fallback
      const localNotif = await AsyncStorage.getItem('@settings_notifications');
      const localNews = await AsyncStorage.getItem('@settings_newsletter');
      if (localNotif !== null) setNotifications(localNotif === 'true');
      if (localNews !== null) setNewsletter(localNews === 'true');

      // 2. Fetch live issues data created by the user
      const { data: issuesData, error: issuesErr } = await supabase
        .from('issues')
        .select('id, upvotes')
        .eq('user_id', user?.id);

      if (issuesData && !issuesErr) {
        const total = issuesData.length;
        // If upvotes don't actually exist in the DB schema yet, it'll just be undefined and fallback to 0.
        const upvotesCount = issuesData.reduce((acc, issue) => acc + (issue.upvotes || 0), 0);
        
        setStats({
          totalReports: total,
          impactScore: (total * 50) + (upvotesCount * 10), // Base score off formula
          upvotes: upvotesCount,
        });
      }
    } catch (err) {
      console.error('[CitizenProfileScreen] Error fetching Data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSignOut = () => {
    logout();
    const parent = navigation.getParent();
    if (parent) {
      parent.replace('Home');
    }
  };

  const toggleSetting = async (setting, currentVal, setter) => {
    const nextVal = !currentVal;
    setter(nextVal);
    
    // Save locally
    const key = `@settings_${setting}`;
    await AsyncStorage.setItem(key, nextVal.toString());

    // Try save to database if column exists
    if (user) {
       await supabase.from('profiles').update({ [setting]: nextVal }).eq('id', user.id).catch(() => {});
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

    if (url && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedName.trim() })
        .eq('id', user.id);
      
      if (!error) {
        await refreshProfile();
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Save Name Error:", err);
    }
  };

  const startEditing = () => {
    setEditedName(profile?.full_name || '');
    setIsEditing(true);
  };

  // Helper function to extract initials for the Avatar Mono
  const getInitials = (name) => {
    if (!name) return 'CH';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted, fontFamily: typography.label }]}>
          Loading Profile...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* TOP HEADER & AVATAR SECTION */}
        <View style={[styles.headerSection, { backgroundColor: isDark ? colors.card : colors.primary }]}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Ionicons name="menu" size={26} color="#FFFFFF" />
              <Text style={[styles.logoText, { fontFamily: typography.heading }]}>FixGrid</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileHero}>
            <View style={styles.avatarGlassContainer}>
              <View style={[styles.avatarCircle, { backgroundColor: '#FFFFFF', overflow: 'hidden' }]}>
                <Image 
                   key={profile?.avatar_url}
                   source={{ uri: profile?.avatar_url }} 
                   style={styles.avatarImage} 
                />
              </View>
              {profile?.role === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  autoFocus
                  placeholder="Enter Name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={handleSaveName}>
                    <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={startEditing} style={styles.nameRow}>
                <Text style={[styles.heroName, { fontFamily: typography.heading }]}>
                  {profile?.full_name}
                </Text>
                <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: 8, marginBottom: 4 }} />
              </TouchableOpacity>
            )}

            <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.roleText, { fontFamily: typography.label }]}>
                {profile?.role === 'volunteer' 
                  ? 'COMMUNITY VOLUNTEER' 
                  : (profile?.role?.toUpperCase() || 'CITIZEN')}
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, fontFamily: typography.body }}>
              Member since {new Date(user?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity 
               style={styles.uploadBtn} 
               onPress={handleUpload}
            >
               <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
               <Text style={styles.uploadBtnText}>Edit Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACTIVITY STATS */}
        <View style={styles.contentPadding}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>
            YOUR IMPACT
          </Text>
          <View style={styles.statsLayout}>
            <View style={[styles.statLargeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statIconWrap}>
                   <Ionicons name="document-text" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.heading }]}>
                {stats.totalReports}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted, fontFamily: typography.label }]}>
                Total Reports
              </Text>
            </View>
            
            <View style={styles.statsRightCol}>
              <View style={[styles.statSmallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statSubLabel, { color: colors.muted, fontFamily: typography.body }]}>Impact Score</Text>
                <Text style={[styles.statSubValue, { color: '#D97706', fontFamily: typography.heading }]}>
                  {stats.impactScore}
                </Text>
              </View>
              <View style={[styles.statSmallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statSubLabel, { color: colors.muted, fontFamily: typography.body }]}>Rep Points</Text>
                <Text style={[styles.statSubValue, { color: colors.primary, fontFamily: typography.heading }]}>
                  {stats.upvotes}
                </Text>
              </View>
            </View>
          </View>

          {/* SETTINGS MODULE */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading, marginTop: 24 }]}>
            PREFERENCES
          </Text>
          <View style={[styles.settingsBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <SettingToggle
                icon="moon"
                title="Dark Mode"
                subtitle="Switch to darker theme"
                isActive={isDark}
                onToggle={() => setTheme(!isDark)}
                colors={colors}
                typography={typography}
             />
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
             <SettingToggle
                icon="notifications"
                title="Status Updates"
                subtitle="Alerts for resolved issues"
                isActive={notifications}
                onToggle={() => toggleSetting('notifications', notifications, setNotifications)}
                colors={colors}
                typography={typography}
             />
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
             <SettingToggle
                icon="mail"
                title="Newsletter"
                subtitle="Weekly community digests"
                isActive={newsletter}
                onToggle={() => toggleSetting('newsletter', newsletter, setNewsletter)}
                colors={colors}
                typography={typography}
             />
          </View>

          {/* ACCOUNT SECURITY */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading, marginTop: 24 }]}>
            SECURITY
          </Text>
          <View style={[styles.settingsBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <ActionRow
                icon="shield-checkmark"
                title="Account Status"
                rightText="Secured"
                rightTextColor={colors.primary}
                colors={colors}
                typography={typography}
             />
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ActionRow
                icon="mail-outline"
                title="Email Address"
                rightText={user?.email || 'Not verified'}
                colors={colors}
                typography={typography}
             />
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
             <ActionRow
                icon="key"
                title="Change Password"
                colors={colors}
                typography={typography}
             />
          </View>
          
          <TouchableOpacity 
             style={[styles.logoutBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '10' }]} 
             onPress={handleSignOut}
          >
             <Ionicons name="log-out-outline" size={20} color={colors.error} />
             <Text style={[styles.logoutText, { color: colors.error, fontFamily: typography.label }]}>
                Secure Sign Out
             </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Subcomponents
const SettingToggle = ({ icon, title, subtitle, isActive, onToggle, colors, typography }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
       <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
          <Ionicons name={icon} size={20} color={colors.text} />
       </View>
       <View>
          <Text style={[styles.settingTitle, { color: colors.text, fontFamily: typography.label }]}>{title}</Text>
          <Text style={[styles.settingSub, { color: colors.muted, fontFamily: typography.body }]}>{subtitle}</Text>
       </View>
    </View>
    <TouchableOpacity 
       style={[styles.toggleTrack, { backgroundColor: isActive ? colors.primary : colors.border }]}
       onPress={onToggle}
       activeOpacity={0.8}
    >
       <View style={[styles.toggleThumb, { transform: [{ translateX: isActive ? 18 : 2 }] }]} />
    </TouchableOpacity>
  </View>
);

const ActionRow = ({ icon, title, rightText, rightTextColor, colors, typography }) => (
  <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
    <View style={styles.settingLeft}>
       <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
          <Ionicons name={icon} size={20} color={colors.text} />
       </View>
       <Text style={[styles.settingTitle, { color: colors.text, fontFamily: typography.label }]}>{title}</Text>
    </View>
    <View style={styles.actionRight}>
       {rightText && (
          <Text style={[styles.actionRightText, { color: rightTextColor || colors.muted, fontFamily: typography.label }]}>
             {rightText}
          </Text>
       )}
       <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  headerSection: {
    paddingTop: 10,
    paddingBottom: 34,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileHero: {
    alignItems: 'center',
  },
  avatarGlassContainer: {
    padding: 6,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16,
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 14,
    opacity: 0.8,
  },
  statsLayout: {
    flexDirection: 'row',
    gap: 14,
  },
  statLargeCard: {
    flex: 1.2,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    marginBottom: 16,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRightCol: {
    flex: 1,
    gap: 14,
  },
  statSmallCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statSubValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  settingsBlock: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 12,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionRightText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  logoutBtn: {
    marginTop: 28,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  uploadBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    minWidth: 150,
    textAlign: 'center',
    paddingVertical: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default CitizenProfileScreen;
