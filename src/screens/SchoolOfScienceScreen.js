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

// 1. IMPORT DATA (Fallback / Baseline)
import { initialContacts } from '../data/SchoolOfScienceData'; 

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING ---
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // Leadership
    if (d.includes('dean') || d.includes('head') || d.includes('principal')) return 1;

    // Academic Ranks
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 2; 
    if (d.includes('associate professor')) return 3; 
    if (d.includes('assistant professor') || d.includes('asst. professor')) return 4;
    
    // Technical / Support
    if (d.includes('lab') || d.includes('technician')) return 50;
    if (d.includes('assistant') && !d.includes('professor')) return 51;
    
    return 20; // Default
};

// --- RULE 2: DEPARTMENT RANKING ---
const SCIENCE_DEPT_PRIORITY = {
    "forensic science": 1,
    "bsc- cyber security": 2
};

const getDeptScore = (deptName) => {
    const name = deptName.toLowerCase();
    for (const [key, rank] of Object.entries(SCIENCE_DEPT_PRIORITY)) {
        if (name.includes(key)) return rank;
    }
    return 100; 
};

// --- HELPER: Science School Icons ---
const getScienceStyle = (deptName) => {
  const name = deptName.toLowerCase();
  
  if (name.includes('forensic science')) return { icon: 'search-outline', color: '#009688' }; // Teal
  if (name.includes('cyber') || name.includes('security')) return { icon: 'shield-checkmark-outline', color: '#673AB7' }; // Deep Purple
  
  // Default fallback
  return { icon: 'flask-outline', color: '#607D8B' };
};

const SchoolOfScienceScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [masterContacts, setMasterContacts] = useState([]); // Holds ALL synced data
  const [scienceDepts, setScienceDepts] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ---------------------------------------------------------
  // 3. REAL-TIME DATA SYNC (With Employee ID Priority)
  // ---------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          console.log('📡 Setting up real-time Firebase listener...');
          
          // Setup real-time listener for your Firebase collection
          unsubscribe = onSnapshot(
            collection(db, "updates"), // Your Firebase collection name
            (snapshot) => {
              // 1. Get Cloud Data
              const firebaseStaff = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              console.log(`✅ Firebase: ${firebaseStaff.length} contacts received`);

              // --- MERGE LOGIC START (EMPLOYEE ID PRIORITY) ---
              const staffMap = new Map();
              
              // A. Load Hardcoded Data First (Baseline)
              initialContacts.forEach(contact => {
                // Determine Unique Key: Use EmployeeID if available, else fallback to internal ID
                // We trim and lowercase to ensure "5659" matches " 5659 "
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();
                  
                staffMap.set(uniqueKey, contact);
              });
              
              // B. Load Firebase Data Second (Overwrites hardcoded if EmployeeID matches)
              firebaseStaff.forEach(contact => {
                const uniqueKey = contact.employeeId 
                  ? String(contact.employeeId).trim().toLowerCase() 
                  : String(contact.id).trim();

                // This action REPLACES the old hardcoded object with the new Firebase object
                // if the employeeId matches.
                staffMap.set(uniqueKey, contact);
              });
              
              // Convert Map back to array
              const allStaff = Array.from(staffMap.values());
              // --- MERGE LOGIC END ---
              
              console.log(`🔀 Merged total: ${allStaff.length} contacts`);

              // Save to state for immediate use
              setMasterContacts(allStaff);

              // Also cache locally for offline viewing
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));

              // --- RECALCULATE DEPARTMENTS (Using the new Merged List) ---
              let scienceBranchNames = [
                  "Forensic Science",
                  "BSC- Cyber security"
              ];

              // Sort Departments by priority
              scienceBranchNames.sort((a, b) => getDeptScore(a) - getDeptScore(b));

              // Count Staff in each Dept
              const deptObjects = scienceBranchNames.map(deptName => {
                  const count = allStaff.filter(c => c.department === deptName).length;
                  return { name: deptName, count };
              });

              setScienceDepts(deptObjects);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              
              // Fallback to cached data if Firebase connection fails
              AsyncStorage.getItem('aditya_contacts_master')
                .then(cachedData => {
                  if (cachedData) {
                    const fallbackStaff = JSON.parse(cachedData);
                    setMasterContacts(fallbackStaff);
                    // Recalculate depts for fallback
                    let scienceBranchNames = ["Forensic Science", "BSC- Cyber security"];
                    scienceBranchNames.sort((a, b) => getDeptScore(a) - getDeptScore(b));
                    const deptObjects = scienceBranchNames.map(deptName => {
                        const count = fallbackStaff.filter(c => c.department === deptName).length;
                        return { name: deptName, count };
                    });
                    setScienceDepts(deptObjects);
                  } else {
                    // Final fallback: Use Hardcoded
                    setMasterContacts(initialContacts);
                    // Recalculate depts for hardcoded
                    let scienceBranchNames = ["Forensic Science", "BSC- Cyber security"];
                    scienceBranchNames.sort((a, b) => getDeptScore(a) - getDeptScore(b));
                    const deptObjects = scienceBranchNames.map(deptName => {
                        const count = initialContacts.filter(c => c.department === deptName).length;
                        return { name: deptName, count };
                    });
                    setScienceDepts(deptObjects);
                  }
                })
                .catch(() => setMasterContacts(initialContacts));
            }
          );
        } catch (error) {
          console.log("❌ Error setting up real-time sync:", error);
          setMasterContacts(initialContacts);
        }
      };

      setupRealtimeSync();

      // Cleanup function
      return () => {
        if (unsubscribe) {
          console.log('🔌 Disconnecting real-time listener');
          unsubscribe();
        }
      };
    }, [])
  );

  // 4. HANDLE BACK BUTTON
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
    // Filter from MASTER CONTACTS (Real-time Firebase Data)
    const peopleInDept = masterContacts.filter(c => 
        c.department === deptName
    );

    // Sort Staff by designation priority
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
    
    // Always search from the Real-time Synced Master List
    const peopleInDept = masterContacts.filter(c => 
        c.department === selectedDept
    );
    
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filtered = peopleInDept.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          (item.designation && item.designation.toLowerCase().includes(formattedQuery)) ||
          (item.role && item.role.toLowerCase().includes(formattedQuery)) 
        );
      });
      // Maintain Sort
      filtered.sort((a, b) => getRoleScore(a.designation) - getRoleScore(b.designation));
      setFilteredContacts(filtered);
    } else {
      // Re-apply sort
      peopleInDept.sort((a, b) => getRoleScore(a.designation) - getRoleScore(b.designation));
      setFilteredContacts(peopleInDept);
    }
  };

  // --- RENDER: DEPARTMENT CARD ---
  const renderDeptItem = ({ item }) => {
    const style = getScienceStyle(item.name);
    
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
            {/* Dynamic Count from Firebase + Hardcoded */}
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
          // VIEW 1: INSIDE A DEPT (Back -> List)
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
                 School of Science
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
            keyExtractor={(item) => item.id.toString()}
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
          data={scienceDepts}
          keyExtractor={(item) => item.name}
          renderItem={renderDeptItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Science Programs</Text>}
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
  
  // Dept Card
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

export default SchoolOfScienceScreen;