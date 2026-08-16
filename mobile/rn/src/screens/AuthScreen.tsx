import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { authApi } from '../services/api';
import { ClayButton } from '../components/ClayButton';
import { ClayCard } from '../components/ClayCard';
import {
  BRAND,
  COLORS,
  COLOR_MAP,
  RADIUS,
  SPACING,
  SHADOWS,
} from '../design/tokens';

interface AuthScreenProps {
  saveToken: (token: string) => Promise<void>;
  onLoginSuccess: () => void;
}

export type AuthMode = 'login' | 'register';

// Backend UserCreate requires password >= 8 chars (per backend/models/user_mongo.py).
const MIN_PASSWORD_LENGTH = 8;

// Minimum email shape check — RN-side only. Backend remains authority for
// the canonical email validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ApiErrorShape {
  response?: { status?: number; data?: { detail?: unknown } };
  message?: string;
}

function extractApiError(err: unknown, mode: AuthMode): string {
  const apiErr = err as ApiErrorShape;
  const status = apiErr.response?.status;
  const detail = apiErr.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }

  if (status === 400) {
    return mode === 'register'
      ? 'That email or username is already taken. Try signing in instead.'
      : 'Please check your email and password.';
  }
  if (status === 401) {
    return 'Incorrect email or password.';
  }
  if (status === 409) {
    return 'That email or username is already taken.';
  }
  if (status && status >= 500) {
    return 'Our servers are having trouble. Please try again in a moment.';
  }
  if (apiErr.message) {
    return apiErr.message;
  }
  return mode === 'register'
    ? 'We could not create your account. Please try again.'
    : 'Login failed. Please check your credentials.';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  saveToken,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFormState = (targetMode: AuthMode): void => {
    setMode(targetMode);
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
  };

  const handleLogin = async (): Promise<void> => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(email.trim(), password);
      const { access_token } = response.data;
      await saveToken(access_token);
      onLoginSuccess();
    } catch (err: unknown) {
      setError(extractApiError(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (): Promise<void> => {
    if (loading) return;
    if (name.trim() === '') {
      setError('Please enter your name');
      return;
    }
    if (email.trim() === '') {
      setError('Please enter your email');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.register({
        email: email.trim(),
        username: name.trim(),
        password,
        full_name: name.trim(),
      });
      // Backend register returns UserResponse (no token). Auto-login to
      // obtain a JWT and persist it via the existing secure storage path.
      const loginResponse = await authApi.login(email.trim(), password);
      const { access_token } = loginResponse.data;
      await saveToken(access_token);
      onLoginSuccess();
    } catch (err: unknown) {
      setError(extractApiError(err, 'register'));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>B</Text>
          </View>
          <Text style={styles.brand}>EduPlatform</Text>
        </View>

        <ClayCard variant="lg" color="white" padding={24} style={styles.card}>
          {error && (
            <View
              style={styles.errorContainer}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeSwitchButton, isLogin && styles.modeSwitchButtonActive]}
              onPress={() => resetFormState('login')}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ selected: isLogin }}
              accessibilityLabel="Switch to sign in form"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={[styles.modeSwitchText, isLogin && styles.modeSwitchTextActive]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeSwitchButton, !isLogin && styles.modeSwitchButtonActive]}
              onPress={() => resetFormState('register')}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ selected: !isLogin }}
              accessibilityLabel="Switch to create account form"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={[styles.modeSwitchText, !isLogin && styles.modeSwitchTextActive]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {isLogin ? 'Welcome back' : 'Start your journey'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Continue learning with AR flashcards, games, and your progress streak.'
              : 'Build your learning profile and unlock full progress tracking.'}
          </Text>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabel="Name"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
            accessibilityLabel="Email"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel="Password"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />

          <View style={styles.cta}>
            <ClayButton
              variant="lg"
              color={isLogin ? 'blue' : 'green'}
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={loading}
              loading={loading}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </ClayButton>
          </View>

          <Text style={styles.helperText}>
            {isLogin
              ? 'New here? Tap "Create Account" above.'
              : 'Already registered? Tap "Sign In" above.'}
          </Text>
        </ClayCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: BRAND.sunshineYellow,
    // Web parity: draw a darker "raised bottom" shadow that mirrors
    // `0 6px 0 #d5811f` from the web Login avatar badge.
    shadowColor: BRAND.sunshineYellowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  logoBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    // Reuse the lg shadow for the raised clay panel hierarchy.
    ...(SHADOWS.clayLg as object),
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundBase,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: BRAND.skyBlueLight,
  },
  modeSwitchButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchButtonActive: {
    backgroundColor: BRAND.skyBlue,
    // Raised-pill hint that mirrors the web's "pressed/active" clay state.
    shadowColor: BRAND.skyBlueDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  modeSwitchText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeSwitchTextActive: {
    color: COLORS.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: BRAND.skyBlueLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    minHeight: 52,
  },
  cta: {
    marginTop: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    marginTop: SPACING.md,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
