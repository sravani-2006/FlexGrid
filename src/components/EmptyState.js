import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EmptyState = ({ title = 'No issues reported yet', subtitle = 'Try changing filters or report a new issue.' }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="rocket-outline" size={38} color="#94A3B8" />
      <Text style={styles.title}>{title} 🚀</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    backgroundColor: '#F4F1EA',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    marginTop: 8,
    color: '#1F1F1D',
    fontWeight: '700',
    fontSize: 16,
  },
  subtitle: {
    marginTop: 6,
    color: '#756C60',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default EmptyState;
