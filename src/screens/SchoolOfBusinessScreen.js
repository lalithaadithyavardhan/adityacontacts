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
import { initialContacts } from '../data/SchoolOfBusinessData'; 

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING ---
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // Top Leadership
    if (d.includes('dean') || d.includes('head') || d.includes('director')) return 1;

    // Academic Ranks (Strict Order)
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 2; // Full Professor
    if (d.includes('associate professor')) return 3; 
    if (d.includes('assistant professor') || d.includes('asst. professor')) return 4;
    
    // Scholars / Staff
    if (d.includes('research scholar') || d.includes('ph.d')) return 50;
    if (d.includes('assistant') && !d.includes('professor')) return 51;
    
    return 20; // Default
};

// --- RULE 2: DEPARTMENT RANKING ---
const BUSINESS_DEPT_PRIORITY = {
    "integrated mba": 1, 
    "1mba": 1, 
    "mba": 2,
    "bba": 3
};

const getDeptScore = (deptName) => {
    const name = deptName.toLowerCase();
    for (const [key, rank] of Object.entries(BUSINESS_DEPT_PRIORITY)) {
        if (name.includes(key)) return rank;
    }
    return 100; 
};

// --- HELPER: Business School Icons ---
const getBusinessStyle = (deptName) => {
  const name = deptName.toLowerCase();
  
  if (name.includes('bba')) return { icon: 'briefcase-outline', color: '#FF9800' }; // Orange
  if (name.includes('integrated') || name.includes('1mba')) return { icon: 'layers-outline', color: '#9C27B0' }; // Purple
  if (name.includes('mba')) return { icon: 'trending-up-outline', color: '#4CAF50' }; // Green
  
  // Default fallback
  return { icon: 'business-outline', color: '#607D8B' };
};

// ---------------------------------------------------------
// 3. ROBUST MATCHING LOGIC (THE FIX)
// ---------------------------------------------------------
// This function handles Case Sensitivity and the "1MBA" vs "Integrated MBA" issue
const checkBusinessMatch = (contact, folderName) => {
    const contactDept = (contact.department || "").toLowerCase().trim();
    const targetFolder = folderName.toLowerCase().trim();

    // 1. Handle "Integrated MBA" Special Case
    if (targetFolder === "integrated mba") {
        return contactDept === "integrated mba" || contactDept === "1mba";
    }

    // 2. Standard Match (Exact Case-Insensitive Match)
    if (contactDept === targetFolder) return true;

    // 3. Fallback: Check if Department field contains the folder name
    // (e.g. "MBA Department" matches "MBA")
    if (contactDept.includes(targetFolder)) return true;

    return false;
};

const SchoolOfBusinessScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  // Initialize with initialContacts for Instant Load
  const [masterContacts, setMasterContacts] = useState(initialContacts);
  const [businessDepts, setBusinessDepts] = useState([]);
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
          console.log("📡 Connecting to Firebase for Business School...");
          
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

              // --- RECALCULATE DEPARTMENTS ---
              let businessBranchNames = [
                "BBA",
                "MBA",
                "Integrated MBA" 
              ];

              // Create objects with counts using the new ROBUST MATCHER
              const deptObjects = businessBranchNames.map(deptName => {
                const count = allStaff.filter(c => checkBusinessMatch(c, deptName)).length;
                return { name: deptName, count };
              });

              // Sort Departments
              deptObjects.sort((a, b) => getDeptScore(a.name) - getDeptScore(b.name));
              setBusinessDepts(deptObjects);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback logic
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      
                      // Recalculate counts for fallback
                      let businessBranchNames = ["BBA", "MBA", "Integrated MBA"];
                      const deptObjects = businessBranchNames.map(deptName => {
                        const count = allStaff.filter(c => checkBusinessMatch(c, deptName)).length;
                        return { name: deptName, count };
                      });
                      deptObjects.sort((a, b) => getDeptScore(a.name) - getDeptScore(b.name));
                      setBusinessDepts(deptObjects);
                  } else {
                      // Initial fallback
                      setMasterContacts(initialContacts);
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
        // Filter contacts from MASTER list using ROBUST MATCHER
        let peopleInDept = masterContacts.filter(c => checkBusinessMatch(c, selectedDept));

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
        // Initial setup for departments (ensure counts are right on first load)
        if (businessDepts.length === 0 && masterContacts.length > 0) {
             let businessBranchNames = ["BBA", "MBA", "Integrated MBA"];
             const deptObjects = businessBranchNames.map(deptName => {
                const count = masterContacts.filter(c => checkBusinessMatch(c, deptName)).length;
                return { name: deptName, count };
             });
             deptObjects.sort((a, b) => getDeptScore(a.name) - getDeptScore(b.name));
             setBusinessDepts(deptObjects);
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
    const peopleInDept = masterContacts.filter(c => checkBusinessMatch(c, deptName));

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
    const style = getBusinessStyle(item.name);
    
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
            <Text style={styles.cardCount}>{item.count} Faculty</Text>
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
            <Text style={styles.contactRole}>{item.designation || item.role || 'Faculty'}</Text>
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
                 School of Business
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
                    <Text style={styles.emptyText}>No faculty found.</Text>
                </View>
            }
          />
        </View>
      ) : (
        <FlatList
          data={businessDepts}
          keyExtractor={(item) => item.name}
          renderItem={renderDeptItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Management Programs</Text>}
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

export default SchoolOfBusinessScreen;