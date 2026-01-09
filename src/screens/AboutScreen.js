import React, { useLayoutEffect, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Linking,
  StatusBar,
  Alert,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// --- REUSABLE COMPONENTS ---

// 1. Reusable Contact Row
const ContactRow = ({ icon, label, value, onPress, isLast }) => (
  <TouchableOpacity
    style={[styles.contactRow, isLast && { borderBottomWidth: 0 }]}
    onPress={onPress}
  >
    <View style={styles.contactIcon}>
      <Ionicons name={icon} size={18} color="#F05819" />
    </View>
    <View style={styles.contactInfo}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={styles.contactValue}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const AboutScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [tapCount, setTapCount] = useState(0);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current; // Started lower for better spring effect
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- NEW SMOOTHER ENTRY ANIMATION ---
  useEffect(() => {
    Animated.parallel([
      // Fade in slightly faster to cover the shadow glitch
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, 
        useNativeDriver: true,
      }),
      // Spring animation for a "Handsome" smooth bounce
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Safe Link Handler
  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open this link. Please check your apps.");
      }
    } catch (error) {
      console.error("An error occurred", error);
    }
  };

  const handleSecretLogoPress = () => {
    // Animate Logo Tap
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();

    const count = tapCount + 1;
    setTapCount(count);

    if (count === 5) {
      Alert.alert(
        'Original Developer Credits',
        'Designed & Developed by:\n\nBorra Adithya\n\nGitHub: @lalithaadithyavardhan\n\nThis application architecture is digitally signed.',
        [{ text: 'Close', onPress: () => setTapCount(0) }]
      );
    }

    setTimeout(() => {
      if (count < 5) setTapCount(0);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />

      {/* GRADIENT HEADER */}
      <LinearGradient
        colors={['#F05819', '#F05819']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* ANIMATED CONTENT WRAPPER */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }], 
            width: '100%', 
            alignItems: 'center' 
          }}
        >
          
          {/* LOGO SECTION */}
          <View style={styles.logoContainer}>
            <TouchableWithoutFeedback onPress={handleSecretLogoPress}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Image
                  source={require('../../assets/au_logo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>

          {/* CARD 1: MERGED UNIVERSITY INFO & CONTACTS */}
          <View style={styles.card}>
            {/* Part A: About University */}
            <View style={styles.cardHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name="school-outline" size={22} color="#F05819" />
              </View>
              <Text style={styles.cardTitle}>About Aditya University</Text>
            </View>
            <Text style={styles.paragraph}>
              Aditya University is a leading institution in Surampalem, Andhra Pradesh, committed to academic excellence, innovation, and research-driven education. It is known for its wide array of programs and has earned NAAC's highest 'A++' grade.
            </Text>

            {/* Divider Line */}
            <View style={styles.divider} />

            {/* Part B: Official Contacts */}
            <View style={[styles.cardHeader, { marginTop: 10 }]}>
              <View style={styles.iconBadge}>
                <Ionicons name="call-outline" size={22} color="#F05819" />
              </View>
              <Text style={styles.cardTitle}>Official Contacts</Text>
            </View>

            <ContactRow 
              icon="call" 
              label="Admissions" 
              value="+91 9989776661" 
              onPress={() => handleOpenLink('tel:+919989776661')}
            />
            
            <ContactRow 
              icon="mail" 
              label="Email" 
              value="info@adityauniversity.in" 
              onPress={() => handleOpenLink('mailto:info@adityauniversity.in')}
              isLast
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#4A90E2" />
              <Text style={styles.infoBoxText}>
                For corrections or app issues, please report below
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actions}>
            {/* 1. Visit Website */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => handleOpenLink('https://adityauniversity.in')}
            >
              <LinearGradient
                colors={['#F05819', '#F05819']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="globe-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Visit University Website</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 2. Report Issue */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => handleOpenLink('mailto:borraadithya@gmail.com?subject=Contact App Issue')}
            >
              <LinearGradient
                colors={['#F05819', '#F05819']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="flag-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Report an Issue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* CARD 2: DEVELOPER SECTION */}
          <View style={styles.devCard}>
            <View style={styles.devHeader}>
              <Text style={styles.devTitle}>Developed By</Text>
              <Text style={styles.devName}>Borra Adhitya</Text>
              
              <Text style={styles.devMessage}>
                This application was designed to provide faculty with accurate and quick access to essential university resources.
              </Text>
            </View>

            {/* Developer Actions */}
            <View style={styles.devActionsGrid}>
              <TouchableOpacity style={styles.devButtonSmall} onPress={() => handleOpenLink('mailto:adithyasai533@gmail.com')}>
                <View style={styles.devIconCircle}><Ionicons name="mail" size={20} color="#F05819" /></View>
                <Text style={styles.devButtonLabel}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.devButtonSmall} onPress={() => handleOpenLink('tel:+919492198886')}>
                <View style={styles.devIconCircle}><Ionicons name="call" size={20} color="#F05819" /></View>
                <Text style={styles.devButtonLabel}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.devButtonSmall} onPress={() => handleOpenLink('https://github.com/lalithaadithyavardhan')}>
                <View style={styles.devIconCircle}><Ionicons name="logo-github" size={20} color="#F05819" /></View>
                <Text style={styles.devButtonLabel}>GitHub</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.madeWithContainer}>
              <View style={styles.heartBeat}>
                <Text style={styles.heartIcon}>❤️</Text>
              </View>
              <Text style={styles.madeWith}>Built with care and attention to detail</Text>
            </View>

            <Text style={styles.copyright}>© 2025 Aditya University All rights reserved.</Text>
            
            <Text style={styles.appVersionBottom}>Version 1.1.0</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutScreen;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100, 
  },
  backBtn: { 
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: { 
    padding: 20, 
    alignItems: 'center' 
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  logo: { 
    width: 180, 
    height: 95,
  },
  appVersionBottom: {
    marginTop: 8,
    fontSize: 12,
    color: '#030303ff',
    fontWeight: '500',
    marginBottom: 10,
  },
  // MERGED CARD STYLE
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    // Cleaned up Shadow/Elevation to avoid "Dark Border" glitch
    elevation: 4, 
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Increased slightly for better look on iOS
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  paragraph: {
    fontSize: 14,
    color: '#5A6C7D',
    lineHeight: 22,
    marginBottom: 10, 
  },
  // SEPARATOR LINE
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
    width: '100%',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  infoBoxText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#4A90E2',
    flex: 1,
    lineHeight: 18,
  },
  actions: { 
    width: '100%', 
    marginBottom: 20 
  },
  primaryButton: {
    borderRadius: 30,
    marginBottom: 12,
    elevation: 5,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  devCard: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    // REMOVED borderTopWidth/Color here to fix the "Two Color" glitch
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  devHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  devTitle: { 
    fontSize: 13, 
    color: '#999',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  devName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
    color: '#2C3E50',
  },
  devMessage: {
    fontSize: 14,
    color: '#5A6C7D',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  devActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
    gap: 12, 
  },
  devButtonSmall: {
    alignItems: 'center',
    width: 80,
  },
  devIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFE8DC',
  },
  devButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  madeWithContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    width: '100%',
    justifyContent: 'center'
  },
  heartBeat: {
    marginRight: 8,
  },
  heartIcon: {
    fontSize: 16,
  },
  madeWith: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A6C7D',
  },
  copyright: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});