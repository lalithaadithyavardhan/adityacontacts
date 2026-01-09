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
import { initialContacts } from '../data/TransportData'; 

// --- HELPER: Transport Icons ---
const getTransportStyle = (unitName) => {
  const name = unitName.toLowerCase();
  
  if (name.includes('office') || name.includes('manager')) return { icon: 'briefcase-outline', color: '#607D8B' }; // Grey (Admin)
  if (name.includes('coordinator') || name.includes('in-charge')) return { icon: 'map-outline', color: '#2196F3' }; // Blue (Routes)
  if (name.includes('driver')) return { icon: 'bus-outline', color: '#F44336' }; // Red (Bus)
  if (name.includes('mechanic') || name.includes('maintenance')) return { icon: 'construct-outline', color: '#FF9800' }; // Orange (Repair)

  // Default fallback
  return { icon: 'car-sport-outline', color: '#9E9E9E' };
};

// ---------------------------------------------------------
// 2. SMART MATCHING LOGIC
// ---------------------------------------------------------
// Checks Department, Role, and Designation for Transport roles
const checkTransportMatch = (contact, folderName) => {
    const dept = (contact.department || "").toLowerCase().trim();
    const role = (contact.role || "").toLowerCase().trim();
    const desig = (contact.designation || "").toLowerCase().trim();
    const targetFolder = folderName.toLowerCase().trim();
    
    // Combine all fields
    const fullProfile = `${dept} ${role} ${desig}`;

    // 1. DRIVERS
    if (targetFolder === "drivers") {
        return fullProfile.includes("driver");
    }

    // 2. BUS MAINTENANCE
    if (targetFolder.includes("maintenance") || targetFolder.includes("mechanic")) {
        return fullProfile.includes("mechanic") || fullProfile.includes("repair") || fullProfile.includes("maintenance");
    }

    // 3. BUS COORDINATORS
    if (targetFolder.includes("coordinator")) {
        return fullProfile.includes("coordinator") || fullProfile.includes("in-charge") || fullProfile.includes("incharge");
    }

    // 4. TRANSPORT OFFICE
    if (targetFolder.includes("office") || targetFolder.includes("manager")) {
        return (fullProfile.includes("manager") || fullProfile.includes("admin") || fullProfile.includes("clerk")) 
               && !fullProfile.includes("driver") 
               && !fullProfile.includes("mechanic");
    }

    // Default Fallback
    return dept === targetFolder || dept.includes(targetFolder);
};

// --- HELPER: Calculate Counts ---
const calculateTransportUnits = (dataList) => {
    const unitNames = [
        "Transport Office",
        "Bus Coordinators",
        "Drivers",
        "Bus Maintenance"
    ];

    return unitNames.map(uName => {
        const count = dataList.filter(c => checkTransportMatch(c, uName)).length;
        return { name: uName, count };
    });
};

const TransportScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  
  // --- STATE ---
  // Initialize with hardcoded data for Instant Load
  const [masterContacts, setMasterContacts] = useState(initialContacts);
  const [transportUnits, setTransportUnits] = useState(() => calculateTransportUnits(initialContacts));
  
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
          console.log("📡 Connecting to Firebase for Transport...");
          
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
              setTransportUnits(calculateTransportUnits(allStaff));
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterContacts(allStaff);
                      setTransportUnits(calculateTransportUnits(allStaff));
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
        let peopleInUnit = masterContacts.filter(c => checkTransportMatch(c, selectedUnit));

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
    const peopleInUnit = masterContacts.filter(c => checkTransportMatch(c, unitName));

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
    const style = getTransportStyle(item.name);
    
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
          // VIEW 1: INSIDE UNIT
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
          // VIEW 2: MAIN LIST
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                 Transport
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
          data={transportUnits}
          keyExtractor={(item) => item.name}
          renderItem={renderUnitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Campus Transport</Text>}
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

export default TransportScreen;