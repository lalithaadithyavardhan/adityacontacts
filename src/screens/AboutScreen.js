import React, { useLayoutEffect, useState } from 'react';
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
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AboutScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // --- SECRET CREDITS STATE ---
  const [tapCount, setTapCount] = useState(0);

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- HIDDEN SIGNATURE LOGIC ---
  const handleSecretLogoPress = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    // Trigger when tapped 5 times
    if (newCount === 5) {
      Alert.alert(
        "Original Developer Credits",
        "Designed & Developed by:\nBarra Adithya\n\nGitHub: @lalithaadithyavardhan\n\nThis architecture is permanently signed.",
        [{ text: "Close", onPress: () => setTapCount(0) }]
      );
    }

    // Reset counter if they stop tapping for 1 second
    setTimeout(() => {
        if (newCount < 5) setTapCount(0);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />

      {/* --- CUSTOM HEADER --- */}
      <View style={[
          styles.header, 
          { 
              backgroundColor: '#F05819',
              paddingTop: insets.top + 20 
          }
      ]}>
        <View style={styles.headerContent}>
            {/* 1. Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* 2. Title (Centered) */}
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>About</Text>
            </View>

            {/* 3. Empty Spacer for Alignment */}
            <View style={{ width: 30 }} />
        </View>
      </View>

      {/* --- MAIN CONTENT --- */}
      <ScrollView
        contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* LOGO WITH HIDDEN TRIGGER */}
        <TouchableWithoutFeedback onPress={handleSecretLogoPress}>
            <Image
            source={require('../../assets/Picsart_25-12-17_12-03-41-625.png')}
            style={styles.logo}
            resizeMode="contain"
            />
        </TouchableWithoutFeedback>

        {/* DESCRIPTION */}
        <Text style={styles.description}>
          Aditya University is one of the leading institutions providing quality
          education and research opportunities. Located in a green and
          student-friendly campus, the university focuses on excellence,
          innovation, and holistic development.
        </Text>

        {/* CONTACT */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact</Text>

          <Text style={styles.contactText}>Registrar</Text>
          <Text style={styles.contactText}>Administration Block</Text>
          <Text style={styles.contactText}>Aditya University</Text>
          <Text style={styles.contactText}>Phone: +91 9XXXXXXXXX</Text>
          <Text style={styles.contactText}>
            Email: registrar@aditya.edu
          </Text>
        </View>

        {/* WEBSITE BUTTON */}
        <TouchableOpacity
          style={styles.websiteButton}
          onPress={() => Linking.openURL('https://adityauniversity.in')}
          activeOpacity={0.85}
        >
          <Text style={styles.websiteButtonText}>
            VISIT ADITYA WEBSITE
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.devTitle}>Developed By</Text>
          <Text style={styles.devName}>Barra Adithya</Text>

          <TouchableOpacity
            style={styles.githubButton}
            onPress={() =>
              Linking.openURL('https://github.com/lalithaadithyavardhan')
            }
            activeOpacity={0.85}
          >
            <Ionicons name="logo-github" size={22} color="#000" />
            <Text style={styles.githubText}>GitHub Profile</Text>
          </TouchableOpacity>

          <Text style={styles.madeWith}>made with love</Text>
          <Text style={styles.tagline}>an aditya student</Text>
        </View>

      </ScrollView>
    </View>
  );
};

export default AboutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // --- HEADER STYLES ---
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backBtn: {
    padding: 5,
    width: 30,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  // ---------------------

  content: {
    padding: 20,
    alignItems: 'center',
  },

  logo: {
    width: 170,
    height: 90,
    marginBottom: 20,
    marginTop: 10,
  },

  description: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },

  contactSection: {
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F05819',
    marginBottom: 10,
  },

  contactText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },

  websiteButton: {
    backgroundColor: '#F05819',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    marginBottom: 40,
    elevation: 3,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  websiteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  footer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  devTitle: {
    fontSize: 13,
    color: '#777',
    marginBottom: 4,
  },

  devName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },

  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 16,
    elevation: 2,
  },

  githubText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },

  madeWith: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 5,
  },

  tagline: {
    fontSize: 13,
    color: '#666',
  },
});