import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { Card, Avatar, Searchbar, Text, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// --- FIREBASE IMPORTS ---
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

// ---------------------------------------------------------
// 1. IMPORT DATA FROM ALL FILES (Fallback)
// ---------------------------------------------------------
import { initialContacts as enggData } from '../data/SchoolOfEnggData'; 
import { initialContacts as freshmanData } from '../data/FreshmanEngineeringData';
import { initialContacts as pharmacyData } from '../data/SchoolOfPharmacyData';
import { initialContacts as businessData } from '../data/SchoolOfBusinessData';
import { initialContacts as scienceData } from '../data/SchoolOfScienceData';
// Add any other data files here if needed

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING ---
// Lower number = Higher Priority
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // 1. Top Leadership
    if (d.includes('vice chancellor') || d.includes('pro chancellor')) return 1;
    if (d.includes('chancellor')) return 1;
    if (d.includes('principal')) return 1;
    if (d.includes('director')) return 1;

    // 2. Academic Ranks (Strict Order)
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 2; // Full Professor
    if (d.includes('associate professor')) return 3; 
    if (d.includes('assistant professor') || d.includes('asst. professor')) return 4;
    
    // 3. Default for others
    return 99;
};

// --- RULE 2: DEPARTMENT RANKING ---
const DEPT_PRIORITY = {
  "agricultural": 1, 
  "civil": 2,
  "computer science": 3, "cse": 3,
  "artificial intelligence": 4, "ai & ml": 4, "aiml": 4,
  "data science": 5, "ds": 5,
  "electronics": 6, "ece": 6, "communication": 6,
  "electrical": 7, "eee": 7,
  "mechanical": 8, "mech": 8,
  "mining": 9,
  "petroleum": 10,
  "pharmacy": 50,
  "business": 51, "mba": 51,
  "science": 52,
  "humanities": 53,
  "freshman": 54,
};

const getDeptScore = (department) => {
    const dept = (department || "").toLowerCase();
    for (const [key, rank] of Object.entries(DEPT_PRIORITY)) {
        if (dept.includes(key)) return rank;
    }
    return 100; 
};

const DeansAndHODsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [masterContacts, setMasterContacts] = useState([]); // Holds ALL synced data
  const [activeTab, setActiveTab] = useState('Deans'); 
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. REAL-TIME DATA SYNC (SMARTER MERGE LOGIC)
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          // Setup real-time listener
          unsubscribe = onSnapshot(
            collection(db, "updates"), 
            (snapshot) => {
              // 1. Get Cloud Data
              const firebaseUpdates = snapshot.docs.map(doc => ({
                id: doc.id, // This is the Firestore Doc ID
                ...doc.data() // This spreads the actual fields (id, name, employeeId)
              }));

              console.log(`🔥 Firebase sent ${firebaseUpdates.length} updates`);

              // 2. Prepare Hardcoded Data (The Base)
              let masterList = [
                ...(enggData || []),
                ...(freshmanData || []),
                ...(pharmacyData || []),
                ...(businessData || []),
                ...(scienceData || []) 
              ];

              // 3. THE SMART MERGE LOOP
              // Iterate through every Firebase update and try to find a match in the masterList
              firebaseUpdates.forEach(update => {
                const updateEmpId = update.employeeId ? String(update.employeeId).trim().toLowerCase() : null;
                const updateInternalId = update.id ? String(update.id).trim() : null;

                // Find index of matching person
                const index = masterList.findIndex(local => {
                    const localEmpId = local.employeeId ? String(local.employeeId).trim().toLowerCase() : null;
                    const localInternalId = local.id ? String(local.id).trim() : null;

                    // MATCH IF: Employee IDs match OR Internal IDs match
                    return (updateEmpId && updateEmpId === localEmpId) || 
                           (updateInternalId && updateInternalId === localInternalId);
                });

                if (index !== -1) {
                    // UPDATE: Overwrite the existing person with Firebase data
                    masterList[index] = { ...masterList[index], ...update };
                } else {
                    // ADD: This person doesn't exist in hardcoded files, add them
                    masterList.push(update);
                }
              });

              setMasterContacts([...masterList]); // Force new array reference

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(masterList))
                .catch(err => console.log('⚠️ Cache save failed:', err));
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      setMasterContacts(JSON.parse(cached));
                  } else {
                      // Final fallback: use combined hardcoded arrays
                      const fallback = [
                        ...(enggData || []),
                        ...(freshmanData || []),
                        ...(pharmacyData || []),
                        ...(businessData || []),
                        ...(scienceData || []) 
                      ];
                      setMasterContacts(fallback);
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
  // 3. FILTER & SORT DATA (Runs whenever Tab, Search, or Data changes)
  // ---------------------------------------------------------
  useEffect(() => {
    if (masterContacts.length === 0) return;

    let results = [];

    // B. Filter by Tab (Deans vs HODs)
    if (activeTab === 'Deans') {
        results = masterContacts.filter(c => {
            // Check both Role and Designation fields
            const role = (c.role || '').toLowerCase();
            const desig = (c.designation || '').toLowerCase();
            return role.includes('dean') || desig.includes('dean') || role.includes('director') || desig.includes('director');
        });
    } else {
        results = masterContacts.filter(c => {
            const role = (c.role || '').toLowerCase();
            const desig = (c.designation || '').toLowerCase();
            // Filter out Deans from HOD tab to prevent duplication if they have both titles
            const isDean = role.includes('dean') || desig.includes('dean');
            const isHod = role.includes('head') || role.includes('hod') || desig.includes('head') || desig.includes('hod');
            
            return isHod && !isDean; // Only show as HOD if they are NOT a Dean (Dean tab takes priority)
        });
    }

    // C. Remove duplicates
    let uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => (
            String(t.id) === String(item.id)
        ))
    );

    // D. *** DUAL-LEVEL SORTING ***
    uniqueResults.sort((a, b) => {
        // 1. Get Designation Scores
        const roleA = getRoleScore(a.designation || a.role);
        const roleB = getRoleScore(b.designation || b.role);

        // Primary Sort: By Designation (e.g., Professor vs Asst. Prof)
        if (roleA !== roleB) {
            return roleA - roleB; 
        }

        // Secondary Sort: By Department (Using your custom list)
        const deptA = getDeptScore(a.department);
        const deptB = getDeptScore(b.department);
        
        return deptA - deptB;
    });

    // E. Search Filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        uniqueResults = uniqueResults.filter(item => 
            item.name.toLowerCase().includes(query) ||
            (item.department && item.department.toLowerCase().includes(query))
        );
    }

    setFilteredData(uniqueResults);
  }, [activeTab, searchQuery, masterContacts]);

  // --- RENDER ITEM ---
  const renderContactItem = ({ item }) => (
    <Card
      style={styles.contactCard}
      onPress={() => navigation.navigate('ContactDetail', { contact: item })}
    >
      <View style={styles.contactRow}>
        <Avatar.Text
            size={50}
            label={item.name ? item.name.substring(0, 1) : '?'}
            style={{ backgroundColor: activeTab === 'Deans' ? '#673AB7' : '#009688' }} 
            color="white"
        />
        <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.name}</Text>
            {/* Display Role */}
            <Text style={styles.contactRole}>{item.designation || item.role}</Text>
            {/* Display Department */}
            <Text style={styles.contactDept}>{item.department}</Text>
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
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Leadership</Text>
              <View style={{width: 24}} /> 
          </View>
      </View>

      {/* CONTROLS */}
      <View style={styles.controlsContainer}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'Deans' && styles.activeTabBtn]} 
                onPress={() => setActiveTab('Deans')}
              >
                  <Text style={[styles.tabText, activeTab === 'Deans' && styles.activeTabText]}>Deans</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'HODs' && styles.activeTabBtn]} 
                onPress={() => setActiveTab('HODs')}
              >
                  <Text style={[styles.tabText, activeTab === 'HODs' && styles.activeTabText]}>HODs</Text>
              </TouchableOpacity>
          </View>

          {/* Search */}
          <Searchbar
            placeholder={`Search ${activeTab}...`}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor="#F05819"
          />
      </View>

      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderContactItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No {activeTab} found.</Text>
            </View>
        }
      />

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
    marginBottom: 0, 
    elevation: 5,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 10,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  backBtn: { padding: 5 },
  controlsContainer: {
      backgroundColor: 'white',
      padding: 15,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      marginBottom: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.05,
  },
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      padding: 4,
      marginBottom: 15,
  },
  tabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
  },
  activeTabBtn: {
      backgroundColor: 'white',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  tabText: {
      fontWeight: '600',
      color: '#888',
      fontSize: 15,
  },
  activeTabText: {
      color: '#F05819',
      fontWeight: 'bold',
  },
  searchBar: { borderRadius: 12, backgroundColor: '#f9f9f9', elevation: 0, height: 45, borderWidth: 1, borderColor: '#eee' },
  searchInput: { fontSize: 15, alignSelf: 'center' },
  listContainer: { padding: 15, paddingBottom: 40 },
  contactCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  contactDetails: { flex: 1, marginLeft: 15 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contactRole: { fontSize: 13, color: '#F05819', fontWeight: '600', marginTop: 2 },
  contactDept: { fontSize: 12, color: '#666', marginTop: 1 },
  arrowBox: { backgroundColor: '#4CAF50', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});

export default DeansAndHODsScreen;