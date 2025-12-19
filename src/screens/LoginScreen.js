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
  ActivityIndicator, // Added for loading state
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { initialContacts } from '../data/contactsData'; 

const LoginScreen = ({ navigation }) => {
  // --- STATE ---
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UX State
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // To track which input is active
  const [errors, setErrors] = useState({}); // To store inline error messages

  // --- HANDLERS ---
  const handleFocus = (name) => setFocusedInput(name);
  const handleBlur = () => setFocusedInput(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrors({}); // Clear previous errors
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

    try {
      // Simulate a brief network delay for better UX (optional, remove if unwanted)
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Get Data
      const storedData = await AsyncStorage.getItem('contacts');
      let currentData = storedData ? JSON.parse(storedData) : initialContacts;

      if (!storedData) {
         await AsyncStorage.setItem('contacts', JSON.stringify(initialContacts));
      }

      // 3. Authenticate
      // Attempt 1: Check against loaded data
      let user = currentData.find(
        (c) => c.employeeId === employeeId && c.password === password
      );

      // Attempt 2: Fallback check against initial file (if storage was stale)
      if (!user) {
        const freshUser = initialContacts.find(
          (c) => c.employeeId === employeeId && c.password === password
        );
        if (freshUser) {
          await AsyncStorage.setItem('contacts', JSON.stringify(initialContacts));
          user = freshUser;
        }
      }

      // 4. Result Handling
      if (user) {
        await AsyncStorage.setItem('userSession', JSON.stringify(user));
        navigation.replace('Home');
      } else {
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
              source={require('../../assets/Picsart_25-12-17_12-03-41-625.png')} 
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
                  keyboardType="numeric"
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
    backgroundColor: '#f9f9f9', // Slightly lighter grey for cleaner look
    borderWidth: 1.5, // Slightly thicker for focus effect visibility
    borderColor: '#eee',
    borderRadius: 14, // Softer corners
    paddingHorizontal: 15,
    height: 54, // Taller touch target
  },
  inputFocused: {
    borderColor: '#F05819', // Primary Orange
    backgroundColor: '#fff', // White background on focus
  },
  inputError: {
    borderColor: '#d32f2f', // Red for error
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
    backgroundColor: '#FFBca0', // Lighter orange when disabled
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