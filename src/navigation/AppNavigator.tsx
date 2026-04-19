// AppNavigator — root navigation structure
//
// Architecture:
//   RootStack (native-stack)
//     ├── [if !hasOnboarded] OnboardingWelcome → Location → Sports → SkillPrefs
//     └── [if hasOnboarded]
//           └── TabNavigator (bottom-tabs)
//               ├── Home (map)
//               ├── Explore (list)
//               ├── Saved
//               └── Profile
//           └── VenueDetail (modal-style stack screen)
//           └── RunDetail (modal-style stack screen)
//
// The conditional screen pattern (React Navigation recommended for auth/onboarding flows):
// when hasOnboarded flips from false → true, React Navigation automatically unmounts
// onboarding screens and shows the main app — no navigate() call needed on finish.

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VenueDetailScreen } from '../screens/VenueDetailScreen';
import { RunDetailScreen } from '../screens/RunDetailScreen';
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { OnboardingLocationScreen } from '../screens/onboarding/OnboardingLocationScreen';
import { OnboardingSportsScreen } from '../screens/onboarding/OnboardingSportsScreen';
import { OnboardingSkillPrefsScreen } from '../screens/onboarding/OnboardingSkillPrefsScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';

import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Shadow, Spacing } from '../constants/spacing';
import { RootStackParamList } from './types';
import { usePrefsContext } from '../context/PrefsContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Custom tab bar with the centered "find" action button from design refs
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const iconMap: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
            Home: { active: 'map', inactive: 'map-outline' },
            Explore: { active: 'compass', inactive: 'compass-outline' },
            Saved: { active: 'bookmark', inactive: 'bookmark-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          };

          const icons = iconMap[route.name];
          if (!icons) return null;

          const label = route.name === 'Home' ? 'Map' : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? Colors.tab.active : Colors.tab.inactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? Colors.tab.active : Colors.tab.inactive },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { hasOnboarded, isLoaded } = usePrefsContext();

  // Hold rendering until we know onboarding state — prevents flash of wrong screen.
  // In practice this is < 20ms (single AsyncStorage.multiGet call).
  if (!isLoaded) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasOnboarded ? (
          // ── Onboarding flow ───────────────────────────────────────────────────
          // When completeOnboarding() sets hasOnboarded = true, React Navigation
          // automatically replaces these screens with the main app — no navigate().
          <>
            <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
            <Stack.Screen name="OnboardingLocation" component={OnboardingLocationScreen} />
            <Stack.Screen name="OnboardingSports" component={OnboardingSportsScreen} />
            <Stack.Screen name="OnboardingSkillPrefs" component={OnboardingSkillPrefsScreen} />
          </>
        ) : (
          // ── Main app ──────────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Home" component={TabNavigator} />
            <Stack.Screen
              name="VenueDetail"
              component={VenueDetailScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="RunDetail"
              component={RunDetailScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            {/* Auth modals — slide up over any screen */}
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.tab.background,
    borderRadius: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    ...Shadow.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
