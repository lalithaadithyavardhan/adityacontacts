import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

const LoadingAnimation = ({ onFinish, onReady }) => {
  // 1. Create the player instance
  const player = useVideoPlayer(require('../../assets/km_20260104_1080p_30f_20260104_200900.mp4'), (player) => {
    player.loop = false;
    player.play();
  });

  // 2. Listen for events
  useEffect(() => {
    // Listener 1: When video actually starts playing (Is Playing = true)
    const playingSubscription = player.addListener('playingChange', (isPlaying) => {
      if (isPlaying && onReady) {
        onReady(); // Hide the splash screen NOW
      }
    });

    // Listener 2: When video finishes
    const finishSubscription = player.addListener('playToEnd', () => {
      if (onFinish) onFinish();
    });

    return () => {
      playingSubscription.remove();
      finishSubscription.remove();
    };
  }, [player, onFinish, onReady]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover" // Ensures no black bars
        nativeControls={false}
        fullscreenOptions={{ isAllowed: false }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Ensure this matches the LoadingScreen background
    backgroundColor: '#f0e8e8ff', 
    width: width,
    height: height,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default LoadingAnimation;