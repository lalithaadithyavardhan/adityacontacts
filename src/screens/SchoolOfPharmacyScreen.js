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

// 1. IMPORT DATA
import { initialContacts } from '../data/SchoolOfPharmacyData'; 

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING ---
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // Leadership
    if (d.includes('principal') || d.includes('dean') || d.includes('director')) return 1;

    // Academic Ranks
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 2; // Full Professor
    if (d.includes('associate professor')) return 3; 
    if (d.includes('assistant professor') || d.includes('asst. professor')) return 4;
    
    // Technical / Support
    if (d.includes('lab') || d.includes('technician')) return 50;
    if (d.includes('assistant') && !d.includes('professor')) return 51;
    
    return 20; // Default
};

// --- HELPER: Pharmacy Icon Logic ---
const getPharmacyStyle = () => {
  return { icon: 'medkit-outline', color: '#009688' }; // Medical Green
};

// ---------------------------------------------------------
// 3. SMART MATCHING LOGIC (THE FIX)
// ---------------------------------------------------------
// Checks Department, Role, AND Designation for the keyword "Pharmacy"
const checkPharmacyMatch = (contact) => {
    const dept = (contact.department || "").toLowerCase();
    const desig = (contact.designation || "").toLowerCase();
    const role = (contact.role || "").toLowerCase();

    // Combine all fields into one searchable string
    const fullProfile = dept + " " + desig + " " + role;

    return fullProfile.includes('pharmacy');
};

// --- HELPER: Count Calculation ---
const calculatePharmacyCount = (dataList) => {
    return dataList.filter(c => checkPharmacyMatch(c)).length;
};

const SchoolOfPharmacyScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // --- STATE ---
  // Initialize with hardcoded data for Instant Load
  const [masterContacts, setMasterContacts] = useState(initialContacts);
  
  // Initialize department count based on hardcoded data
  const [pharmacyDept, setPharmacyDept] = useState([
      { name: "School of Pharmacy", count: calculatePharmacyCount(initialContacts) }
  ]);

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
          console.log("📡 Connecting to Firebase for Pharmacy...");
          
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

              setMasterContacts(allStaff);

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));

              // --- RECALCULATE COUNT (Using Smart Match) ---
              const count = calculatePharmacyCount(allStaff);
              setPharmacyDept([{ name: "School of Pharmacy", count: count }]);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      const count = calculatePharmacyCount(allStaff);
                      setPharmacyDept([{ name: "School of Pharmacy", count: count }]);
                  }
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
  useEffect(() => {
    if (selectedDept) {
        // Filter from MASTER list using Smart Match
        let peopleInDept = masterContacts.filter(c => checkPharmacyMatch(c));

        // Search Filter
        if (searchQuery) {
            const formattedQuery = searchQuery.toLowerCase();
            peopleInDept = peopleInDept.filter((item) => {
                return (
                  item.name.toLowerCase().includes(formattedQuery) ||
                  (item.designation && item.designation.toLowerCase().includes(formattedQuery)) ||
                  (item.role && item.role.toLowerCase().includes(formattedQuery))
                );
            });
        }

        // Sort
        peopleInDept.sort((a, b) => {
            return getRoleScore(a.designation || a.role) - getRoleScore(b.designation || b.role);
        });

        setFilteredContacts(peopleInDept);
    } else {
        // Update main screen count if user is not inside the folder
        // (This handles the case where data loads while user is on main screen)
        if (masterContacts.length > 0) {
            const count = calculatePharmacyCount(masterContacts);
            setPharmacyDept([{ name: "School of Pharmacy", count: count }]);
        }
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
    // Filter from MASTER list
    const peopleInDept = masterContacts.filter(c => checkPharmacyMatch(c));

    // Sort
    peopleInDept.sort((a, b) => {
        return getRoleScore(a.designation || a.role) - getRoleScore(b.designation || b.role);
    });

    setFilteredContacts(peopleInDept);
    setSelectedDept(deptName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    // Logic handled by useEffect
  };

  // --- RENDER: DEPARTMENT CARD ---
  const renderDeptItem = ({ item }) => {
    const style = getPharmacyStyle();
    
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

  // --- RENDER: CONTACT CARD ---
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
            {/* Show Designation first, if empty show Role */}
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
          // VIEW 1: INSIDE FOLDER (Back -> List)
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
          // VIEW 2: MAIN LIST (Back -> Home)
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                 School of Pharmacy
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
          data={pharmacyDept}
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

export default SchoolOfPharmacyScreen;