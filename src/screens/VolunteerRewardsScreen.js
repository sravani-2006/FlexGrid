import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { mockIssues } from '../data/mockData';

const rewardBySeverity = { critical: 800, medium: 500, low: 300 };

const resolvedIssues = mockIssues.filter((i) => i.status === 'resolved');

const govRewards = resolvedIssues.slice(0, 3).map((i, idx) => ({
  id: `gov-${idx}`,
  title: i.title,
  location: i.locationName || 'Unknown',
  severity: i.severity,
  amount: rewardBySeverity[i.severity] || 300,
  date: '2026-03-20',
  status: 'Credited',
}));

const publicRewards = resolvedIssues.slice(1, 3).map((i, idx) => ({
  id: `pub-${idx}`,
  title: i.title,
  location: i.locationName || 'Unknown',
  severity: i.severity,
  amount: Math.round((rewardBySeverity[i.severity] || 300) * 0.4),
  date: '2026-03-22',
  status: idx === 0 ? 'Credited' : 'Pending',
}));

const leaderboard = [
  { rank: 1, name: 'Priya Sharma', college: 'IIT Bombay', xp: 3200, badge: '🏆' },
  { rank: 2, name: 'Arjun Mehta', college: 'NIT Trichy', xp: 2850, badge: '🥈' },
  { rank: 3, name: 'Sana Iyer', college: 'BITS Pilani', xp: 2400, badge: '🥉' },
  { rank: 4, name: 'You', college: 'FixGrid Campus', xp: 1950, badge: '⭐' },
  { rank: 5, name: 'Rahul V.', college: 'VIT Vellore', xp: 1700, badge: '' },
];

const VolunteerRewardsScreen = () => {
  const { colors, typography } = useTheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [claimedIds, setClaimedIds] = useState([]);

  const totalEarned = [...govRewards, ...publicRewards]
    .filter((r) => r.status === 'Credited')
    .reduce((s, r) => s + r.amount, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.selectionAsync();
    setTimeout(() => { setRefreshing(false); showToast('Rewards updated'); }, 700);
  };

  const claimReward = async (id, amount) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (claimedIds.includes(id)) { showToast('Already claimed', 'info'); return; }
    setClaimedIds((p) => [...p, id]);
    showToast(`₹${amount} reward claimed! 🎉`);
  };

  const RewardCard = ({ item, source }) => {
    const isClaimed = claimedIds.includes(item.id);
    const isPending = item.status === 'Pending';
    return (
      <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rewardCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rewardTitle, { color: colors.text, fontFamily: typography.label }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.rewardMeta, { color: colors.muted, fontFamily: typography.body }]}>
              {item.location} · {item.date}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, { color: source === 'gov' ? colors.primary : '#7C3AED', fontFamily: typography.heading }]}>
              ₹{item.amount}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: isPending ? '#FFF7ED' : '#F0FDF4' }]}>
              <Text style={[styles.statusPillText, { color: isPending ? '#C2410C' : '#15803D' }]}>
                {isClaimed ? 'Claimed' : item.status}
              </Text>
            </View>
          </View>
        </View>
        {!isClaimed && !isPending && (
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: source === 'gov' ? colors.primary : '#7C3AED' }]}
            onPress={() => claimReward(item.id, item.amount)}
          >
            <Ionicons name="gift-outline" size={14} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Claim Reward</Text>
          </TouchableOpacity>
        )}
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
          <View style={[styles.trophyBadge, { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }]}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={[styles.trophyRank, { color: '#92400E' }]}>Rank #4</Text>
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />
          <Text style={styles.summaryLabel}>Total Rewards Earned</Text>
          <Text style={styles.summaryAmount}>₹{totalEarned}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{resolvedIssues.length}</Text>
              <Text style={styles.summaryItemLabel}>Tasks Done</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{govRewards.length + publicRewards.length}</Text>
              <Text style={styles.summaryItemLabel}>Rewards</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>1950</Text>
              <Text style={styles.summaryItemLabel}>XP Points</Text>
            </View>
          </View>
        </View>

        {/* Government Fund Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            <Text style={styles.sectionIcon}>🏛️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>Government Fund</Text>
            <Text style={[styles.sectionSub, { color: colors.muted, fontFamily: typography.body }]}>
              Municipal civic reward programme
            </Text>
          </View>
          <View style={[styles.sourcePill, { backgroundColor: '#E0F2FE' }]}>
            <Text style={[styles.sourcePillText, { color: '#0369A1' }]}>₹{govRewards.reduce((s, r) => s + r.amount, 0)}</Text>
          </View>
        </View>

        {govRewards.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.muted }]}>No government rewards yet. Complete tasks to earn.</Text>
        ) : (
          govRewards.map((r) => <RewardCard key={r.id} item={r} source="gov" />)
        )}

        {/* Public Fundraise Section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <View style={[styles.sectionIconWrap, { backgroundColor: '#F5F3FF' }]}>
            <Text style={styles.sectionIcon}>🤝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.heading }]}>Public Fundraise</Text>
            <Text style={[styles.sectionSub, { color: colors.muted, fontFamily: typography.body }]}>
              Community crowd-funded contributions
            </Text>
          </View>
          <View style={[styles.sourcePill, { backgroundColor: '#F5F3FF' }]}>
            <Text style={[styles.sourcePillText, { color: '#7C3AED' }]}>₹{publicRewards.reduce((s, r) => s + r.amount, 0)}</Text>
          </View>
        </View>

        {publicRewards.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.muted }]}>No public fundraise rewards yet.</Text>
        ) : (
          publicRewards.map((r) => <RewardCard key={r.id} item={r} source="public" />)
        )}

        {/* Leaderboard */}
        <Text style={[styles.lbTitle, { color: colors.text, fontFamily: typography.heading }]}>Top Volunteers</Text>
        <View style={[styles.lbCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {leaderboard.map((v, idx) => (
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
  pageLabel: { fontSize: 12, marginBottom: 2 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
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
