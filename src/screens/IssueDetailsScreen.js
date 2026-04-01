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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useVolunteer } from '../context/VolunteerContext';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../utils/storage';

const rewardBySeverity = { critical: 800, medium: 500, low: 300 };

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
};

const IssueDetailsScreen = ({ navigation, route }) => {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const { startTask, completeTask, activeTask } = useVolunteer();
  const { issue: initialIssue } = route.params;
  
  const [issue, setIssue] = useState(initialIssue);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const isVolunteer = role === 'volunteer' || role === 'admin';
  const isResolved = issue.status === 'resolved';

  useEffect(() => {
    fetchLatestIssue();
    fetchComments();
    
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

  const fetchLatestIssue = async () => {
    const { data, error } = await supabase.from('issues').select('*').eq('id', issue.id).single();
    if (data) setIssue(data);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('issue_id', issue.id)
        .order('created_at', { ascending: false });
    if (data) setComments(data);
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
    
    const { error } = await supabase.from('comments').insert({
        issue_id: issue.id,
        user_id: user.id,
        author_name: user.user_metadata?.full_name || 'Anonymous',
        content: commentText.trim()
    });

    if (!error) {
        setCommentText('');
        fetchComments();
        showToast('Comment added');
    }
    setSubmittingComment(false);
  };

  const acceptComplaint = async () => {
    setProcessingAction(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { error } = await supabase
        .from('issues')
        .update({ 
            status: 'in_progress', 
            volunteer_id: user.id,
            assigned_at: new Date().toISOString() 
        })
        .eq('id', issue.id);

    if (!error) {
        startTask(issue);
        showToast('Complaint accepted! Opening Map...');
        setTimeout(() => navigation.navigate('Map'), 1000);
    } else {
        showToast('Failed to accept complaint', 'error');
    }
    setProcessingAction(false);
  };

  const uploadProofAndResolve = async () => {
    setProcessingAction(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        showToast('Camera permission required', 'error');
        setProcessingAction(false);
        return;
    }

    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
    });

    if (result.canceled) {
        setProcessingAction(false);
        return;
    }

    const proofUri = result.assets[0].uri;
    const amount = rewardBySeverity[issue.severity] || 300;

    // 1. Upload the completion proof to Supabase Storage
    const publicUrl = await uploadImage(proofUri);
    if (!publicUrl) {
        showToast('Failed to upload proof image', 'error');
        setProcessingAction(false);
        return;
    }

    // 2. Update the database with the public URL
    const { error } = await supabase
        .from('issues')
        .update({ 
            status: 'resolved', 
            after_image_url: publicUrl,
            resolved_at: new Date().toISOString(),
            reward_amount: amount,
            reward_status: 'credited'
        })
        .eq('id', issue.id);

    if (!error) {
        if (activeTask?.id === issue.id) {
            completeTask();
        }
        showToast(`✅ Fixed! Reward unlocked: ₹${amount}`);
    } else {
        showToast('Failed to resolve issue', 'error');
    }
    setProcessingAction(false);
  };

  const timeline = useMemo(() => {
    const base = [
      { key: 'open', label: 'Complaint Raised', icon: 'alert-circle' },
      { key: 'in_progress', label: 'Volunteer Assigned', icon: 'person' },
      { key: 'resolved', label: 'Fixed & Verified', icon: 'checkmark-circle' },
    ];
    const statusOrder = { open: 0, in_progress: 1, resolved: 2 };
    // Prioritize 'issue_type' and fallback
    const category = issue.issue_type || issue.type || issue.category;
    const currentIndex = statusOrder[issue.status] ?? 0;
    
    return base.map((item, index) => ({
      ...item,
      done: index <= currentIndex,
    }));
  }, [issue.status]);

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

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color="#756C60" />
        <Text style={styles.meta}>{issue.location_name || issue.locationName || 'Unknown location'}</Text>
      </View>

      <Text style={styles.description}>{issue.description}</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statusPill, isResolved ? styles.statusResolved : issue.status === 'in_progress' ? styles.statusInProgress : styles.statusOpen]}>
          <Text style={[styles.statusPillText, isResolved ? { color: '#047857' } : issue.status === 'in_progress' ? { color: '#C2410C' } : { color: '#1D4ED8' }]}>
            {issue.status.replace('_', ' ')}
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
                  <View style={[styles.timelineConnector, item.done && styles.timelineConnectorDone]} />
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
            {isResolved && issue.after_image_url ? (
              <Image source={{ uri: issue.after_image_url }} style={styles.beforeAfterImage} />
            ) : (
              <View style={[styles.beforeAfterImage, styles.afterPending]}>
                <Ionicons name="hourglass-outline" size={28} color="#94A3B8" />
                <Text style={styles.afterPendingText}>Pending</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Volunteer Actions */}
      {isVolunteer && !isResolved && (
        <View style={[styles.card, styles.volunteerCard]}>
          <Text style={styles.sectionTitle}>Volunteer Actions</Text>
          {processingAction ? (
              <ActivityIndicator color="#4F5D33" style={{ marginVertical: 20 }} />
          ) : (
              <>
                {issue.status === 'open' ? (
                    <TouchableOpacity style={styles.uploadBtn} onPress={acceptComplaint}>
                        <Ionicons name="hand-right-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.uploadBtnText}>Accept Mission</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#10B981' }]} onPress={uploadProofAndResolve}>
                        <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.uploadBtnText}>Upload Completion Proof</Text>
                    </TouchableOpacity>
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
                      <Text style={[styles.infoGridValue, { color: '#047857', fontWeight: '800' }]}>₹{issue.reward_amount || rewardBySeverity[issue.severity]}</Text>
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
  afterPendingText: { color: '#94A3B8', fontSize: 12, marginTop: 6, fontWeight: '600' },
  volunteerCard: { borderColor: '#4F5D3340', backgroundColor: '#F8FAF4' },
  uploadBtn: { height: 48, borderRadius: 12, backgroundColor: '#4F5D33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#4F5D33', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  commentInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 15 },
  commentInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 10, color: '#1F1F1D', fontSize: 13 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F5D33', alignItems: 'center', justifyContent: 'center' },
  commentItem: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  commentAuthor: { color: '#1F1F1D', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentText: { color: '#5F5549', fontSize: 12, lineHeight: 18 },
  commentDate: { color: '#94A3B8', fontSize: 9, marginTop: 6, textAlign: 'right' },
  infoGrid: { flexDirection: 'row', gap: 20 },
  infoGridItem: { flex: 1 },
  infoGridLabel: { color: '#756C60', fontSize: 10, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  infoGridValue: { color: '#1F1F1D', fontSize: 13 },
});

export default IssueDetailsScreen;
