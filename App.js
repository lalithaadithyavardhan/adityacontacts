import React from 'react';
// FIXED: Added 'View' to imports to fix the error
import { View } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// --- Screens Imports ---
import HomeScreen from './src/screens/HomeScreen';
import AdminScreen from './src/screens/AdminScreen';
import DepartmentScreen from './src/screens/DepartmentScreen';
import OfficesScreen from './src/screens/OfficesScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';
import RecentCallsScreen from './src/screens/RecentCallsScreen';
import EditContactScreen from './src/screens/EditContactScreen';
import AboutScreen from './src/screens/AboutScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen'; 
import SettingsScreen from './src/screens/SettingsScreen'; 

// --- Theme Import ---
import { theme } from './src/theme/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/* -------------------- TAB NAVIGATOR (Floating Design) -------------------- */
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarShowLabel: false,

        tabBarActiveTintColor: '#F05819',
        tabBarInactiveTintColor: '#9E9E9E',

        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Recent') {
            iconName = focused ? 'call' : 'call-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          }

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={color}
              />
            </View>
          );
        },

        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          height: 64,

          borderRadius: 25,

          backgroundColor: 'rgba(255, 255, 255, 0.92)',

          borderTopWidth: 0,

          elevation: 10, // Android shadow

          shadowColor: '#000', // iOS shadow
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        },

        tabBarItemStyle: {
          borderRadius: 32,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Recent"
        component={RecentCallsScreen}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
      />
    </Tab.Navigator>
  );
}


/* -------------------- STACK NAVIGATOR -------------------- */
function StackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Loading"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      {/* 1. Loading Screen */}
      <Stack.Screen 
        name="Loading" 
        component={LoadingScreen} 
        options={{ headerShown: false }} 
      />

      {/* 2. Login Screen */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />

      {/* 3. Main App (Tabs) */}
      {/* This stays named "Home" so your LoginScreen works correctly */}
      <Stack.Screen
        name="Home" 
        component={TabNavigator}
        options={{ headerShown: false }}
      /> 

      {/* 4. Other Screens */}
      <Stack.Screen 
        name="Offices" 
        component={OfficesScreen} 
        options={{ headerShown: false }} 
      />

      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="Department" component={DepartmentScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <Stack.Screen name="EditContact" component={EditContactScreen} />

      {/* Settings Screen */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          headerStyle: { backgroundColor: '#F05819' }, 
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }} 
      />

      {/* About Screen */}
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: 'About',
          headerStyle: { backgroundColor: '#F05819' },
          headerTintColor: '#ffffff',
          headerTitleAlign: 'center',
        }}
      />
    </Stack.Navigator>
  );
}

/* -------------------- MAIN APP COMPONENT -------------------- */
export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#F05819" />
          <StackNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}