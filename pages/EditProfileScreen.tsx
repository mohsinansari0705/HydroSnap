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
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';
import {
  createNeumorphicCard,
  createNeumorphicButton,
  createNeumorphicInput,
  NeumorphicTextStyles,
} from '../lib/neumorphicStyles';
import { useTranslation } from 'react-i18next';
import { Colors } from '../lib/colors';
import { useAuth } from '../lib/AuthContext';

interface EditProfileScreenProps {
  onBack: () => void;
}

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Profile['role']>('public');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [siteId, setSiteId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRole(profile.role);
      setOrganization(profile.organization || '');
      setLocation(profile.location || '');
      setSiteId(profile.site_id || '');
    }
  }, [profile]);

  const roles: { value: Profile['role']; label: string; description: string }[] = [
    { 
      value: 'central_analyst', 
      label: t('editProfile.centralAnalyst'), 
      description: t('editProfile.centralAnalystDesc')
    },
    { 
      value: 'supervisor', 
      label: t('editProfile.supervisor'), 
      description: t('editProfile.supervisorDesc')
    },
    { 
      value: 'field_personnel', 
      label: t('editProfile.fieldPersonnel'), 
      description: t('editProfile.fieldPersonnelDesc')
    },
    { 
      value: 'public', 
      label: t('editProfile.publicUser'), 
      description: t('editProfile.publicUserDesc')
    },
  ];

  const handleSave = async () => {
    if (!fullName || !organization || !location) {
      Alert.alert(t('editProfile.error'), t('editProfile.fillAllFields'));
      return;
    }

    if (role === 'field_personnel' && !siteId) {
      Alert.alert(t('editProfile.error'), t('editProfile.siteIdRequired'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          organization,
          location,
          site_id: role === 'field_personnel' ? siteId : null,
        })
        .eq('id', profile?.id);

      if (error) {
        Alert.alert(t('editProfile.error'), error.message);
      } else {
        Alert.alert(t('editProfile.success'), t('editProfile.profileUpdated'));
        await refreshProfile();
        onBack();
      }
    } catch (error) {
      Alert.alert(t('editProfile.error'), t('editProfile.unexpectedError'));
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('editProfile.editProfile')}</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, createNeumorphicCard({ size: 'large', borderRadius: 16 })]}>
          <Text style={styles.subtitle}>{t('editProfile.updateProfileInfo')}</Text>

          <Text style={styles.label}>{t('editProfile.fullName')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>{t('editProfile.role')}</Text>
          <View style={styles.roleContainer}>
            {roles.map((roleOption) => (
              <TouchableOpacity
                key={roleOption.value}
                style={[
                  styles.roleButton,
                  role === roleOption.value && styles.roleButtonSelected,
                ]}
                onPress={() => !loading && setRole(roleOption.value)}
                disabled={loading}
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

          <Text style={styles.label}>{t('editProfile.organization')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editProfile.organizationPlaceholder')}
            value={organization}
            onChangeText={setOrganization}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>{t('editProfile.location')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editProfile.location')}
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
            editable={!loading}
          />

          {role === 'field_personnel' && (
            <View style={styles.siteIdContainer}>
              <Text style={styles.label}>{t('editProfile.siteId')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('editProfile.siteIdPlaceholder')}
                value={siteId}
                onChangeText={setSiteId}
                autoCapitalize="characters"
                editable={!loading}
              />
              <Text style={styles.helperText}>{t('editProfile.siteIdHelper')}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onBack}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('editProfile.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('editProfile.saveChanges')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    backgroundColor: Colors.deepSecurityBlue, 
    gap: 12,
    elevation: 2,
  },
  backButton: { 
    width: 54, 
    height: 54, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.softLightGrey, 
    borderRadius: 27, 
    elevation: 4,
  },
  backIcon: { 
    fontSize: 24, 
    color: Colors.deepSecurityBlue, 
    fontWeight: '700',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: Colors.white, 
    flex: 1, 
    textAlign: 'center',
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
  siteIdContainer: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  roleContainer: {
    gap: 10,
    marginBottom: 8,
  },
  roleButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 12 }),
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleButtonSelected: {
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue + '40',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  roleButtonTextSelected: {
    color: Colors.white,
  },
  roleDescriptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  roleDescriptionTextSelected: {
    color: Colors.aquaTechBlue,
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
