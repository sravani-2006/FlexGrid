import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import VolunteerTaskMap from '../components/VolunteerTaskMap';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useVolunteer } from '../context/VolunteerContext';
import { useIssues } from '../hooks/useIssues';

const VolunteerMapScreen = ({ navigation }) => {
    const { colors, typography } = useTheme();
    const { showToast } = useToast();
    const { activeTask, sessionStats, volunteerLocation } = useVolunteer();
    const { issues, loading: issuesLoading } = useIssues();
    const [selectedIssue, setSelectedIssue] = useState(null);

    useEffect(() => {
        if (activeTask) {
            // Find the latest version of the active task from Supabase issues
            const latest = issues.find(i => i.id === activeTask.id);
            setSelectedIssue(latest || activeTask);
        }
    }, [activeTask, issues]);

    const openNavigation = async () => {
        if (!selectedIssue) return;
        await Haptics.selectionAsync();
        
        // Handling both mock location object and Supabase flat columns
        const lat = selectedIssue.latitude || selectedIssue.location?.latitude;
        const lng = selectedIssue.longitude || selectedIssue.location?.longitude;
        
        if (!lat || !lng) {
            showToast("Location data missing for this task");
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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text, fontFamily: typography.heading }]}>Volunteer Network</Text>
                    <Text style={[styles.subtitle, { color: colors.muted, fontFamily: typography.body }]}>
                        {activeTask ? 'Active Mission in Progress' : 'Scanning for nearby complaints'}
                    </Text>
                </View>
                {activeTask && (
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>TRACKING LIVE</Text>
                    </View>
                )}
            </View>

            <View style={styles.mapContainer}>
                {issuesLoading && <ActivityIndicator style={styles.loader} color={colors.primary} />}
                <VolunteerTaskMap
                    issues={issues}
                    selectedIssue={selectedIssue}
                    onMarkerPress={setSelectedIssue}
                    volunteerLocation={volunteerLocation}
                    activeTask={activeTask}
                />

                {/* Tracking Stats Overlay */}
                <View style={[styles.statsOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: colors.primary, fontFamily: typography.heading }]}>
                            {sessionStats.distance.toFixed(2)} km
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.muted }]}>DISTANCE</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.heading }]}>
                            {sessionStats.tasksCompleted}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.muted }]}>TASKS</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: '#B86D2D', fontFamily: typography.heading }]}>
                            Low
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.muted }]}>LATENCY</Text>
                    </View>
                </View>
            </View>

            {selectedIssue ? (
                <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.panelHeader}>
                        <View style={styles.panelInfo}>
                            <Text style={[styles.panelTitle, { color: colors.text, fontFamily: typography.label }]}>{selectedIssue.title}</Text>
                            <Text style={[styles.panelMeta, { color: colors.muted }]}>{selectedIssue.location_name || selectedIssue.locationName}</Text>
                        </View>
                        <View style={[styles.severityPill, { backgroundColor: selectedIssue.severity === 'critical' ? '#FEE2E2' : '#EFF6FF' }]}>
                             <Text style={[styles.severityText, { color: selectedIssue.severity === 'critical' ? '#B91C1C' : '#1D4ED8' }]}>
                                {selectedIssue.severity?.toUpperCase()}
                             </Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.secondaryBtn, { borderColor: colors.border }]} 
                            onPress={() => navigation.navigate('IssueDetails', { issue: selectedIssue })}
                        >
                            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
                            onPress={openNavigation}
                        >
                            <MaterialCommunityIcons name="navigation-variant" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>Navigate</Text>
                        </TouchableOpacity>

                        {activeTask?.id === selectedIssue.id && (
                            <TouchableOpacity 
                                style={[styles.primaryBtn, { backgroundColor: '#10B981' }]} 
                                onPress={() => navigation.navigate('IssueDetails', { issue: selectedIssue })}
                            >
                                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryBtnText}>Upload</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ) : (
                <View style={[styles.emptyPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="location-outline" size={24} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Select a marker on the map to view task details and start navigation.</Text>
                </View>
            )}
            <View style={{ height: 80 }} /> 
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 24, fontWeight: '800' },
    subtitle: { fontSize: 13, marginTop: 4 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
    liveText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
    mapContainer: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB' },
    loader: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
    statsOverlay: {
        position: 'absolute', top: 12, left: 12, right: 12, height: 64, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
        elevation: 6, borderWidth: 1,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    statDivider: { width: 1, height: 28, marginHorizontal: 8 },
    bottomPanel: {
        margin: 16, marginTop: 12, borderRadius: 20, borderWidth: 1, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
        elevation: 4,
    },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    panelInfo: { flex: 1, marginRight: 12 },
    panelTitle: { fontSize: 17, fontWeight: '700' },
    panelMeta: { fontSize: 12, marginTop: 4 },
    severityPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    severityText: { fontSize: 10, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 12 },
    primaryBtn: { flex: 2, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    secondaryBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    secondaryBtnText: { fontWeight: '700', fontSize: 14 },
    emptyPanel: { margin: 16, marginTop: 12, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
});

export default VolunteerMapScreen;
