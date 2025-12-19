import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal, // Import Modal
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }) => {
  // --- STATE ---
  const [userProfile, setUserProfile] = useState(null);
  
  // Password Fields
  const [empId, setEmpId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- CUSTOM ALERT STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('success'); // 'success', 'error', 'confirm'
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(null); // Function to run on "Yes"

  // --- 1. LOAD USER PROFILE ON START ---
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await AsyncStorage.getItem('userSession');
        if (session) {
          const user = JSON.parse(session);
          setUserProfile(user);
          setEmpId(user.employeeId || '');
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      }
    };
    loadProfile();
  }, []);

  // --- HELPER: SHOW CUSTOM ALERT ---
  const showAlert = (type, title, message, action = null) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setOnConfirmAction(() => action);
    setModalVisible(true);
  };

  // --- LOGOUT FUNCTION ---
  const handleLogoutPress = () => {
    showAlert(
      'confirm',
      'Log Out?',
      'Are you sure you want to sign out of your account?',
      async () => {
        // The actual logout logic
        await AsyncStorage.removeItem('userSession');
        setModalVisible(false);
        navigation.replace('Login');
      }
    );
  };

  // --- CHANGE PASSWORD FUNCTION ---
  const handleChangePassword = async () => {
    if (!empId || !oldPassword || !newPassword || !confirmPassword) {
      showAlert('error', 'Missing Fields', 'Please fill in all the required fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('error', 'Mismatch', 'New passwords do not match. Please try again.');
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem('contacts');
      if (!storedData) {
        showAlert('error', 'Data Error', 'No user data found in storage.');
        return;
      }

      let contacts = JSON.parse(storedData);
      const userIndex = contacts.findIndex(
        u => u.employeeId === empId && u.password === oldPassword
      );

      if (userIndex === -1) {
        showAlert('error', 'Authentication Failed', 'Invalid Employee ID or Old Password.');
        return;
      }

      // Update Password
      contacts[userIndex].password = newPassword;
      await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
      
      // Show Success Modal
      showAlert(
        'success',
        'Password Updated',
        'Your password has been changed successfully.\nPlease log in again.',
        async () => {
           await AsyncStorage.removeItem('userSession');
           setModalVisible(false);
           navigation.replace('Login');
        }
      );

    } catch (error) {
      console.error(error);
      showAlert('error', 'System Error', 'Failed to update password. Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* PROFILE CARD */}
        {userProfile && (
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userProfile.name ? userProfile.name.charAt(0) : 'U'}
              </Text>
            </View>
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileRole}>{userProfile.role || 'Staff Member'}</Text>
            
            <View style={styles.profileDetails}>
                <View style={styles.badge}>
                    <Ionicons name="card-outline" size={16} color="#666" />
                    <Text style={styles.badgeText}>ID: {userProfile.employeeId}</Text>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="briefcase-outline" size={16} color="#666" />
                    <Text style={styles.badgeText}>{userProfile.department || 'General'}</Text>
                </View>
            </View>
          </View>
        )}

        {/* CHANGE PASSWORD FORM */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          
          <Text style={styles.label}>Employee ID</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your ID" 
            value={empId}
            onChangeText={setEmpId}
            keyboardType="numeric"
            editable={!userProfile} 
          />

          <Text style={styles.label}>Old Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Current Password" 
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="New Password" 
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Confirm New Password" 
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.updateButton} onPress={handleChangePassword}>
            <Text style={styles.updateButtonText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <View style={[styles.section, styles.logoutSection]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            {/* ICON BASED ON TYPE */}
            <View style={[styles.modalIconContainer, 
              modalType === 'success' ? styles.iconSuccess : 
              modalType === 'error' ? styles.iconError : styles.iconConfirm
            ]}>
              <Ionicons 
                name={
                  modalType === 'success' ? "checkmark" : 
                  modalType === 'error' ? "close" : "log-out"
                } 
                size={40} 
                color="white" 
              />
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            {/* BUTTONS */}
            <View style={styles.modalActions}>
              {modalType === 'confirm' ? (
                // Two Buttons for Confirmation
                <>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnCancel]} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnConfirm]} 
                    onPress={onConfirmAction}
                  >
                    <Text style={styles.modalBtnTextConfirm}>Log Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Single Button for Success/Error
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnOk]} 
                  onPress={() => {
                     if (onConfirmAction) onConfirmAction();
                     else setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnTextConfirm}>Okay</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  
  // --- PROFILE STYLES ---
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F05819',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  profileRole: { fontSize: 16, color: '#F05819', fontWeight: '600', marginBottom: 15 },
  profileDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
  badgeText: { marginLeft: 6, color: '#555', fontSize: 13, fontWeight: '500' },

  // --- FORM STYLES ---
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fafafa' },
  updateButton: { backgroundColor: '#F05819', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  updateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutSection: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, marginTop: 10 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#d9534f', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },

  // --- CUSTOM MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: -45, // Pull icon up slightly out of the box
    borderWidth: 4,
    borderColor: 'white',
  },
  iconSuccess: { backgroundColor: '#4CAF50' }, // Green
  iconError: { backgroundColor: '#F44336' },   // Red
  iconConfirm: { backgroundColor: '#F05819' }, // Orange
  
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  
  modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  modalBtnCancel: { backgroundColor: '#f0f0f0' },
  modalBtnConfirm: { backgroundColor: '#F05819' },
  modalBtnOk: { backgroundColor: '#4CAF50' },
  
  modalBtnTextCancel: { color: '#666', fontWeight: 'bold' },
  modalBtnTextConfirm: { color: 'white', fontWeight: 'bold' },
});

export default SettingsScreen;