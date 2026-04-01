import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // Added for auto-refresh
import * as Haptics from 'expo-haptics';
import SkeletonIssueCard from '../components/SkeletonIssueCard';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const filters = ['all', 'open', 'in_progress', 'resolved'];
const sortOptions = ['Most Upvoted', 'Latest', 'Critical First'];

const CitizenTrackScreen = ({ navigation }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('Latest');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [userUpvotes, setUserUpvotes] = useState([]);
  const [profile, setProfile] = useState(null);

  // Fetch real issues from Supabase (Showing ALL issues as requested)
  const fetchIssues = async () => {
    try {
      setLoading(true);
      
      // Fetch Issues
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log("Fetch error:", error);
        showToast('Failed to load reports', 'error');
      } else {
        setIssues(data || []);
        
        if (user) {
          // Fetch User Upvotes
          const { data: upvoteData } = await supabase
            .from('upvotes')
            .select('issue_id')
            .eq('user_id', user.id);
          setUserUpvotes(upvoteData?.map(u => u.issue_id) || []);

          // Fetch User Profile for Avatar
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.log("Profile Fetch Error:", profileError.message);
          }
          
          if (profileData) {
            console.log("Profile Data Found:", profileData);
            setProfile(profileData);
          } else {
            console.log("No profile record found in database.");
          }
        }
      }
    } catch (err) {
      console.log("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    console.log("--- ATTEMPTING DELETE ---");
    console.log("Target ID:", id);
    
    try {
      const { error, data } = await supabase
        .from('issues')
        .delete()
        .eq('id', id)
        .select(); // Added .select() to see if anything was actually deleted

      if (error) {
        console.log("Supabase Delete Error:", error);
        showToast('Delete failed: ' + error.message, 'error');
        return;
      }

      console.log("Delete response data:", data);
      
      if (data && data.length > 0) {
        showToast('Report deleted successfully 🗑️');
        fetchIssues(); // Refresh the list
      } else {
        console.log("No rows deleted. Check ID or RLS policies.");
        showToast('Notice: No changes made to database', 'error');
      }
    } catch (err) {
      console.log("Unexpected Delete Failure:", err);
      showToast('Panic: Delete failed unexpectedly', 'error');
    }
  };

  const toggleUpvote = async (issueId) => {
    if (!user) {
        showToast('Please login to upvote', 'error');
        return;
    }
    
    try {
        const userId = user.id;

        // 🔍 Check if already upvoted
        const { data: existing } = await supabase
            .from('upvotes')
            .select('*')
            .eq('issue_id', issueId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            // 🔻 REMOVE UPVOTE (UNDO)
            const { error } = await supabase
                .from('upvotes')
                .delete()
                .eq('issue_id', issueId)
                .eq('user_id', userId);

            if (error) {
                console.log("Remove error:", error);
                showToast('Failed to remove upvote', 'error');
            } else {
                console.log("Upvote removed");
                showToast('Upvote removed');
                
                // Also update the local count in issues table (optional but helpful)
                await supabase.rpc('decrement_upvotes', { row_id: issueId }).catch(() => {});
            }
        } else {
            // 🔺 ADD UPVOTE
            const { error } = await supabase
                .from('upvotes')
                .insert({
                    issue_id: issueId,
                    user_id: userId,
                });

            if (error) {
                console.log("Insert error:", error);
                showToast('Failed to upvote', 'error');
            } else {
                console.log("Upvoted");
                showToast('Upvoted issue 👍');
                
                // Also update the local count in issues table
                await supabase.rpc('increment_upvotes', { row_id: issueId }).catch(() => {});
            }
        }

        fetchIssues(); // refresh UI
    } catch (err) {
        console.log("Toggle upvote failed:", err);
    }
  };

  const optimisticToggle = (issueId) => {
    // Optimistic UI Update
    setUserUpvotes(prev => {
        if (prev.includes(issueId)) {
            return prev.filter(id => id !== issueId);
        } else {
            return [...prev, issueId];
        }
    });

    setIssues(prev => prev.map(issue => {
        if (issue.id === issueId) {
            const hasUpvoted = userUpvotes.includes(issueId);
            const currentUpvotes = Number(issue.upvotes) || 0;
            return {
                ...issue,
                upvotes: hasUpvoted ? Math.max(0, currentUpvotes - 1) : (currentUpvotes + 1)
            };
        }
        return issue;
    }));

    // Trigger real update
    toggleUpvote(issueId);
  };

  // Re-fetch whenever screen comes into focus
  useFocusEffect(
      useCallback(() => {
          fetchIssues();
      }, [])
  );

  const filteredIssues = useMemo(() => {
    const base = issues
      .filter((issue) => (filter === 'all' ? true : issue.status === filter))
      .filter((issue) => issue.title.toLowerCase().includes(search.toLowerCase()));

    if (sortBy === 'Most Upvoted') {
      return [...base].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    if (sortBy === 'Critical First') {
      const rank = { critical: 0, medium: 1, low: 2 };
      return [...base].sort((a, b) => (rank[a.severity] || 3) - (rank[b.severity] || 3));
    }

    return [...base].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [issues, filter, search, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.selectionAsync();
    await fetchIssues();
    setRefreshing(false);
    showToast('Issue list refreshed ✅');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Ionicons name="menu" size={20} color="#60708A" />
          <Text style={styles.brand}>FixGrid</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CitizenProfile')}>
          <View style={[styles.headerAvatar, { overflow: 'hidden', backgroundColor: '#FFFFFF', width: 44, height: 44, borderRadius: 22 }]}>
            <Image 
              key={profile?.avatar_url}
              source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&q=80' }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [{ id: 's1' }, { id: 's2' }, { id: 's3' }] : filteredIssues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F5D33" />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Smart Dashboard</Text>
            <Text style={styles.subtitle}>Search, filter, and prioritize your civic reports.</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#756C60" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by issue title"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.filterRow}>
              {filters.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterChip, filter === item && styles.filterChipActive]}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                    {item === 'all' ? 'All' : item.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              horizontal
              data={sortOptions}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sortChip, sortBy === item && styles.sortChipActive]}
                  onPress={() => setSortBy(item)}
                >
                  <Text style={[styles.sortChipText, sortBy === item && styles.sortChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        }
        renderItem={({ item, index }) => {
          if (loading) {
            return <SkeletonIssueCard />;
          }
          return (
            <EnhancedIssueCard 
              issue={item} 
              index={index} 
              navigation={navigation} 
              showToast={showToast} 
              hasUpvoted={userUpvotes.includes(item.id)}
              onDelete={() => handleDelete(item.id)}
              onUpvote={() => optimisticToggle(item.id)}
            />
          );
        }}
        ListEmptyComponent={!loading ? <EmptyState title="No issues reported yet" /> : null}
      />
    </SafeAreaView>
  );
};

const EnhancedIssueCard = ({ issue, index, navigation, showToast, onDelete, onUpvote, hasUpvoted }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const severityConfig = {
    critical: { icon: 'flame', color: '#DC2626' },
    medium: { icon: 'warning', color: '#A16207' },
    low: { icon: 'leaf', color: '#047857' },
  };

  const progressMap = {
    open: 0.25,
    in_progress: 0.65,
    resolved: 1,
    breached: 0.55,
  };

  const statusColorMap = {
    open: '#756C60',
    in_progress: '#A16207',
    resolved: '#047857',
    breached: '#B91C1C',
  };

  const severity = severityConfig[issue.severity] || severityConfig.low;
  // Use new column names for image and type
  const displayImage = issue.before_photo_url || issue.image_url || issue.image;
  const displayType = issue.issue_type || issue.type || 'General';

  const handleUpvoteClick = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 130, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onUpvote();
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to remove this report? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete }
      ]
    );
  };

  return (
    <Animated.View style={{ opacity: 1, transform: [{ translateY: index * 0 }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.93}
        onPress={() => navigation.navigate('IssueDetails', { issue })}
      >
        <Image source={{ uri: displayImage }} style={styles.cardImage} />

        <View style={styles.rowBetween}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color="#756C60" />
            <Text style={styles.locationText}>{issue.location_name || 'Detected Location'}</Text>
          </View>
          <View style={styles.severityWrap}>
            <Ionicons name={severity.icon} size={12} color={severity.color} />
            <Text style={[styles.severityText, { color: severity.color }]}>{issue.severity}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{issue.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{issue.description}</Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round((progressMap[issue.status] || 0.2) * 100)}%`,
                backgroundColor: statusColorMap[issue.status] || '#756C60',
              },
            ]}
          />
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.statusText}>{issue.status.replace('_', ' ')}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.upvoteBtn, hasUpvoted && styles.upvoteBtnActive]} 
              onPress={handleUpvoteClick}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons name="thumbs-up" size={16} color={hasUpvoted ? "#FFFFFF" : "#4F5D33"} />
              </Animated.View>
              <Text style={[styles.upvoteText, hasUpvoted && styles.upvoteTextActive]}>
                {parseInt(issue.upvotes) || 0}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECE9E1',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#DCD6CB',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1F1D',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
  },
  title: {
    color: '#1F1F1D',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    marginTop: 4,
    fontSize: 13,
    marginBottom: 12,
  },
  searchWrap: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#1F1F1D',
  },
  filterRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: '#DCD6CB',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: '#4F5D33',
  },
  filterChipText: {
    color: '#5F5549',
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortRow: {
    marginTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  sortChip: {
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortChipActive: {
    borderColor: '#4F5D33',
    backgroundColor: '#E4E6D8',
  },
  sortChipText: {
    color: '#5F5549',
    fontSize: 11,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#4F5D33',
  },
  card: {
    backgroundColor: '#F4F1EA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 124,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#756C60',
    fontSize: 11,
  },
  severityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  severityText: {
    textTransform: 'capitalize',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    marginTop: 8,
    color: '#1F1F1D',
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#DCD6CB',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 4,
  },
  statusText: {
    marginTop: 10,
    color: '#5F5549',
    fontSize: 11,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  upvoteBtn: {
    marginTop: 8,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DFF2D8', // VIBRANT Light Green
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upvoteText: {
    color: '#4F5D33',
    fontWeight: '700',
    fontSize: 12,
  },
  upvoteBtnActive: {
    backgroundColor: '#4F5D33',
  },
  upvoteTextActive: {
    color: '#E4E6D8',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CitizenTrackScreen;
