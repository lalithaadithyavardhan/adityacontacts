import React, { useLayoutEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Linking,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const EmergencyScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 1. HARDCODED EMERGENCY DATA (No External Import)
  const emergencyContacts = [
    { id: '1', name: 'Ambulance', role: 'Medical Emergency', phone: '108', icon: 'medical' },
    { id: '2', name: 'Police', role: 'Police Control Room', phone: '100', icon: 'shield' },
    { id: '3', name: 'Fire Station', role: 'Fire Emergency', phone: '101', icon: 'flame' },
    { id: '4', name: 'Women Helpline', role: 'Women Safety', phone: '1091', icon: 'woman' },
    { id: '5', name: 'Cyber Crime', role: 'Report Cyber Fraud', phone: '1930', icon: 'lock-closed' },
    { id: '6', name: 'Anti-Ragging', role: 'Helpline', phone: '18001805522', icon: 'hand-left' },
    { id: '7', name: 'Campus Security', role: 'Main Gate', phone: '9999999999', icon: 'eye' }, // Replace with actual
  ];

  // --- DIRECT CALL FUNCTION ---
  const handleCall = (phoneNumber) => {
    let phoneUrl = '';
    if (Platform.OS === 'android') {
      phoneUrl = `tel:${phoneNumber}`;
    } else {
      phoneUrl = `telprompt:${phoneNumber}`;
    }

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        } else {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => handleCall(item.phone)} // Clicking card calls directly
    >
      <View style={styles.row}>
        
        {/* ICON BOX */}
        <View style={styles.iconBox}>
             <Ionicons 
                name={item.icon} 
                size={32} 
                color="#D32F2F" 
             />
        </View>

        {/* TEXT INFO */}
        <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.role}>{item.role}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
        </View>

        {/* CALL BUTTON INDICATOR */}
        <View style={styles.callBtn}>
            <Ionicons name="call" size={24} color="white" />
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

      {/* HEADER (Red for Emergency) */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                 <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                 Emergency
              </Text>

              <View style={{width: 24}} /> 
          </View>
      </View>

      {/* CONTENT LIST */}
      <FlatList
        data={emergencyContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
            <Text style={styles.subHeader}>Tap to Call Immediately</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: {
    backgroundColor: '#F05819', // Red Theme
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  backBtn: { padding: 5 },

  listContainer: { padding: 15, paddingBottom: 40 },
  subHeader: { 
      fontSize: 14, 
      fontWeight: 'bold', 
      color: '#D32F2F', 
      marginBottom: 15, 
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1
  },

  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
    borderLeftColor: '#D32F2F' // Red accent line
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFEBEE', // Very Light Red
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  callBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  }
});

export default EmergencyScreen;