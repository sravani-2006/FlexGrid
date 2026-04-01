import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const MapViewComponent = ({ issues, onMarkerPress }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webText}>Map preview is available on Android/iOS.</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      {(issues || []).map(issue => (
        <Marker
          key={issue.id}
          coordinate={issue.location}
          onPress={() => onMarkerPress && onMarkerPress(issue)}
        />
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    backgroundColor: '#DCD6CB',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  webText: {
    color: '#374151',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MapViewComponent;