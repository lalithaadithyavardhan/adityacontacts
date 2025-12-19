import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  BackHandler, 
  TouchableOpacity, 
  StatusBar,
  Dimensions
} from 'react-native';
import { Card, Avatar, Searchbar, Text, useTheme } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 1. IMPORT THE CENTRAL DATA
import { initialContacts } from '../data/contactsData'; 

// --- HELPER 1: Smart Icons & Colors ---
const getAdminStyle = (officeName) => {
  const name = officeName.toLowerCase();
  
  // 1. Top Leadership
  if (name.includes('vice chancellor') || name.includes('vc')) return { icon: 'ribbon-outline', color: '#FFD700' }; // Gold
  if (name.includes('chancellor')) return { icon: 'ribbon-outline', color: '#DAA520' }; // Dark Gold
  if (name.includes('principal')) return { icon: 'school-outline', color: '#F05819' }; // Brand Orange
  if (name.includes('provision') || name.includes('pro-vice')) return { icon: 'briefcase-outline', color: '#007AFF' }; // Blue

  // 2. Financial & Registration
  if (name.includes('treasurer') || name.includes('finance') || name.includes('account')) return { icon: 'wallet-outline', color: '#2E7D32' }; // Dark Green
  if (name.includes('registrar') || name.includes('register')) return { icon: 'file-tray-full-outline', color: '#6A1B9A' }; // Purple

  // 3. Regulation & Security
  if (name.includes('proctor')) return { icon: 'shield-checkmark-outline', color: '#C62828' }; // Red
  if (name.includes('inspector')) return { icon: 'search-outline', color: '#455A64' }; // Blue Grey
  if (name.includes('controller') || name.includes('examination')) return { icon: 'clipboard-outline', color: '#009688' }; // Teal

  // 4. Student & Public Relations
  if (name.includes('public relations') || name.includes('pr office')) return { icon: 'megaphone-outline', color: '#E91E63' }; // Pink
  if (name.includes('advisor') || name.includes('student')) return { icon: 'happy-outline', color: '#FF9800' }; // Orange
  if (name.includes('academic')) return { icon: 'book-outline', color: '#1565C0' }; // Blue

  // Default
  return { icon: 'business-outline', color: '#656D78' };
};

// --- HELPER 2: Custom Sorting (Hierarchy) ---
// UPDATED: Added 'Principal' to top priority
const getAdminPriority = (officeName) => {
    const name = officeName.toLowerCase();
    if (name.includes('chancellor') && !name.includes('vice')) return 1; // Chancellor 1st
    if (name.includes('vice chancellor')) return 2; // VC 2nd
    if (name.includes('principal')) return 3; // Principal 3rd (ADDED)
    if (name.includes('provision') || name.includes('pro-vice')) return 4; // Pro-VC 4th
    if (name.includes('registrar')) return 5;
    if (name.includes('controller')) return 6;
    if (name.includes('treasurer')) return 7;
    return 100; // Everyone else sorted alphabetically later
};

const AdminScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [adminOffices, setAdminOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. EXTRACT & SORT ADMIN OFFICES AUTOMATICALLY
  useEffect(() => {
    const allAdmins = initialContacts.filter(c => c.category === 'admin');

    const uniqueOffices = [...new Set(allAdmins.map(item => item.department))]
      .filter(dept => dept); 
    
    const officeObjects = uniqueOffices.map(office => {
        const count = allAdmins.filter(c => c.department === office).length;
        return { name: office, count };
    });

    // Sort by Hierarchy
    officeObjects.sort((a, b) => {
        const priorityA = getAdminPriority(a.name);
        const priorityB = getAdminPriority(b.name);
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB; 
        }
        return a.name.localeCompare(b.name); 
    });

    setAdminOffices(officeObjects);
  }, []);

  // 2. HANDLE BACK BUTTON
  useEffect(() => {
    const onBackPress = () => {
      if (selectedOffice) {
        setSelectedOffice(null); // Go back to office list
        setSearchQuery('');
        return true; 
      }
      return false; // Let default behavior happen (exit screen)
    };

    if (isFocused) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [isFocused, selectedOffice]);

  // --- LOGIC ---
  const handleOfficePress = (officeName) => {
    const peopleInOffice = initialContacts.filter(c => c.department === officeName && c.category === 'admin');
    setFilteredContacts(peopleInOffice);
    setSelectedOffice(officeName);
    setSearchQuery('');
  };

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    const peopleInOffice = initialContacts.filter(c => c.department === selectedOffice && c.category === 'admin');
    
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filtered = peopleInOffice.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          (item.role && item.role.toLowerCase().includes(formattedQuery)) ||
          (item.designation && item.designation.toLowerCase().includes(formattedQuery))
        );
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(peopleInOffice);
    }
  };

  // --- RENDER ITEMS ---
  const renderOfficeItem = ({ item }) => {
    const style = getAdminStyle(item.name);
    return (
      <TouchableOpacity 
        style={styles.officeCard} 
        onPress={() => handleOfficePress(item.name)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: style.color + '15' }]}>
           <Ionicons name={style.icon} size={28} color={style.color} />
        </View>
        <View style={styles.officeInfo}>
            <Text style={styles.officeName}>{item.name}</Text>
            <Text style={styles.officeCount}>{item.count} Staff Members</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.contactRole}>{item.role || item.designation || 'Administrator'}</Text>
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

      {/* --- HEADER --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        {selectedOffice ? (
          // VIEW 1: INSIDE AN OFFICE (Back goes to Office List)
          <View style={styles.headerContent}>
             <TouchableOpacity onPress={() => setSelectedOffice(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity>
             <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedOffice}
             </Text>
             <View style={{width: 24}} /> 
          </View>
        ) : (
          // VIEW 2: MAIN LIST (Back goes to Home Screen)
          <View style={styles.headerContent}>
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity>
             
             <Text style={styles.headerTitle}>
                Administration
             </Text>
             
             {/* Spacer to center title */}
             <View style={{width: 24}} /> 
          </View>
        )}
      </View>

      {/* --- CONTENT --- */}
      {selectedOffice ? (
        // CONTACTS LIST
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Searchbar
                placeholder="Search staff..."
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
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No staff found in this office.</Text>
                </View>
            }
          />
        </View>
      ) : (
        // OFFICE FOLDERS LIST
        <FlatList
          data={adminOffices}
          keyExtractor={(item) => item.name}
          renderItem={renderOfficeItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
              <Text style={styles.sectionHeader}>Offices & Sections</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
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
  
  // List
  listContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  sectionHeader: {
      fontSize: 14,
      fontWeight: '700',
      color: '#888',
      marginBottom: 10,
      marginLeft: 5,
      textTransform: 'uppercase',
      letterSpacing: 1
  },
  
  // Office Card
  officeCard: {
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
  officeInfo: {
    flex: 1,
  },
  officeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  officeCount: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },

  // Contact Card
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
    backgroundColor: '#4CAF50',
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

export default AdminScreen;