import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ToastAndroid
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// 1. IMPORT REAL DATA (As fallback)
import { initialContacts } from '../data/contactsData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FavoritesScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState([]);

  // --- CUSTOM ALERT STATE ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: '',
    message: '',
    onConfirm: null
  });

  // 2. LOAD DATA FROM DATABASE
  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        try {
          const storedData = await AsyncStorage.getItem('contacts');
          if (storedData) {
            const allContacts = JSON.parse(storedData);
            const favs = allContacts.filter((contact) => contact.isFavorite === true);
            setFavorites(favs);
          } else {
            const favs = initialContacts.filter((contact) => contact.isFavorite === true);
            setFavorites(favs);
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      };
      loadFavorites();
    }, [])
  );

  // --- HELPER: Show Custom Alert ---
  const showCustomAlert = (title, message, onConfirm) => {
    setAlertData({ title, message, onConfirm });
    setAlertVisible(true);
  };

  // --- ACTIONS ---
  const handleCall = (phone) => {
    if (!phone) {
        if (Platform.OS === 'android') ToastAndroid.show('No phone number', ToastAndroid.SHORT);
        return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleMessage = (phone) => {
    if (!phone) {
        if (Platform.OS === 'android') ToastAndroid.show('No phone number', ToastAndroid.SHORT);
        return;
    }
    Linking.openURL(`sms:${phone}`).catch(() => {});
  };

  const handleEmail = (email) => {
    if (!email) {
        if (Platform.OS === 'android') ToastAndroid.show('No email available', ToastAndroid.SHORT);
        return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {});
  };

  // 3. REMOVE FAVORITE LOGIC
  const confirmRemoveFavorite = (contactId) => {
    showCustomAlert(
        'Remove Favorite',
        'Are you sure you want to remove this contact from your favorites?',
        async () => {
            try {
                // A. UI Update
                setFavorites(favorites.filter(fav => fav.id !== contactId));
                setAlertVisible(false); // Close modal immediately

                // B. Database Update
                const storedData = await AsyncStorage.getItem('contacts');
                if (storedData) {
                    let allContacts = JSON.parse(storedData);
                    const updatedContacts = allContacts.map(c => {
                        if (c.id === contactId) return { ...c, isFavorite: false };
                        return c;
                    });
                    await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
                }

                // C. Subtle Feedback
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Removed from Favorites', ToastAndroid.SHORT);
                }
            } catch (error) {
                console.error(error);
            }
        }
    );
  };

  const handleContactPress = (contact) => {
    navigation.navigate('ContactDetail', { contact });
  };

  const renderFavoriteContact = (contact) => {
    const displayName = contact.name;
    const displayTitle = contact.title || contact.designation || contact.role || 'Staff';
    const displayOffice = contact.office || contact.department || 'General';

    return (
      <TouchableOpacity
        key={contact.id}
        style={[styles.contactItem, { backgroundColor: theme.colors.card || 'white' }]}
        onPress={() => handleContactPress(contact)}
      >
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text 
              style={[styles.contactName, { color: theme.colors.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit={true}
            >
              {displayName}
            </Text>
            
            {/* Custom Remove Button Trigger */}
            <TouchableOpacity
              onPress={() => confirmRemoveFavorite(contact.id)}
              style={styles.removeButton}
            >
              <Ionicons name="heart" size={22} color='#F05819' />
            </TouchableOpacity>
          </View>

          <Text style={[styles.contactTitle, { color: '#666' }]}>
            {displayTitle}
          </Text>
          <Text style={[styles.contactOffice, { color: '#666' }]}>
            {displayOffice}
          </Text>

          <View style={[styles.contactActions, { borderTopColor: '#eee' }]}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(contact.phone)}>
              <Ionicons name="call" size={20} color='#F05819' />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleMessage(contact.phone)}>
              <Ionicons name="chatbubble" size={20} color='#F05819' />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleEmail(contact.email)}>
              <Ionicons name="mail" size={20} color='#F05819' />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const headerFontSize = Math.max(20, Math.min(24, SCREEN_WIDTH * 0.06));

  // --- EMPTY STATE ---
  if (favorites.length === 0) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['left', 'right']}
      >
        <StatusBar barStyle="light-content" backgroundColor="#F05819" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{flex: 1, alignItems: 'center', marginRight: 30}}>
                    <Text style={[styles.headerTitle, { fontSize: headerFontSize }]}>Favorites</Text>
                </View>
            </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.emptyStateContainer, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={Math.min(80, SCREEN_WIDTH * 0.2)} color='#ccc' />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Favorites Yet</Text>
            <Text style={[styles.emptyStateSubtitle, { color: '#666' }]}>
              Start adding contacts to your favorites to see them here
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: '#F05819' }]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Browse Contacts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- MAIN RENDER ---
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']} 
    >
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                  <Text style={[styles.headerTitle, { fontSize: headerFontSize }]}>Favorites</Text>
                  {/* REMOVED COUNT SUBTITLE */}
              </View>

              <View style={{width: 30}} />
          </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          {favorites.map(renderFavoriteContact)}
        </View>
      </ScrollView>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <View style={styles.modalIconContainer}>
                    <Ionicons name="alert-circle" size={40} color="white" />
                </View>
                
                <Text style={styles.modalTitle}>{alertData.title}</Text>
                <Text style={styles.modalMessage}>{alertData.message}</Text>

                <View style={styles.modalActions}>
                    <TouchableOpacity 
                        style={[styles.modalBtn, styles.modalBtnCancel]} 
                        onPress={() => setAlertVisible(false)}
                    >
                        <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.modalBtn, styles.modalBtnConfirm]} 
                        onPress={alertData.onConfirm}
                    >
                        <Text style={styles.modalBtnTextConfirm}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  
  // --- HEADER ---
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
    backgroundColor: '#F05819',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  backBtn: {
    padding: 5,
    width: 30,
  },

  // --- CONTACT LIST ---
  content: { padding: 16 },
  contactItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    minHeight: 120,
    backgroundColor: 'white', 
  },
  contactInfo: { flex: 1 },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactName: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    flexWrap: 'wrap',
  },
  removeButton: { padding: 5 },
  contactTitle: { fontSize: 14, marginBottom: 5 },
  contactOffice: { fontSize: 12, marginBottom: 15 },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 15,
  },
  actionButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },

  // --- EMPTY STATE ---
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  browseButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- CUSTOM ALERT MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F05819',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: -45, // Pop-out effect
    borderWidth: 4,
    borderColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalBtnCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalBtnConfirm: {
    backgroundColor: '#d9534f', // Red for destructive action
  },
  modalBtnTextCancel: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalBtnTextConfirm: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FavoritesScreen;