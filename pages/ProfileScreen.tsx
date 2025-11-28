import { ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../lib/NavigationContext';
import SafeScreen from '../components/SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import { createNeumorphicCard } from '../lib/neumorphicStyles';

interface ProfileScreenProps {
  profile: Profile;
  onEditProfile: () => void;
  onBack: () => void;
}

const defaultProfileImage = 'https://example.com/default-profile.png'; // Add your default image URL here

export default function ProfileScreen({ profile: initialProfile, onEditProfile, onBack }: ProfileScreenProps) {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);

  // Handle hardware back button
  useSimpleBackHandler(() => {
    onBack();
  });

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const renderAvatar = () => {
    if (profile?.profile_image_url) {
      return (
        <Image
          source={{ uri: profile.profile_image_url }}
          style={styles.avatar}
        />
      );
    } else if (profile?.full_name) {
      const initials = profile.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase();
      return (
        <View style={styles.fallbackAvatar}>
          <Text style={styles.fallbackAvatarText}>{initials}</Text>
        </View>
      );
    } else {
      return (
        <Image
          source={{ uri: defaultProfileImage }}
          style={styles.avatar}
        />
      );
    }
  };

  const handleViewDashboard = () => {
    navigation.setCurrentScreen('dashboard'); // Use custom navigation method
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={onEditProfile} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={Colors.deepSecurityBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* ACTION BUTTONS */}
        {profile?.role !== 'public' && (
          <TouchableOpacity
            style={[styles.dashboardButton, createNeumorphicCard({ size: 'medium', borderRadius: 14 })]}
            onPress={handleViewDashboard}
          >
            <View style={styles.dashboardIconContainer}>
              <MaterialCommunityIcons name="view-dashboard" size={24} color={Colors.white} />
            </View>
            <Text style={styles.dashboardButtonText}>View Dashboard</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginTop: 8,
  },
  dashboardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dashboardButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
