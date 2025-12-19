import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// 1. IMPORT REAL DATA
import { initialContacts } from '../data/contactsData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SearchScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State to hold the Real Contact List
  const [allContacts, setAllContacts] = useState([]);

  // 2. LOAD DATA (Database or File)
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const storedData = await AsyncStorage.getItem('contacts');
          if (storedData) {
            setAllContacts(JSON.parse(storedData));
          } else {
            setAllContacts(initialContacts);
          }
        } catch (error) {
          console.error("Error loading contacts for search:", error);
          setAllContacts(initialContacts);
        }
      };
      loadData();
    }, [])
  );

  // --- ACTION HANDLERS ---
  const handleCall = (phone) => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const handleMessage = (phone) => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    Linking.openURL(`sms:${phone}`).catch(() => Alert.alert('Error', 'Cannot send message'));
  };

  const handleEmail = (email) => {
    if (!email) return Alert.alert('Error', 'No email available');
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Cannot open email'));
  };

  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    
    // Search against the REAL 'allContacts' state
    const results = allContacts.filter(contact => 
      (contact.name && contact.name.toLowerCase().includes(lowerQuery)) ||
      (contact.title && contact.title.toLowerCase().includes(lowerQuery)) ||
      (contact.designation && contact.designation.toLowerCase().includes(lowerQuery)) || 
      (contact.office && contact.office.toLowerCase().includes(lowerQuery)) ||
      (contact.department && contact.department.toLowerCase().includes(lowerQuery)) || 
      (contact.email && contact.email.toLowerCase().includes(lowerQuery))
    );

    setSearchResults(results);
    setIsSearching(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allContacts]);

  const handleContactPress = (contact) => {
    navigation.navigate('ContactDetail', { contact });
  };

  const renderSearchResult = (contact) => {
      // Smart Mapping for display
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
            <Text 
              style={[styles.contactName, { color: theme.colors.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit={true}
            >
              {displayName}
            </Text>
            <Text style={[styles.contactTitle, { color: theme.colors.textSecondary || '#666' }]}>
              {displayTitle}
            </Text>
            <Text style={[styles.contactOffice, { color: theme.colors.textSecondary || '#666' }]}>
              {displayOffice}
            </Text>
            
            {/* ACTION BUTTONS */}
            <View style={[styles.contactActions, { borderTopColor: theme.dark ? '#424242' : '#eee' }]}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleCall(contact.phone)}
              >
                <Ionicons name="call" size={20} color={theme.colors.primary || '#F05819'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleMessage(contact.phone)}
              >
                <Ionicons name="chatbubble" size={20} color={theme.colors.primary || '#F05819'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEmail(contact.email)}
              >
                <Ionicons name="mail" size={20} color={theme.colors.primary || '#F05819'} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={80} color={theme.colors.textSecondary || '#ccc'} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
        {searchQuery ? 'No Results Found' : 'Search Contacts'}
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary || '#666' }]}>
        {searchQuery 
          ? `No contacts found for "${searchQuery}"`
          : 'Search by name, title, office, or email'
        }
      </Text>
    </View>
  );

  const headerFontSize = Math.max(20, Math.min(24, SCREEN_WIDTH * 0.06));

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']} 
    >
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />
      
      {/* --- CUSTOM HEADER START --- */}
      <View style={[
          styles.header, 
          { 
              backgroundColor: theme.colors.primary || '#F05819',
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
                <Text style={[styles.headerTitle, { fontSize: headerFontSize }]}>Search</Text>
            </View>

            {/* 3. Empty Spacer for Alignment */}
            <View style={{ width: 30 }} />
        </View>
      </View>
      {/* --- CUSTOM HEADER END --- */}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card || 'white' }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary || '#999'} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search contacts..."
              placeholderTextColor={theme.colors.textSecondary || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary || '#999'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary || '#666' }]}>
                Searching...
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: theme.colors.textSecondary || '#666' }]}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </Text>
              </View>
              {searchResults.map(renderSearchResult)}
            </>
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // --- UPDATED HEADER STYLES ---
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
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  // ---------------------------

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resultsHeader: {
    paddingVertical: 15,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    minHeight: 120,
    backgroundColor: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  contactTitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  contactOffice: {
    fontSize: 12,
    marginBottom: 15,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  actionButton: {
    padding: 10,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
    minHeight: 300,
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
    lineHeight: Platform.OS === 'ios' ? 24 : 22,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
  },
});

export default SearchScreen;