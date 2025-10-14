import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';
import {
  createNeumorphicCard,
  createNeumorphicButton,
  NeumorphicTextStyles,
} from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';

interface SettingsPageProps {
  onNavigate: (screen: string) => void;
  onBack: () => void;
}

interface UserData {
  email?: string;
  full_name?: string;
  organization?: string;
  role?: string;
}

interface SettingItem {
  icon: string;
  label: string;
  value?: string | boolean;
  onPress?: () => void;
  disabled?: boolean;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(), []);
  
  const [userData, setUserData] = useState<UserData>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch additional user profile data if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserData({
          email: user.email || '',
          full_name: profile?.full_name || user.user_metadata?.full_name || 'User',
          organization: profile?.organization || 'HydroSnap Team',
          role: profile?.role || 'Water Monitoring Personnel',
        });
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      } else {
        setShowLogoutModal(false);
        onNavigate('Auth');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => setShowLogoutModal(true) },
      ]
    );
  };

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: '👤',
          label: 'Profile Information',
          value: userData.full_name || 'Update Profile',
          onPress: () => onNavigate('Profile'),
        },
        {
          icon: '📧',
          label: 'Email',
          value: userData.email || 'No email',
          disabled: true,
        },
        {
          icon: '🏢',
          label: 'Organization',
          value: userData.organization || 'Not specified',
          disabled: true,
        },
        {
          icon: '👔',
          label: 'Role',
          value: userData.role || 'Health Worker',
          disabled: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: theme === 'dark' ? '🌙' : '☀️',
          label: 'Theme',
          value: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
          onPress: toggleTheme,
        },
        {
          icon: '🔔',
          label: 'Push Notifications',
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: '📍',
          label: 'Location Services',
          toggle: true,
          value: locationEnabled,
          onToggle: setLocationEnabled,
        },
        {
          icon: '🔄',
          label: 'Auto Sync Data',
          toggle: true,
          value: autoSync,
          onToggle: setAutoSync,
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: '💾',
          label: 'Clear Cache',
          value: 'Clear app cache',
          onPress: () => Alert.alert('Info', 'Cache cleared successfully!'),
        },
        {
          icon: '📊',
          label: 'Data Usage',
          value: 'View data usage',
          onPress: () => Alert.alert('Info', 'Feature coming soon!'),
        },
        {
          icon: '☁️',
          label: 'Sync Settings',
          value: 'Manage sync preferences',
          onPress: () => Alert.alert('Info', 'Feature coming soon!'),
        },
      ],
    },
    {
      title: 'Support & About',
      items: [
        {
          icon: '❓',
          label: 'Help & FAQ',
          value: 'Get help',
          onPress: () => Alert.alert('Info', 'Feature coming soon!'),
        },
        {
          icon: '📝',
          label: 'Privacy Policy',
          value: 'View policy',
          onPress: () => Alert.alert('Info', 'Feature coming soon!'),
        },
        {
          icon: '📋',
          label: 'Terms of Service',
          value: 'View terms',
          onPress: () => Alert.alert('Info', 'Feature coming soon!'),
        },
        {
          icon: 'ℹ️',
          label: 'App Version',
          value: 'v1.0.0',
          disabled: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    item.disabled && styles.settingItemDisabled,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                  activeOpacity={item.disabled ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>{item.icon}</Text>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, item.disabled && styles.disabledText]}>
                        {item.label}
                      </Text>
                      {!item.toggle && (
                        <Text style={[styles.settingValue, item.disabled && styles.disabledText]}>
                          {item.value}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onToggle}
                      thumbColor={item.value ? Colors.aquaTechBlue : Colors.textSecondary}
                      trackColor={{ false: Colors.border, true: Colors.aquaTechBlue + '40' }}
                    />
                  ) : !item.disabled ? (
                    <Text style={styles.settingArrow}>›</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout from HealthDrop? You'll need to sign in again to access your account.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Logging out...' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: Colors.deepSecurityBlue, // Use deep security blue for header
    shadowColor: Colors.deepSecurityBlue + '40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 22 }),
    padding: 10,
    backgroundColor: Colors.softLightGrey,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  headerTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 22,
    color: Colors.white,
  },
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    ...NeumorphicTextStyles.subheading,
    marginBottom: 16,
    marginLeft: 6,
    color: Colors.textPrimary,
  },
  sectionContent: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
    color: Colors.aquaTechBlue, // Accent color for icons
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    ...NeumorphicTextStyles.body,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  settingValue: {
    ...NeumorphicTextStyles.bodySecondary,
    fontSize: 14,
  },
  settingArrow: {
    fontSize: 20,
    color: Colors.aquaTechBlue,
    fontWeight: 'bold',
  },
  disabledText: {
    color: Colors.textSecondary,
  },
  logoutSection: {
    marginVertical: 24,
    marginBottom: 55,
    paddingHorizontal: 4,
  },
  logoutButton: {
    ...createNeumorphicButton('danger', { size: 'large', borderRadius: 16 }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 12,
    color: Colors.white,
  },
  logoutText: {
    ...NeumorphicTextStyles.buttonPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 24 }),
    padding: 30,
    width: '100%',
    maxWidth: 360,
    elevation: 20,
  },
  modalTitle: {
    ...NeumorphicTextStyles.heading,
    textAlign: 'center',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  modalMessage: {
    ...NeumorphicTextStyles.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    color: Colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    ...createNeumorphicCard({ size: 'medium', borderRadius: 14 }),
    backgroundColor: Colors.softLightGrey,
  },
  confirmButton: {
    ...createNeumorphicButton('danger', { size: 'medium', borderRadius: 14 }),
  },
  cancelButtonText: {
    ...NeumorphicTextStyles.body,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmButtonText: {
    ...NeumorphicTextStyles.buttonPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SettingsPage;