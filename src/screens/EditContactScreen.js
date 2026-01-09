import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditContactScreen = ({ route, navigation }) => {
  const { contact } = route.params;
  const insets = useSafeAreaInsets();

  // --- STATE MANAGEMENT ---
  const [name, setName] = useState(contact.name || '');
  const [role, setRole] = useState(contact.role || contact.title || contact.designation || '');
  const [office, setOffice] = useState(contact.office || contact.department || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');
  const [address, setAddress] = useState(contact.address || contact.location || '');
  const [image, setImage] = useState(contact.photo || contact.image || null);

  // --- HIDE DEFAULT HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- IMAGE ACTIONS ---
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to change the image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    if (!image) return;
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => setImage(null) }
      ]
    );
  };

  // --- SAVE FUNCTION ---
  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing Info', 'Name and Phone Number are required.');
      return;
    }

    try {
      const storedContacts = await AsyncStorage.getItem('contacts');
      let contactsArr = storedContacts ? JSON.parse(storedContacts) : [];

      const updatedContact = {
        ...contact,
        name,
        role: role, 
        title: role,
        designation: role,
        office: office, 
        department: office,
        phone,
        email,
        address,
        photo: image,
        image: image
      };

      // Find and update the specific contact
      const index = contactsArr.findIndex(c => String(c.id) === String(contact.id));
      
      if (index !== -1) {
        contactsArr[index] = updatedContact;
      } else {
        contactsArr.push(updatedContact);
      }

      await AsyncStorage.setItem('contacts', JSON.stringify(contactsArr));
      navigation.goBack();

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />
      
      {/* --- CUSTOM HEADER (MATCHING CONTACT DETAIL STYLE) --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
             {/* 1. Cancel Button (Left) */}
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color="white" />
             </TouchableOpacity>

             {/* 2. Title */}
             <Text style={styles.headerTitle}>Edit Profile</Text>

             {/* 3. Save Button (Right) */}
             <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                <Ionicons name="checkmark" size={24} color="white" />
             </TouchableOpacity>
        </View>
      </View>

      {/* --- KEYBOARD HANDLING --- */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.content}>

            {/* --- IMAGE SECTION --- */}
            <View style={styles.imageContainer}>
              <View style={[styles.avatar, styles.shadow]}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  )}
              </View>

              {/* Image Control Buttons */}
              <View style={styles.imageControls}>
                <TouchableOpacity onPress={pickImage} style={[styles.controlBtn, styles.editPhotoBtn]}>
                   <Ionicons name="camera" size={18} color="white" />
                   <Text style={styles.controlBtnText}>Change</Text>
                </TouchableOpacity>

                {image && (
                  <TouchableOpacity onPress={removeImage} style={[styles.controlBtn, styles.removePhotoBtn]}>
                    <Ionicons name="trash" size={18} color="white" />
                    <Text style={styles.controlBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* --- FORM CARD --- */}
            <View style={[styles.formCard, styles.shadow]}>
              
              {/* Section: Identity */}
              <Text style={styles.sectionTitle}>IDENTITY</Text>
              
              <InputItem 
                icon="person-outline" 
                label="Full Name" 
                value={name} 
                onChange={setName} 
                placeholder="Ex: Aditya Kumar"
              />

              <InputItem 
                icon="ribbon-outline" 
                label="Role / Designation" 
                value={role} 
                onChange={setRole} 
                placeholder="Ex: HOD, Professor, Student"
              />

              <InputItem 
                icon="business-outline" 
                label="Office / Department" 
                value={office} 
                onChange={setOffice} 
                placeholder="Ex: CSE Dept, Admin Block"
              />

              {/* Section: Contact */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>CONTACT DETAILS</Text>

              <InputItem 
                icon="call-outline" 
                label="Phone Number" 
                value={phone} 
                onChange={setPhone} 
                keyboardType="phone-pad"
                placeholder="+91 00000 00000"
              />

              <InputItem 
                icon="mail-outline" 
                label="Email Address" 
                value={email} 
                onChange={setEmail} 
                keyboardType="email-address"
                placeholder="example@aditya.ac.in"
                autoCapitalize="none"
              />

              {/* Section: Location */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>LOCATION</Text>

              <InputItem 
                icon="location-outline" 
                label="Address / Cabin" 
                value={address} 
                onChange={setAddress} 
                placeholder="Ex: Room 304, Block B"
                multiline={true}
              />

            </View>

            <View style={{ height: 100 }} /> 
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- REUSABLE INPUT COMPONENT ---
const InputItem = ({ label, value, onChange, icon, placeholder, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && { height: 80, alignItems: 'flex-start' }]}>
      <Ionicons name={icon} size={20} color="#F05819" style={{ marginRight: 10, marginTop: multiline ? 10 : 0 }} />
      <TextInput
        style={[styles.textInput, multiline && { paddingTop: 10, height: '100%' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#ccc"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7', 
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // --- HEADER STYLES (MATCHED EXACTLY) ---
  header: {
    backgroundColor: '#F05819',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 0, 
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
    fontSize: 20, 
    fontWeight: 'bold',
    color: 'white',
    flex: 1, 
    textAlign: 'center',
    marginHorizontal: 10, 
  },
  headerBtn: {
    padding: 5,
  },

  // Content
  content: {
    padding: 20,
    paddingTop: 25,
  },
  
  // Image
  imageContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 15,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarInitials: {
    fontSize: 45,
    color: '#F05819',
    fontWeight: 'bold',
  },
  
  // Image Controls
  imageControls: {
    flexDirection: 'row',
    gap: 15,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  editPhotoBtn: {
    backgroundColor: '#F05819',
  },
  removePhotoBtn: {
    backgroundColor: '#666',
  },
  controlBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Form
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
});

export default EditContactScreen;