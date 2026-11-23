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
import { LearningPathScreen } from '../screens/LearningPathScreen';
import { GamesMenuScreen } from '../screens/games/GamesMenuScreen';
import { DragMatchScreen } from '../screens/games/DragMatchScreen';
import { MemoryPairsScreen } from '../screens/games/MemoryPairsScreen';
import { ColorLearnScreen } from '../screens/games/ColorLearnScreen';
import { BridgeDiagnosticScreen } from '../screens/BridgeDiagnosticScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { BRAND, COLORS } from '../design/tokens';
import type { Lesson } from '../types/course';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  CourseList: undefined;
  CourseDetail: { courseId: string; courseTitle: string };
  LearningPath: undefined;
  LessonPlayer: { lessonId: string; lessonTitle: string; qrCode?: string; lesson?: Lesson };
  Pets: undefined;
  Profile: undefined;
  AR: { lessonId: string; lessonTitle: string };
  GamesMenu: undefined;
  DragMatch: undefined;
  MemoryPairs: undefined;
  ColorLearn: undefined;
  BridgeDiagnostic: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  isAuthenticated: boolean;
  saveToken: (token: string) => Promise<void>;
  onLoginSuccess: () => void;
  onLogout: () => Promise<void>;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  isAuthenticated,
  saveToken,
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
          {() => (
            <AuthScreen
              saveToken={saveToken}
              onLoginSuccess={onLoginSuccess}
            />
          )}
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
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="LearningPath"
            component={LearningPathScreen}
            options={{
              headerShown: true,
              headerTitle: 'Learning Path',
              headerStyle: { backgroundColor: COLORS.backgroundBase },
              headerTintColor: COLORS.textPrimary,
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="LessonPlayer"
            component={LessonPlayerScreen}
            options={{
              headerShown: false,
            }}
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
              headerShown: false,
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
          <Stack.Screen
            name="BridgeDiagnostic"
            component={BridgeDiagnosticScreen}
            options={{ headerShown: true, headerTitle: 'Unity Bridge Diagnostics' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="GamesMenu"
            component={GamesMenuScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="DragMatch"
            component={DragMatchScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MemoryPairs"
            component={MemoryPairsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ColorLearn"
            component={ColorLearnScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
