import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CitizenLoginScreen from '../screens/CitizenLoginScreen';
import VolunteerLoginScreen from '../screens/VolunteerLoginScreen';
import CitizenHomeScreen from '../screens/CitizenHomeScreen';
import CitizenProfileScreen from '../screens/CitizenProfileScreen';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import CitizenTrackScreen from '../screens/CitizenTrackScreen';
import VolunteerDashboardScreen from '../screens/VolunteerDashboardScreen';
import VolunteerRewardsScreen from '../screens/VolunteerRewardsScreen';
import VolunteerProfileScreen from '../screens/VolunteerProfileScreen';
import VolunteerMapScreen from '../screens/VolunteerMapScreen';
import ComplaintDetailsScreen from '../screens/ComplaintDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CitizenTabNavigator = () => {
  const { colors, typography } = useTheme();
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
            height: 70, paddingTop: 4, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: colors.card, position: 'absolute', borderTopWidth: 0,
            elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06, shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: typography.label, letterSpacing: 0.5 },
        tabBarActiveBackgroundColor: colors.glowB,
        tabBarItemStyle: { marginHorizontal: 6, marginVertical: 8, borderRadius: 14 },
        tabBarIcon: ({ color, size }) => {
            if (route.name === 'Home') return <Ionicons name="home" size={size} color={color} />;
            if (route.name === 'Report') return <Ionicons name="add-circle" size={size} color={color} />;
            return <Ionicons name="stats-chart" size={size} color={color} />;
        },
        })}
    >
        <Tab.Screen name="Home" component={CitizenHomeScreen} />
        <Tab.Screen name="Report" component={ReportIssueScreen} />
        <Tab.Screen name="Track" component={CitizenTrackScreen} />
    </Tab.Navigator>
  );
};

const VolunteerTabNavigator = () => {
  const { colors, typography } = useTheme();
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
            height: 70, paddingTop: 4, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: colors.card, position: 'absolute', borderTopWidth: 0,
            elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06, shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: typography.label, letterSpacing: 0.5 },
        tabBarActiveBackgroundColor: colors.glowB,
        tabBarItemStyle: { marginHorizontal: 6, marginVertical: 8, borderRadius: 14 },
        tabBarIcon: ({ color, size }) => {
            if (route.name === 'Queue') return <Ionicons name="people" size={size} color={color} />;
            if (route.name === 'Map') return <Ionicons name="map" size={size} color={color} />;
            if (route.name === 'Rewards') return <Ionicons name="trophy" size={size} color={color} />;
            return <Ionicons name="person" size={size} color={color} />;
        },
        })}
    >
        <Tab.Screen name="Queue" component={VolunteerDashboardScreen} />
        <Tab.Screen name="Map" component={VolunteerMapScreen} />
        <Tab.Screen name="Rewards" component={VolunteerRewardsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isDark, colors, typography } = useTheme();
  const { user, role, activePortal, loading } = useAuth();

  const navigationTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: typography.body, fontWeight: '400' },
      medium: { fontFamily: typography.label, fontWeight: '500' },
      bold: { fontFamily: typography.heading, fontWeight: '700' },
      heavy: { fontFamily: typography.heading, fontWeight: '800' },
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const portal = activePortal || role;

  // Avoid routing flicker while portal/role is still being resolved.
  if (user && !portal) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontFamily: typography.heading },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CitizenLogin" component={CitizenLoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AdminLogin" component={VolunteerLoginScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            {portal === 'volunteer' || role === 'admin' ? (
              <>
                <Stack.Screen name="AdminApp" component={VolunteerTabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="VolunteerProfile" component={VolunteerProfileScreen} options={{ headerShown: false }} />
              </>
            ) : (
              <>
                <Stack.Screen name="CitizenApp" component={CitizenTabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="CitizenProfile" component={CitizenProfileScreen} options={{ headerShown: false }} />
              </>
            )}
            <Stack.Screen name="IssueDetails" component={ComplaintDetailsScreen} options={{ title: 'Complaint Details' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;