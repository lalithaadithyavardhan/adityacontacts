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
import { initialContacts } from '../data/ServiceAndMaintenanceData'; 

// --- HELPER: Service & Maintenance Icons ---
const getServiceStyle = (unitName) => {
  const name = unitName.toLowerCase();
  
  if (name.includes('electr')) return { icon: 'flash-outline', color: '#FFC107' }; // Amber (Electricity)
  if (name.includes('plumb')) return { icon: 'water-outline', color: '#03A9F4' }; // Light Blue (Water)
  if (name.includes('construction')) return { icon: 'construct-outline', color: '#795548' }; // Brown (Building)
  if (name.includes('gardners')) return { icon: 'leaf-outline', color: '#4CAF50' }; // Green (Nature)
  if (name.includes('garbage')) return { icon: 'trash-outline', color: '#607D8B' }; // Grey (Waste)
  if (name.includes('security')) return { icon: 'shield-outline', color: '#3F51B5' }; // Indigo (Safety)
  if (name.includes('store') || name.includes('material')) return { icon: 'cube-outline', color: '#FF9800' }; // Orange (Inventory)
  if (name.includes('housekeeping') || name.includes('house keeping')) return { icon: 'sparkles-outline', color: '#009688' }; // Teal (Clean)
  if (name.includes('garage')) return { icon: 'car-outline', color: '#607D8B' }; // Grey (Garage)

  // Default fallback (General, SPL Dept, etc.)
  return { icon: 'build-outline', color: '#df5656ff' };
};

// ---------------------------------------------------------
// 2. SMART MATCHING LOGIC (The Fix)
// ---------------------------------------------------------
// Checks Department, Role, and Designation for a robust match
const checkServiceMatch = (contact, folderName) => {
    // Normalize all fields to lowercase for easy comparison
    const dept = (contact.department || "").toLowerCase().trim();
    const role = (contact.role || "").toLowerCase().trim();
    const desig = (contact.designation || "").toLowerCase().trim();
    
    const targetFolder = folderName.toLowerCase().trim();
    
    // Combine all info into one searchable string
    const fullProfile = `${dept} ${role} ${desig}`;

    // --- SPECIFIC MATCHING RULES ---

    // 1. ELECTRICAL
    if (targetFolder.includes("electrical")) {
        return fullProfile.includes("electrical") || fullProfile.includes("electrician") || fullProfile.includes("wireman");
    }

    // 2. PLUMBING
    if (targetFolder.includes("plumb")) {
        return fullProfile.includes("plumb");
    }

    // 3. CONSTRUCTION
    if (targetFolder.includes("construction")) {
        return fullProfile.includes("construction") || fullProfile.includes("civil work") || fullProfile.includes("mason");
    }

    // 4. GARDNERS
    if (targetFolder.includes("gardners")) {
        return fullProfile.includes("garden") || fullProfile.includes("mali");
    }

    // 5. SECURITY
    if (targetFolder.includes("security")) {
        return fullProfile.includes("security") || fullProfile.includes("guard") || fullProfile.includes("watchman");
    }

    // 6. HOUSE KEEPING (General)
    if (targetFolder === "house keeping") {
        // Exclude SPL housekeeping unless specifically looked for
        return (fullProfile.includes("house keeping") || fullProfile.includes("sweeper") || fullProfile.includes("scavenger")) 
               && !fullProfile.includes("spl");
    }

    // 7. SPL HOUSEKEEPING
    if (targetFolder === "spl housekeeping") {
        return fullProfile.includes("spl") && fullProfile.includes("house");
    }

    // 8. GARAGE
    if (targetFolder.includes("garage")) {
        return fullProfile.includes("garage") || fullProfile.includes("driver") || fullProfile.includes("mechanic");
    }

    // 9. STORE
    if (targetFolder.includes("store")) {
        return fullProfile.includes("store");
    }

    // 10. Default Fallback (Exact or Partial Match on Department Name)
    return dept === targetFolder || dept.includes(targetFolder);
};

// --- HELPER: Initial Count Calculation ---
const calculateServiceUnits = (dataList) => {
    const unitNames = [
        "CONSTRUCTION",
        "ELECTRICAL DEPT",
        "Plumbering Dept",
        "GARDNERS",
        "Central Activities",
        "House Keeping",
        "SECURITY",
        "STORE",
        "XMisc. Dept",
        "Garage",
        "SPL Dept",
        "SPL housekeeping",
        "Material"
    ];

    return unitNames.map(uName => {
        const count = dataList.filter(c => checkServiceMatch(c, uName)).length;
        return { name: uName, count };
    });
};

const ServiceAndMaintenanceScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // --- STATE ---
  // Initialize with initialContacts for Instant Load
  const [masterContacts, setMasterContacts] = useState(initialContacts);
  
  // Initialize units based on hardcoded data
  const [serviceUnits, setServiceUnits] = useState(() => calculateServiceUnits(initialContacts));
  
  const [selectedUnit, setSelectedUnit] = useState(null); 
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
          console.log("📡 Connecting to Firebase for Service & Maintenance...");
          
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

              // --- RECALCULATE COUNTS ---
              setServiceUnits(calculateServiceUnits(allStaff));
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      setServiceUnits(calculateServiceUnits(allStaff));
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
    if (selectedUnit) {
        // Filter from MASTER list using Smart Match
        let peopleInUnit = masterContacts.filter(c => checkServiceMatch(c, selectedUnit));

        // Search Filter
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
    // Filter from MASTER list
    const peopleInUnit = masterContacts.filter(c => checkServiceMatch(c, unitName));

    setFilteredContacts(peopleInUnit);
    setSelectedUnit(unitName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    // Logic handled by useEffect
  };

  // --- RENDER: UNIT CARD ---
  const renderUnitItem = ({ item }) => {
    const style = getServiceStyle(item.name);
    
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
                 Service & Maintenance
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
          data={serviceUnits}
          keyExtractor={(item) => item.name}
          renderItem={renderUnitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Campus Services</Text>}
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

export default ServiceAndMaintenanceScreen;