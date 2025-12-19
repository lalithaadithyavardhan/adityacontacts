import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingAnimation from './LoadingAnimation'; // Ensure path is correct

const LoadingScreen = ({ navigation }) => {
  const [userSession, setUserSession] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const navigationPerformed = useRef(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Check session immediately
        const session = await AsyncStorage.getItem('userSession');
        setUserSession(session);
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setDataLoaded(true); // Mark data as ready
      }
    };

    prepareApp();
  }, []);

  const handleVideoFinish = () => {
    if (navigationPerformed.current) return;
    
    // Only navigate if our data check is done
    if (dataLoaded) {
      navigationPerformed.current = true;
      if (userSession) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    } else {
      // If video finished SUPER fast but AsyncStorage is slow (rare),
      // wait a tiny bit and retry.
      setTimeout(() => {
         handleVideoFinish();
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hide status bar for full immersion */}
      <StatusBar hidden /> 
      <LoadingAnimation onFinish={handleVideoFinish} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Matches video background
  },
});

export default LoadingScreen;