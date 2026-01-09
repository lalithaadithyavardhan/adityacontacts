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
import { initialContacts } from '../data/PlacementAndTrainingData'; 

// ---------------------------------------------------------
// 2. CONFIGURATION: PRIORITY RULES
// ---------------------------------------------------------

// --- RULE 1: STAFF DESIGNATION RANKING ---
const getRoleScore = (designation) => {
    const d = (designation || "").toLowerCase();

    // Leadership
    if (d.includes('dean') || d.includes('director') || d.includes('head') || d.includes('chief')) return 1;

    // Coordinators / Officers
    if (d.includes('placement officer')) return 2;
    if (d.includes('coordinator') && !d.includes('assistant')) return 3;

    // Academic/Training Ranks
    if (d.includes('professor') && !d.includes('associate') && !d.includes('assistant')) return 4; 
    if (d.includes('associate professor')) return 5; 
    if (d.includes('assistant professor') || d.includes('trainer')) return 6;
    
    // Support
    if (d.includes('assistant')) return 50;
    if (d.includes('attender') || d.includes('staff')) return 99;
    
    return 20; // Default
};

// --- RULE 2: FIELD (UNIT) RANKING ---
const UNIT_PRIORITY = {
    "t-hub": 1,
    "placements": 2,
    "placement coordinators": 3,
    "smart interview coordinators": 4,
    "gpp coordinators": 5, 
    "apssdc - siemens lab staff": 6,
    "trg. & p.o., & misc": 7,
    "xtraining & assessment": 8,
    "japanese language trainer": 9
};

const getUnitScore = (unitName) => {
    const name = unitName.toLowerCase();
    if (UNIT_PRIORITY[name]) return UNIT_PRIORITY[name];
    return 100; 
};

// --- HELPER: Placement Icons ---
const getPlacementStyle = (unitName) => {
  const name = unitName.toLowerCase();
  
  if (name.includes('t-hub') || name.includes('t hub')) return { icon: 'rocket-outline', color: '#F44336' }; // Red
  if (name.includes('placement') && !name.includes('coordinator')) return { icon: 'briefcase-outline', color: '#2196F3' }; // Blue
  
  if (name.includes('placement coordinators')) return { icon: 'people-outline', color: '#3F51B5' }; // Indigo
  if (name.includes('smart interview')) return { icon: 'mic-outline', color: '#9C27B0' }; // Purple
  if (name.includes('gpp')) return { icon: 'globe-outline', color: '#009688' }; // Teal

  if (name.includes('apssdc')) return { icon: 'construct-outline', color: '#FF9800' }; // Orange
  if (name.includes('japanese')) return { icon: 'language-outline', color: '#E91E63' }; // Pink
  if (name.includes('training')) return { icon: 'school-outline', color: '#4CAF50' }; // Green

  return { icon: 'business-outline', color: '#9E9E9E' };
};

// ---------------------------------------------------------
// 3. SMART MATCHING LOGIC
// ---------------------------------------------------------
// This function decides which folder a person belongs to
const checkPlacementMatch = (contact, unitName) => {
    const name = unitName.toLowerCase();
    const dept = (contact.department || "").toLowerCase();
    const desig = (contact.designation || "").toLowerCase();
    const role = (contact.role || "").toLowerCase();
    
    // Combine fields for broader searching
    const fullProfile = desig + " " + role + " " + dept;

    // 1. T-Hub
    if (name === "t-hub") return dept.includes("t-hub") || dept.includes("t hub");

    // 2. Placements (General)
    if (name === "placements") return dept === "placements";

    // 3. Placement Coordinators
    if (name === "placement coordinators") {
        return dept === "placement coordinators" || fullProfile.includes("placement coordinator");
    }

    // 4. Smart Interview Coordinators
    if (name.includes("smart interview")) {
        return dept.includes("smart interview") || fullProfile.includes("smart interview");
    }

    // 5. GPP Coordinators (Global Placement Programme)
    if (name.includes("gpp")) {
        return dept.includes("gpp") || 
               fullProfile.includes("gpp") || 
               fullProfile.includes("global placement");
    }

    // 6. APSSDC
    if (name.includes("apssdc")) return dept.includes("apssdc");

    // 7. Training & PO
    if (name.includes("trg.") || name.includes("p.o.")) return dept.includes("trg.") || dept.includes("p.o.");

    // 8. XTraining
    if (name.includes("xtraining")) return dept.includes("xtraining");

    // 9. Japanese
    if (name.includes("japanese")) return dept.includes("japanese");

    return false;
};

// --- HELPER: Calculate Unit Counts ---
// Used for both initial load and updates
const calculatePlacementUnits = (contactsList) => {
    const unitNames = [
        "T-Hub",
        "Placements", 
        "Placement Coordinators",       
        "Smart Interview Coordinators", 
        "GPP Coordinators",             
        "APSSDC - SIEMENS LAB STAFF",
        "TRG. & P.O., & MISC",
        "XTraining & Assessment",
        "Japanese Language Trainer"
    ];

    const unitObjects = unitNames.map(uName => {
        const count = contactsList.filter(c => checkPlacementMatch(c, uName)).length;
        return { name: uName, count };
    });

    // Sort Units
    unitObjects.sort((a, b) => getUnitScore(a.name) - getUnitScore(b.name));
    return unitObjects;
};

const PlacementAndTrainingScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // --- STATE ---
  // 1. Initialize Master List with Hardcoded Data (Instant Load)
  const [masterContacts, setMasterContacts] = useState(initialContacts);
  
  // 2. Initialize Units based on Hardcoded Data (Instant Load)
  const [placementUnits, setPlacementUnits] = useState(() => calculatePlacementUnits(initialContacts));
  
  const [selectedUnit, setSelectedUnit] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ---------------------------------------------------------
  // 1. REAL-TIME DATA SYNC
  // ---------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          console.log("📡 Connecting to Firebase for Placement Data...");
          
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
              
              // UPDATE COUNTS DYNAMICALLY
              setPlacementUnits(calculatePlacementUnits(allStaff));

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      setPlacementUnits(calculatePlacementUnits(allStaff));
                  } 
                  // No need for else, we already have initialContacts loaded
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
    // Refresh the open folder whenever masterContacts changes
    if (selectedUnit) {
        let peopleInUnit = masterContacts.filter(c => checkPlacementMatch(c, selectedUnit));

        // Apply Search Filter
        if (searchQuery) {
            const formattedQuery = searchQuery.toLowerCase();
            peopleInUnit = peopleInUnit.filter((item) => {
                return (
                  item.name.toLowerCase().includes(formattedQuery) ||
                  (item.designation && item.designation.toLowerCase().includes(formattedQuery)) ||
                  (item.role && item.role.toLowerCase().includes(formattedQuery))
                );
            });
        }

        // Apply Priority Sort
        peopleInUnit.sort((a, b) => {
            return getRoleScore(a.designation || a.role) - getRoleScore(b.designation || b.role);
        });

        setFilteredContacts(peopleInUnit);
    } 
  }, [masterContacts, selectedUnit, searchQuery]);

  // 3. HANDLE BACK BUTTON
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
    let peopleInUnit = masterContacts.filter(c => checkPlacementMatch(c, unitName));

    peopleInUnit.sort((a, b) => {
        return getRoleScore(a.designation || a.role) - getRoleScore(b.designation || b.role);
    });

    setFilteredContacts(peopleInUnit);
    setSelectedUnit(unitName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    // The useEffect handles filtering
  };

  // --- RENDER: UNIT CARD ---
  const renderUnitItem = ({ item }) => {
    const style = getPlacementStyle(item.name);
    
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
            <Text style={styles.cardCount}>
                {item.count} {item.name.includes('Coordinators') ? 'Members' : 'Staff'}
            </Text>
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
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                 Placement & Training
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
          data={placementUnits}
          keyExtractor={(item) => item.name}
          renderItem={renderUnitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Career Development</Text>}
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

  contactCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  contactDetails: { flex: 1, marginLeft: 15 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contactRole: { fontSize: 13, color: '#666', marginTop: 2 },
  arrowBox: { backgroundColor: '#4CAF50', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 15, marginBottom: 5 },
  searchBar: { borderRadius: 12, backgroundColor: 'white', elevation: 2, height: 45 },
  searchInput: { fontSize: 15, alignSelf: 'center' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});

export default PlacementAndTrainingScreen;