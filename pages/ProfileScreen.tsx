import { ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../lib/NavigationContext';
import SafeScreen from '../components/SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import { createNeumorphicCard, createNeumorphicInput } from '../lib/neumorphicStyles';
import { profileCacheService } from '../services/profileCacheService';
import { useAuth } from '../lib/AuthContext';
import { profilePhotoService } from '../services/profilePhotoService';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import ProfileUpdateSuccessPopup from '../components/ProfileUpdateSuccessPopup';
import { supabase } from '../lib/supabase';

interface ProfileScreenProps {
  profile: Profile;
  onEditProfile: () => void;
  onBack: () => void;
  showSuccessPopup?: boolean;
  onSuccessPopupDismiss?: () => void;
}

export default function ProfileScreen({ profile: initialProfile, onEditProfile, onBack, showSuccessPopup = false, onSuccessPopupDismiss }: ProfileScreenProps) {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Handle hardware back button
  useSimpleBackHandler(() => {
    onBack();
  });

  // Load profile with offline-first strategy
  useEffect(() => {
    loadProfileWithCache();
  }, [initialProfile]);

  const loadProfileWithCache = async () => {
    if (!session?.user?.id) {
      setProfile(initialProfile);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use cache-first strategy
      const result = await profileCacheService.getProfileFast(session.user.id);
      
      if (result.profile) {
        setProfile(result.profile);
        setIsFromCache(result.isFromCache);
        
        if (result.isFromCache) {
          console.log('📱 Profile loaded from cache (offline-ready)');
          
          // Monitor background sync
          if (result.syncPromise) {
            setIsSyncing(true);
            result.syncPromise
              .then((freshProfile) => {
                if (freshProfile) {
                  setProfile(freshProfile);
                  setIsFromCache(false);
                  console.log('✅ Profile synced from server');
                }
              })
              .finally(() => setIsSyncing(false));
          }
        }
      } else {
        // Fallback to initial profile
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error('Profile load error:', error);
      setProfile(initialProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!session?.user?.id) return;

    try {
      setIsSyncing(true);
      const result = await profileCacheService.getProfileFast(session.user.id);
      
      if (result.profile) {
        setProfile(result.profile);
        Alert.alert('Success', 'Profile refreshed successfully');
      } else {
        Alert.alert('Error', 'Unable to refresh profile. Please check your connection.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh profile');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePhotoAction = () => {
    setShowPhotoPicker(true);
  };

  const handleTakePhoto = async () => {
    if (!session?.user?.id || !profile?.role) return;

    try {
      setUploadingPhoto(true);
      const photoUri = await profilePhotoService.pickImage('camera');
      
      if (photoUri) {
        const result = await profilePhotoService.uploadProfilePhoto(
          photoUri, 
          session.user.id,
          profile.role
        );
        
        if (result.success && result.photoUrl) {
          // Update local state immediately
          setProfile(prev => prev ? { ...prev, profile_image_url: result.photoUrl! } : null);
          
          // Update cache
          await profileCacheService.updateProfile(session.user.id, { 
            profile_image_url: result.photoUrl 
          } as Partial<Profile>);
          
          Alert.alert('Success', 'Profile photo updated successfully!');
        } else {
          Alert.alert('Upload Failed', result.error || 'Unable to upload photo');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (!session?.user?.id || !profile?.role) return;

    try {
      setUploadingPhoto(true);
      const photoUri = await profilePhotoService.pickImage('library');
      
      if (photoUri) {
        const result = await profilePhotoService.uploadProfilePhoto(
          photoUri,
          session.user.id,
          profile.role
        );
        
        if (result.success && result.photoUrl) {
          // Update local state immediately
          setProfile(prev => prev ? { ...prev, profile_image_url: result.photoUrl! } : null);
          
          // Update cache
          await profileCacheService.updateProfile(session.user.id, { 
            profile_image_url: result.photoUrl 
          } as Partial<Profile>);
          
          Alert.alert('Success', 'Profile photo updated successfully!');
        } else {
          Alert.alert('Upload Failed', result.error || 'Unable to upload photo');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!session?.user?.id || !profile?.role) return;

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingPhoto(true);
              const result = await profilePhotoService.removeProfilePhoto(
                session.user.id,
                profile.role
              );
              
              if (result.success) {
                // Update local state
                const { profile_image_url, ...restProfile } = profile;
                setProfile(restProfile as Profile);
                
                // Update cache
                await profileCacheService.updateProfile(session.user.id, { 
                  profile_image_url: '' 
                } as Partial<Profile>);
                
                Alert.alert('Success', 'Profile photo removed');
              } else {
                Alert.alert('Error', result.error || 'Failed to remove photo');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove profile photo');
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  const renderAvatar = () => {
    return (
      <View style={styles.avatarContainer}>
        {profile?.profile_image_url ? (
          <Image
            source={{ uri: profile.profile_image_url }}
            style={styles.avatar}
          />
        ) : profile?.full_name ? (
          <View style={styles.fallbackAvatar}>
            <Text style={styles.fallbackAvatarText}>
              {profile.full_name
                .split(' ')
                .map((name) => name[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={styles.fallbackAvatar}>
            <Ionicons name="person" size={48} color={Colors.white} />
          </View>
        )}
        
        {/* Edit Photo Button - Always visible with high z-index */}
        <TouchableOpacity
          style={styles.editPhotoButton}
          onPress={handlePhotoAction}
          disabled={uploadingPhoto}
          activeOpacity={0.7}
        >
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="pencil" size={16} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const handleViewDashboard = () => {
    navigation.setCurrentScreen('dashboard'); // Use custom navigation method
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert('Error', updateError.message);
      } else {
        Alert.alert('Success', 'Password changed successfully!');
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
      console.error('Password change error:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      } else {
        setShowLogoutModal(false);
        // Navigate to auth screen
        navigation.setCurrentScreen('auth');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'central_analyst': return Colors.aquaTechBlue;
      case 'supervisor': return Colors.validationGreen;
      case 'field_personnel': return Colors.deepSecurityBlue;
      default: return Colors.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'central_analyst': return 'Central Analyst';
      case 'supervisor': return 'Supervisor';
      case 'field_personnel': return 'Field Personnel';
      case 'public': return 'Public User';
      default: return 'User';
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background} statusBarStyle="dark">
      {/* MODERN HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Profile</Text>
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
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={Colors.deepSecurityBlue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEditProfile} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={Colors.deepSecurityBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.deepSecurityBlue} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
        {/* PROFILE HEADER CARD */}
        <View style={[styles.profileHeaderCard, createNeumorphicCard({ size: 'large', borderRadius: 20 })]}>
          <View style={styles.avatarWrapper}>
            {renderAvatar()}
          </View>
          <Text style={styles.fullName}>{profile?.full_name || 'Unknown User'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(profile?.role || 'public') + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleBadgeColor(profile?.role || 'public') }]}>
              {getRoleLabel(profile?.role || 'public')}
            </Text>
          </View>
        </View>

        {/* CONTACT INFO CARD */}
        <View style={[styles.infoCard, createNeumorphicCard({ size: 'medium', borderRadius: 16 })]}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          {profile?.email && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email" size={20} color={Colors.deepSecurityBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>
          )}

          {profile?.phone && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="phone" size={20} color={Colors.deepSecurityBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
            </View>
          )}

          {profile?.location && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="map-marker" size={20} color={Colors.deepSecurityBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{profile.location}</Text>
              </View>
            </View>
          )}
        </View>

        {/* WORK INFO CARD */}
        <View style={[styles.infoCard, createNeumorphicCard({ size: 'medium', borderRadius: 16 })]}>
          <Text style={styles.cardTitle}>Work Information</Text>
          
          {profile?.organization && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="office-building" size={20} color={Colors.deepSecurityBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Organization</Text>
                <Text style={styles.infoValue}>{profile.organization}</Text>
              </View>
            </View>
          )}

          {profile?.site_id && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color={Colors.deepSecurityBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Site ID</Text>
                <Text style={styles.infoValue}>{profile.site_id}</Text>
              </View>
            </View>
          )}
        </View>

        {/* OFFLINE WARNING BANNER */}
        {isFromCache && !isSyncing && (
          <View style={[styles.offlineWarning, createNeumorphicCard({ size: 'small', borderRadius: 12 })]}>
            <MaterialCommunityIcons name="cloud-off-outline" size={24} color={Colors.warning} />
            <View style={styles.offlineWarningContent}>
              <Text style={styles.offlineWarningTitle}>Viewing Cached Profile</Text>
              <Text style={styles.offlineWarningText}>Data will sync when connection improves</Text>
            </View>
          </View>
        )}

        {/* ACCOUNT ACTIONS CARD */}
        <View style={[styles.infoCard, createNeumorphicCard({ size: 'medium', borderRadius: 16 })]}>
          <Text style={styles.cardTitle}>Account Actions</Text>
          
          {/* Dashboard Button - Only for non-public users */}
          {profile?.role !== 'public' && (
            <>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleViewDashboard}
              >
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="view-dashboard" size={20} color={Colors.deepSecurityBlue} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.actionLabel}>Dashboard</Text>
                  <Text style={styles.actionDescription}>View analytics and reports</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          {/* Change Password */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lock-reset" size={20} color={Colors.deepSecurityBlue} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.actionLabel}>Change Password</Text>
              <Text style={styles.actionDescription}>Update your login password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowLogoutModal(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: Colors.error + '15' }]}>
              <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.actionLabel, { color: Colors.error }]}>Logout</Text>
              <Text style={styles.actionDescription}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
          </>
        )}
      </ScrollView>
      
      {/* Photo Picker Modal */}
      <ProfilePhotoPicker
        visible={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        hasExistingPhoto={!!profile?.profile_image_url}
      />

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, createNeumorphicCard({ size: 'large', borderRadius: 20 })]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity 
                onPress={() => setShowChangePasswordModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordForm}>
              <Text style={styles.passwordLabel}>Current Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                editable={!changingPassword}
              />

              <Text style={styles.passwordLabel}>New Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password (min 12 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!changingPassword}
              />

              <Text style={styles.passwordLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!changingPassword}
              />

              <View style={styles.passwordButtonContainer}>
                <TouchableOpacity
                  style={[styles.passwordButton, styles.cancelPasswordButton]}
                  onPress={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                >
                  <Text style={styles.cancelPasswordButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.passwordButton, styles.savePasswordButton]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.savePasswordButtonText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.logoutModalContent, createNeumorphicCard({ size: 'large', borderRadius: 20 })]}>
            <View style={styles.logoutIconContainer}>
              <MaterialCommunityIcons name="logout" size={48} color={Colors.error} />
            </View>

            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.logoutButtonContainer}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.cancelLogoutButton]}
                onPress={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                <Text style={styles.cancelLogoutButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutModalButton, styles.confirmLogoutButton]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmLogoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Update Success Popup */}
      <ProfileUpdateSuccessPopup
        visible={showSuccessPopup}
        onDismiss={() => {
          if (onSuccessPopupDismiss) {
            onSuccessPopupDismiss();
          }
        }}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.background,
  },
  fallbackAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackAvatarText: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: '700',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 100,
  },
  fullName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background,
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordForm: {
    gap: 8,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  passwordInput: {
    ...createNeumorphicInput({ borderRadius: 12 }),
    padding: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    borderRadius: 12,
  },
  passwordButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  passwordButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 54,
  },
  cancelPasswordButton: {
    backgroundColor: Colors.lightShadow,
  },
  savePasswordButton: {
    backgroundColor: Colors.aquaTechBlue,
  },
  cancelPasswordButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  savePasswordButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  logoutModalContent: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  logoutButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 54,
  },
  cancelLogoutButton: {
    backgroundColor: Colors.lightShadow,
  },
  confirmLogoutButton: {
    backgroundColor: Colors.error,
  },
  cancelLogoutButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  confirmLogoutButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
