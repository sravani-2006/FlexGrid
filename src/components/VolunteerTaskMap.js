import React from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const SEVERITY_COLORS = {
    critical: '#DC2626',
    medium: '#F59E0B',
    low: '#10B981',
};

const MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];

const VolunteerTaskMap = ({
    issues,
    selectedIssue,
    onMarkerPress,
    volunteerLocation,
    activeTask,
}) => {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webFallback}>
                <Ionicons name="map" size={48} color="#94A3B8" />
                <Text style={styles.webText}>Map is active on physical devices via Expo Go.</Text>
            </View>
        );
    }

    const initialRegion = {
        latitude: volunteerLocation?.latitude || 12.9716,
        longitude: volunteerLocation?.longitude || 77.5946,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    return (
        <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialRegion}
            customMapStyle={MAP_STYLE}
        >
            {/* Volunteer Location Marker */}
            {volunteerLocation && (
                <Marker coordinate={volunteerLocation} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.volunteerMarkerOuter}>
                        <View style={styles.volunteerMarkerInner} />
                    </View>
                </Marker>
            )}

            {/* Path to Active Task */}
            {activeTask && volunteerLocation && (
                <Polyline
                    coordinates={[volunteerLocation, activeTask.location]}
                    strokeColor="#4F5D33"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                />
            )}

            {/* Issue Markers */}
            {(issues || []).map((issue) => {
                const isActive = activeTask?.id === issue.id;
                const isSelected = selectedIssue?.id === issue.id;
                
                return (
                    <Marker
                        key={issue.id}
                        coordinate={issue.location}
                        onPress={() => onMarkerPress && onMarkerPress(issue)}
                    >
                        <View style={[
                            styles.markerContainer,
                            { backgroundColor: isSelected ? '#1F1F1D' : SEVERITY_COLORS[issue.severity] || '#4F5D33' },
                            isActive && styles.activeMarker
                        ]}>
                            <MaterialCommunityIcons 
                                name={isActive ? "run-fast" : "alert-decagram"} 
                                size={isSelected ? 16 : 14} 
                                color="#FFFFFF" 
                            />
                        </View>
                    </Marker>
                );
            })}
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: { flex: 1 },
    webFallback: {
        flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', gap: 12
    },
    webText: { color: '#64748B', fontSize: 13, fontWeight: '600', maxWidth: 200, textAlign: 'center' },
    markerContainer: {
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3,
        elevation: 4,
    },
    activeMarker: {
        borderColor: '#4F5D33', borderWidth: 3, scaleX: 1.2, scaleY: 1.2
    },
    volunteerMarkerOuter: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(79, 93, 51, 0.2)',
        alignItems: 'center', justifyContent: 'center'
    },
    volunteerMarkerInner: {
        width: 14, height: 14, borderRadius: 7, backgroundColor: '#4F5D33',
        borderWidth: 2, borderColor: '#FFFFFF'
    }
});

export default VolunteerTaskMap;
