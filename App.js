import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, Image, StyleSheet, Dimensions, Easing, Platform } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; 

// --- IMPORT NAVIGATION BAR TO FIX BOTTOM SYSTEM BAR COLOR ---
import * as NavigationBar from 'expo-navigation-bar';

// --- 1. CORE SCREENS ---
import HomeScreen from './src/screens/HomeScreen';
import AdminScreen from './src/screens/AdminScreen'; 
import LoginScreen from './src/screens/LoginScreen'; 
import LoadingScreen from './src/screens/LoadingScreen';
import SettingsScreen from './src/screens/SettingsScreen'; 
import AboutScreen from './src/screens/AboutScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import EditContactScreen from './src/screens/EditContactScreen';

// --- NEW DEVELOPER SCREEN ---
import DeveloperScreen from './src/screens/DeveloperScreen';

// --- 2. TAB SCREENS ---
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';
import RecentCallsScreen from './src/screens/RecentCallsScreen';

// --- 3. FEATURE SCREENS ---
import DeansAndHODsScreen from './src/screens/DeansAndHODsScreen';
import OfficesScreen from './src/screens/OfficesScreen';

// School Screens
import DepartmentScreen from './src/screens/DepartmentScreen'; 
import SchoolOfBusinessScreen from './src/screens/SchoolOfBusinessScreen';
import SchoolOfScienceScreen from './src/screens/SchoolOfScienceScreen';
import SchoolOfPharmacyScreen from './src/screens/SchoolOfPharmacyScreen';
import FreshmanEngineeringScreen from './src/screens/FreshmanEngineeringScreen';

// --- 4. SUPPORT SCREENS ---
import PlacementAndTrainingScreen from './src/screens/PlacementAndTrainingScreen';
import AcademicSupportUnitScreen from './src/screens/AcademicSupportUnitScreen';
import HostelsAndResidentialScreen from './src/screens/HostelsAndResidentialScreen';
import ServiceAndMaintenanceScreen from './src/screens/ServiceAndMaintenanceScreen';

// --- 5. MISC SCREENS ---
import TransportScreen from './src/screens/TransportScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';

// --- Theme ---
import { theme } from './src/theme/theme';

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get('window');

/* -------------------- ANIMATED SPLASH COMPONENT -------------------- */
const AnimatedSplash = ({ onFinish }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 1,                 
        duration: 3500,             
        easing: Easing.out(Easing.exp), 
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 1000,             
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
         onFinish();
      }, 500); 
    });
  }, []);

  return (
    <View style={localStyles.splashContainer}>
      <Animated.Image
        source={require('./assets/20260104_195159.png')} 
        style={[
          localStyles.splashLogo, 
          { transform: [{ scale: scaleValue }], opacity: opacityValue }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

/* -------------------- TAB NAVIGATOR (FIXED VISUALS) -------------------- */
function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // Hides the text labels
        
        // --- FIX 1: REMOVE BACKGROUND BOXES ---
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarItemStyle: { backgroundColor: 'transparent' },

        tabBarActiveTintColor: '#F05819',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Recent') iconName = focused ? 'call' : 'call-outline';
          else if (route.name === 'Favorites') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Ionicons name={iconName} size={24} color={color} />
            </View>
          );
        },
        tabBarStyle: {
          position: 'absolute',
          // --- HANDLE SYSTEM BAR POSITION ---
          bottom: Platform.OS === 'ios' ? 20 : 20, 
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 25,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          
          // --- FIX 2: REMOVE WHITE LINE ARTIFACT ON ANDROID ---
          // Android renders 'elevation' poorly on transparent views, creating lines.
          // We disable it for Android (0) but keep it for iOS.
          elevation: Platform.OS === 'android' ? 0 : 5, 
          
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="Recent" component={RecentCallsScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

/* -------------------- STACK NAVIGATOR -------------------- */
function StackNavigator({ initialRoute }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute} 
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Loading" component={LoadingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={TabNavigator} options={{ headerShown: false }} /> 
      <Stack.Screen name="DeveloperScreen" component={DeveloperScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerStyle: { backgroundColor: '#F05819' }, headerTintColor: '#fff', headerTitleAlign: 'center' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <Stack.Screen name="EditContact" component={EditContactScreen} />
      <Stack.Screen name="DeansAndHODs" component={DeansAndHODsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Offices" component={OfficesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Department" component={DepartmentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FreshmanEngineering" component={FreshmanEngineeringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SchoolOfBusiness" component={SchoolOfBusinessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SchoolOfScience" component={SchoolOfScienceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SchoolOfPharmacy" component={SchoolOfPharmacyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlacementAndTraining" component={PlacementAndTrainingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AcademicSupportUnit" component={AcademicSupportUnitScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HostelsAndResidential" component={HostelsAndResidentialScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceAndMaintenance" component={ServiceAndMaintenanceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Transport" component={TransportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

/* -------------------- MAIN APP COMPONENT -------------------- */
export default function App() {
  const [isSplashFinished, setSplashFinished] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login'); 

  useEffect(() => {
    async function prepare() {
      try {
        // --- FIX 3: CONFIGURE ANDROID SYSTEM BAR ---
        if (Platform.OS === 'android') {
            try {
                // Ensure the system navigation bar is transparent and overlaps content
                await NavigationBar.setPositionAsync('absolute');
                await NavigationBar.setBackgroundColorAsync('#ffffff00'); 
                await NavigationBar.setVisibilityAsync('visible');
            } catch (navError) {
                console.log("NavigationBar config failed (ignore if not using Expo Go):", navError);
            }
        }

        // Check Login
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          console.log("User found, going to Home");
          setInitialRoute('Home'); 
        } else {
          console.log("No user found, going to Login");
          setInitialRoute('Login'); 
        }

        await SplashScreen.hideAsync(); 
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  if (!isSplashFinished) {
    return (
       <AnimatedSplash onFinish={() => setSplashFinished(true)} />
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#F05819" />
          <StackNavigator initialRoute={initialRoute} />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const localStyles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: width * 0.85, 
    height: width * 0.85,
  },
});