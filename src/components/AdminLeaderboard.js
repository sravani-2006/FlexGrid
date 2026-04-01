import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

const mockAdmins = [
  { id: '1', name: 'Admin A', resolved: 150 },
  { id: '2', name: 'Admin B', resolved: 120 },
  { id: '3', name: 'Admin C', resolved: 100 },
  { id: '4', name: 'Admin D', resolved: 86 },
];

const AdminLeaderboard = () => {
  const max = Math.max(...mockAdmins.map((item) => item.resolved));

  const getBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '🏅';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Admin Leaderboard</Text>
      <Text style={styles.subtitle}>Resolution performance this month</Text>

      {mockAdmins.map((item, index) => (
        <View key={item.id} style={[styles.item, index === 0 && styles.topItem]}>
          <View style={styles.rankWrap}>
            <Text style={styles.badge}>{getBadge(index)}</Text>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>

          <View style={styles.mainCol}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.score}>{item.resolved}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((item.resolved / max) * 100)}%` }]} />
            </View>
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE9E1',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F1F1D',
  },
  subtitle: {
    marginTop: 4,
    color: '#756C60',
    fontSize: 12,
    marginBottom: 10,
  },
  item: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    backgroundColor: '#F4F1EA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topItem: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  rankWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 20,
  },
  rankText: {
    marginTop: 3,
    color: '#756C60',
    fontSize: 11,
    fontWeight: '700',
  },
  mainCol: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: '#1F1F1D',
    fontSize: 14,
    fontWeight: '700',
  },
  score: {
    color: '#4F5D33',
    fontWeight: '800',
    fontSize: 16,
  },
  track: {
    marginTop: 8,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  fill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4F5D33',
  },
});

export default AdminLeaderboard;
