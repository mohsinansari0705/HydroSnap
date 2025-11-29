import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';
import { profileCacheService } from '../services/profileCacheService';
import {
  createNeumorphicCard,
  createNeumorphicButton,
  createNeumorphicInput,
} from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../lib/NavigationContext';
import SafeScreen from './SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';

interface ProfileSetupProps {
  userId: string;
  onProfileComplete: () => void;
}

export default function ProfileSetup({ userId, onProfileComplete }: ProfileSetupProps) {
  const styles = React.useMemo(() => createStyles(), []);
  const { navigateBack } = useNavigation();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Profile['role']>('public');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [siteId, setSiteId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullNameError, setFullNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle hardware back button
  useSimpleBackHandler(() => {
    navigateBack();
  });

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }

        if (user?.id) {
          // Load profile with cache-first strategy
          setIsSyncing(true);
          const result = await profileCacheService.getProfileFast(user.id);
          setIsSyncing(false);

          if (result.profile) {
            const profile = result.profile;
            setFullName(profile.full_name || '');
            setRole(profile.role || 'public');
            setOrganization(profile.organization || '');
            setLocation(profile.location || '');
            setSiteId(profile.site_id || '');
            setPhone(profile.phone || '');
            setEmail(profile.email || user.email || '');
            setGender(profile.gender || '');
            setIsOfflineMode(result.isFromCache);

            if (result.isFromCache) {
              console.log('📱 Profile loaded from cache (offline mode)');
            }
          } else if (user.user_metadata) {
            // Fallback to user metadata
            console.log('User Metadata:', user.user_metadata);
            setFullName(user.user_metadata.display_name || '');
            setRole(user.user_metadata.role || 'public');
            setOrganization(user.user_metadata.organization || '');
            setLocation(user.user_metadata.location || '');
            setSiteId(user.user_metadata.site_id || '');
            setPhone(user.user_metadata.phone || '');
            setEmail(user.email || '');
            setGender(user.user_metadata.gender || '');
          } else {
            console.warn('User metadata is missing.');
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching user data:', err);
      }
    };

    getUserData();
  }, []);

  const validateFullName = (name: string) => {
    const words = name.trim().split(' ');
    return words.length > 1 && words.every(word => word.length > 0); // Ensure at least two words with non-empty values
  };

  const validatePhoneNumber = (phone: string) => {
    const isValid = /^[0-9]{10}$/.test(phone); // Ensure exactly 10 digits
    if (!isValid) {
      setPhoneError('Please enter a valid 10-digit phone number');
    } else {
      setPhoneError('');
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateFullName(fullName)) {
      setFullNameError('Please enter your full name');
      return;
    } else {
      setFullNameError('');
    }

    if (!validatePhoneNumber(phone)) {
      return;
    }

    if (!fullName || !organization || !location || !phone) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (role === 'field_personnel' && !siteId) {
      Alert.alert('Error', 'Site ID is required for field personnel');
      return;
    }

    setLoading(true);

    try {
      // Check if profile exists in cache first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const updates: Partial<Profile> = {
        full_name: fullName,
        organization,
        location,
        phone,
        ...(role === 'field_personnel' && siteId ? { site_id: siteId } : {}),
      };

      if (existingProfile) {
        // Update existing profile using cache service (offline-capable)
        const result = await profileCacheService.updateProfile(userId, updates);

        if (result.success) {
          if (result.isOffline) {
            // Saved offline
            Alert.alert(
              'Saved Offline',
              result.error || 'Changes saved locally. Will sync when connection improves.',
              [
                {
                  text: 'OK',
                  onPress: () => onProfileComplete(),
                },
              ]
            );
          } else {
            // Saved online
            Alert.alert('Success', 'Profile saved successfully!', [
              {
                text: 'OK',
                onPress: () => onProfileComplete(),
              },
            ]);
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save profile');
        }
      } else {
        // Create new profile
        const newProfile = {
          id: userId,
          full_name: fullName,
          role,
          organization,
          location,
          email,
          phone,
          gender,
          site_id: role === 'field_personnel' ? siteId : null,
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (error) {
          // Try to save offline
          await profileCacheService.saveToCache(userId, newProfile as Profile);
          Alert.alert(
            'Saved Offline',
            'Profile created locally. Will sync when connection improves.',
            [
              {
                text: 'OK',
                onPress: () => onProfileComplete(),
              },
            ]
          );
        } else {
          // Cache the new profile
          await profileCacheService.saveToCache(userId, data);
          Alert.alert('Success', 'Profile created successfully!', [
            {
              text: 'OK',
              onPress: () => onProfileComplete(),
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Profile submit error:', error);
      
      // Try to save offline as last resort
      const offlineProfile = {
        id: userId,
        full_name: fullName,
        role,
        organization,
        location,
        email,
        phone,
        gender,
        site_id: role === 'field_personnel' ? siteId : null,
      } as Profile;

      await profileCacheService.saveToCache(userId, offlineProfile);
      
      Alert.alert(
        'Saved Offline',
        'Connection issue detected. Changes saved locally and will sync automatically.',
        [
          {
            text: 'OK',
            onPress: () => onProfileComplete(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background} statusBarStyle="dark">
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          {isOfflineMode && !isSyncing && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={12} color={Colors.warning} />
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}
          {isSyncing && (
            <View style={styles.syncingBadge}>
              <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
              <Text style={styles.syncingText}>Loading...</Text>
            </View>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {isOfflineMode && (
          <View style={[styles.offlineWarning, createNeumorphicCard({ size: 'small', borderRadius: 12 })]}>
            <Ionicons name="cloud-offline" size={24} color={Colors.warning} />
            <View style={styles.offlineWarningContent}>
              <Text style={styles.offlineWarningTitle}>Offline Mode Active</Text>
              <Text style={styles.offlineWarningText}>Changes will be saved locally and synced when online</Text>
            </View>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          {fullNameError ? (
            <Text style={styles.errorText}>{fullNameError}</Text>
          ) : null}

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your 10-digit phone number"
            placeholderTextColor={Colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your city or region"
            placeholderTextColor={Colors.textSecondary}
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
          />

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Work Information</Text>
          
          <Text style={styles.label}>Organization *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your organization name"
            placeholderTextColor={Colors.textSecondary}
            value={organization}
            onChangeText={setOrganization}
            autoCapitalize="words"
          />

          {role === 'field_personnel' && (
            <>
              <Text style={styles.label}>Site ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your assigned site ID"
                placeholderTextColor={Colors.textSecondary}
                value={siteId}
                onChangeText={setSiteId}
                autoCapitalize="characters"
              />
              <Text style={styles.helperText}>
                Field personnel must provide their assigned site ID
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  {isOfflineMode ? 'Save Offline' : 'Save Changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const createStyles = () => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.warning,
  },
  syncingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.aquaTechBlue + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  syncingText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.aquaTechBlue,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.warning + '10',
  },
  offlineWarningContent: {
    flex: 1,
    marginLeft: 12,
  },
  offlineWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 2,
  },
  offlineWarningText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  formContainer: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  input: {
    ...createNeumorphicInput({ borderRadius: 12 }),
    padding: 16,
    marginBottom: 16,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  button: {
    ...createNeumorphicButton('primary', { size: 'large', borderRadius: 14 }),
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  errorText: {
    fontSize: 13,
    color: Colors.alertRed,
    marginTop: -12,
    marginBottom: 12,
  },
});