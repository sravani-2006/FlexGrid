import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { mockIssues } from '../data/mockData';

import { useVolunteerStats } from '../hooks/useVolunteerStats';

const rewardBySeverity = { critical: 800, medium: 500, low: 300 };

const VolunteerRewardsScreen = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const { showToast } = useToast();
  const { profile, refreshProfile } = useAuth();
  const { stats, rewardHistory, leaderboard, loading, refresh } = useVolunteerStats();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile?.();
    }, [refreshProfile])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.selectionAsync();
    await refresh();
    setRefreshing(false);
    showToast('Rewards updated ✅');
  };

  const RewardCard = ({ item }) => {
    const rewardAmount = item.reward_value ?? item.reward ?? item.amount ?? item.points ?? item.xp ?? 0;
    const statusRaw = item.reward_status ?? item.status ?? 'credited';
    const normalizedStatus = String(statusRaw).toLowerCase();
    const isPending = normalizedStatus === 'pending';
    return (
      <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rewardCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rewardTitle, { color: colors.text, fontFamily: typography.label }]} numberOfLines={2}>
              {item.issue?.title || 'Mission Reward'}
            </Text>
            <Text style={[styles.rewardMeta, { color: colors.muted, fontFamily: typography.body }]}>
              {item.issue?.location_name || 'Completed Task'} · {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, { color: colors.primary, fontFamily: typography.heading }]}>
              ₹{rewardAmount}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: isPending ? '#FFF7ED' : '#F0FDF4' }]}>
              <Text style={[styles.statusPillText, { color: isPending ? '#C2410C' : '#15803D' }]}>
                {isPending ? 'Pending' : 'Credited'}
              </Text>
            </View>
          </View>
        </View>
      </View>
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
          <View>
            <Text style={[styles.pageLabel, { color: colors.muted, fontFamily: typography.body }]}>Your Earnings</Text>
            <Text style={[styles.pageTitle, { color: colors.text, fontFamily: typography.heading }]}>Rewards</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.trophyBadge, { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }]}> 
              <Text style={styles.trophyEmoji}>🏆</Text>
              <Text style={[styles.trophyRank, { color: '#92400E' }]}>Rank #4</Text>
            </View>
            <TouchableOpacity
              style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('VolunteerProfile')}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <Ionicons name="person" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />
          <Text style={styles.summaryLabel}>Total Rewards Earned</Text>
          <Text style={styles.summaryAmount}>₹{stats.totalEarned}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{stats.completedTasks}</Text>
              <Text style={styles.summaryItemLabel}>Tasks Done</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{rewardHistory.length}</Text>
              <Text style={styles.summaryItemLabel}>Rewards</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{stats.xpPoints}</Text>
              <Text style={styles.summaryItemLabel}>XP Points</Text>
            </View>
          </View>
        </View>

        {/* Reward History Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            <Text style={styles.sectionIcon}>🏛️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>Reward History</Text>
            <Text style={[styles.sectionSub, { color: colors.muted, fontFamily: typography.body }]}>
              Verified mission credits
            </Text>
          </View>
        </View>

        {loading ? (
             <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : rewardHistory.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.muted }]}>No rewards earned yet. Complete your first mission!</Text>
        ) : (
          rewardHistory.map((r) => <RewardCard key={r.id} item={r} />)
        )}

        {/* Leaderboard */}
        <Text style={[styles.lbTitle, { color: colors.text, fontFamily: typography.heading }]}>Top Volunteers</Text>
        <View style={[styles.lbCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {leaderboard.length === 0 ? (
              <Text style={{ textAlign: 'center', padding: 20, color: colors.muted }}>Loading leaderboard...</Text>
          ) : leaderboard.map((v, idx) => (
            <View key={v.rank}>
              <View style={[styles.lbRow, v.name === 'You' && { backgroundColor: `${colors.primary}18`, borderRadius: 10, padding: 8 }]}>
                <Text style={[styles.lbRank, { color: v.rank <= 3 ? '#92400E' : colors.muted, fontFamily: typography.heading }]}>
                  {v.badge || `#${v.rank}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lbName, { color: colors.text, fontFamily: typography.label }]}>{v.name}</Text>
                  <Text style={[styles.lbCollege, { color: colors.muted, fontFamily: typography.body }]}>{v.college}</Text>
                </View>
                <Text style={[styles.lbXP, { color: colors.primary, fontFamily: typography.heading }]}>{v.xp} XP</Text>
              </View>
              {idx < leaderboard.length - 1 && <View style={[styles.lbDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        <Text style={[styles.footerNote, { color: colors.muted, fontFamily: typography.body }]}>
          Rewards are disbursed monthly via NEFT. Ensure your bank details are updated in your profile.
        </Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageLabel: { fontSize: 12, marginBottom: 2 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  profileAvatar: { width: '100%', height: '100%' },
  trophyBadge: {
    borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center',
  },
  trophyEmoji: { fontSize: 20 },
  trophyRank: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  glowCircle1: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -40,
  },
  glowCircle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: 20,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 4 },
  summaryAmount: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  summaryItemLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sectionIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSub: { fontSize: 11, marginTop: 1 },
  sourcePill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  sourcePillText: { fontSize: 14, fontWeight: '800' },
  emptyHint: { fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  rewardCard: {
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10,
  },
  rewardCardTop: { flexDirection: 'row', gap: 10 },
  rewardTitle: { fontSize: 13, fontWeight: '700' },
  rewardMeta: { fontSize: 11, marginTop: 3 },
  amountCol: { alignItems: 'flex-end', gap: 5 },
  amountText: { fontSize: 20, fontWeight: '800' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  claimBtn: {
    marginTop: 10, height: 36, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  claimBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  lbTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  lbCard: { borderRadius: 16, borderWidth: 1, padding: 4, marginBottom: 16 },
  lbRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  lbRank: { fontSize: 18, width: 36, textAlign: 'center' },
  lbName: { fontSize: 13, fontWeight: '700' },
  lbCollege: { fontSize: 11, marginTop: 1 },
  lbXP: { fontSize: 14, fontWeight: '800' },
  lbDivider: { height: 1, marginHorizontal: 10 },
  footerNote: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 10 },
});

export default VolunteerRewardsScreen;
