import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- HELPER: Time Ago ---
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return past.toLocaleDateString();
};

const RecentCallsScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [recentCalls, setRecentCalls] = useState([]);

  // 1. LOAD DATA FROM DATABASE
  useFocusEffect(
    useCallback(() => {
      const loadRecentCalls = async () => {
        try {
          const storedData = await AsyncStorage.getItem('recent_calls');
          if (storedData) {
            setRecentCalls(JSON.parse(storedData));
          }
        } catch (error) {
          console.error("Error loading recent calls:", error);
        }
      };
      loadRecentCalls();
    }, [])
  );

  // 2. HANDLE CALL LOGIC
  const handleCall = async (phoneNumber, contactName, contact) => {
    if (!phoneNumber) return Alert.alert('Error', 'No phone number available');

    const phoneUrl = `tel:${phoneNumber}`;
    
    // Check if supported
    const supported = await Linking.canOpenURL(phoneUrl);
    
    if (supported) {
      // A. Open Dialer
      Linking.openURL(phoneUrl);

      // B. Save to "Recent Calls" Database
      try {
        const newCallRecord = {
          id: contact.id || Math.random().toString(),
          name: contactName || contact.name,
          title: contact.title || contact.designation || contact.role || '',
          office: contact.office || contact.department || '',
          phone: phoneNumber,
          callType: 'outgoing', // We can only track outgoing calls
          timestamp: new Date().toISOString(),
        };

        // Get existing list
        const storedData = await AsyncStorage.getItem('recent_calls');
        let currentCalls = storedData ? JSON.parse(storedData) : [];

        // Remove duplicates of the same person (optional clean up)
        currentCalls = currentCalls.filter(c => c.phone !== phoneNumber);

        // Add new call to TOP
        const updatedCalls = [newCallRecord, ...currentCalls];

        // Save back to storage
        await AsyncStorage.setItem('recent_calls', JSON.stringify(updatedCalls));
        
        // Update Screen
        setRecentCalls(updatedCalls);

      } catch (error) {
        console.log("Error saving call history", error);
      }

    } else {
      Alert.alert('Error', 'Phone calls are not supported on this device');
    }
  };

  const clearHistory = () => {
      Alert.alert(
          "Clear History", 
          "Delete all recent calls?",
          [
              { text: "Cancel", style: "cancel"},
              { text: "Delete", style: "destructive", onPress: async () => {
                  await AsyncStorage.removeItem('recent_calls');
                  setRecentCalls([]);
              }}
          ]
      );
  };

  const handleContactPress = (contact) => {
    navigation.navigate('ContactDetail', { contact });
  };

  const renderCallItem = (call) => {
    // Default call styling
    const callIcon = { name: 'call-outline', color: '#4CAF50' }; // Green for outgoing
    const callTypeText = 'Outgoing';
    const timeAgo = formatTimeAgo(call.timestamp || new Date().toISOString());

    return (
      <TouchableOpacity
        key={call.id + call.timestamp}
        style={[styles.callItem, { backgroundColor: theme.colors.card || 'white' }]}
        onPress={() => handleContactPress(call)}
      >
        <View style={styles.callInfo}>
          <View style={styles.callHeader}>
            <Text 
              style={[styles.contactName, { color: theme.colors.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit={true}
            >
              {call.name}
            </Text>
            
            <View style={styles.callTypeContainer}>
              <Ionicons name="arrow-up-outline" size={14} color={callIcon.color} style={{marginRight: 2}} />
              <Text style={[styles.callTypeText, { color: callIcon.color }]}>
                {callTypeText}
              </Text>
            </View>
          </View>

          <Text style={[styles.contactTitle, { color: theme.colors.textSecondary || '#666' }]}>
            {call.title}
          </Text>
          <Text style={[styles.contactOffice, { color: theme.colors.textSecondary || '#666' }]}>
            {call.office}
          </Text>

          <View style={styles.callDetails}>
            <Text style={[styles.callTime, { color: theme.colors.textSecondary || '#888' }]}>
              {timeAgo}
            </Text>
          </View>
        </View>

        <View style={styles.callActions}>
          <TouchableOpacity 
            style={[styles.callButton, { backgroundColor: theme.colors.primary || '#F05819' }]}
            onPress={() => handleCall(call.phone, call.name, call)}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
                if(call.phone) Linking.openURL(`sms:${call.phone}`);
            }}
          >
            <Ionicons name="chatbubble" size={20} color={theme.colors.primary || '#F05819'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={styles.actionButton}
             onPress={() => {
                 if(call.email) Linking.openURL(`mailto:${call.email}`);
                 else Alert.alert("No email", "This contact has no email saved.");
             }}
          >
            <Ionicons name="mail" size={20} color={theme.colors.primary || '#F05819'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // --- MAIN RENDER ---
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />
      
      {/* --- UPDATED CUSTOM HEADER --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerContent}>
               {/* 1. Back Button */}
               <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="white" />
               </TouchableOpacity>

               {/* 2. Title (Centered) */}
               <View style={styles.headerTitleContainer}>
                   <Text style={styles.headerTitleText}>Recent Calls</Text>
                   {recentCalls.length > 0 && (
                      <Text style={styles.headerSubtitleText}>{recentCalls.length} records</Text>
                   )}
               </View>

               {/* 3. Right Action (Trash or Spacer) */}
               {recentCalls.length > 0 ? (
                  <TouchableOpacity onPress={clearHistory} style={styles.trashBtn}>
                      <Ionicons name="trash-outline" size={24} color="white" />
                  </TouchableOpacity>
               ) : (
                  // Empty View to balance the Back button for perfect centering
                  <View style={{width: 34}} /> 
               )}
          </View>
      </View>
      
      {/* CONTENT AREA */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {recentCalls.length === 0 ? (
            // EMPTY STATE VIEW
            <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={Math.min(80, SCREEN_WIDTH * 0.2)} color={theme.colors.textSecondary || '#ccc'} />
                <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                No Recent Calls
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary || '#666' }]}>
                Calls you make from the app will appear here.
                </Text>
            </View>
        ) : (
            // LIST VIEW
            <View style={styles.content}>
                {recentCalls.map(renderCallItem)}
            </View>
        )}
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
    backgroundColor: '#F05819',
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
    justifyContent: 'space-between', // Ensures space between Back - Title - Trash
  },
  backBtn: {
    padding: 5,
    width: 34, // Fixed width for alignment
  },
  trashBtn: {
    padding: 5,
    width: 34, // Fixed width matching back button
    alignItems: 'flex-end',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  // ---------------------------

  content: {
    padding: 16,
  },
  callItem: {
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
  callInfo: {
    flex: 1,
    marginBottom: 15,
  },
  callHeader: {
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
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callTypeText: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  contactTitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  contactOffice: {
    fontSize: 12,
    marginBottom: 10,
  },
  callDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  callButton: {
    padding: 12,
    borderRadius: 25,
    minWidth: 50,
    alignItems: 'center',
  },
  actionButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50, 
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
    lineHeight: Platform.OS === 'ios' ? 24 : 22,
    paddingHorizontal: 20,
  },
});

export default RecentCallsScreen;