/**
 * AppNavigator — root navigation.
 *
 * Stack screens:
 *   - Auth, Home, CourseList, CourseDetail, LessonPlayer, Pets, Profile, AR
 *
 * Bottom-tabs:
 *   Rendered inside the Home screen as a claymorphic strip using
 *   ./BottomTabs.tsx (no `@react-navigation/bottom-tabs` because the project
 *   doesn't have it installed and the directive forbids running `npm install`).
 *   Tapping a tab calls `navigation.navigate(...)` so we keep using the
 *   native-stack as the single source of truth.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CourseListScreen } from '../screens/CourseListScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { LessonPlayerScreen } from '../screens/LessonPlayerScreen';
import { PetsScreen } from '../screens/PetsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ARScreen } from '../screens/ARScreen';
import { BRAND, COLORS } from '../design/tokens';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  CourseList: undefined;
  CourseDetail: { courseId: string; courseTitle: string };
  LessonPlayer: { lessonId: string; lessonTitle: string; qrCode?: string };
  Pets: undefined;
  Profile: undefined;
  AR: { lessonId: string; lessonTitle: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
  onLogout: () => Promise<void>;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  isAuthenticated,
  onLoginSuccess,
  onLogout,
}) => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth">
          {() => <AuthScreen onLoginSuccess={onLoginSuccess} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Home">
            {() => <HomeScreen onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="CourseList"
            component={CourseListScreen}
            options={{
              headerShown: true,
              headerTitle: 'Courses',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="CourseDetail"
            component={CourseDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              headerTitle: route.params?.courseTitle ?? 'Course',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            })}
          />
          <Stack.Screen
            name="LessonPlayer"
            component={LessonPlayerScreen}
            options={({ route }) => ({
              headerShown: true,
              headerTitle: route.params?.lessonTitle ?? 'Lesson',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            })}
          />
          <Stack.Screen
            name="Pets"
            component={PetsScreen}
            options={{
              headerShown: true,
              headerTitle: 'My Pets',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true,
              headerTitle: 'Profile',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="AR"
            component={ARScreen}
            options={{
              headerShown: true,
              headerTitle: 'AR Experience',
              headerStyle: { backgroundColor: BRAND.darkBg },
              headerTintColor: COLORS.white,
              headerBackTitle: 'Back',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
