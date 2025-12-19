import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  BackHandler, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar 
} from 'react-native';
import { Card, Avatar, Searchbar, Text, IconButton, Title, useTheme } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 1. IMPORT THE CENTRAL DATA
import { initialContacts } from '../data/contactsData'; 

const { width } = Dimensions.get('window');

// --- HELPER: Get Smart Icon based on Department Name ---
const getDepartmentStyle = (deptName) => {
  const name = deptName.toLowerCase();
  if (name.includes('computer') || name.includes('cse')) return { icon: 'laptop-outline', color: '#4facfe' };
  if (name.includes('electr') || name.includes('ece')) return { icon: 'flash-outline', color: '#ff9a9e' };
  if (name.includes('mech')) return { icon: 'settings-outline', color: '#a18cd1' };
  if (name.includes('civil')) return { icon: 'construct-outline', color: '#fbc2eb' };
  if (name.includes('admin')) return { icon: 'briefcase-outline', color: '#8fd3f4' };
  if (name.includes('exam')) return { icon: 'document-text-outline', color: '#fa709a' };
  if (name.includes('library')) return { icon: 'book-outline', color: '#48c6ef' };
  // Default
  return { icon: 'business-outline', color: '#F05819' };
};

const DepartmentScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); 
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null); 
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 0. HIDE DEFAULT HEADER (Fixes the "Double Header" issue)
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. EXTRACT DEPARTMENTS & COUNTS (FIXED LOGIC)
  useEffect(() => {
    // --- FIX: Filter ONLY 'faculty' so Admins don't show up here ---
    const academicStaff = initialContacts.filter(c => c.category === 'faculty');

    // Get list of unique departments
    const uniqueDepts = [...new Set(academicStaff.map(item => item.department))]
      .filter(dept => dept) 
      .sort();
    
    // Create objects with counts
    const deptObjects = uniqueDepts.map(dept => {
        const count = academicStaff.filter(c => c.department === dept).length;
        return { name: dept, count };
    });

    setDepartments(deptObjects);
  }, []);

  // 2. HANDLE HARDWARE BACK BUTTON (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (selectedDept) {
        setSelectedDept(null); // Close folder, go back to list
        setSearchQuery('');
        return true; 
      }
      // If on main list, let default behavior happen (go back to Home)
      return false; 
    };

    if (isFocused) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [isFocused, selectedDept]);

  // --- LOGIC ---
  const handleDeptPress = (deptName) => {
    // Filter only faculty from this department
    const peopleInDept = initialContacts.filter(c => 
        c.department === deptName && c.category === 'faculty'
    );
    setFilteredContacts(peopleInDept);
    setSelectedDept(deptName);
    setSearchQuery('');
  };

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    const peopleInDept = initialContacts.filter(c => 
        c.department === selectedDept && c.category === 'faculty'
    );
    
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filtered = peopleInDept.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          item.designation?.toLowerCase().includes(formattedQuery)
        );
      });
      setFilteredContacts(filtered);
    } else {
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
            <Text style={styles.deptCount}>{item.count} Faculty</Text>
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
             {/* ADDED: Back button to return to Home Screen */}
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity>
             
             <Text style={styles.headerTitle}>
                Departments
             </Text>
             
             {/* Spacer to keep title centered */}
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
            keyExtractor={(item) => item.id}
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