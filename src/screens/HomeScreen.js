import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Searchbar, Card, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// DATA IMPORT (The offline data)
import { initialContacts } from '../data/contactsData';

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets(); 

  // --- STATE FOR SEARCH & DATA ---
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState(initialContacts);

  // --- DATABASE INITIALIZATION ---
  useEffect(() => {
    const initializeData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('contacts');
        if (!storedData) {
          console.log("Initializing Database...");
          await AsyncStorage.setItem('contacts', JSON.stringify(initialContacts));
          setContacts(initialContacts);
        } else {
          setContacts(JSON.parse(storedData));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    initializeData();
  }, []);

  // --- CATEGORIES DATA ---
  // Added 'SETTINGS' to the end of this list
  const categories = [
    { id: 'admin', title: 'ADMIN', icon: 'shield', screen: 'Admin', colors: ['#f05819', '#f05819'] },
    { id: 'offices', title: 'OFFICES', icon: 'briefcase', screen: 'Offices', colors: ['#f05819', '#f05819'] },
    { id: 'faculty', title: 'FACULTY', icon: 'school', screen: 'Faculty', colors: ['#f05819', '#f05819'] },
    { id: 'departments', title: 'DEPARTMENTS', icon: 'library', screen: 'Department', colors: ['#f05819', '#f05819'] },
    { id: 'institutes', title: 'INSTITUTES', icon: 'business', screen: 'Institutes', colors: ['#f05819', '#f05819'] },
    { id: 'schools', title: 'SCHOOLS', icon: 'home', screen: 'Schools', colors: ['#f05819', '#f05819'] },
    { id: 'halls', title: 'HALLS', icon: 'home-outline', screen: 'Halls', colors: ['#f05819', '#f05819'] },
    { id: 'facilities', title: 'FACILITIES', icon: 'construct', screen: 'Facilities', colors: ['#f05819', '#f05819'] },
    { id: 'emergency', title: 'EMERGENCY', icon: 'medical', screen: 'Emergency', colors: ['#f05819', '#f05819'] },
    { id: 'city', title: 'ADITYA CITY', icon: 'location', screen: 'City', colors: ['#F05819', '#f05819'] },
    // NEW SETTINGS BUTTON ADDED HERE
    { id: 'settings', title: 'SETTINGS', icon: 'settings', screen: 'Settings', colors: ['#F05819', '#f05819'] },
  ];

  const handleCategoryPress = (category) => {
    navigation.navigate(category.screen);
  };

  // --- SEARCH LOGIC ---
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    if (query) {
      const formattedQuery = query.toLowerCase();
      const filteredData = contacts.filter((item) => {
        return (
          item.name.toLowerCase().includes(formattedQuery) ||
          item.department.toLowerCase().includes(formattedQuery)
        );
      });
      setContacts(filteredData);
    } else {
      setContacts(contacts); 
      AsyncStorage.getItem('contacts').then(data => {
          if(data) setContacts(JSON.parse(data));
      });
    }
  };

  // --- RENDER CONTACT ITEM (For Search Results) ---
  const renderContactItem = ({ item }) => (
    <Card
      style={styles.searchCard}
      onPress={() => navigation.navigate('ContactDetail', { contact: item })}
    >
      <Card.Title
        title={item.name}
        subtitle={item.department}
        titleStyle={styles.cardTitle}
        subtitleStyle={styles.cardSubtitle}
        left={(props) => (
          <Avatar.Text
            {...props}
            size={40}
            label={item.name.substring(0, 1)}
            style={{ backgroundColor: '#F05819' }}
            color="white"
          />
        )}
      />
    </Card>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar backgroundColor="#F05819" barStyle="light-content" />
      
      {/* HEADER */}
      <View style={[
          styles.header, 
          { 
            backgroundColor: '#F05819',
            paddingTop: insets.top + 10, 
            paddingBottom: 20 
          }
      ]}>
        
        {/* ROW 1: Logo (Left) | Text (Center) | Icon (Right) */}
        <View style={styles.headerTopRow}>
            
            {/* 1. Logo Left */}
            <Image 
              source={require('../../assets/20251218_152545.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
            
            {/* 2. Middle Text: Aditya University */}
            <View style={styles.headerCenterContainer}>
              <Text style={styles.headerUniversityText}>
                ADITYA UNIVERSITY
              </Text>
            </View>

            {/* 3. About Icon Right (Settings removed from here) */}
            <View style={styles.headerRightButtons}>
              <TouchableOpacity 
                style={styles.headerCircleButton}
                onPress={() => navigation.navigate('About')}
              >
                <Ionicons name="information" size={24} color="#f05819" />
              </TouchableOpacity>
            </View>

        </View>

        {/* ROW 2: Welcome Text (Down Below) */}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerWelcomeText}> 
              welcome to Aditya Contacts
          </Text>
        </View>

      </View>

      {/* CONDITIONAL RENDERING: GRID or LIST */}
      {searchQuery.length > 0 ? (
        // SHOW SEARCH RESULTS LIST
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // SHOW ORIGINAL GRID (If not searching)
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10 }}
        >
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryButton}
                onPress={() => handleCategoryPress(category)}
              >
                <LinearGradient
                  colors={category.colors}
                  style={styles.iconContainer}
                >
                  <Ionicons name={category.icon} size={36} color="rgba(255, 255, 255, 0.92)" />
                </LinearGradient>
                <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#ffff',
    zIndex: 1, 
  },
  
  // --- HEADER STYLES ---
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    width: '100%',
    marginBottom: 8, 
  },
  headerLogo: {
    width: 50,  
    height: 50,
  },
  headerCenterContainer: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerUniversityText: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  headerCircleButton: {
    width: 30,
    height: 30,
    borderRadius: 15, 
    backgroundColor: '#ffffff', 
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8, 
  },
  
  headerTextContainer: {
    marginTop: 5,
    marginBottom: 0,
    alignItems: 'center', 
  },
  headerWelcomeText: {
    color: '#ffffff', 
    fontSize: 15,    
    fontWeight: 'bold',
    textAlign: 'center', 
    opacity: 0.9,
    textTransform: 'capitalize',
  },
  // -------------------------

  content: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  categoryButton: {
    width: '45%',
    aspectRatio: 1,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
    
    // Default Shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchCard: {
    marginHorizontal: 15,
    marginVertical: 5,
    backgroundColor: 'white',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'gray',
  },
  listContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  }
});

export default HomeScreen;