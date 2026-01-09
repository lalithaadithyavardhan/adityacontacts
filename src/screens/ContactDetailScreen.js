import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  Share,
  Image,
  Platform,
  ToastAndroid,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- NEW FEATURES Imports ---
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

// 1. IMPORT YOUR FILE DATA AS A BACKUP
import { initialContacts } from '../data/contactsData';

const { width } = Dimensions.get('window');

const ContactDetailScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Reference for the hidden Business Card view
  const viewShotRef = useRef();

  const [contact, setContact] = useState(route.params.contact);
  const [isFavorite, setIsFavorite] = useState(contact.isFavorite || false);

  // --- STATE FOR "SAVE TO DEVICE" MODAL ---
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savePhone, setSavePhone] = useState('');
  const [saveEmail, setSaveEmail] = useState('');
  const [saveOffice, setSaveOffice] = useState('');
  const [errors, setErrors] = useState({}); 

  // 0. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      const loadUpdatedContact = async () => {
        try {
            const stored = await AsyncStorage.getItem('contacts');
            if (!stored) return;
            const contacts = JSON.parse(stored);
            const updated = contacts.find(c => String(c.id) === String(contact.id));
            if (updated) {
                setContact(updated);
                setIsFavorite(updated.isFavorite || false);
            }
        } catch (error) {
            console.log("Error loading updated contact", error);
        }
      };
      loadUpdatedContact();
    }, [contact.id])
  );

  // --- ACTIONS ---
  const handleCall = phone => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const handleMessage = phone => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    Linking.openURL(`sms:${phone}`).catch(() => Alert.alert('Error', 'Cannot send message'));
  };

  const handleEmail = email => {
    if (!email) return Alert.alert('Error', 'No email address available');
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Cannot open email'));
  };

  // --- WHATSAPP FEATURE ---
  const handleWhatsApp = (phone) => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    const url = `whatsapp://send?phone=${cleanPhone}`;
    Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed or cannot be opened');
    });
  };

  // --- REPORT ISSUE FEATURE ---
  const handleReport = () => {
    const subject = `Correction for: ${contact.name}`;
    const body = `Hi developer,%0D%0A%0D%0AI found an error in this contact:%0D%0AName: ${contact.name}%0D%0AID: ${contact.id}%0D%0A%0D%0ACorrection needed:%0D%0A(Type correction here)`;
    // CHANGE EMAIL HERE
    const mailUrl = `mailto:adithyasai533@gmail.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailUrl).catch(() => Alert.alert('Error', 'Could not open email client'));
  };

  /* ---------------- SHARE LOGIC ---------------- */
  const handleShareContact = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0, 
        result: 'tmpfile'
      });

      const name = contact.name || 'Unknown';
      const title = contact.title || contact.designation || contact.role || '';
      const office = contact.office || contact.department || '';
      const phone = contact.phone || '';
      const email = contact.email || '';
      const address = contact.address || contact.location || '';

      const message = `
📇 Contact Details

Name: ${name}
Title: ${title}
Office: ${office}

📞 Phone: ${phone}
📧 Email: ${email}
📍 Address: ${address}
      `.trim();

      if (Platform.OS === 'ios') {
        await Share.share({ url: uri, message: message });
      } else {
        await Clipboard.setStringAsync(message);
        if (ToastAndroid) {
            ToastAndroid.show('Details copied to clipboard!', ToastAndroid.LONG);
        } else {
            Alert.alert('Copied', 'Details copied to clipboard.');
        }
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${name}`,
          UTI: 'public.png',
        });
      }

    } catch (error) {
      console.error("Sharing failed", error);
      Alert.alert('Error', 'Failed to share contact card');
    }
  };

  /* ---------------- OPEN ADD MODAL ---------------- */
  const openAddContactModal = () => {
    setSaveName(contact.name || '');
    setSavePhone(contact.phone || '');
    setSaveEmail(contact.email || '');
    setSaveOffice(contact.office || contact.department || '');
    setErrors({});
    setAddModalVisible(true);
  };

  /* ---------------- SAVE TO DEVICE LOGIC ---------------- */
  const saveContactToDevice = async () => {
    let newErrors = {};
    if (!saveName.trim()) newErrors.name = "Name is required";
    if (!savePhone.trim()) newErrors.phone = "Phone is required";
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Contacts permission is required');
        return;
      }
      
      await Contacts.addContactAsync({
        firstName: saveName,
        jobTitle: contact.title || contact.designation || contact.role,
        department: saveOffice,
        phoneNumbers: [{ label: 'mobile', number: savePhone }],
        emails: saveEmail ? [{ label: 'work', email: saveEmail }] : [],
        addresses: contact.address || contact.location ? [{ label: 'work', street: contact.address || contact.location }] : [],
      });
      
      setAddModalVisible(false);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Contact saved successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Contact saved to phone');
      }

    } catch (error) {
      Alert.alert('Error', 'Unable to add contact');
    }
  };
  
  const toggleFavorite = async () => {
    try {
      const storedData = await AsyncStorage.getItem('contacts');
      let allContacts = storedData ? JSON.parse(storedData) : initialContacts;
      const index = allContacts.findIndex(c => String(c.id) === String(contact.id));
      let newStatus = !isFavorite;

      if (index !== -1) {
        allContacts[index].isFavorite = newStatus;
      } else {
        const newContact = { ...contact, isFavorite: newStatus };
        allContacts.push(newContact);
      }

      await AsyncStorage.setItem('contacts', JSON.stringify(allContacts));
      setIsFavorite(newStatus);
      setContact({ ...contact, isFavorite: newStatus });
      if (Platform.OS === 'android') {
         ToastAndroid.show(newStatus ? 'Added to Favorites' : 'Removed from Favorites', ToastAndroid.SHORT);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not save favorite status');
    }
  };

  const displayName = contact.name;
  const displayTitle = contact.title || contact.designation || contact.role || 'Staff';
  const displayOffice = contact.office || contact.department || 'General';
  const displayAddress = contact.address || contact.office || 'Not Available';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />

      {/* --- CUSTOM HEADER --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity>

             <Text style={styles.headerTitle}>Contact Details</Text>

             <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => navigation.navigate('EditContact', { contact })}
             >
                <Ionicons name="create-outline" size={24} color="white" />
             </TouchableOpacity>
        </View>
      </View>

      {/* --- HIDDEN CARD (For Sharing) --- */}
      <View ref={viewShotRef} style={styles.hiddenCardContainer} collapsable={false}>
        <View style={styles.cardOuterBorder}>
            <View style={styles.watermarkContainer}>
                <Image source={require('../../assets/au_logo.png')} style={styles.watermarkImage} resizeMode="contain" />
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    {contact.photo || contact.image ? (
                        <Image source={{ uri: contact.photo || contact.image }} style={styles.cardAvatar} />
                    ) : (
                        <View style={[styles.cardAvatar, { backgroundColor: '#F05819', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{fontSize: 28, color: 'white', fontWeight: 'bold'}}>{contact.name ? contact.name.charAt(0) : 'A'}</Text>
                        </View>
                    )}
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{displayName}</Text>
                        <Text style={styles.cardRole}>{displayTitle}</Text>
                        <Text style={styles.cardDept}>{displayOffice}</Text>
                    </View>
                </View>
                
                <View style={styles.cardDetails}>
                    <View style={styles.cardRow}>
                        <Ionicons name="call" size={18} color="#F05819" />
                        <Text style={styles.cardText}>  {contact.phone}</Text>
                    </View>
                    {contact.email ? (
                        <View style={styles.cardRow}>
                            <Ionicons name="mail" size={18} color="#F05819" />
                            <Text style={styles.cardText}>  {contact.email}</Text>
                        </View>
                    ) : null}
                    <View style={styles.cardRow}>
                        <Ionicons name="location" size={18} color="#F05819" />
                        <Text style={styles.cardText}>  {displayAddress}</Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>Aditya University Contacts</Text>
                </View>
            </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* PROFILE SECTION */}
        <View style={styles.profile}>
          {contact.photo || contact.image ? (
            <Image source={{ uri: contact.photo || contact.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={60} color={theme.colors.primary} />
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.sub}>{displayTitle}</Text>
          <Text style={styles.sub}>{displayOffice}</Text>
        </View>

        <View style={styles.divider} />

        {/* QUICK ACTIONS ROW (Favorite / Add) */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={toggleFavorite}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={22} color="#F05819" />
            <Text style={styles.quickText}>{isFavorite ? 'Favorite' : 'Add Fav'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={openAddContactModal}>
            <Ionicons name="person-add" size={22} color="#F05819" />
            <Text style={styles.quickText}>Save Contact</Text>
          </TouchableOpacity>
        </View>

        <Info label="ADDRESS" value={displayAddress} />
        <Info label="PHONE" value={contact.phone} icon="call" onPress={() => handleCall(contact.phone)} />
        <Info label="EMAIL" value={contact.email} icon="mail" onPress={() => handleEmail(contact.email)} />

        <View style={styles.divider} />

        {/* --- SOLID CIRCLE ACTION BUTTONS --- */}
        <View style={styles.actionRow}>
          
          {/* 1. CALL (Green) */}
          <SolidButton 
            icon="call" 
            color="#4CAF50" 
            onPress={() => handleCall(contact.phone)} 
          />
          
          {/* 2. WHATSAPP (Whatsapp Green) */}
          <SolidButton 
            icon="logo-whatsapp" 
            color="#25D366" 
            onPress={() => handleWhatsApp(contact.phone)} 
          />

          {/* 3. MESSAGE (Blue) */}
          <SolidButton 
            icon="chatbubble" 
            color="#2196F3" 
            onPress={() => handleMessage(contact.phone)} 
          />
          
          {/* 4. SHARE (Orange) */}
          <SolidButton 
            icon="share-social" 
            color="#FFB74D" 
            onPress={handleShareContact} 
          />
          
        </View>

        {/* --- REPORT ISSUE BUTTON (WIDE & SOLID) --- */}
        <TouchableOpacity style={styles.solidReportBtn} onPress={handleReport}>
             <Ionicons name="alert-circle" size={20} color="#D32F2F" />
             <Text style={styles.solidReportText}>Report Incorrect Info</Text>
        </TouchableOpacity>

        <View style={{height: 40}} /> 
      </ScrollView>

      {/* --- ADD CONTACT MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Save to Device</Text>
                        <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Name *</Text>
                        <TextInput 
                            style={[styles.inputField, errors.name && styles.inputError]} 
                            value={saveName}
                            onChangeText={setSaveName}
                            placeholder="Contact Name"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone *</Text>
                        <TextInput 
                            style={[styles.inputField, errors.phone && styles.inputError]} 
                            value={savePhone}
                            onChangeText={setSavePhone}
                            placeholder="Phone Number"
                            keyboardType="phone-pad"
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput 
                            style={styles.inputField} 
                            value={saveEmail}
                            onChangeText={setSaveEmail}
                            placeholder="Email Address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Office / Department</Text>
                        <TextInput 
                            style={styles.inputField} 
                            value={saveOffice}
                            onChangeText={setSaveOffice}
                            placeholder="Office Name"
                        />
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setAddModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveContactToDevice}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
};

// --- HELPER COMPONENTS ---

const Info = ({ label, value, icon, onPress }) => (
  <View style={styles.infoRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
    {icon && value ? (
      <TouchableOpacity onPress={onPress} style={{ padding: 8 }}>
        <Ionicons name={icon} size={22} color="#F05819" />
      </TouchableOpacity>
    ) : null}
  </View>
);

// --- SOLID CIRCLE BUTTON COMPONENT ---
const SolidButton = ({ icon, color, onPress }) => (
  <TouchableOpacity 
    activeOpacity={0.8}
    onPress={onPress}
    style={[styles.solidCircleBtn, { backgroundColor: color }]}
  >
    <Ionicons name={icon} size={28} color="#fff" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // --- HEADER ---
  header: {
    backgroundColor: '#F05819',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#F05819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18, 
    fontWeight: 'bold',
    color: 'white',
    flex: 1, 
    textAlign: 'center', 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  backBtn: { padding: 5 },
  editBtn: { padding: 5 },

  // --- CONTENT ---
  content: { paddingHorizontal: 20, paddingVertical: 10 },
  
  profile: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  avatar: { 
      width: 120, height: 120, borderRadius: 60, 
      backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', 
      elevation: 4, marginBottom: 15,
      borderWidth: 3, borderColor: '#fff'
  },
  name: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  sub: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 2 },
  
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  
  infoRow: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      marginVertical: 12 
  },
  label: { fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 'bold', letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#333' },
  
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  quickBtn: { alignItems: 'center', padding: 10 },
  quickText: { fontSize: 12, marginTop: 4, color: '#666' },

  // --- SOLID ACTION ROW ---
  actionRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-evenly', 
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30
  },
  solidCircleBtn: { 
      width: 60, 
      height: 60, 
      borderRadius: 30, 
      justifyContent: 'center', 
      alignItems: 'center',
      // Clean shadow for pop
      shadowColor: "#ffffffff",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
  },

  // --- SOLID REPORT BUTTON ---
  solidReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee', // Light red background
    paddingVertical: 15,
    borderRadius: 30,
    width: '90%',
    alignSelf: 'center',
    marginTop: 10
  },
  solidReportText: {
    marginLeft: 10,
    color: '#D32F2F', 
    fontSize: 15,
    fontWeight: 'bold'
  },

  // --- CARD STYLES (Hidden) ---
  hiddenCardContainer: { position: 'absolute', top: 0, left: 0, zIndex: -1, width: 420, backgroundColor: '#fff' },
  cardOuterBorder: { margin: 10, borderRadius: 15, borderWidth: 2, borderColor: '#F05819', backgroundColor: '#fff', overflow: 'hidden', position: 'relative' },
  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkImage: { width: '80%', height: '80%', opacity: 0.15 },
  cardContent: { padding: 20, zIndex: 1, backgroundColor: 'transparent' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardAvatar: { width: 80, height: 80, borderRadius: 40, marginRight: 15, borderWidth: 2, borderColor: '#eee', backgroundColor: '#fff' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  cardRole: { fontSize: 14, color: '#F05819', fontWeight: '700', marginTop: 2 },
  cardDept: { fontSize: 12, color: '#666' },
  cardDetails: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#333', fontWeight: '500' },
  cardFooter: { marginTop: 10, alignItems: 'flex-end' },
  cardFooterText: { fontSize: 10, color: '#999', fontStyle: 'italic' },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { margin: 20, backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F05819' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: '600' },
  inputField: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#f5f5f5', marginRight: 10 },
  saveBtn: { backgroundColor: '#F05819' },
  cancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ContactDetailScreen;