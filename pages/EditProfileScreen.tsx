import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';
import {
  createNeumorphicCard,
  createNeumorphicInput,
} from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';
import { useAuth } from '../lib/AuthContext';
import { useNavigation } from '../lib/NavigationContext';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import { profileCacheService } from '../services/profileCacheService';
import SafeScreen from '../components/SafeScreen';

interface EditProfileScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export default function EditProfileScreen({ onBack, onSuccess }: EditProfileScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle hardware back button
  useSimpleBackHandler(onBack);

  useEffect(() => {
    loadProfileWithCache();
  }, [profile]);

  const loadProfileWithCache = async () => {
    if (!profile?.id) {
      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setLocation(profile.location || '');
      }
      return;
    }

    try {
      setIsSyncing(true);
      
      // Use cache-first strategy
      const result = await profileCacheService.getProfileFast(profile.id);
      
      if (result.profile) {
        const loadedProfile = result.profile;
        setFullName(loadedProfile.full_name || '');
        setPhone(loadedProfile.phone || '');
        setLocation(loadedProfile.location || '');
        setIsFromCache(result.isFromCache);
        
        if (result.isFromCache) {
          console.log('📱 Profile loaded from cache (offline-ready)');
          
          // Monitor background sync
          if (result.syncPromise) {
            result.syncPromise
              .then((freshProfile) => {
                if (freshProfile) {
                  setFullName(freshProfile.full_name || '');
                  setPhone(freshProfile.phone || '');
                  setLocation(freshProfile.location || '');
                  setIsFromCache(false);
                  console.log('✅ Profile synced from server');
                }
              })
              .finally(() => setIsSyncing(false));
          } else {
            setIsSyncing(false);
          }
        } else {
          setIsSyncing(false);
        }
      } else if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setLocation(profile.location || '');
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Profile load error:', error);
      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setLocation(profile.location || '');
      }
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          location: location.trim(),
        })
        .eq('id', profile?.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await refreshProfile();
        // Update cache
        await profileCacheService.updateProfile(profile?.id || '', {
          full_name: fullName.trim(),
          phone: phone.trim(),
          location: location.trim(),
        } as Partial<Profile>);
        
        // Navigate back and trigger success popup
        onBack();
        
        // Call success callback to show popup on ProfileScreen
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 100);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onBack();
  };

  return (
    <SafeScreen backgroundColor={Colors.background} statusBarStyle="dark">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Edit Profile</Text>
            {isFromCache && !isSyncing && (
              <View style={styles.offlineBadge}>
                <MaterialCommunityIcons name="cloud-off-outline" size={12} color={Colors.warning} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            {isSyncing && (
              <View style={styles.syncingBadge}>
                <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
                <Text style={styles.syncingText}>Syncing...</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, createNeumorphicCard({ size: 'large', borderRadius: 16 })]}>
            <Text style={styles.subtitle}>Update your personal information</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={styles.label}>Location/Region</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your location"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
              editable={!loading}
            />

            {/* Read-only fields */}
            {profile?.role && (
              <View style={styles.readOnlySection}>
                <Text style={styles.readOnlySectionTitle}>Account Information (Read-only)</Text>
                
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Role</Text>
                  <Text style={styles.readOnlyValue}>
                    {profile.role === 'central_analyst' ? 'Central Analyst' :
                     profile.role === 'supervisor' ? 'Supervisor' :
                     profile.role === 'field_personnel' ? 'Field Personnel' :
                     'Public User'}
                  </Text>
                </View>

                {profile.organization && (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Organization</Text>
                    <Text style={styles.readOnlyValue}>{profile.organization}</Text>
                  </View>
                )}

                {profile.site_id && (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Site ID</Text>
                    <Text style={styles.readOnlyValue}>{profile.site_id}</Text>
                  </View>
                )}

                <Text style={styles.helperText}>
                  Contact your administrator to modify these fields
                </Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
    color: Colors.textPrimary,
  },
  input: {
    ...createNeumorphicInput({ borderRadius: 12 }),
    padding: 16,
    marginBottom: 6,
    fontSize: 15,
    color: Colors.textPrimary,
    borderRadius: 12,
  },
  readOnlySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.lightShadow,
  },
  readOnlySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  readOnlyField: {
    marginBottom: 16,
  },
  readOnlyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  readOnlyValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  helperText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 54,
  },
  cancelButton: {
    backgroundColor: Colors.lightShadow,
  },
  saveButton: {
    backgroundColor: Colors.aquaTechBlue,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  saveButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
