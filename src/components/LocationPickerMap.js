import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const LocationPickerMap = ({ location, onDragEnd }) => {
  if (!location) return null;

  return (
    <View style={styles.container}>
      {/* Fallback box underneath the map so it's not totally blank if tiles fail */}
      <View style={styles.fallbackBox}>
         <Text style={{textAlign: 'center', color: '#756C60', fontWeight: '500'}}>Loading Map Tiles...</Text>
      </View>
      
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker
          coordinate={location}
          draggable
          onDragEnd={(e) => onDragEnd(e.nativeEvent.coordinate)}
        />
      </MapView>

      {/* Persistent coordinates overlay */}
      <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>📍 Map Coordinates</Text>
          <Text style={styles.overlayCoord}>Lat: {location.latitude.toFixed(6)}</Text>
          <Text style={styles.overlayCoord}>Lng: {location.longitude.toFixed(6)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    borderRadius: 12
  },
  fallbackBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  overlay: {
    position: 'absolute', 
    bottom: 8, 
    left: 8, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 10, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  overlayTitle: {
    fontSize: 12, 
    fontWeight: '800', 
    color: '#1F1F1D', 
    marginBottom: 4
  },
  overlayCoord: {
     fontSize: 11, 
     color: '#4F5D33', 
     fontWeight: '600'
  }
});

export default LocationPickerMap;
