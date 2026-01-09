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
import { initialContacts } from '../data/AcademicSupportData'; 

// --- HELPER: Support Unit Icons --- 
const getSupportStyle = (unitName) => {
  const name = unitName.toLowerCase();
  
  if (name.includes('exam')) return { icon: 'document-text-outline', color: '#E91E63' }; // Pink (Strict/Official)
  if (name.includes('international')) return { icon: 'globe-outline', color: '#2196F3' }; // Blue (Global)
  if (name.includes('knowledge') || name.includes('library')) return { icon: 'library-outline', color: '#673AB7' }; // Purple (Wisdom)
  if (name.includes('physical') || name.includes('sports')) return { icon: 'football-outline', color: '#4CAF50' }; // Green (Sports)
  if (name.includes('extension')) return { icon: 'bulb-outline', color: '#FF9800' }; // Orange (Activity)
  if (name.includes('admin')) return { icon: 'briefcase-outline', color: '#607D8B' }; // Grey (Office)

  // Default fallback
  return { icon: 'business-outline', color: '#9E9E9E' };
};

// --- HELPER: Priority Sorting Logic (Specific to Support Units) ---
const getPriority = (contact) => {
  const designation = (contact.designation || "").toLowerCase();
  const role = (contact.role || "").toLowerCase();

  // --- TIER 1: Top Leadership ---
  if (
    (designation.includes("director") && !designation.includes("physical")) || 
    designation.includes("hod") ||
    designation.includes("controller of examinations") ||
    designation.includes("chief librarian")
  ) {
    if (designation.includes("deputy") || designation.includes("dy.")) return 2;
    return 1;
  }

  // --- TIER 2: Management & Officers ---
  if (
    designation.includes("officer") || 
    designation.includes("manager")
  ) {
    if (designation.includes("asst. manager")) return 3; 
    return 2;
  }

  // --- TIER 3: Supervisors & Coordinators ---
  if (
    designation.includes("co-ordinator") ||
    designation.includes("supervisor") ||
    designation.includes("incharge") ||
    designation.includes("p.r.o") ||
    designation.includes("press relation")
  ) {
    return 3;
  }

  // --- TIER 4: Faculty & Specialized Roles ---
  if (
    designation.includes("professor") ||
    designation.includes("librarian") ||
    designation.includes("physical director") ||
    designation.includes("coach") ||
    designation.includes("counsellor")
  ) {
    return 4;
  }

  // --- TIER 5: Senior Staff ---
  if (
    designation.includes("sr.asst") ||
    designation.includes("accountant") ||
    designation.includes("head-cashier")
  ) {
    return 5;
  }

  // --- TIER 6: Junior Staff & Support ---
  if (
    designation.includes("jr.asst") ||
    designation.includes("assistant") ||
    designation.includes("cashier") ||
    designation.includes("receptionist") ||
    designation.includes("rec.asst")
  ) {
    return 6;
  }

  // --- TIER 7: Interns ---
  if (designation.includes("intern")) {
    return 7;
  }

  // Default priority for anyone else
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

const AcademicSupportUnitScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [masterContacts, setMasterContacts] = useState([]); // Holds ALL synced data
  const [supportUnits, setSupportUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. REAL-TIME DATA SYNC (With Employee ID Priority)
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          // Setup real-time listener for your Firebase collection
          unsubscribe = onSnapshot(
            collection(db, "updates"), // Your Firebase collection name
            (snapshot) => {
              // 1. Get Cloud Data
              const firebaseStaff = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // --- MERGE LOGIC START (EMPLOYEE ID PRIORITY) ---
              const staffMap = new Map();
              
              // A. Load Hardcoded Data First
              initialContacts.forEach(contact => {
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();
                staffMap.set(uniqueKey, contact);
              });
              
              // B. Load Firebase Data Second (Overwrites hardcoded)
              firebaseStaff.forEach(contact => {
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();
                staffMap.set(uniqueKey, contact);
              });
              
              // Convert Map back to array
              const allStaff = Array.from(staffMap.values());
              // --- MERGE LOGIC END ---

              setMasterContacts(allStaff);

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));

              // --- RECALCULATE UNIT COUNTS ---
              const unitNames = [
                "Exam cell",
                "Extension Activities",
                "International Admissions",
                "Knowledge Resource Center",
                "OFFICE ADMIN",
                "Physical education"
              ];

              const unitObjects = unitNames.map(uName => {
                // Count matches from the NEW merged list
                const count = allStaff.filter(c => 
                    c.department && c.department.toLowerCase() === uName.toLowerCase()
                ).length;
                
                return { name: uName, count };
              });

              setSupportUnits(unitObjects);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      // Re-run count logic for fallback
                      const unitNames = ["Exam cell", "Extension Activities", "International Admissions", "Knowledge Resource Center", "OFFICE ADMIN", "Physical education"];
                      const unitObjects = unitNames.map(uName => {
                        const count = allStaff.filter(c => c.department && c.department.toLowerCase() === uName.toLowerCase()).length;
                        return { name: uName, count };
                      });
                      setSupportUnits(unitObjects);
                  } else {
                      setMasterContacts(initialContacts);
                  }
              });
            }
          );
        } catch (error) {
          console.log("❌ Error setting up real-time sync:", error);
          setMasterContacts(initialContacts);
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

  // 2. HANDLE BACK BUTTON
  useEffect(() => {
    const onBackPress = () => {
      if (selectedUnit) {
        setSelectedUnit(null); 
        setSearchQuery('');
        return true; 
      }
      return false; 
    };

    if (isFocused) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [isFocused, selectedUnit]);

  // --- NAVIGATION LOGIC ---
  const handleUnitPress = (unitName) => {
    // 1. Filter contacts from MASTER (Merged) List
    let peopleInUnit = masterContacts.filter(c => 
        c.department && c.department.toLowerCase() === unitName.toLowerCase()
    );

    // 2. Apply Priority Sorting
    peopleInUnit = sortContacts(peopleInUnit);

    setFilteredContacts(peopleInUnit);
    setSelectedUnit(unitName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    
    // Get base list from MASTER (Merged) List
    let peopleInUnit = masterContacts.filter(c => 
        c.department && c.department.toLowerCase() === selectedUnit.toLowerCase()
    );
    
    if (query) {
      const formattedQuery = query.toLowerCase();
      // Filter first
      const filtered = peopleInUnit.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          (item.designation && item.designation.toLowerCase().includes(formattedQuery)) ||
          (item.role && item.role.toLowerCase().includes(formattedQuery))
        );
      });
      // Then sort results
      setFilteredContacts(sortContacts(filtered));
    } else {
      // If search cleared, show full sorted list
      setFilteredContacts(sortContacts(peopleInUnit));
    }
  };

  // --- RENDER: UNIT CARD ---
  const renderUnitItem = ({ item }) => {
    const style = getSupportStyle(item.name);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleUnitPress(item.name)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: style.color + '15' }]}>
           <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardCount}>{item.count} Staff</Text>
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
        {selectedUnit ? (
          // VIEW 1: INSIDE UNIT (Back -> List)
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => setSelectedUnit(null)} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle} numberOfLines={1}>
                 {selectedUnit}
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
                 Academic Support
              </Text>

              <View style={{width: 24}} /> 
          </View>
        )}
      </View>

      {/* CONTENT */}
      {selectedUnit ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Searchbar
                placeholder={`Search ${selectedUnit}...`}
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#F05819"
            />
          </View>
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id.toString()} // Ensure ID is string
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
          data={supportUnits}
          keyExtractor={(item) => item.name}
          renderItem={renderUnitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Support Units</Text>}
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

export default AcademicSupportUnitScreen;