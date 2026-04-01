import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const UpvoteButton = ({ onPress }) => {
  const [upvoted, setUpvoted] = useState(false);

  const handlePress = () => {
    setUpvoted(!upvoted);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, upvoted && styles.upvoted]}
      onPress={handlePress}
    >
      <Text style={[styles.text, upvoted && styles.upvotedText]}>
        {upvoted ? 'Upvoted' : 'Upvote'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#DCD6CB',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  upvoted: {
    backgroundColor: '#10B981',
  },
  text: {
    color: '#6B7280',
    fontWeight: 'bold',
  },
  upvotedText: {
    color: '#FFFFFF',
  },
});

export default UpvoteButton;