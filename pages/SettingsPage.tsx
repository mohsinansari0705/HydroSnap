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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';
import SafeScreen from '../components/SafeScreen';
import { Colors } from '../lib/colors';
import i18n, { storeLanguage, languageMeta, SupportedLanguage } from '../lib/i18n';

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
  const { t } = useTranslation();
  const styles = React.useMemo(() => createStyles(), []);
  
  const [userData, setUserData] = useState<UserData>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (languageCode: SupportedLanguage) => {
    await i18n.changeLanguage(languageCode);
    await storeLanguage(languageCode);
    setCurrentLanguage(languageCode);
    setShowLanguageModal(false);
  };

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
        Alert.alert(t('common.error'), t('settings.logoutError'));
      } else {
        setShowLogoutModal(false);
        onNavigate('Auth');
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.logoutError'));
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: () => setShowLogoutModal(true) },
      ]
    );
  };

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: t('settings.account'),
      items: [
        {
          icon: '👤',
          label: t('settings.profileInformation'),
          value: userData.full_name || t('settings.updateProfile'),
          onPress: () => onNavigate('Profile'),
        },
        {
          icon: '📧',
          label: t('profile.email'),
          value: userData.email || t('settings.noEmail'),
          disabled: true,
        },
        {
          icon: '🏢',
          label: t('profile.organization'),
          value: userData.organization || t('settings.notSpecified'),
          disabled: true,
        },
        {
          icon: '👔',
          label: t('profile.role'),
          value: userData.role || t('settings.healthWorker'),
          disabled: true,
        },
      ],
    },
    {
      title: t('settings.preferences'),
      items: [
        {
          icon: theme === 'dark' ? '🌙' : '☀️',
          label: t('settings.theme'),
          value: theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode'),
          onPress: toggleTheme,
        },
        {
          icon: '🔔',
          label: t('settings.pushNotifications'),
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: '📍',
          label: t('settings.locationServices'),
          toggle: true,
          value: locationEnabled,
          onToggle: setLocationEnabled,
        },
        {
          icon: '🔄',
          label: t('settings.autoSyncData'),
          toggle: true,
          value: autoSync,
          onToggle: setAutoSync,
        },
        {
          icon: '🌐',
          label: t('settings.language'),
          value: languageMeta.find((l: { code: SupportedLanguage; name: string; nativeName: string }) => l.code === currentLanguage)?.nativeName || 'English',
          onPress: () => setShowLanguageModal(true),
        },
      ],
    },
    {
      title: t('settings.dataStorage'),
      items: [
        {
          icon: '💾',
          label: t('settings.clearCache'),
          value: t('settings.clearCacheDesc'),
          onPress: () => Alert.alert(t('common.success'), t('settings.cacheClearedSuccess')),
        },
        {
          icon: '📊',
          label: t('settings.dataUsage'),
          value: t('settings.viewDataUsage'),
          onPress: () => Alert.alert(t('common.comingSoon'), t('settings.featureComingSoon')),
        },
        {
          icon: '☁️',
          label: t('settings.syncSettings'),
          value: t('settings.manageSyncPreferences'),
          onPress: () => Alert.alert(t('common.comingSoon'), t('settings.featureComingSoon')),
        },
      ],
    },
    {
      title: t('settings.supportAbout'),
      items: [
        {
          icon: '❓',
          label: t('settings.helpFAQ'),
          value: t('common.getHelp'),
          onPress: () => Alert.alert(t('common.comingSoon'), t('settings.featureComingSoon')),
        },
        {
          icon: '📝',
          label: t('settings.privacyPolicy'),
          value: t('settings.viewPolicy'),
          onPress: () => Alert.alert(t('common.comingSoon'), t('settings.featureComingSoon')),
        },
        {
          icon: '📋',
          label: t('settings.termsOfService'),
          value: t('settings.viewTerms'),
          onPress: () => Alert.alert(t('common.comingSoon'), t('settings.featureComingSoon')),
        },
        {
          icon: 'ℹ️',
          label: t('settings.appVersion'),
          value: 'v1.0.0',
          disabled: true,
        },
      ],
    },
  ];

  return (
    <SafeScreen>
      <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.settings')}</Text>
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
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
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
            <Text style={styles.modalTitle}>{t('settings.logoutDialogTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('settings.logoutDialogMessage')}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? t('settings.loggingOut') : t('settings.logout')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={[styles.modalContent, styles.languageModalContent]}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            <ScrollView style={styles.languageList}>
              {languageMeta.map((lang: { code: SupportedLanguage; name: string; nativeName: string }) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    currentLanguage === lang.code && styles.languageItemActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <View style={styles.languageItemContent}>
                    <Text style={[
                      styles.languageItemText,
                      currentLanguage === lang.code && styles.languageItemTextActive
                    ]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={styles.languageItemSubtext}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeScreen>
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
    padding: 10,
    backgroundColor: Colors.softLightGrey,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    shadowColor: Colors.darkShadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: -0.5,
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
    marginBottom: 16,
    marginLeft: 6,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: -0.25,
  },
  sectionContent: {
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    shadowColor: Colors.darkShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 9,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400',
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: Colors.alertRed,
    borderRadius: 16,
    shadowColor: Colors.alertRed + '40',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.25,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 12,
    color: Colors.white,
  },
  logoutText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textOnDark,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    padding: 30,
    width: '100%',
    maxWidth: 360,
    elevation: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    shadowColor: Colors.darkShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 9,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  modalMessage: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    color: Colors.textSecondary,
    fontWeight: '400',
    fontSize: 16,
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
    backgroundColor: Colors.softLightGrey,
    borderRadius: 14,
    shadowColor: Colors.darkShadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  },
  confirmButton: {
    backgroundColor: Colors.alertRed,
    borderRadius: 14,
    shadowColor: Colors.alertRed + '40',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textOnDark,
    textAlign: 'center',
  },
  languageModalContent: {
    maxHeight: '70%',
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: Colors.lightShadow,
  },
  languageItemActive: {
    backgroundColor: Colors.aquaTechBlue + '20',
    borderWidth: 2,
    borderColor: Colors.deepSecurityBlue,
  },
  languageItemContent: {
    flex: 1,
  },
  languageItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  languageItemTextActive: {
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  languageItemSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default SettingsPage;