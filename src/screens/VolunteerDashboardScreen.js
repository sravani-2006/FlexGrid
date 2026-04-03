import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useVolunteer } from '../context/VolunteerContext';
import { useIssues } from '../hooks/useIssues';
import { useVolunteerStats } from '../hooks/useVolunteerStats';
import { useAuth } from '../context/AuthContext';

const SEVERITY_COLOR = {
  critical: { bg: '#FEE2E2', text: '#B91C1C' },
  medium: { bg: '#FEF9C3', text: '#92400E' },
  low: { bg: '#DCFCE7', text: '#047857' },
};

const STATUS_COLOR = {
  open: { bg: '#EFF6FF', text: '#1D4ED8' },
  in_progress: { bg: '#FFF7ED', text: '#C2410C' },
  completed: { bg: '#F0FDF4', text: '#15803D' },
  resolved: { bg: '#F0FDF4', text: '#15803D' },
};

const VolunteerDashboardScreen = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const { showToast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const { activeTask, startTask, acceptTask } = useVolunteer();
  const { issues, loading: issuesLoading, refresh } = useIssues();
  const { stats: rewardStats, refresh: refreshRewards } = useVolunteerStats();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const normalizeStatus = (status) => (status === 'resolved' ? 'completed' : status);
  const getDisplayStatus = (issue) => {
    const raw = activeTask?.id === issue.id && issue.status === 'open' ? 'in_progress' : issue.status;
    return normalizeStatus(raw);
  };
  const getDisplayAssignedTo = (issue) => (activeTask?.id === issue.id && !issue.assigned_to ? user?.id : issue.assigned_to);
  const filterIssues = (status) => {
    if (status === 'all') return filteredIssues;
    if (status === 'completed') {
      return filteredIssues.filter((i) => getDisplayStatus(i) === 'completed');
    }
    return filteredIssues.filter((i) => getDisplayStatus(i) === status);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      // 1. 'open' for anyone to accept
      // 2. 'in_progress' or 'completed' ONLY if assigned to the current user
      const isMine = getDisplayAssignedTo(i) === user?.id;
      if (activeTask?.id === i.id) return true;
      if (i.status === 'open') return true;
      if (isMine) return true;
      return false;
    });
  }, [issues, user?.id, activeTask?.id]);

  const data = useMemo(() => {
    return filterIssues(statusFilter)
      .filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
  }, [filteredIssues, statusFilter, search, activeTask?.id]);

  const stats = useMemo(() => ({
    accepted: issues.filter(i => (getDisplayStatus(i) === 'in_progress') && getDisplayAssignedTo(i) === user?.id).length,
    completed: issues.filter((i) => (getDisplayStatus(i) === 'completed' || getDisplayStatus(i) === 'resolved') && getDisplayAssignedTo(i) === user?.id).length,
    rewards: rewardStats?.totalEarned || 0,
  }), [issues, user?.id, activeTask?.id, rewardStats?.totalEarned]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.selectionAsync();
    await Promise.all([refresh(), refreshRewards()]);
    setRefreshing(false);
    showToast('Volunteer queue refreshed ✅');
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile?.();
    }, [refreshProfile])
  );

  const handleAccept = async (item) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (activeTask?.id === item.id) {
       showToast('This task is already your active mission', 'info');
       navigation.navigate('Map');
       return;
    }
    
    if (activeTask) {
        showToast('You already have an active mission', 'warning');
        return;
    }

    try {
        console.log('[VolunteerDashboard] Attempting to accept task:', item.id);
        
        if (!user?.id) {
          showToast('User not found. Please log in again.', 'error');
          return;
        }

        await acceptTask(item.id);
        
        startTask({ ...item, status: 'in_progress', assigned_to: user.id });
        await Promise.all([refresh(), refreshRewards()]);
        showToast(`Mission Started: ${item.title}`);
        navigation.navigate('Map');
    } catch (e) {
        console.error('[VolunteerDashboard] Acceptance Exception:', e);
        showToast(`Failed to accept: ${e.message || 'Database error'}`, 'error');
    }
  };

  const renderItem = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    const displayAssignedTo = getDisplayAssignedTo(item);
    const sev = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.low;
    const sta = STATUS_COLOR[displayStatus] || STATUS_COLOR.open;
    const isAssignedToMe = displayAssignedTo === user?.id;
    const isMyActiveTask = activeTask?.id === item.id;

    let actionLabel = 'Unavailable';
    let actionDisabled = true;
    let actionIcon = 'close-circle-outline';
    let actionColor = colors.border;
    let actionTextColor = colors.muted;

    if (displayStatus === 'open') {
      actionLabel = 'Accept Task';
      actionDisabled = !!activeTask;
      actionIcon = 'hand-right-outline';
      actionColor = actionDisabled ? colors.border : colors.primary;
      actionTextColor = actionDisabled ? colors.muted : '#FFFFFF';
    } else if (displayStatus === 'in_progress' && isAssignedToMe) {
      actionLabel = 'Upload Proof';
      actionDisabled = false;
      actionIcon = 'cloud-upload-outline';
      actionColor = '#10B981';
      actionTextColor = '#FFFFFF';
    } else if (displayStatus === 'completed') {
      actionLabel = 'Task Completed';
      actionDisabled = true;
      actionIcon = 'checkmark-done-outline';
      actionColor = '#D1FAE5';
      actionTextColor = '#065F46';
    }

    const handlePrimaryAction = async () => {
      if (displayStatus === 'open') {
        await handleAccept(item);
        return;
      }

      if (displayStatus === 'in_progress' && isAssignedToMe) {
        navigation.navigate('IssueDetails', {
          issue: {
            ...item,
            status: displayStatus,
            assigned_to: displayAssignedTo,
          },
        });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('IssueDetails', {
          issue: {
            ...item,
            status: displayStatus,
            assigned_to: displayAssignedTo,
          },
        })}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
            <Text style={[styles.severityText, { color: sev.text }]}>{item.severity?.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sta.bg }]}>
            <Text style={[styles.statusText, { color: sta.text }]}>{displayStatus?.replace('_', ' ')}</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text, fontFamily: typography.label }]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.cardMetaRow}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={[styles.cardMeta, { color: colors.muted, fontFamily: typography.body }]} numberOfLines={1}>
            {item.location_name || 'Unknown location'}
          </Text>
        </View>

        <View style={styles.cardMetaRow}>
          <Ionicons name="thumbs-up-outline" size={12} color={colors.muted} />
          <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.upvotes || 0} upvotes</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: actionColor },
            ]}
            onPress={handlePrimaryAction}
            activeOpacity={0.8}
            disabled={actionDisabled}
          >
            <Ionicons
              name={actionIcon}
              size={14}
              color={actionTextColor}
            />
            <Text style={[styles.actionBtnText, { color: actionTextColor }]}> 
              {actionLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.proofBtn]}
            onPress={async () => {
              await Haptics.selectionAsync();
              navigation.navigate('IssueDetails', {
                issue: {
                  ...item,
                  status: displayStatus,
                  assigned_to: displayAssignedTo,
                },
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color="#047857" />
            <Text style={[styles.actionBtnText, { color: '#047857' }]}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {issuesLoading && !refreshing && <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.greeting, { color: colors.muted, fontFamily: typography.body }]}>Welcome back 👋</Text>
                <Text style={[styles.title, { color: colors.text, fontFamily: typography.heading }]}>Volunteer Queue</Text>
              </View>
              <TouchableOpacity
                style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('VolunteerProfile')}
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary, fontFamily: typography.heading }]}>{stats.accepted}</Text>
                <Text style={[styles.statLabel, { color: colors.muted, fontFamily: typography.body }]}>Accepted</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.heading }]}>{stats.completed}</Text>
                <Text style={[styles.statLabel, { color: colors.muted, fontFamily: typography.body }]}>Completed</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#047857', fontFamily: typography.heading }]}>₹{stats.rewards}</Text>
                <Text style={[styles.statLabel, { color: colors.muted, fontFamily: typography.body }]}>Rewards</Text>
              </View>
            </View>

            <View style={styles.quickLinks}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('VolunteerProfile')}
              >
                <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                <Text style={[styles.quickBtnText, { color: colors.primary, fontFamily: typography.label }]}>Impact Stats</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Rewards')}
              >
                <Ionicons name="trophy-outline" size={16} color="#92400E" />
                <Text style={[styles.quickBtnText, { color: '#92400E', fontFamily: typography.label }]}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Map')}
              >
                <Ionicons name="map-outline" size={16} color="#1D4ED8" />
                <Text style={[styles.quickBtnText, { color: '#1D4ED8', fontFamily: typography.label }]}>Map View</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text, fontFamily: typography.body }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search complaints..."
                placeholderTextColor={colors.muted}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterRow}>
              {['all', 'open', 'in_progress', 'completed'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.chip,
                    { backgroundColor: statusFilter === f ? colors.primary : colors.card, borderColor: statusFilter === f ? colors.primary : colors.border },
                  ]}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setStatusFilter(f);
                  }}
                >
                  <Text style={[styles.chipText, { color: statusFilter === f ? '#FFFFFF' : colors.muted, fontFamily: typography.label }]}>
                    {f === 'all' ? 'All' : f === 'completed' ? 'Resolved' : f.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.queueLabel, { color: colors.muted, fontFamily: typography.body }]}>
              {data.length} complaint{data.length !== 1 ? 's' : ''} in queue
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No complaints in queue"
            subtitle="Change filters or pull down to refresh"
          />
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 14, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { fontSize: 12, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
  quickLinks: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickBtnText: { fontSize: 11, fontWeight: '700' },
  searchWrap: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  queueLabel: { fontSize: 11, marginBottom: 6 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  severityBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  cardMeta: { fontSize: 12, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  proofBtn: { backgroundColor: '#DCFCE7' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});

export default VolunteerDashboardScreen;
