import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This is a simple test component.
const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>THIS IS A TEST</Text>
      <Text style={styles.text}>If you can see this, the file is updating.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#084298', // A bright purple color
  },
  text: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 10,
  },
});

export default HomeScreen;