import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  BackHandler, 
  TouchableOpacity, 
  Dimensions,
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

// 1. IMPORT THE CENTRAL DATA (Fallback)
import { initialContacts } from '../data/SchoolOfEnggData'; 

const { width } = Dimensions.get('window');

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING (Priority) ---
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // Top Leadership
    if (d.includes('vice chancellor') || d.includes('principal') || d.includes('dean')) return 1;

    // Academic Ranks (Strict Order)
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 2; // Full Professor
    if (d.includes('associate professor')) return 3; 
    if (d.includes('assistant professor') || d.includes('asst. professor')) return 4;
    
    // Technical / Support Staff
    if (d.includes('lab') || d.includes('technician')) return 50;
    if (d.includes('assistant') && !d.includes('professor')) return 51;
    if (d.includes('attender')) return 99;
    
    return 20; // Default for others (e.g. "Faculty")
};

// --- RULE 2: DEPARTMENT RANKING (Custom Order) ---
const DEPT_PRIORITY = {
  "Agricultural engineering": 1,
  "Civil Engineering": 2,
  "Computer Science & Engineering": 3,
  "AIML": 4, 
  "Data Science": 5,
  "Electronics & Communication Engineering": 6,
  "Electrical & Electronics Engineering": 7,
  "Mechanical Engineering": 8,
  "Mining Engineering": 9,
  "Petroleum Technology": 10,
  "Information Technology": 11,
  "Internet of things": 12,
  "Master of Computer Applications": 13,
  
  // Diploma / Others (Lower Priority)
  "DCME": 20,
  "DCCN": 21,
  "DECE": 22,
  "DEEE": 23,
  "DCivil": 24,
  "DMech": 25,
  "DPET": 26
};

// Helper to find rank by Exact Name first, then fallback to partial
const getDeptScore = (deptName) => {
    // 1. Check for Exact Match
    if (DEPT_PRIORITY[deptName]) {
        return DEPT_PRIORITY[deptName];
    }

    // 2. Fallback: Check lowercase partials
    const name = deptName.toLowerCase();
    for (const [key, rank] of Object.entries(DEPT_PRIORITY)) {
        if (name.includes(key.toLowerCase())) return rank;
    }
    
    return 100; // Default to bottom
};

// --- HELPER: Get Smart Icon ---
const getDepartmentStyle = (deptName) => {
  const name = deptName.toLowerCase();

  if (name.includes('computer') || name.includes('cse') || name.includes('information')) return { icon: 'laptop-outline', color: '#4facfe' }; 
  if (name.includes('electr') || name.includes('eee')) return { icon: 'flash-outline', color: '#ff9a9e' }; 
  if (name.includes('communication') || name.includes('ece')) return { icon: 'wifi-outline', color: '#a18cd1' }; 
  if (name.includes('civil')) return { icon: 'business-outline', color: '#fbc2eb' }; 
  if (name.includes('mech')) return { icon: 'settings-outline', color: '#8fd3f4' }; 

  if (name.includes('mining')) return { icon: 'hammer-outline', color: '#607D8B' }; 
  if (name.includes('petroleum')) return { icon: 'water-outline', color: '#FF9800' }; 
  if (name.includes('agricult')) return { icon: 'leaf-outline', color: '#4CAF50' }; 
  if (name.includes('data') || name.includes('aiml') || name.includes('artificial')) return { icon: 'hardware-chip-outline', color: '#673AB7' }; 
  if (name.includes('internet') || name.includes('iot')) return { icon: 'cloud-outline', color: '#03A9F4' }; 
  if (name.includes('mca')) return { icon: 'code-slash-outline', color: '#E91E63' }; 

  if (name.startsWith('d') && name.length <= 6) return { icon: 'school-outline', color: '#FFC107' }; 

  return { icon: 'folder-open-outline', color: '#F05819' };
};

const DepartmentScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [masterContacts, setMasterContacts] = useState([]); // Holds ALL synced data
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null); 
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

              // --- RECALCULATE DEPARTMENT COUNTS ---
              let allDepartmentNames = [
                "Computer Science & Engineering",
                "Electrical & Electronics Engineering",
                "Electronics & Communication Engineering",
                "Civil Engineering",
                "Mechanical Engineering",
                "Mining Engineering",
                "Petroleum Technology",
                "Information Technology",
                "Data Science",
                "AIML",
                "Agricultural engineering",
                "Internet of things",
                "Master of Computer Applications",
                "DCME", "DCCN", "DECE", "DEEE", "DCivil", "DMech", "DPET"
              ];

              // Sort the Folders
              allDepartmentNames.sort((a, b) => getDeptScore(a) - getDeptScore(b));

              // Create objects with counts using MERGED list
              const deptObjects = allDepartmentNames.map(deptName => {
                  const count = allStaff.filter(c => c.department === deptName).length;
                  return { name: deptName, count };
              });

              setDepartments(deptObjects);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      // Re-run count logic for fallback (abbreviated)
                      // ... (Similar logic as above to rebuild departments)
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

  // 2. HANDLE HARDWARE BACK BUTTON (Android)
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

  // --- LOGIC ---
  const handleDeptPress = (deptName) => {
    // Filter staff for this department from MASTER (Merged) List
    const peopleInDept = masterContacts.filter(c => 
        c.department === deptName
    );

    // *** SORT STAFF BY DESIGNATION ***
    peopleInDept.sort((a, b) => {
        return getRoleScore(a.designation || a.role) - getRoleScore(b.designation || b.role);
    });

    setFilteredContacts(peopleInDept);
    setSelectedDept(deptName);
    setSearchQuery('');
  };

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    
    // Base list is everyone in selected dept (Merged List)
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
      // Maintain priority sort in search results
      filtered.sort((a, b) => getRoleScore(a.designation) - getRoleScore(b.designation));
      setFilteredContacts(filtered);
    } else {
      // Re-apply sort if search cleared
      peopleInDept.sort((a, b) => getRoleScore(a.designation) - getRoleScore(b.designation));
      setFilteredContacts(peopleInDept);
    }
  };

  // --- RENDER: DEPARTMENT CARD ---
  const renderDepartmentItem = ({ item }) => {
    const style = getDepartmentStyle(item.name);
    
    return (
      <TouchableOpacity 
        style={styles.deptCard} 
        onPress={() => handleDeptPress(item.name)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: style.color + '20' }]}>
           <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.deptInfo}>
            <Text style={styles.deptName}>{item.name}</Text>
            <Text style={styles.deptCount}>{item.count} Staff Members</Text>
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
            label={item.name ? item.name.substring(0, 1) : '?'}
            style={{ backgroundColor: '#F05819' }}
            color="white"
        />
        <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.name}</Text>
            {/* Show Designation */}
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

      {/* --- CUSTOM HEADER --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        {selectedDept ? (
          // VIEW 1: INSIDE A DEPARTMENT (Back button closes folder)
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
          // VIEW 2: MAIN LIST (Back button goes to HOME)
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>
                 School of Engineering
              </Text>
              
              <View style={{width: 24}} /> 
          </View>
        )}
      </View>

      {/* --- CONTENT --- */}
      {selectedDept ? (
        // VIEW: CONTACTS LIST
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Searchbar
                placeholder="Search this department..."
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
        // VIEW: DEPARTMENTS LIST
        <FlatList
          data={departments}
          keyExtractor={(item) => item.name}
          renderItem={renderDepartmentItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Styles
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    padding: 5,
  },
  
  // List Styles
  listContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  
  // Department Card Styles
  deptCard: {
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
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  deptCount: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },

  // Contact Card Styles
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  contactDetails: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  arrowBox: {
    backgroundColor: '#4CAF50', // Green call button
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    height: 45,
  },
  searchInput: {
    fontSize: 15,
    alignSelf: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontSize: 16,
  }
});

export default DepartmentScreen;