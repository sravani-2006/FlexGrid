import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const BeforeAfter = ({ before, after }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Before / After</Text>
      <View style={styles.images}>
        <View style={styles.imageContainer}>
          <Text style={styles.label}>Before</Text>
          <Image source={{ uri: before }} style={styles.image} />
        </View>
        <View style={styles.imageContainer}>
          <Text style={styles.label}>After</Text>
          <Image source={{ uri: after }} style={styles.image} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  images: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
});

export default BeforeAfter;