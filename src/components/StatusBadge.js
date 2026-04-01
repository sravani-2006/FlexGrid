import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusBadge = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'open': return '#6B7280';
      case 'in_progress': return '#F59E0B';
      case 'resolved': return '#10B981';
      case 'breached': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.text}>{status.replace('_', ' ').toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginVertical: 5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default StatusBadge;