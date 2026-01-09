import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Searchbar, Card, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

// --- NEW IMPORTS FOR PHASE 3 ---
import AsyncStorage from '@react-native-async-storage/async-storage'; // For offline storage
import { collection, getDocs } from 'firebase/firestore'; // For Cloud
import { db } from '../firebaseConfig'; // The bridge we created in Phase 2

// --- DATA IMPORTS (Your Hardcoded Data) ---
import { initialContacts } from '../data/contactsData';
import { initialContacts as enggData } from '../data/SchoolOfEnggData'; 
import { initialContacts as freshmanData } from '../data/FreshmanEngineeringData';
import { initialContacts as pharmacyData } from '../data/SchoolOfPharmacyData';
import { initialContacts as businessData } from '../data/SchoolOfBusinessData';
import { initialContacts as scienceData } from '../data/SchoolOfScienceData';
import { initialContacts as placementData } from '../data/PlacementAndTrainingData'; 

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets(); 

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]); 
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // --- NEW: SMART MERGE LOGIC ---
  useEffect(() => {
    const syncAndLoadContacts = async () => {
      // 1. Create the Master List from Hardcoded Files (The "Factory Default")
      let masterList = [
        ...(initialContacts || []),
        ...(enggData || []),
        ...(freshmanData || []),
        ...(pharmacyData || []),
        ...(businessData || []),
        ...(scienceData || []),
        ...(placementData || []),
      ];

      try {
        // 2. CHECK CACHE: Did we save a merged list previously?
        const cachedData = await AsyncStorage.getItem('aditya_contacts_master');
        
        if (cachedData) {
          // If yes, use it immediately (it's faster and might have old updates)
          const parsedCache = JSON.parse(cachedData);
          setContacts(parsedCache);
          masterList = parsedCache; // Use this as the base for comparison
        } else {
          // If no cache, start with hardcoded data
          setContacts(masterList);
        }

        // 3. CHECK FIREBASE: Are there any NEW updates in the cloud?
        // (This runs silently in the background)
        const querySnapshot = await getDocs(collection(db, "updates"));
        
        let hasNewUpdates = false;

        querySnapshot.forEach((doc) => {
          const cloudContact = doc.data();
          
          // --- THE SMART MERGE ALGORITHM ---
          // Check if this cloud contact matches anyone in our current list by ID
          const index = masterList.findIndex(local => String(local.id) === String(cloudContact.id));

          if (index !== -1) {
            // CASE A: UPDATE existing contact (Fixing a typo remotely)
            // We verify if data is actually different before updating to save resources
            if (JSON.stringify(masterList[index]) !== JSON.stringify(cloudContact)) {
                masterList[index] = { ...masterList[index], ...cloudContact };
                hasNewUpdates = true;
            }
          } else {
            // CASE B: INSERT new contact (The new 20 members)
            masterList.push(cloudContact);
            hasNewUpdates = true;
          }
        });

        // 4. SAVE: If we found updates, save to phone so next time it's instant
        if (hasNewUpdates) {
          setContacts([...masterList]); // Update the screen
          await AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(masterList));
          console.log("Synced with Firebase: Contacts updated successfully.");
        }

      } catch (error) {
        console.log("Offline mode or Firebase Error:", error);
        // If offline, we simply do nothing. The user sees the data loaded in Step 1 or 2.
      }
    };
    
    // Run this logic when the screen loads
    syncAndLoadContacts();

    // Optional: Refresh when coming back to this screen
    const unsubscribe = navigation.addListener('focus', () => {
        syncAndLoadContacts();
    });

    return unsubscribe;
  }, [navigation]);

  // --- CATEGORIES DATA ---
  const categories = [
    { id: 'offices', title: 'OFFICES', icon: 'briefcase', screen: 'Offices', colors: ['#f05819', '#f05819'] },
    { id: 'leadership', title: 'DEANS & HODs', icon: 'people', screen: 'DeansAndHODs', colors: ['#f05819', '#f05819'] },
    { id: 'departments', title: 'SCHOOL OF ENGG', icon: 'hardware-chip', screen: 'Department', colors: ['#f05819', '#f05819'] },
    { id: 'business', title: 'SCHOOL OF BUSINESS', icon: 'stats-chart', screen: 'SchoolOfBusiness', colors: ['#f05819', '#f05819'] },
    { id: 'science', title: 'SCHOOL OF SCIENCE', icon: 'flask', screen: 'SchoolOfScience', colors: ['#f05819', '#f05819'] },
    { id: 'pharmacy', title: 'SCHOOL OF PHARMACY', icon: 'medkit', screen: 'SchoolOfPharmacy', colors: ['#f05819', '#f05819'] },
    { id: 'freshman', title: 'FRESHMAN ENGG', icon: 'happy', screen: 'FreshmanEngineering', colors: ['#f05819', '#f05819'] },
    { id: 'placement', title: 'PLACEMENT & TRAINING', icon: 'trophy', screen: 'PlacementAndTraining', colors: ['#f05819', '#f05819'] },
    { id: 'academic', title: 'ACADEMIC SUPPORT', icon: 'library', screen: 'AcademicSupportUnit', colors: ['#f05819', '#f05819'] },
    { id: 'hostels', title: 'HOSTELS & RESIDENTIAL', icon: 'bed', screen: 'HostelsAndResidential', colors: ['#f05819', '#f05819'] },
    { id: 'service', title: 'SERVICE & MAINTENANCE', icon: 'build', screen: 'ServiceAndMaintenance', colors: ['#f05819', '#f05819'] },
    { id: 'emergency', title: 'EMERGENCY', icon: 'medical', screen: 'Emergency', colors: ['#f05819', '#f05819'] },
    { id: 'transport', title: 'TRANSPORT', icon: 'bus', screen: 'Transport', colors: ['#F05819', '#f05819'] },
    { id: 'settings', title: 'SETTINGS', icon: 'settings', screen: 'Settings', colors: ['#F05819', '#f05819'] },
  ];

  const handleCategoryPress = (category) => {
    navigation.navigate(category.screen);
  };

  // --- DOUBLE TAP LOGIC ---
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; 

    if (now - lastTap < DOUBLE_PRESS_DELAY) {
        toggleSearch();
    } else {
        setLastTap(now);
    }
  };

  const toggleSearch = async () => {
      const newState = !showSearchBar;
      setShowSearchBar(newState);
      
      if (!newState) {
          setSearchQuery('');
          // Reload from cache or hardcode when closing search
          const cachedData = await AsyncStorage.getItem('aditya_contacts_master');
          if (cachedData) {
             setContacts(JSON.parse(cachedData));
          } else {
             // Fallback logic
             setContacts([
                ...(initialContacts || []),
                ...(enggData || []),
                // ... (add other arrays if needed for immediate fallback)
             ]);
          }
          Keyboard.dismiss();
      }
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filteredData = contacts.filter((item) => {
        return (
          item.name?.toLowerCase().includes(formattedQuery) ||
          (item.department && item.department.toLowerCase().includes(formattedQuery)) ||
          (item.designation && item.designation.toLowerCase().includes(formattedQuery))
        );
      });
      setContacts(filteredData);
    } else {
       // Reset logic handled by toggle/focus
    }
  };

  // --- RENDER CONTACT ITEM (Search) ---
  const renderContactItem = ({ item }) => (
    <Card
      style={styles.searchCard}
      onPress={() => navigation.navigate('ContactDetail', { contact: item })}
    >
      <Card.Title
        title={item.name}
        subtitle={item.department}
        titleStyle={styles.cardTitle}
        subtitleStyle={styles.cardSubtitle}
        left={(props) => (
          <Avatar.Text
            {...props}
            size={40}
            label={item.name ? item.name.substring(0, 1) : '?'}
            style={{ backgroundColor: '#F05819' }}
            color="white"
          />
        )}
      />
    </Card>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar backgroundColor="#F05819" barStyle="light-content" />
      
      {/* HEADER WRAPPER */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={[
            styles.header, 
            { 
              backgroundColor: '#F05819',
              paddingTop: insets.top + 10, 
              paddingBottom: 20 
            }
        ]}>
          
          {/* ROW 1: Logo | Text | Icon */}
          <View style={styles.headerTopRow}>
              
              <Image 
                source={require('../../assets/20260104_200350.png')} 
                style={styles.headerLogo}
                resizeMode="contain"
              />
              
              <View style={styles.headerCenterContainer}>
                <Text 
                  style={styles.headerUniversityText}
                  numberOfLines={1}             
                  adjustsFontSizeToFit={true}   
                  minimumFontScale={0.5} 
                  allowFontScaling={false} 
                >
                  ADITYA UNIVERSITY
                </Text>
              </View>

              <View style={styles.headerRightButtons}>
                <TouchableOpacity 
                  style={styles.headerCircleButton}
                  onPress={() => navigation.navigate('About')}
                >
                  <Ionicons name="information" size={24} color="#f05819" />
                </TouchableOpacity>
              </View>

          </View>

          {/* ROW 2: Welcome Text */}
          <View style={styles.headerTextContainer}>
            <Text 
              style={styles.headerWelcomeText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.5}
              allowFontScaling={false}
            > 
                welcome to Aditya Contacts
            </Text>
          </View>

          {/* ROW 3: SEARCH BAR */}
          {showSearchBar && (
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search faculty, staff..."
                    onChangeText={onChangeSearch}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                    iconColor="#F05819"
                    elevation={1}
                    autoFocus={true} 
                />
            </View>
          )}

        </View>
      </TouchableWithoutFeedback>

      {/* CONDITIONAL RENDERING */}
      {showSearchBar && searchQuery.length > 0 ? (
        
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

      ) : (
        
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
        >
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryButton}
                onPress={() => handleCategoryPress(category)}
              >
                <LinearGradient
                  colors={category.colors}
                  style={styles.iconContainer}
                >
                  <Ionicons name={category.icon} size={36} color="rgba(255, 255, 255, 0.92)" />
                </LinearGradient>
                <Text 
                  style={[styles.categoryTitle, { color: theme.colors.text }]}
                  numberOfLines={2}            
                  adjustsFontSizeToFit={true}  
                  allowFontScaling={false}     
                >
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 15, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#ffff',
    zIndex: 1, 
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    width: '100%',
    marginBottom: 8, 
  },
  headerLogo: { width: 50, height: 50 },
  headerCenterContainer: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerUniversityText: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  headerCircleButton: {
    width: 30,
    height: 30,
    borderRadius: 15, 
    backgroundColor: '#ffffff', 
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8, 
  },
  headerTextContainer: {
    marginTop: 5,
    marginBottom: 10,
    alignItems: 'center', 
  },
  headerWelcomeText: {
    color: '#ffffff', 
    fontSize: 15,     
    fontWeight: 'bold',
    textAlign: 'center', 
    opacity: 0.9,
    textTransform: 'capitalize',
  },
  searchContainer: { marginTop: 10, marginBottom: 5 },
  searchBar: {
    borderRadius: 15,
    backgroundColor: 'white',
    height: 45,
  },
  searchInput: { fontSize: 14, minHeight: 0, alignSelf: 'center' },
  content: { flex: 1 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  categoryButton: {
    width: '45%',
    aspectRatio: 1,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 13, 
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  searchCard: {
    marginHorizontal: 15,
    marginVertical: 5,
    backgroundColor: 'white',
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { fontSize: 14, color: 'gray' },
  listContainer: { paddingBottom: 20, paddingTop: 10 }
});

export default HomeScreen;