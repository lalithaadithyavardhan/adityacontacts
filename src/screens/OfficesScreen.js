import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  BackHandler, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { Card, Avatar, Searchbar, Text, useTheme } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 1. IMPORT DATA
import { initialContacts } from '../data/contactsData'; 

// --- HELPER: Smart Icons for Offices ---
const getOfficeStyle = (officeName) => {
  const name = officeName.toLowerCase();
  
  // 1. Deans
  if (name.includes('dean')) return { icon: 'school-outline', color: '#673AB7' }; // Deep Purple
  
  // 2. HODs
  if (name.includes('head') || name.includes('hod')) return { icon: 'grid-outline', color: '#009688' }; // Teal
  
  // 3. Placement
  if (name.includes('placement') || name.includes('training')) return { icon: 'briefcase-outline', color: '#E91E63' }; // Pink
  
  // Default
  return { icon: 'business-outline', color: '#607D8B' };
};

// --- HELPER: Sorting Priority ---
const getOfficePriority = (officeName) => {
    const name = officeName.toLowerCase();
    if (name.includes('dean')) return 1;       // Deans first
    if (name.includes('head')) return 2;       // HODs second
    if (name.includes('placement')) return 3;  // Placement third
    return 100;
};

const OfficesScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [officeSections, setOfficeSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. EXTRACT DATA AUTOMATICALLY
  useEffect(() => {
    // A. Filter only 'offices' category
    const allOffices = initialContacts.filter(c => c.category === 'offices');

    // B. Get unique section names (e.g. "Council of Deans")
    const uniqueSections = [...new Set(allOffices.map(item => item.department))]
      .filter(dept => dept); 
    
    // C. Create objects with counts
    const sectionObjects = uniqueSections.map(section => {
        const count = allOffices.filter(c => c.department === section).length;
        return { name: section, count };
    });

    // D. Sort by Priority
    sectionObjects.sort((a, b) => {
        const priorityA = getOfficePriority(a.name);
        const priorityB = getOfficePriority(b.name);
        return priorityA - priorityB;
    });

    setOfficeSections(sectionObjects);
  }, []);

  // 2. HANDLE BACK BUTTON
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

  // --- NAVIGATION LOGIC ---
  const handleSectionPress = (sectionName) => {
    const peopleInOffice = initialContacts.filter(c => c.department === sectionName && c.category === 'offices');
    setFilteredContacts(peopleInOffice);
    setSelectedSection(sectionName);
    setSearchQuery('');
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    const peopleInSection = initialContacts.filter(c => c.department === selectedSection && c.category === 'offices');
    
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filtered = peopleInSection.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          (item.role && item.role.toLowerCase().includes(formattedQuery)) ||
          (item.designation && item.designation.toLowerCase().includes(formattedQuery))
        );
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(peopleInSection);
    }
  };

  // --- RENDER: FOLDER CARD ---
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
            {/* Show specific designation (e.g. "Dean of Engineering") */}
            <Text style={styles.contactRole}>{item.role || item.designation}</Text>
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
          // CASE 1: INSIDE A FOLDER (Back -> Office List)
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
          // CASE 2: MAIN OFFICE LIST (Back -> Home Screen)
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                 Offices
              </Text>

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
            keyExtractor={(item) => item.id}
            renderItem={renderContactItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <FlatList
          data={officeSections}
          keyExtractor={(item) => item.name}
          renderItem={renderSectionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Departments & Cells</Text>}
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
  
  // Folder Card
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
});

export default OfficesScreen;