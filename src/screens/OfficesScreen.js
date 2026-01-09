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

// ---------------------------------------------------------
// 1. IMPORT DATA FROM ALL FILES (Fallback / Base)
// ---------------------------------------------------------
import { initialContacts as officesData } from '../data/OfficesData'; 
import { initialContacts as enggData } from '../data/SchoolOfEnggData'; 
import { initialContacts as freshmanData } from '../data/FreshmanEngineeringData';
import { initialContacts as pharmacyData } from '../data/SchoolOfPharmacyData';
import { initialContacts as businessData } from '../data/SchoolOfBusinessData';
import { initialContacts as scienceData } from '../data/SchoolOfScienceData';

// ---------------------------------------------------------
// 2. CONFIGURATION & HELPERS
// ---------------------------------------------------------

// --- RULE 1: DESIGNATION RANKING ---
const ROLE_PRIORITY = {
  "chancellor": 1,
  "vice chancellor": 1,
  "pro vice chancellor": 2,
  "registrar": 3,
  "dean": 4,
  "director": 4,
  "principal": 5,
  "head": 5, 
  "professor": 6,
  "associate professor": 7,
  "assistant professor": 8,
  "asst. professor": 8,
  "administrative officer": 9,
  "pa to": 10,
  "superintendent": 11,
  "senior assistant": 12,
  "junior assistant": 13,
  "attender": 99,
  "staff": 99
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
  "business": 51, "1mba": 51,
  "science": 52,
  "humanities": 53,
  "freshman": 54,
};

// --- HELPER: Composite Rank ---
const getCompositeRank = (contact) => {
  const designation = (contact.designation || contact.role || "").toLowerCase();
  const department = (contact.department || "").toLowerCase();

  let roleScore = 100;
  for (const [key, rank] of Object.entries(ROLE_PRIORITY)) {
    if (designation.includes(key)) {
      roleScore = rank;
      break; 
    }
  }

  let deptScore = 100;
  for (const [key, rank] of Object.entries(DEPT_PRIORITY)) {
    if (department.includes(key)) {
      deptScore = rank;
      break;
    }
  }

  return { roleScore, deptScore };
};

// --- HELPER: Icons ---
const getOfficeStyle = (officeName) => {
  const name = officeName.toLowerCase();
  if (name.includes('deputy')) return { icon: 'ribbon-outline', color: '#FFD700' }; 
  if (name.includes('vice chancellor') && !name.includes('pro')) return { icon: 'school-outline', color: '#D32F2F' }; 
  if (name.includes('pro vice')) return { icon: 'medal-outline', color: '#F57C00' }; 
  if (name.includes('registrar')) return { icon: 'newspaper-outline', color: '#2196F3' }; 
  if (name.includes('personal')) return { icon: 'people-outline', color: '#9C27B0' }; 
  return { icon: 'business-outline', color: '#607D8B' };
};

// --- HELPER: Folder Priority ---
const getOfficePriority = (officeName) => {
    const name = officeName.toLowerCase();
    if (name.includes('deputy')) return 1;
    if (name.includes('vice chancellor') && !name.includes('pro')) return 2;
    if (name.includes('pro vice')) return 3;
    if (name.includes('registrar')) return 4;
    return 100;
};

// ---------------------------------------------------------
// 3. MATCHING LOGIC (UPDATED: CHECKS BOTH FIELDS)
// ---------------------------------------------------------
const checkMatch = (contact, categoryName) => {
    // FIX: Combine both fields to ensure we don't miss anything
    const roleField = (contact.role || '').toLowerCase();
    const desigField = (contact.designation || '').toLowerCase();
    const fullProfile = roleField + " " + desigField; 
    
    const dept = (contact.department || '').toLowerCase();

    // 1. DEPUTY PRO CHANCELLOR
    if (categoryName === "Deputy Pro Chancellor") {
        return (fullProfile.includes('dy pro') || fullProfile.includes('deputy pro')) 
               && !fullProfile.includes('pa to');
    }
    // 2. VICE CHANCELLOR
    if (categoryName === "Vice Chancellor") {
        return fullProfile.includes('vice chancellor') 
               && !fullProfile.includes('pro vice') 
               && !fullProfile.includes('dy') 
               && !fullProfile.includes('deputy')
               && !fullProfile.includes('pa to');
    }
    // 3. PRO VICE CHANCELLOR
    if (categoryName === "Pro Vice Chancellor") {
        return fullProfile.includes('pro vice') 
               && !fullProfile.includes('dy') 
               && !fullProfile.includes('deputy')
               && !fullProfile.includes('pa to');
    }
    // 4. REGISTRAR
    if (categoryName === "Registrar") {
        return fullProfile.includes('registrar') && !fullProfile.includes('pa to');
    }
    // 5. Personal assistant
    if (categoryName === "Personal assistant") {
        return fullProfile.includes('pa to') || dept.includes('personal assistant');
    }
    return false;
};

// Helper: Combine all hardcoded files
const getCombinedInitialData = () => {
    return [
        ...(officesData || []),
        ...(enggData || []),
        ...(freshmanData || []),
        ...(pharmacyData || []),
        ...(businessData || []),
        ...(scienceData || []),
    ];
};

const OfficesScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // --- STATE ---
  const [masterList, setMasterList] = useState(getCombinedInitialData());
  const [officeSections, setOfficeSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ---------------------------------------------------------
  // 4. REAL-TIME DATA SYNC (With Employee ID Priority)
  // ---------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const setupRealtimeSync = async () => {
        try {
          console.log("📡 Connecting to Firebase for Offices...");
          
          unsubscribe = onSnapshot(
            collection(db, "updates"), 
            (snapshot) => {
              const firebaseStaff = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // --- MERGE LOGIC START ---
              const staffMap = new Map();
              const initialCombined = getCombinedInitialData();

              // A. Load ALL Hardcoded Data
              initialCombined.forEach(contact => {
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

              setMasterList(allStaff);

              // Cache locally
              AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allStaff))
                .catch(err => console.log('⚠️ Cache save failed:', err));

              // --- RECALCULATE FOLDER COUNTS ---
              const targetRoles = [
                "Deputy Pro Chancellor",
                "Vice Chancellor",
                "Pro Vice Chancellor",
                "Registrar",
                "Personal assistant"
              ];

              const sectionObjects = targetRoles.map(targetRole => {
                // Use the new merged list with updated checkMatch logic
                const count = allStaff.filter(c => checkMatch(c, targetRole)).length;
                return { name: targetRole, count };
              });

              sectionObjects.sort((a, b) => getOfficePriority(a.name) - getOfficePriority(b.name));
              setOfficeSections(sectionObjects);
            },
            (error) => {
              console.error('❌ Real-time listener error:', error);
              // Fallback to cached data
              AsyncStorage.getItem('aditya_contacts_master').then(cached => {
                  if(cached) {
                      const allStaff = JSON.parse(cached);
                      setMasterList(allStaff);
                      // Re-run count logic
                      const targetRoles = ["Deputy Pro Chancellor", "Vice Chancellor", "Pro Vice Chancellor", "Registrar", "Personal assistant"];
                      const sectionObjects = targetRoles.map(targetRole => {
                        const count = allStaff.filter(c => checkMatch(c, targetRole)).length;
                        return { name: targetRole, count };
                      });
                      sectionObjects.sort((a, b) => getOfficePriority(a.name) - getOfficePriority(b.name));
                      setOfficeSections(sectionObjects);
                  } else {
                      // Initial fallback
                      const initialCombined = getCombinedInitialData();
                      const targetRoles = ["Deputy Pro Chancellor", "Vice Chancellor", "Pro Vice Chancellor", "Registrar", "Personal assistant"];
                      const sectionObjects = targetRoles.map(targetRole => {
                        const count = initialCombined.filter(c => checkMatch(c, targetRole)).length;
                        return { name: targetRole, count };
                      });
                      sectionObjects.sort((a, b) => getOfficePriority(a.name) - getOfficePriority(b.name));
                      setOfficeSections(sectionObjects);
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
  // 5. AUTO-REFRESH LIST LOGIC
  // ---------------------------------------------------------
  useEffect(() => {
    if (selectedSection) {
        // Filter from masterList using the robust checkMatch
        const peopleInRole = masterList.filter(c => checkMatch(c, selectedSection));

        // Deduplicate
        let uniquePeople = peopleInRole.filter((item, index, self) =>
            index === self.findIndex((t) => (
                String(t.id) === String(item.id)
            ))
        );

        // Search Filter
        if (searchQuery) {
            const formattedQuery = searchQuery.toLowerCase();
            uniquePeople = uniquePeople.filter((item) => {
                return (
                  item.name.toLowerCase().includes(formattedQuery) ||
                  (item.role && item.role.toLowerCase().includes(formattedQuery)) ||
                  (item.designation && item.designation.toLowerCase().includes(formattedQuery))
                );
            });
        }

        // Sorting
        uniquePeople.sort((a, b) => {
            const ranksA = getCompositeRank(a);
            const ranksB = getCompositeRank(b);
            if (ranksA.roleScore !== ranksB.roleScore) return ranksA.roleScore - ranksB.roleScore;
            return ranksA.deptScore - ranksB.deptScore;
        });

        setFilteredContacts(uniquePeople);
    } else {
        // Refresh counts if main list changes
        if (officeSections.length > 0 && masterList.length > 0) {
             const targetRoles = ["Deputy Pro Chancellor", "Vice Chancellor", "Pro Vice Chancellor", "Registrar", "Personal assistant"];
             const sectionObjects = targetRoles.map(targetRole => {
               const count = masterList.filter(c => checkMatch(c, targetRole)).length;
               return { name: targetRole, count };
             });
             sectionObjects.sort((a, b) => getOfficePriority(a.name) - getOfficePriority(b.name));
             setOfficeSections(sectionObjects);
        }
    }
  }, [masterList, selectedSection, searchQuery]);

  // Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (selectedSection) {
        setSelectedSection(null); 
        setSearchQuery('');
        return true; 
      }
      return false; 
    };
    if (isFocused) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [isFocused, selectedSection]);

  // --- NAVIGATION HANDLER ---
  const handleSectionPress = (sectionName) => {
    const peopleInRole = masterList.filter(c => checkMatch(c, sectionName));

    // Deduplicate
    const uniquePeople = peopleInRole.filter((item, index, self) =>
        index === self.findIndex((t) => (
            String(t.id) === String(item.id)
        ))
    );

    // Sort
    uniquePeople.sort((a, b) => {
        const ranksA = getCompositeRank(a);
        const ranksB = getCompositeRank(b);
        if (ranksA.roleScore !== ranksB.roleScore) return ranksA.roleScore - ranksB.roleScore;
        return ranksA.deptScore - ranksB.deptScore;
    });

    setFilteredContacts(uniquePeople);
    setSelectedSection(sectionName);
    setSearchQuery('');
  };

  const onChangeSearch = (query) => {
    setSearchQuery(query);
  };

  // Render Section
  const renderSectionItem = ({ item }) => {
    const style = getOfficeStyle(item.name);
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleSectionPress(item.name)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: style.color + '15' }]}>
           <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardCount}>{item.count} Members</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  // Render Person
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
            <Text style={styles.contactRole}>{item.designation || item.role}</Text>
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
        {selectedSection ? (
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => setSelectedSection(null)} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                 {selectedSection}
              </Text>
              <View style={{width: 24}} /> 
          </View>
        ) : (
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Offices</Text>
              <View style={{width: 24}} /> 
          </View>
        )}
      </View>

      {/* CONTENT */}
      {selectedSection ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Searchbar
                placeholder="Search..."
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
                    <Text style={styles.emptyText}>No members found.</Text>
                </View>
            }
          />
        </View>
      ) : (
        <FlatList
          data={officeSections}
          keyExtractor={(item) => item.name}
          renderItem={renderSectionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Leadership</Text>}
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
  contactDept: { fontSize: 11, color: '#999', marginTop: 2 }, 
  arrowBox: { backgroundColor: '#4CAF50', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 15, marginBottom: 5 },
  searchBar: { borderRadius: 12, backgroundColor: 'white', elevation: 2, height: 45 },
  searchInput: { fontSize: 15, alignSelf: 'center' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});

export default OfficesScreen;