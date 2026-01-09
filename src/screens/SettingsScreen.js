import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// --- FIREBASE IMPORTS ---
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // --- 0. HIDE DEFAULT HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- STATE ---
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit Fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Password Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(null); 

  // --- 1. LOAD USER PROFILE (FIXED: ALWAYS GETS LATEST DATA) ---
  useFocusEffect(
    useCallback(() => {
      const loadFreshProfile = async () => {
        try {
          // A. Get the basic session (Who is logged in?)
          const sessionJson = await AsyncStorage.getItem('userSession');
          if (!sessionJson) return;
          
          let currentUser = JSON.parse(sessionJson);

          // B. CHECK MASTER LIST FOR UPDATES (The Fix for Designation)
          // We look into the synchronized data used by other screens to find the LATEST version of this user.
          const masterJson = await AsyncStorage.getItem('aditya_contacts_master');
          if (masterJson) {
             const masterList = JSON.parse(masterJson);
             
             // Find this user in the master list using Employee ID
             const freshData = masterList.find(c => 
                (c.employeeId && String(c.employeeId).trim() === String(currentUser.employeeId).trim()) ||
                (c.id && String(c.id) === String(currentUser.id))
             );

             if (freshData) {
                 console.log("✅ Settings: Found fresher data in Master List");
                 // Merge fresh data ON TOP of session data
                 currentUser = { ...currentUser, ...freshData };
             }
          }

          setUserProfile(currentUser);
          
          // Pre-fill edit fields only if not currently editing
          if (!isEditing) {
              setEditName(currentUser.name || '');
              setEditPhone(currentUser.phone || '');
              setEditEmail(currentUser.email || '');
          }

        } catch (error) {
          console.error("Failed to load profile", error);
        }
      };
      loadFreshProfile();
    }, [isEditing]) // Re-run when editing mode toggles to ensure data integrity
  );

  // --- HELPER: SHOW ALERT ---
  const showAlert = (type, title, message, action = null) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setOnConfirmAction(() => action);
    setModalVisible(true);
  };

  // --- HELPER: UPDATE LOCAL CACHE ---
  const updateLocalCache = async (updatedFields) => {
    try {
      // 1. Update Session (So Settings page stays fresh)
      const updatedUser = { ...userProfile, ...updatedFields };
      await AsyncStorage.setItem('userSession', JSON.stringify(updatedUser));
      setUserProfile(updatedUser);

      // 2. Update Master Contact List (So Search/Lists update instantly)
      const masterData = await AsyncStorage.getItem('aditya_contacts_master');
      if (masterData) {
        let contacts = JSON.parse(masterData);
        const index = contacts.findIndex(c => 
            (c.employeeId && String(c.employeeId) === String(userProfile.employeeId))
        );
        
        if (index !== -1) {
            contacts[index] = { ...contacts[index], ...updatedFields };
            await AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(contacts));
        }
      }
    } catch (e) {
      console.log("Error updating local cache:", e);
    }
  };

  // --- FEATURE 1: SAVE PROFILE CHANGES (FIXED: SENDS ID) ---
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
        showAlert('error', 'Required', 'Name cannot be empty.');
        return;
    }

    setLoading(true);
    try {
        // 1. Prepare Update Object
        // FIX: We MUST include identifiers (employeeId, id) so other devices
        // know WHICH contact to update when they download this data.
        const updates = {
            name: editName,
            phone: editPhone,
            email: editEmail,
            employeeId: userProfile.employeeId, // Critical Fix
            id: userProfile.id,                 // Critical Fix
            
            // Preserve these to ensure they don't get wiped if overwritten
            designation: userProfile.designation || "",
            department: userProfile.department || "",
            role: userProfile.role || ""
        };

        // 2. WRITE TO FIREBASE (The "Truth")
        // Use EmployeeID as the Document Key
        const userDocRef = doc(db, 'updates', String(userProfile.employeeId));
        await setDoc(userDocRef, updates, { merge: true });

        // 3. Update Local Storage
        await updateLocalCache(updates);

        setLoading(false);
        setIsEditing(false);
        showAlert('success', 'Profile Updated', 'Your changes are now live for everyone.');

    } catch (error) {
        console.error("Profile Update Error:", error);
        setLoading(false);
        showAlert('error', 'Update Failed', 'Could not sync with server. Check internet.');
    }
  };

  // --- FEATURE 2: CHANGE PASSWORD ---
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showAlert('error', 'Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('error', 'Mismatch', 'New passwords do not match.');
      return;
    }

    // Verify Old Password
    if (String(oldPassword).trim() !== String(userProfile.password).trim()) {
        showAlert('error', 'Authentication Failed', 'Incorrect old password.');
        return;
    }

    setLoading(true);
    try {
        // 1. WRITE TO FIREBASE
        const updates = { 
            password: newPassword,
            employeeId: userProfile.employeeId, // Critical ID link
            id: userProfile.id
        };
        const userDocRef = doc(db, 'updates', String(userProfile.employeeId));
        await setDoc(userDocRef, updates, { merge: true });

        // 2. Update Local Cache
        await updateLocalCache(updates);

        setLoading(false);
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        
        showAlert('success', 'Password Changed', 'Your password has been updated securely.', () => setModalVisible(false));

    } catch (error) {
        setLoading(false);
        showAlert('error', 'Update Failed', 'Could not update password on server.');
    }
  };

  // --- LOGOUT ---
  const handleLogoutPress = () => {
    showAlert('confirm', 'Log Out?', 'Are you sure you want to sign out?', async () => {
      await AsyncStorage.removeItem('userSession');
      setModalVisible(false);
      navigation.replace('Login');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#F05819" />

      {/* --- HEADER --- */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            {/* Edit Button */}
            <TouchableOpacity 
                style={styles.editHeaderBtn} 
                onPress={() => {
                    if(isEditing) {
                        setEditName(userProfile.name);
                        setEditPhone(userProfile.phone);
                        setEditEmail(userProfile.email);
                        setIsEditing(false);
                    } else {
                        setIsEditing(true);
                    }
                }}
            >
                <Text style={styles.editHeaderText}>{isEditing ? "Cancel" : "Edit"}</Text>
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- PROFILE CARD --- */}
        {userProfile && (
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            {isEditing ? (
                // --- EDIT MODE ---
                <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput 
                        style={styles.editInput} 
                        value={editName} 
                        onChangeText={setEditName} 
                        placeholder="Name"
                    />

                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput 
                        style={styles.editInput} 
                        value={editPhone} 
                        onChangeText={setEditPhone} 
                        placeholder="Phone"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput 
                        style={styles.editInput} 
                        value={editEmail} 
                        onChangeText={setEditEmail} 
                        placeholder="Email"
                        keyboardType="email-address"
                    />

                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={handleSaveProfile}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            ) : (
                // --- VIEW MODE ---
                <>
                    <Text style={styles.profileName}>{userProfile.name}</Text>
                    <Text style={styles.profileRole}>{userProfile.designation || userProfile.role || 'Staff Member'}</Text>
                    
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

                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color="#F05819" />
                        <Text style={styles.infoText}>{userProfile.phone || "No phone added"}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={20} color="#F05819" />
                        <Text style={styles.infoText}>{userProfile.email || "No email added"}</Text>
                    </View>
                </>
            )}
          </View>
        )}

        {/* --- PASSWORD SECTION --- */}
        {!isEditing && (
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput 
                    style={styles.input} 
                    placeholder="Current Password" 
                    secureTextEntry={!showOldPass}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                />
                <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)} style={styles.eyeBtn}>
                    <Ionicons name={showOldPass ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput 
                    style={styles.input} 
                    placeholder="New Password" 
                    secureTextEntry={!showNewPass}
                    value={newPassword}
                    onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                    <Ionicons name={showNewPass ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput 
                    style={styles.input} 
                    placeholder="Confirm New Password" 
                    secureTextEntry={!showConfirmPass}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPass ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.updateButton} onPress={handleChangePassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update Password</Text>}
            </TouchableOpacity>
            </View>
        )}

        {/* --- LOGOUT --- */}
        {!isEditing && (
            <View style={[styles.section, styles.logoutSection]}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
            </View>
        )}

      </ScrollView>

      {/* --- MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, 
              modalType === 'success' ? styles.iconSuccess : 
              modalType === 'error' ? styles.iconError : styles.iconConfirm
            ]}>
              <Ionicons 
                name={modalType === 'success' ? "checkmark" : modalType === 'error' ? "close" : "log-out"} 
                size={40} color="white" 
              />
            </View>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalActions}>
              {modalType === 'confirm' ? (
                <>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={onConfirmAction}>
                    <Text style={styles.modalBtnTextConfirm}>Log Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOk]} onPress={() => { if (onConfirmAction) onConfirmAction(); setModalVisible(false); }}>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginLeft: 10
  },
  backBtn: { padding: 5, width: 40 },
  editHeaderBtn: { 
      paddingVertical: 6, 
      paddingHorizontal: 12, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      borderRadius: 15 
  },
  editHeaderText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F05819',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  profileRole: { fontSize: 16, color: '#F05819', fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  profileDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
  badgeText: { marginLeft: 6, color: '#555', fontSize: 13, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '100%', justifyContent: 'center' },
  infoText: { marginLeft: 10, fontSize: 16, color: '#444' },
  editForm: { width: '100%' },
  inputLabel: { fontSize: 13, color: '#888', fontWeight: 'bold', marginBottom: 5, marginLeft: 2 },
  editInput: {
      backgroundColor: '#fafafa',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: '#333',
      marginBottom: 15
  },
  saveBtn: {
      backgroundColor: '#4CAF50',
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 15
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  eyeBtn: { padding: 8 },
  updateButton: { backgroundColor: '#F05819', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  updateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutSection: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, marginTop: 0 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#d9534f', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  modalIconContainer: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15, marginTop: -45, borderWidth: 4, borderColor: 'white' },
  iconSuccess: { backgroundColor: '#4CAF50' }, 
  iconError: { backgroundColor: '#F44336' },   
  iconConfirm: { backgroundColor: '#F05819' }, 
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  modalBtnCancel: { backgroundColor: '#f0f0f0' },
  modalBtnConfirm: { backgroundColor: '#F05819' },
  modalBtnOk: { backgroundColor: '#4CAF50' },
  modalBtnTextCancel: { color: '#666', fontWeight: 'bold' },
  modalBtnTextConfirm: { color: 'white', fontWeight: 'bold' },
});

export default SettingsScreen;