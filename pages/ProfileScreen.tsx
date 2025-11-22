import { SafeAreaView, StatusBar, Platform, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface ProfileScreenProps {
  profile: Profile;
  onEditProfile: () => void;
  onBack: () => void;
}

export default function ProfileScreen({ profile: initialProfile, onEditProfile, onBack }: ProfileScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);

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
    } else {
      const initials = profile?.full_name
        ? profile.full_name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase()
        : 'U';
      return (
        <View style={styles.fallbackAvatar}>
          <Text style={styles.fallbackAvatarText}>{initials}</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={Colors.deepSecurityBlue}
        barStyle="light-content"
        translucent={Platform.OS === 'android'}
      />

      {/* NAVIGATION BAR */}
      <View style={styles.navigationBar}>
        <TouchableOpacity onPress={onBack} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity onPress={onEditProfile} style={styles.navButton}>
          <Text style={styles.navButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            <TouchableOpacity style={styles.editAvatarButton} onPress={onEditProfile}>
              <MaterialCommunityIcons name="pencil" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fullName}>{profile?.full_name || 'Unknown User'}</Text>
          <Text style={styles.role}>{`Role: ${profile?.role || 'N/A'}`}</Text>
        </View>

        {/* INFO & CONTACT SECTION */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Info & Contact</Text>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="ruler-square" size={24} color="gray" />
            <Text style={styles.infoText}>Site ID: {profile?.site_id || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="phone" size={24} color="gray" />
            <Text style={styles.infoText}>Phone No: {profile?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="gender-male-female" size={24} color="gray" />
            <Text style={styles.infoText}>Gender: {profile?.gender || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="email" size={24} color="gray" />
            <Text style={styles.infoText}>Email: {profile?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color="gray" />
            <Text style={styles.infoText}>Location: {profile?.location || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="office-building" size={24} color="gray" />
            <Text style={styles.infoText}>Organization: {profile?.organization || 'N/A'}</Text>
          </View>
        </View>

        {/* SYSTEM & ACCOUNT METADATA SECTION */}
        <View style={styles.metadataSection}>
          <Text style={styles.sectionTitle}>System & Account Metadata</Text>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="account" size={24} color="gray" />
            <Text style={styles.metadataText}>User ID: {profile?.id || 'N/A'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="check-circle" size={24} color={profile?.is_active ? 'green' : 'red'} />
            <Text style={styles.metadataText}>Account Status: {profile?.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="calendar" size={24} color="gray" />
            <Text style={styles.metadataText}>Profile Created: {profile?.created_at ? format(new Date(profile.created_at), 'PPpp') : 'N/A'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="update" size={24} color="gray" />
            <Text style={styles.metadataText}>Last Updated: {profile?.updated_at ? format(new Date(profile.updated_at), 'PPpp') : 'N/A'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="login" size={24} color="gray" />
            <Text style={styles.metadataText}>Last Login: {profile?.last_login_at ? format(new Date(profile.last_login_at), 'PPpp') : 'N/A'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="clock" size={24} color="gray" />
            <Text style={styles.metadataText}>Last Activity: {profile?.last_activity_at ? format(new Date(profile.last_activity_at), 'PPpp') : 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  navigationBar: {
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Adjust for status bar height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.deepSecurityBlue,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: Colors.white,
    fontSize: 16,
  },
  navTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32, // Ensure extra space at the bottom for scrolling
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  fallbackAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackAvatarText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: 'gray',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16, // Add spacing below this section
  },
  metadataSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Clear vertical separation
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12, // Consistent spacing between icon and text
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12, // Consistent spacing between icon and text
  },
  metadataText: {
    fontSize: 14,
    marginLeft: 12,
    color: 'gray',
  },
});
