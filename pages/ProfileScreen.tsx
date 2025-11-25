import { ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '../lib/NavigationContext'; // Use custom navigation context
import SafeScreen from '../components/SafeScreen';

interface ProfileScreenProps {
  profile: Profile;
  onEditProfile: () => void;
  onBack: () => void;
}

// Define the RootStackParamList type
type RootStackParamList = {
  Dashboard: undefined; // Add other routes as needed
  Profile: undefined;   // Example route
};

const defaultProfileImage = 'https://example.com/default-profile.png'; // Add your default image URL here

export default function ProfileScreen({ profile: initialProfile, onEditProfile, onBack }: ProfileScreenProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>(); // Reliable navigation object

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

  return (
    <SafeScreen backgroundColor={Colors.softLightGrey} statusBarStyle="dark">

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
            <MaterialCommunityIcons name="ruler-square" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Site ID: {profile?.site_id || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="phone" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Phone No: {profile?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="gender-male-female" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Gender: {profile?.gender || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="email" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Email: {profile?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Location: {profile?.location || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="office-building" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>Organization: {profile?.organization || 'N/A'}</Text>
          </View>
        </View>

        {/* ACTION BUTTONS SECTION */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewDashboard} // Updated to use the safe handler
          >
            <Text style={styles.primaryButtonText}>View Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => console.log('Logout action triggered')}
          >
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  navigationBar: {
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
    borderWidth: 2,
    borderColor: Colors.primary,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  actionSection: {
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
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
  icon: {
    fontSize: 24,
    marginRight: 12, // Consistent spacing between icon and text
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12, // Consistent spacing between icon and text
  },
});
