import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, Easing } from 'react-native';

// Get screen width to make the logo responsive and large
const { width } = Dimensions.get('window');

const AnimatedSplash = ({ onFinish }) => {
  // 1. Initial Values
  const scaleValue = useRef(new Animated.Value(0)).current;   // Starts tiny (scale 0)
  const opacityValue = useRef(new Animated.Value(0)).current; // Starts invisible

  useEffect(() => {
    // 2. Start the animation sequence
    Animated.sequence([
      // Parallel: Zoom In + Fade In at the same time
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,                     // Grows to full size (defined in styles)
          duration: 3500,                 // Slow duration: 3.5 seconds
          easing: Easing.out(Easing.exp), // Smooths the end of the animation
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,                     // Fades to fully visible
          duration: 1000,                 // Fades in over 1 second
          useNativeDriver: true,
        }),
      ]),
      // Optional: Hold the final big image for a moment (500ms)
      Animated.delay(500) 
    ]).start(() => {
      // 3. When finished, trigger the callback to load the main app
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.imageContainer, 
          { 
            transform: [{ scale: scaleValue }], // Bind scale to animation
            opacity: opacityValue 
          }
        ]}
      >
        {/* YOUR LOGO IMAGE - Make sure this path is correct! */}
        <Image 
          source={require('./assets/20260104_195159.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Background color matches your logo background
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    // UPDATED: Make it bigger (85% of screen width)
    width: width * 0.85,  
    height: width * 0.85, 
  },
});

export default AnimatedSplash;