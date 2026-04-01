import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Timer = () => {
  const [timeLeft, setTimeLeft] = useState(86400); // 24 hours in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Time Left: {formatTime(timeLeft)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  text: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: 'bold',
  },
});

export default Timer;