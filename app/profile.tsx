import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { uploadProfileImage } from '@/lib/profileImageStorage';
import { getProfileRecord, syncProfileFromUser, updateProfileAvatar } from '@/lib/profileSync';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const email = user?.email || '';
  const initials = (name.trim() || email || 'PM')
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const loadProfileDetails = async (nextUser: any) => {
    if (!nextUser?.id) {
      setAvatarUrl(null);
      return;
    }

    const profile = await getProfileRecord(nextUser.id);
    setAvatarUrl(profile?.avatar_url ?? nextUser.user_metadata?.avatar_url ?? null);
  };

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setSession(null);
      setUser(null);
      setLoadingUser(false);
      return;
    }

    const loadAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session ?? null);
      setUser(session?.user ?? null);
      await loadProfileDetails(session?.user ?? null);
      setLoadingUser(false);
    };

    void loadAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      await loadProfileDetails(nextSession?.user ?? null);
      setLoadingUser(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    setName(user.user_metadata?.name || '');
    setDob(user.user_metadata?.date_of_birth || '');
  }, [user]);

  useEffect(() => {
    console.log('[Profile] loading:', loadingUser);
    console.log('[Profile] session exists:', !!session);
    console.log('[Profile] user email:', user?.email ?? null);
  }, [loadingUser, session, user]);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace('/(auth)/login');
    }
  }, [loadingUser, user]);

  const handleUpdateProfile = async () => {
    console.log('[Profile] save profile pressed');

    if (!supabase) {
      Alert.alert('Supabase not configured', 'Profile updates are unavailable right now.');
      return;
    }

    if (!user) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedDob = dob.trim();

    if (isUpdatingProfile) {
      console.log('[Profile] save profile ignored: request already in progress');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter your name before saving.');
      return;
    }

    console.log('[Profile] saving profile values', {
      name: trimmedName,
      date_of_birth: trimmedDob,
    });
    console.log('[Profile] source of truth: auth metadata, mirrored to profiles table');

    setIsUpdatingProfile(true);
    console.log('[Profile] profile update request started');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          name: trimmedName,
          date_of_birth: trimmedDob,
          avatar_url: avatarUrl ?? null,
        },
      });

      console.log('[Profile] auth metadata update response', {
        hasUser: !!data.user,
        error: error?.message ?? null,
      });

      if (error) {
        Alert.alert('Profile update failed', error.message);
        return;
      }

      if (data.user) {
        setUser(data.user);
        setSession((currentSession: any) =>
          currentSession
            ? {
                ...currentSession,
                user: data.user,
              }
            : currentSession
        );
        setName(trimmedName);
        setDob(trimmedDob);
        await syncProfileFromUser(data.user);
        await loadProfileDetails(data.user);
        console.log('[Profile] refreshed from updated auth user', data.user.user_metadata ?? null);
      } else {
        console.log('[Profile] auth update returned no user, refreshing session');

        const {
          data: { session: refreshedSession },
        } = await supabase.auth.getSession();

        if (!refreshedSession?.user) {
          Alert.alert('Profile update failed', 'Unable to refresh your profile session.');
          return;
        }

        setSession(refreshedSession);
        setUser(refreshedSession.user);
        setName((refreshedSession.user.user_metadata?.name ?? '').trim());
        setDob((refreshedSession.user.user_metadata?.date_of_birth ?? '').trim());
        await syncProfileFromUser(refreshedSession.user);
        await loadProfileDetails(refreshedSession.user);
        console.log('[Profile] refreshed from session', refreshedSession.user.user_metadata ?? null);
      }

      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save profile right now.';
      console.log('[Profile] profile save failed', message);
      Alert.alert('Profile update failed', message);
    } finally {
      console.log('[Profile] profile save finished');
      setIsUpdatingProfile(false);
    }
  };

  const verifyOldPassword = async () => {
    if (!supabase || !user?.email) {
      console.log('[Profile] verify password aborted: missing auth session');
      return false;
    }

    console.log('[Profile] verifying current password');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (error) {
        console.log('[Profile] current password verification failed', error.message);
        return false;
      }

      console.log('[Profile] current password verification succeeded');
      return true;
    } catch (error) {
      console.log('[Profile] current password verification threw', error);
      throw error;
    }
  };

  const handleChangePassword = async () => {
    console.log('[Profile] change password pressed');

    if (!supabase) {
      Alert.alert('Supabase not configured', 'Password updates are unavailable right now.');
      return;
    }

    if (!user) {
      Alert.alert('Auth session missing', 'Please sign in again and try again.');
      return;
    }

    if (isUpdatingPassword) {
      console.log('[Profile] change password ignored: request already in progress');
      return;
    }

    if (!oldPassword.trim() || !newPassword.trim()) {
      Alert.alert('Missing fields', 'Please enter your old password and new password.');
      return;
    }

    if (newPassword.trim().length < 8) {
      Alert.alert('Weak password', 'Please choose a new password with at least 8 characters.');
      return;
    }

    if (oldPassword.trim() === newPassword.trim()) {
      Alert.alert(
        'Choose a different password',
        'Your new password must be different from your current password.'
      );
      return;
    }

    setIsUpdatingPassword(true);
    console.log('[Profile] password update request started');

    try {
      const isValid = await verifyOldPassword();

      if (!isValid) {
        Alert.alert('Incorrect password', 'Your old password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      console.log('[Profile] password update response received', { error: error?.message ?? null });

      if (error) {
        Alert.alert('Password update failed', error.message);
        return;
      }

      setOldPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update password right now.';
      console.log('[Profile] password update failed', message);
      Alert.alert('Password update failed', message);
    } finally {
      console.log('[Profile] password update finished');
      setIsUpdatingPassword(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!supabase || !user?.id) {
      Alert.alert('Auth session missing', 'Please sign in again and try again.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access so you can choose a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];

    setIsUploadingPhoto(true);

    try {
      const { publicUrl: nextAvatarUrl } = await uploadProfileImage(user.id, asset);

      await updateProfileAvatar(user.id, nextAvatarUrl);

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          name: name.trim(),
          date_of_birth: dob.trim(),
          avatar_url: nextAvatarUrl,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        setUser(authData.user);
        await syncProfileFromUser(authData.user);
      }

      setAvatarUrl(nextAvatarUrl);
      await loadProfileDetails(authData.user ?? user);
      Alert.alert('Success', 'Profile picture updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update profile picture.';
      Alert.alert('Photo upload failed', message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!supabase || !user?.id) {
      Alert.alert('Auth session missing', 'Please sign in again and try again.');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      await updateProfileAvatar(user.id, null);

      const { data: authData, error } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          name: name.trim(),
          date_of_birth: dob.trim(),
          avatar_url: null,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (authData.user) {
        setUser(authData.user);
        await syncProfileFromUser(authData.user);
      }

      setAvatarUrl(null);
      Alert.alert('Success', 'Profile picture removed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to remove profile picture.';
      Alert.alert('Remove photo failed', message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const handleLogout = async () => {
    if (!supabase) {
      router.replace('/(auth)/login');
      return;
    }

    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loadingUser) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Review your account details and update your password.</Text>
          </View>

          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} contentFit="cover" style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarActions}>
              <Text style={styles.infoLabel}>Profile Picture</Text>
              <View style={styles.avatarButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleChangePhoto}
                  style={styles.inlineActionButton}
                  disabled={isUploadingPhoto}>
                  <Text style={styles.inlineActionButtonText}>
                    {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                  </Text>
                </TouchableOpacity>
                {avatarUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleRemovePhoto}
                    style={styles.inlineSecondaryButton}
                    disabled={isUploadingPhoto}>
                    <Text style={styles.inlineSecondaryButtonText}>Remove Photo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
          <Text style={styles.infoLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#8B8479"
            style={styles.input}
          />
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="Date of Birth"
            placeholderTextColor="#8B8479"
            style={styles.input}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleUpdateProfile}
            style={styles.primaryButton}
            disabled={isUpdatingProfile}>
            <Text style={styles.primaryButtonText}>
              {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.passwordSection}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Old Password"
            placeholderTextColor="#8B8479"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            secureTextEntry
            placeholder="New password"
            placeholderTextColor="#8B8479"
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleChangePassword}
            style={styles.primaryButton}
            disabled={isUpdatingPassword}>
            <Text style={styles.primaryButtonText}>
              {isUpdatingPassword ? 'Updating...' : 'Change Password'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={handleLogout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F1EB',
    padding: 20,
  },
  loadingText: {
    color: '#24221E',
    fontSize: 15,
    fontWeight: '600',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 6,
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
  backButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#F1EEE8',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  infoSection: {
    gap: 8,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D8E7DA',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2BA6B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  passwordSection: {
    gap: 12,
  },
  sectionTitle: {
    color: '#1F1D19',
    fontSize: 18,
    fontWeight: '800',
  },
  infoLabel: {
    color: '#8B8479',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#24221E',
    fontSize: 15,
    fontWeight: '600',
  },
  inlineActionButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  inlineActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineSecondaryButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#F1EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  inlineSecondaryButtonText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
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
