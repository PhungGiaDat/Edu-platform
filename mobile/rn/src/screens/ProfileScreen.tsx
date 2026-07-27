/**
 * ProfileScreen — reuses HomeScreen in profile mode.
 * Lives in the stack navigator under the Profile route so the bottom-tab
 * "Profile" entry can navigate to it via navigation.navigate('Profile').
 */
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { HomeScreen } from './HomeScreen';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const onLogout = useCallback(async () => {
    // ProfileScreen doesn't own the logout; AppNavigator owns it. We emit a
    // "goBack to home and let parent log out" by simply going back.
    if (typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  }, [navigation]);

  return <HomeScreen onLogout={onLogout} profileMode />;
};

export default ProfileScreen;
