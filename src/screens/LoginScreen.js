import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// --- FIREBASE IMPORTS ---
import { collection, getDocs } from 'firebase/firestore';
// Make sure this path matches where your firebaseConfig.js is located
import { db } from '../firebaseConfig'; 

// 1. IMPORT UTILS
import { FileSystemService } from '../utils/FileSystemService'; 

// ---------------------------------------------------------
// 2. IMPORT ALL DATA FILES (The "Master List")
// ---------------------------------------------------------
// NOTE: If you don't have one of these files yet, comment out that line!

// A. General Contacts (Admin/Test users)
import { initialContacts as mainData } from '../data/contactsData'; 

// B. Schools & Departments
import { initialContacts as scienceData } from '../data/SchoolOfScienceData';
import { initialContacts as businessData } from '../data/SchoolOfBusinessData';
import { initialContacts as placementData } from '../data/PlacementAndTrainingData';
import { initialContacts as freshmanData } from '../data/FreshmanEngineeringData';
import { initialContacts as pharmacyData } from '../data/SchoolOfPharmacyData';
import { initialContacts as engineeringData } from '../data/SchoolOfEnggData';
// C. Support & Offices
import { initialContacts as officeData } from '../data/OfficesData';
// Add any others here (e.g., DeansData, HostelData)

const LoginScreen = ({ navigation }) => {
  // --- STATE ---
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UX State
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); 
  const [errors, setErrors] = useState({}); 

  // --- HANDLERS ---
  const handleFocus = (name) => setFocusedInput(name);
  const handleBlur = () => setFocusedInput(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrors({}); 
    setIsLoading(true);

    // 1. Validation Logic
    let newErrors = {};
    if (!employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!password.trim()) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    // --- DEVELOPER BACKDOOR (Always works) ---
    if (employeeId === 'dev' && password === 'root') {
        setIsLoading(false); 
        navigation.replace('DeveloperScreen'); 
        return;
    }

    try {
      // 2. Initialize File System
      await FileSystemService.initializeProjectStructure();

      // 3. FETCH & MERGE DATA
      
      // --- A. COMBINE ALL HARDCODED FILES ---
      // We use (x || []) to prevent crashing if a file import is undefined
      const allHardcodedData = [
        ...(mainData || []),
        ...(scienceData || []),
        ...(businessData || []),
        ...(placementData || []),
        ...(freshmanData || []),
        ...(pharmacyData || []),
        ...(officeData || []),
        ...(engineeringData || []),
      ];

      let allData = [...allHardcodedData];

      try {
        // --- B. FETCH FIREBASE DATA ---
        const querySnapshot = await getDocs(collection(db, "updates"));
        const firebaseStaff = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // --- C. INTELLIGENT MERGE ---
        const staffMap = new Map();

        // Helper to safely generate a key
        const getKey = (c) => {
            const raw = c.employeeId || c.id;
            return String(raw).trim().toLowerCase();
        };

        // 1. Load Hardcoded Data
        allData.forEach(contact => {
            const key = getKey(contact);
            // If we already have this person, only overwrite if the new one has a password
            // This prevents "Display Data" (no password) from erasing "Login Data" (with password)
            if (staffMap.has(key)) {
                const existing = staffMap.get(key);
                if (!existing.password && contact.password) {
                    staffMap.set(key, contact);
                }
            } else {
                staffMap.set(key, contact);
            }
        });

        // 2. Load Firebase Data (Always wins)
        firebaseStaff.forEach(contact => {
            const key = getKey(contact);
            staffMap.set(key, contact);
        });

        // Convert back to array
        allData = Array.from(staffMap.values());

      } catch (firebaseError) {
        console.log("⚠️ Firebase fetch failed (Offline?), using local data only.");
        // Optional: Check FileSystem backup
        const fsData = await FileSystemService.loadAllData();
        if (fsData && Array.isArray(fsData) && fsData.length > 0) {
             allData = fsData;
        }
      }

      // 4. Authenticate User (STRICT MATCHING)
      const cleanInputID = employeeId.trim().toLowerCase();
      const cleanInputPass = password.trim();

      const user = allData.find((c) => {
        // Safe conversion
        const dataEmpID = c.employeeId ? String(c.employeeId).trim().toLowerCase() : "";
        const dataID = c.id ? String(c.id).trim().toLowerCase() : "";
        
        // IMPORTANT: Ensure password exists before trimming
        const dataPass = c.password ? String(c.password).trim() : "";

        // Check 1: Match Employee ID
        if (dataEmpID === cleanInputID && dataPass === cleanInputPass) return true;

        // Check 2: Match Internal ID (Fallback)
        if (dataID === cleanInputID && dataPass === cleanInputPass) return true;

        return false;
      });

      // 5. Result Handling
      if (user) {
        // Save Session
        await AsyncStorage.setItem('userSession', JSON.stringify(user));
        
        // Save Master List so other screens see the full combined data
        await AsyncStorage.setItem('aditya_contacts_master', JSON.stringify(allData)); 
        
        console.log("✅ Login Success:", user.name);
        navigation.replace('Home'); 
      } else {
        console.log("❌ Login Failed. User not found in", allData.length, "records.");
        setErrors({ general: 'Invalid Employee ID or Password' });
      }

    } catch (error) {
      console.error("Login Error:", error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          
          {/* LOGO SECTION */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/au_logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Staff Login</Text>
            <Text style={styles.subtitle}>Welcome back, please sign in.</Text>
          </View>

          {/* FORM SECTION */}
          <View style={styles.form}>
            
            {/* GENERAL ERROR MESSAGE */}
            {errors.general && (
              <View style={styles.generalErrorContainer}>
                <Ionicons name="alert-circle" size={20} color="#d32f2f" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Employee ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'employeeId' && styles.inputFocused,
                errors.employeeId && styles.inputError
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={focusedInput === 'employeeId' ? '#F05819' : '#999'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter ID (e.g. 50001)"
                  placeholderTextColor="#ccc"
                  value={employeeId}
                  onChangeText={(text) => {
                    setEmployeeId(text);
                    if(errors.employeeId) setErrors({...errors, employeeId: null});
                  }}
                  onFocus={() => handleFocus('employeeId')}
                  onBlur={handleBlur}
                  autoCapitalize="none"
                  keyboardType="default" 
                />
              </View>
              {errors.employeeId && <Text style={styles.errorText}>{errors.employeeId}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputFocused,
                errors.password && styles.inputError
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={focusedInput === 'password' ? '#F05819' : '#999'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Password"
                  placeholderTextColor="#ccc"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if(errors.password) setErrors({...errors, password: null});
                  }}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.loginButtonText, { marginLeft: 10 }]}>Please wait...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>LOGIN</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 70, 
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9', 
    borderWidth: 1.5, 
    borderColor: '#eee',
    borderRadius: 14, 
    paddingHorizontal: 15,
    height: 54, 
  },
  inputFocused: {
    borderColor: '#F05819', 
    backgroundColor: '#fff', 
  },
  inputError: {
    borderColor: '#d32f2f', 
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
    fontWeight: '500',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  generalErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    color: '#F05819',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#F05819', 
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#F05819",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#FFBca0', 
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default LoginScreen;