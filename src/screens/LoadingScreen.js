import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; // Import this
import LoadingAnimation from './LoadingAnimation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

const LoadingScreen = ({ navigation }) => {
  const [userSession, setUserSession] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const navigationPerformed = useRef(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        const session = await AsyncStorage.getItem('userSession');
        setUserSession(session);
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setDataLoaded(true);
      }
    };

    prepareApp();
  }, []);

  // New function: Hides the App Icon only when video is actually playing
  const handleVideoReady = async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      // ignore
    }
  };

  const handleVideoFinish = () => {
    if (navigationPerformed.current) return;
    
    if (dataLoaded) {
      navigationPerformed.current = true;
      if (userSession) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    } else {
      setTimeout(() => {
         handleVideoFinish();
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden /> 
      <LoadingAnimation 
        onFinish={handleVideoFinish} 
        onReady={handleVideoReady} // Pass the ready handler
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // CHANGED: Match the video background color exactly to prevent black flashes
    backgroundColor: '#f0e8e8ff', 
  },
});

export default LoadingScreen;