import React, { useMemo, useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useVolunteer } from '../context/VolunteerContext';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../utils/storage';

const DEFAULT_XP_REWARD = 100;
const COMMENT_TABLE_CANDIDATES = ['comments', 'issue_comments', 'chat_messages', 'messages'];

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
};

const normalizeComment = (row) => ({
  id: row?.id || `${row?.created_at || Date.now()}-${row?.user_id || 'anon'}`,
  author_name: row?.author_name || row?.user_name || 'Anonymous',
  content: row?.content || row?.message || row?.text || '',
  created_at: row?.created_at || new Date().toISOString(),
});

const isMissingTableError = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('relation') && msg.includes('does not exist')
  );
};

const ComplaintDetailsScreen = ({ navigation, route }) => {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const { completeTask, activeTask, resolveTask } = useVolunteer();
  const { issue: initialIssue } = route.params;
  
  const [issue, setIssue] = useState(initialIssue);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsTable, setCommentsTable] = useState(null);
  const [chatUnavailableReason, setChatUnavailableReason] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [rewardCollected, setRewardCollected] = useState(false);
  const [localAfterPreview, setLocalAfterPreview] = useState(null);

  const isVolunteer = role === 'volunteer' || role === 'admin';
  const isResolved = issue.status === 'resolved' || issue.status === 'completed';
  const afterImageUrl = issue.after_photo_url || issue.proof_photo_url || localAfterPreview;
  const hasAfterProof = !!afterImageUrl;
  const isMissionCompleted = isResolved || hasAfterProof;
  const isAssignedToMe = issue.assigned_to === user?.id;
  const isMyActiveMission = activeTask?.id === issue.id;
  const canUploadAfter = isVolunteer && !isMissionCompleted && (isAssignedToMe || isMyActiveMission);
  const effectiveStatus = isMyActiveMission && issue.status === 'open' ? 'in_progress' : issue.status;

  useEffect(() => {
    fetchLatestIssue();
    fetchComments();
    fetchRewardStatus();
    
    // Subscribe to changes for this specific issue
    const channel = supabase
      .channel(`issue-${issue.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues', filter: `id=eq.${issue.id}` }, (payload) => {
        setIssue(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [issue.id]);

  useEffect(() => {
    if (!commentsTable) return;

    const commentsChannel = supabase
      .channel(`issue-comments-${issue.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: commentsTable, filter: `issue_id=eq.${issue.id}` }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [issue.id, commentsTable]);

  const resolveCommentsTable = async () => {
    if (commentsTable) return commentsTable;

    let lastError = null;
    for (const tableName of COMMENT_TABLE_CANDIDATES) {
      const { error } = await supabase.from(tableName).select('id').limit(1);

      if (!error || !isMissingTableError(error)) {
        setCommentsTable(tableName);
        return tableName;
      }

      lastError = error;
    }

    setChatUnavailableReason(lastError?.message || 'No chat table found');
    return null;
  };

  const fetchRewardStatus = async () => {
    if (!user?.id || !issue?.id) {
      setRewardCollected(false);
      return;
    }

    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('issue_id', issue.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log('[ComplaintDetails] Reward status fetch error:', error.message);
      return;
    }

    const latestReward = data?.[0];
    if (!latestReward) {
      setRewardCollected(false);
      return;
    }

    const collected =
      (typeof latestReward.status === 'string' && latestReward.status.toLowerCase() === 'credited') ||
      latestReward.claimed === true ||
      latestReward.is_claimed === true ||
      !('status' in latestReward);

    setRewardCollected(collected);
  };

  const fetchLatestIssue = async () => {
    const { data, error } = await supabase.from('issues').select('*').eq('id', issue.id).single();
    if (data) setIssue(data);
  };

  const fetchComments = async () => {
    setCommentsLoading(true);

    const tableName = await resolveCommentsTable();
    if (!tableName) {
      setCommentsLoading(false);
      setComments([]);
      return;
    }

    const selectVariants = [
      'id, issue_id, user_id, author_name, content, created_at',
      'id, issue_id, user_id, author_name, message, created_at',
      'id, issue_id, user_id, author_name, text, created_at',
      '*',
    ];

    let rows = null;
    let lastError = null;

    for (const selectClause of selectVariants) {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectClause)
        .eq('issue_id', issue.id)
        .order('created_at', { ascending: false });

      if (!error) {
        rows = data || [];
        break;
      }

      lastError = error;
    }

    if (rows) {
      setComments(rows.map(normalizeComment));
      setChatUnavailableReason('');
    } else {
      console.log('[ComplaintDetails] Comments fetch error:', lastError?.message);
      setChatUnavailableReason(lastError?.message || 'Unable to fetch chat');
      setComments([]);
    }

    setCommentsLoading(false);
  };

  const handleUpvote = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await supabase.rpc('increment_upvotes', { row_id: issue.id });
    if (error) {
        // Fallback if RPC doesn't exist yet
        const currentUpvotes = parseInt(issue.upvotes) || 0;
        await supabase.from('issues').update({ upvotes: currentUpvotes + 1 }).eq('id', issue.id);
    }
    showToast('Thanks for supporting this complaint');
  };

  const addComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    await Haptics.selectionAsync();

    const author = user.user_metadata?.full_name || profile?.full_name || 'Anonymous';
    const text = commentText.trim();
    const tableName = await resolveCommentsTable();

    if (!tableName) {
      showToast('Community chat is not configured in database yet.', 'error');
      setSubmittingComment(false);
      return;
    }

    const payloadVariants = [
      { issue_id: issue.id, user_id: user.id, author_name: author, content: text },
      { issue_id: issue.id, user_id: user.id, author_name: author, message: text },
      { issue_id: issue.id, user_id: user.id, author_name: author, text },
      { issue_id: issue.id, user_id: user.id, content: text },
      { issue_id: issue.id, user_id: user.id, message: text },
    ];

    let insertWorked = false;
    let lastError = null;

    for (const payload of payloadVariants) {
      const { error } = await supabase.from(tableName).insert(payload);
      if (!error) {
        insertWorked = true;
        break;
      }
      lastError = error;
    }

    if (insertWorked) {
      setCommentText('');
      await fetchComments();
      showToast('Comment added');
    } else {
      console.log('[ComplaintDetails] Comment insert error:', lastError?.message);
      showToast(`Failed to send comment: ${lastError?.message || 'Unknown error'}`, 'error');
    }

    setSubmittingComment(false);
  };

  const openInMaps = async () => {
    await Haptics.selectionAsync();
    
    // Support both direct columns and nested location objects
    const lat = issue.latitude || issue.location?.latitude;
    const lng = issue.longitude || issue.location?.longitude;
    
    if (!lat || !lng) {
      showToast("Location data missing for this complaint");
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      showToast("Could not open maps application");
    }
  };

  const uploadAfterImage = async (issueId) => {
    setProcessingAction(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
        const imageUri = await new Promise(async (resolve) => {
          Alert.alert(
            'Upload After Image',
            'Choose image source',
            [
              {
                text: 'Camera',
                onPress: async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') {
                    showToast('Camera permission required', 'error');
                    resolve(null);
                    return;
                  }

                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                  });
                  resolve(result.canceled ? null : result.assets[0].uri);
                },
              },
              {
                text: 'Gallery',
                onPress: async () => {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    showToast('Gallery permission required', 'error');
                    resolve(null);
                    return;
                  }

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                  });
                  resolve(result.canceled ? null : result.assets[0].uri);
                },
              },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            ],
            { cancelable: true, onDismiss: () => resolve(null) }
          );
        });

        if (!imageUri) return;
        setLocalAfterPreview(imageUri);

        showToast('Uploading proof...', 'info');
        const imageUrl = await uploadImage(imageUri);
        const rewardValue = DEFAULT_XP_REWARD;

        await resolveTask(issueId, imageUrl, rewardValue);
        setRewardCollected(true);

        // Update local view immediately so AFTER image appears right away.
        setIssue((prev) => ({
          ...prev,
          status: 'completed',
          proof_photo_url: imageUrl,
          after_photo_url: imageUrl,
          reward_amount: rewardValue,
          assigned_to: user?.id || prev.assigned_to,
        }));

        // Sync with server state in background.
        await fetchLatestIssue();

        if (activeTask?.id === issue.id) {
            completeTask();
        }

        showToast(`Mission complete. You claimed ${rewardValue} XP`);

    } catch (e) {
        console.error('[ComplaintDetails] Upload error:', e);
        showToast(`Failed to complete: ${e.message || 'Error'}`, 'error');
    } finally {
        setProcessingAction(false);
    }
  };

  const handleAfterImagePress = async () => {
    if (processingAction) return;

    if (canUploadAfter) {
      await uploadAfterImage(issue.id);
      return;
    }

    if (issue.status === 'open') {
      showToast('Accept this mission first to upload after photo', 'info');
      return;
    }

    if (issue.status === 'in_progress' && !isAssignedToMe) {
      showToast('Only assigned volunteer can upload proof', 'warning');
      return;
    }

    if (isMissionCompleted) {
      showToast('This complaint is already completed', 'info');
    }
  };

  const timeline = useMemo(() => {
    const base = [
      { key: 'open', label: 'Complaint Raised', icon: 'alert-circle' },
      { key: 'in_progress', label: 'Volunteer Assigned', icon: 'person' },
      { key: 'resolved', label: 'Fixed & Verified', icon: 'checkmark-circle' },
    ];
    const statusOrder = { open: 0, in_progress: 1, resolved: 2, completed: 2 };
    // Prioritize 'issue_type' and fallback
    const category = issue.issue_type || issue.type || issue.category;
    const currentIndex = statusOrder[effectiveStatus] ?? 0;
    
    return base.map((item, index) => ({
      ...item,
      done: index <= currentIndex,
    }));
  }, [effectiveStatus]);

  const timelineCurrentIndex = timeline.reduce((lastDone, step, index) => (step.done ? index : lastDone), -1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: issue.before_photo_url || issue.image_url || issue.image }} style={styles.heroImage} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>{issue.title}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => showToast('Share link copied')}>
          <Ionicons name="share-social-outline" size={16} color="#4F5D33" />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.metaRow} onPress={openInMaps}>
        <Ionicons name="location-outline" size={13} color="#756C60" />
        <Text style={styles.meta}>{issue.location_name || issue.locationName || 'Unknown location'}</Text>
        <Ionicons name="navigate-circle-outline" size={14} color="#4F5D33" style={{ marginLeft: 6 }} />
        <Text style={[styles.meta, { color: '#4F5D33', fontWeight: '700' }]}>Navigate</Text>
      </TouchableOpacity>

      <Text style={styles.description}>{issue.description}</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statusPill, isResolved ? styles.statusResolved : effectiveStatus === 'in_progress' ? styles.statusInProgress : styles.statusOpen]}>
          <Text style={[styles.statusPillText, isResolved ? { color: '#047857' } : effectiveStatus === 'in_progress' ? { color: '#C2410C' } : { color: '#1D4ED8' }]}> 
            {effectiveStatus.replace('_', ' ')}
          </Text>
        </View>
        <TouchableOpacity style={styles.upvoteBtn} onPress={handleUpvote}>
          <Ionicons name="thumbs-up" size={16} color="#4F5D33" />
          <Text style={styles.upvoteText}>{parseInt(issue.upvotes) || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progress Timeline</Text>
        <View style={styles.timelineWrap}>
          {timeline.map((item, index) => (
            <View key={item.key} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, item.done && styles.timelineDotDone]}>
                  <Ionicons name={item.icon} size={14} color={item.done ? '#FFFFFF' : '#94A3B8'} />
                </View>
                {index !== timeline.length - 1 && (
                  <View style={[styles.timelineConnector, index < timelineCurrentIndex && styles.timelineConnectorDone]} />
                )}
              </View>
              <Text style={[styles.timelineLabel, item.done && styles.timelineLabelDone]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Before & After */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Before & After</Text>
        <View style={styles.beforeAfterRow}>
          <View style={styles.beforeAfterCol}>
            <View style={[styles.beforeAfterLabel, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.beforeAfterLabelText, { color: '#B91C1C' }]}>BEFORE</Text>
            </View>
            <Image source={{ uri: issue.before_photo_url || issue.image_url || issue.image }} style={styles.beforeAfterImage} />
          </View>
          <View style={styles.beforeAfterCol}>
            <View style={[styles.beforeAfterLabel, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.beforeAfterLabelText, { color: '#047857' }]}>AFTER</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={handleAfterImagePress} disabled={processingAction}>
              {afterImageUrl ? (
                <Image source={{ uri: afterImageUrl }} style={styles.beforeAfterImage} />
              ) : (
                <View style={[styles.beforeAfterImage, styles.afterPending, canUploadAfter && styles.afterPendingUploadable]}>
                  <Ionicons name={canUploadAfter ? 'camera-outline' : 'hourglass-outline'} size={28} color={canUploadAfter ? '#047857' : '#94A3B8'} />
                  <Text style={[styles.afterPendingText, canUploadAfter && styles.afterPendingTextUploadable]}>
                    {canUploadAfter ? 'Tap to Capture & Upload' : 'Pending'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Volunteer Actions */}
      {isVolunteer && (
        <View style={[styles.card, styles.volunteerCard]}>
          <Text style={styles.sectionTitle}>Volunteer Actions</Text>
          {processingAction ? (
            <ActivityIndicator color="#4F5D33" style={{ marginVertical: 12 }} />
          ) : (
            <>
              {isMissionCompleted ? (
                <>
                  <View style={styles.completedChip}>
                    <Ionicons name="checkmark-circle" size={16} color="#047857" />
                    <Text style={styles.completedChipText}>Mission Completed</Text>
                  </View>
                  {rewardCollected ? (
                    <TouchableOpacity
                      style={[styles.uploadBtn, styles.rewardCollectedBtn]}
                      activeOpacity={1}
                      disabled
                    >
                      <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadBtnText}>Reward Collected - {DEFAULT_XP_REWARD} XP</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.uploadBtn, styles.rewardBtn]}
                      onPress={() => navigation.navigate('Rewards')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="trophy-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadBtnText}>Collect Reward - {DEFAULT_XP_REWARD} XP</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.uploadBtn, !canUploadAfter && styles.uploadBtnDisabled]}
                    onPress={handleAfterImagePress}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.uploadBtnText}>Upload After Image</Text>
                  </TouchableOpacity>
                  {!canUploadAfter && (
                    <Text style={styles.uploadHelperText}>Accept task from Queue first, then upload after image.</Text>
                  )}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* Reward Info (if resolved) */}
      {isResolved && (
          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Impact Metrics</Text>
              <View style={styles.infoGrid}>
                  <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Volunteer Reward</Text>
                      <Text style={[styles.infoGridValue, { color: '#047857', fontWeight: '800' }]}>{issue.reward_amount || DEFAULT_XP_REWARD} XP</Text>
                  </View>
                  <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Status</Text>
                      <Text style={styles.infoGridValue}>Credited</Text>
                  </View>
              </View>
          </View>
      )}

      {/* Comments */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Community Chat</Text>
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment…"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={addComment} disabled={submittingComment}>
            {submittingComment ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
        {comments.map((c) => (
          <View key={c.id} style={styles.commentItem}>
            <Text style={styles.commentAuthor}>{c.author_name}</Text>
            <Text style={styles.commentText}>{c.content}</Text>
            <Text style={styles.commentDate}>{formatDate(c.created_at)}</Text>
          </View>
        ))}
        {!commentsLoading && comments.length === 0 ? (
          <Text style={styles.emptyCommentsText}>
            {chatUnavailableReason ? 'Community chat is unavailable: missing chat table in DB.' : 'No messages yet. Start the community chat.'}
          </Text>
        ) : null}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE9E1' },
  content: { paddingBottom: 40 },
  heroImage: { width: '100%', height: 240 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: 14, paddingBottom: 4 },
  title: { flex: 1, color: '#1F1F1D', fontSize: 21, fontWeight: '800', lineHeight: 26 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E4E6D8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  shareText: { color: '#4F5D33', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, marginBottom: 6 },
  meta: { color: '#756C60', fontSize: 12 },
  description: { color: '#5F5549', fontSize: 13, lineHeight: 19, paddingHorizontal: 14, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12 },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  statusOpen: { backgroundColor: '#EFF6FF' },
  statusInProgress: { backgroundColor: '#FFF7ED' },
  statusResolved: { backgroundColor: '#F0FDF4' },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  upvoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E4E6D8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  upvoteText: { color: '#4F5D33', fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 14, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: '#DCD6CB', backgroundColor: '#F4F1EA', padding: 14 },
  sectionTitle: { color: '#1F1F1D', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  timelineWrap: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: '#4F5D33' },
  timelineConnector: { width: 2, height: 20, backgroundColor: '#E2E8F0', marginVertical: 2 },
  timelineConnectorDone: { backgroundColor: '#4F5D33' },
  timelineLabel: { color: '#94A3B8', fontWeight: '600', fontSize: 13, paddingTop: 5 },
  timelineLabelDone: { color: '#1F1F1D' },
  beforeAfterRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  beforeAfterCol: { flex: 1 },
  beforeAfterLabel: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  beforeAfterLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  beforeAfterImage: { width: '100%', height: 150, borderRadius: 12 },
  afterPending: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  afterPendingUploadable: { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' },
  afterPendingTextUploadable: { color: '#047857', fontWeight: '700' },
  afterPendingText: { color: '#94A3B8', fontSize: 12, marginTop: 6, fontWeight: '600' },
  volunteerCard: { borderColor: '#4F5D3340', backgroundColor: '#F8FAF4' },
  uploadBtn: { height: 46, borderRadius: 12, backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadBtnDisabled: { backgroundColor: '#94A3B8' },
  rewardBtn: { backgroundColor: '#4F5D33', marginTop: 10 },
  rewardCollectedBtn: { backgroundColor: '#059669', marginTop: 10, opacity: 0.9 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  uploadHelperText: { marginTop: 8, color: '#6B7280', fontSize: 12, textAlign: 'center' },
  completedChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 999, paddingVertical: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  completedChipText: { color: '#047857', fontSize: 13, fontWeight: '700' },
  commentInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 15 },
  commentInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 10, color: '#1F1F1D', fontSize: 13 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F5D33', alignItems: 'center', justifyContent: 'center' },
  commentItem: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  commentAuthor: { color: '#1F1F1D', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentText: { color: '#5F5549', fontSize: 12, lineHeight: 18 },
  commentDate: { color: '#94A3B8', fontSize: 9, marginTop: 6, textAlign: 'right' },
  emptyCommentsText: { color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  infoGrid: { flexDirection: 'row', gap: 20 },
  infoGridItem: { flex: 1 },
  infoGridLabel: { color: '#756C60', fontSize: 10, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  infoGridValue: { color: '#1F1F1D', fontSize: 13 },
});

export default ComplaintDetailsScreen;
