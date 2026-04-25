import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AUTH_CALLBACK_URL } from '@/lib/authRedirect';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert(
        'Supabase not configured',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a root .env file, then fully restart Expo with npx expo start -c.'
      );
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL,
        data: {
          name: name.trim(),
          date_of_birth: dateOfBirth.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('Signup failed', error.message);
      return;
    }

    if (!data.session) {
      Alert.alert('Check your email', 'Open the confirmation email to finish setting up your account.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>Create an account so your saved plans can stay separate.</Text>

        <TextInput
          placeholder="Name"
          placeholderTextColor="#8B8479"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Date of Birth"
          placeholderTextColor="#8B8479"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          style={styles.input}
        />

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8B8479"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#8B8479"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <Pressable onPress={handleSignup} style={styles.primaryButton} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push('/login')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    color: '#1F1D19',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6F6B62',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DDD2',
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 14,
    color: '#1F1D19',
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1EEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1E6E31',
    fontSize: 14,
    fontWeight: '700',
  },
});
