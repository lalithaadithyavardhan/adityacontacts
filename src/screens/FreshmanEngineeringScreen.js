import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  BackHandler, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { Card, Avatar, Searchbar, Text, useTheme } from 'react-native-paper';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// --- FIREBASE IMPORTS ---
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

// 1. IMPORT DATA (Fallback)
import { initialContacts } from '../data/FreshmanEngineeringData'; 

// --- HELPER: Icon Logic ---
const getFreshmanStyle = () => {
  // Return a specific style for Freshman Engineering
  return { icon: 'school-outline', color: '#4CAF50' }; // Green (Growth/Freshman)
};

// --- HELPER: Priority Sorting Logic (PRESERVED) ---
const getPriority = (contact) => {
  const designation = (contact.designation || "").toLowerCase();
  const role = (contact.role || "").toLowerCase();
  
  // PRIORITY 1: Deans & Associate Deans
  if (designation.includes("dean") || role.includes("dean")) return 1;

  // PRIORITY 2: Heads of Departments (HOD)
  if (designation.includes("hod") || role.includes("head of department")) return 2;

  // PRIORITY 3: Full Professors (Excluding Associate/Assistant)
  if (designation.includes("professor") && !designation.includes("associate") && !designation.includes("assistant")) {
    return 3;
  }

  // PRIORITY 4: Associate Professors
  if (designation.includes("associate professor")) return 4;

  // PRIORITY 5: Assistant Professors
  if (designation.includes("assistant professor")) return 5;

  // PRIORITY 6: Scholars & Teaching Assistants (Academic Support)
  if (designation.includes("scholar") || designation.includes("teaching assistant")) return 6;

  // PRIORITY 7: Technical & Support Staff
  if (designation.includes("technician") || designation.includes("programmer")) return 7;

  // PRIORITY 8: Everyone else
  return 8;
};

// Helper function to apply sort
const sortContacts = (contacts) => {
  return contacts.sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    // 1. Sort by Rank Priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 2. If Rank is same, Sort Alphabetically by Name
    return a.name.localeCompare(b.name);
  });
};

const FreshmanEngineeringScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // --- STATE ---
  // Initialize with initialContacts so data appears INSTANTLY (Fixes "not showing" issue)
  const [masterContacts, setMasterContacts] = useState(initialContacts); 
  const [freshmanDept, setFreshmanDept] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ---------------------------------------------------------
  // 1. REAL-TIME DATA SYNC (With Employee ID Priority)
  // ---------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          console.log("📡 Connecting to Firebase for Freshman Data...");
          
          unsubscribe = onSnapshot(
            collection(db, "updates"), 
            (snapshot) => {
              // 1. Get Cloud Data
              const firebaseStaff = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // --- MERGE LOGIC START ---
              const staffMap = new Map();
              
              // A. Load Hardcoded Data
              initialContacts.forEach(contact => {
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();
                staffMap.set(uniqueKey, contact);
              });
              
              // B. Load Firebase Data (Overwrites Hardcoded)
              firebaseStaff.forEach(contact => {
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();
                staffMap.set(uniqueKey, contact);
              });
              
              const allStaff = Array.from(staffMap.values());
              // --- MERGE LOGIC END ---

              console.log(`✅ Synced: ${allStaff.length} Freshman contacts total.`);
              setMasterContacts(allStaff);

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));

              // --- RECALCULATE COUNT ---
              // Catch "Freshman Engineering", "Freshman Dept", etc.
              const count = allStaff.filter(c => 
                  c.department && c.department.toLowerCase().includes("freshman")
              ).length;

              setFreshmanDept([{ name: "Freshman Engineering", count: count }]);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      
                      // Recalculate Count for Fallback
                      const count = allStaff.filter(c => c.department && c.department.toLowerCase().includes("freshman")).length;
                      setFreshmanDept([{ name: "Freshman Engineering", count: count }]);
                  }
                  // If no cache, we already initialized state with initialContacts, so we are good.
              });
            }
          );
        } catch (error) {
          console.log("❌ Error setting up real-time sync:", error);
        }
      };

      setupRealtimeSync();

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [])
  );

  // ---------------------------------------------------------
  // 2. AUTO-REFRESH LIST LOGIC
  // ---------------------------------------------------------
  // This ensures that if you are looking at the list and Firebase updates,
  // the screen updates IMMEDIATELY without you going back.
  useEffect(() => {
    if (selectedDept) {
        // Filter from the LATEST masterContacts
        let peopleInDept = masterContacts.filter(c => 
            c.department && c.department.toLowerCase().includes("freshman")
        );

        // Apply Search Filter if active
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            peopleInDept = peopleInDept.filter((item) => {
                return (
                  item.name.toLowerCase().includes(query) ||
                  (item.designation && item.designation.toLowerCase().includes(query)) ||
                  (item.role && item.role.toLowerCase().includes(query))
                );
            });
        }

        // Apply Sort
        setFilteredContacts(sortContacts(peopleInDept));
    } else {
        // If on the main folder screen, update the count object
        const count = masterContacts.filter(c => 
            c.department && c.department.toLowerCase().includes("freshman")
        ).length;
        setFreshmanDept([{ name: "Freshman Engineering", count: count }]);
    }
  }, [masterContacts, selectedDept, searchQuery]);


  // 3. HANDLE BACK BUTTON
  useEffect(() => {
    const onBackPress = () => {
      if (selectedDept) {
        setSelectedDept(null); 
        setSearchQuery('');
        return true; 
      }
      return false; 
    };

    if (isFocused) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [isFocused, selectedDept]);

  // --- NAVIGATION LOGIC ---
  const handleDeptPress = (deptName) => {
    // Initial load when clicking the folder
    let peopleInDept = masterContacts.filter(c => 
        c.department && c.department.toLowerCase().includes("freshman")
    );

    setFilteredContacts(sortContacts(peopleInDept));
    setSelectedDept(deptName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    // The useEffect above automatically handles the filtering
  };

  // --- RENDER HELPERS ---
  const renderDeptItem = ({ item }) => {
    const style = getFreshmanStyle();
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleDeptPress(item.name)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: style.color + '15' }]}>
           <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardCount}>{item.count} Staff Members</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }) => (
    <Card
      style={styles.contactCard}
      onPress={() => navigation.navigate('ContactDetail', { contact: item })}
    >
      <View style={styles.contactRow}>
        <Avatar.Text
            size={50}
            label={item.name.substring(0, 1)}
            style={{ backgroundColor: '#F05819' }}
            color="white"
        />
        <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactRole}>{item.designation || item.role || 'Staff'}</Text>
        </View>
        <View style={styles.arrowBox}>
            <Ionicons name="call" size={18} color="white" />
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView 
        style={[styles.container, { backgroundColor: '#F5F7FA' }]}
        edges={['left', 'right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        {selectedDept ? (
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => setSelectedDept(null)} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                 {selectedDept}
              </Text>
              <View style={{width: 24}} /> 
          </View>
        ) : (
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                 Freshman Engineering
              </Text>
              <View style={{width: 24}} /> 
          </View>
        )}
      </View>

      {/* CONTENT */}
      {selectedDept ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Searchbar
                placeholder={`Search ${selectedDept}...`}
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#F05819"
            />
          </View>
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderContactItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No staff found.</Text>
                </View>
            }
          />
        </View>
      ) : (
        <FlatList
          data={freshmanDept}
          keyExtractor={(item) => item.name}
          renderItem={renderDeptItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Departments</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  backBtn: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 40 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  cardCount: { fontSize: 13, color: '#888', fontWeight: '500' },

  // Contact Card
  contactCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  contactDetails: { flex: 1, marginLeft: 15 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contactRole: { fontSize: 13, color: '#666', marginTop: 2 },
  arrowBox: { backgroundColor: '#4CAF50', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 15, marginBottom: 5 },
  searchBar: { borderRadius: 12, backgroundColor: 'white', elevation: 2, height: 45 },
  searchInput: { fontSize: 15, alignSelf: 'center' },
  
  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});

export default FreshmanEngineeringScreen;