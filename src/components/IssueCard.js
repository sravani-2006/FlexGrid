import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import StatusBadge from './StatusBadge';
import Timer from './Timer';

const IssueCard = ({ issue, onPress }) => {
  const displayImage = issue.before_photo_url || issue.image_url || issue.image;
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: displayImage }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{issue.title}</Text>
        <StatusBadge status={issue.status} />
        <Timer />
        <Text style={styles.upvotes}>Upvotes: {issue.upvotes}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  content: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 5,
  },
  upvotes: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default IssueCard;