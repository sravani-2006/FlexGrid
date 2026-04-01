import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonIssueCard = () => (
  <View style={styles.card}>
    <View style={styles.image} />
    <View style={styles.lineLg} />
    <View style={styles.lineSm} />
    <View style={styles.row}>
      <View style={styles.pill} />
      <View style={styles.pill} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F4F1EA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    padding: 12,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#DCD6CB',
    marginBottom: 10,
  },
  lineLg: {
    height: 14,
    borderRadius: 8,
    backgroundColor: '#DCD6CB',
    width: '72%',
    marginBottom: 8,
  },
  lineSm: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#DCD6CB',
    width: '50%',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    width: 80,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCD6CB',
  },
});

export default SkeletonIssueCard;
