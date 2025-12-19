import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

const LoadingAnimation = ({ onFinish }) => {
  // 1. Create the player instance
  const player = useVideoPlayer(require('../../assets/1000064992-vmake.mp4'), (player) => {
    player.loop = false;
    player.play();
  });

  // 2. Listen for finish
  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (onFinish) onFinish();
    });

    return () => subscription.remove();
  }, [player, onFinish]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        // FIXED: Replaced 'allowsFullscreen' with 'fullscreenOptions'
        fullscreenOptions={{ isAllowed: false }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: width,
    height: height,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default LoadingAnimation;