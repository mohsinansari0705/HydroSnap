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
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';
import {
  createNeumorphicCard,
  createNeumorphicButton,
  createNeumorphicInput,
  NeumorphicTextStyles,
} from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../lib/NavigationContext';

interface ProfileSetupProps {
  userId: string;
  onProfileComplete: () => void;
}

export default function ProfileSetup({ userId, onProfileComplete }: ProfileSetupProps) {
  const { navigateBack } = useNavigation(); // Use custom navigation context
  const styles = React.useMemo(() => createStyles(), []);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Profile['role']>('public');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [siteId, setSiteId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try to get user metadata from auth
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        setFullName(user.user_metadata.full_name || '');
        setRole(user.user_metadata.role || 'public');
        setOrganization(user.user_metadata.organization || '');
        setLocation(user.user_metadata.location || '');
        setSiteId(user.user_metadata.site_id || '');
      }
    };
    getUserData();
  }, []);

  const roles: { value: Profile['role']; label: string; description: string }[] = [
    { 
      value: 'central_analyst', 
      label: 'Central Analyst', 
      description: 'CWC headquarters staff for data analysis'
    },
    { 
      value: 'supervisor', 
      label: 'Supervisor', 
      description: 'Regional supervisors managing multiple sites'
    },
    { 
      value: 'field_personnel', 
      label: 'Field Personnel', 
      description: 'On-ground staff taking water level readings'
    },
    { 
      value: 'public', 
      label: 'Public User', 
      description: 'General public contributing to monitoring'
    },
  ];

  const handleSubmit = async () => {
    if (!fullName || !organization || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (role === 'field_personnel' && !siteId) {
      Alert.alert('Error', 'Site ID is required for field personnel');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          role,
          organization,
          location,
          site_id: role === 'field_personnel' ? siteId : null,
        });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Profile created successfully!');
        onProfileComplete();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={navigateBack} // Use custom navigation method
      >
        <Ionicons name="arrow-back" size={24} color={Colors.deepSecurityBlue} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Set up your HydroSnap monitoring profile
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleContainer}>
            {roles.map((roleOption) => (
              <TouchableOpacity
                key={roleOption.value}
                style={[
                  styles.roleButton,
                  role === roleOption.value && styles.roleButtonSelected,
                ]}
                onPress={() => setRole(roleOption.value)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === roleOption.value && styles.roleButtonTextSelected,
                  ]}
                >
                  {roleOption.label}
                </Text>
                <Text
                  style={[
                    styles.roleDescriptionText,
                    role === roleOption.value && styles.roleDescriptionTextSelected,
                  ]}
                >
                  {roleOption.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Organization (e.g., Central Water Commission)"
            value={organization}
            onChangeText={setOrganization}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Location/Region"
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
          />

          {role === 'field_personnel' && (
            <View style={styles.siteIdContainer}>
              <TextInput
                style={styles.input}
                placeholder="Site ID (e.g., CWC-GAN-001)"
                value={siteId}
                onChangeText={setSiteId}
                autoCapitalize="characters"
              />
              <Text style={styles.helperText}>
                Enter the monitoring site ID assigned to you
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 24 }),
    padding: 32,
  },
  title: {
    ...NeumorphicTextStyles.heading,
    fontSize: 30,
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...NeumorphicTextStyles.body,
    textAlign: 'center',
    marginBottom: 32,
    color: Colors.textSecondary,
  },
  label: {
    ...NeumorphicTextStyles.body,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
    color: Colors.textPrimary,
  },
  input: {
    ...createNeumorphicInput({ borderRadius: 14 }),
    padding: 18,
    marginBottom: 18,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  siteIdContainer: {
    marginBottom: 15,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  roleContainer: {
    gap: 10,
    marginBottom: 15,
  },
  roleButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 14 }),
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  roleButtonSelected: {
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue + '40',
  },
  roleButtonText: {
    ...NeumorphicTextStyles.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  roleButtonTextSelected: {
    color: Colors.white,
  },
  roleDescriptionText: {
    ...NeumorphicTextStyles.bodySecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  roleDescriptionTextSelected: {
    color: Colors.aquaTechBlue,
  },
  button: {
    ...createNeumorphicButton('primary', { size: 'large', borderRadius: 16 }),
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: Colors.textLight,
    shadowOpacity: 0,
  },
  buttonText: {
    ...NeumorphicTextStyles.buttonPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
});