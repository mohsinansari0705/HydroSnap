/**
 * PermissionScreen Component
 * 
 * Modern permission request screen that requests all necessary permissions
 * at app launch following best practices for mobile app UX.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { permissionService } from '../services/permissionService';

interface PermissionScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface PermissionItem {
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  title: string;
  description: string;
  key: string;
  critical: boolean;
}

const permissions: PermissionItem[] = [
  {
    icon: 'location',
    iconFamily: 'Ionicons',
    title: 'Location Access',
    description: 'Verify you are at the correct monitoring site for accurate readings',
    key: 'hasLocationPermission' as any,
    critical: true,
  },
  {
    icon: 'camera',
    iconFamily: 'Ionicons',
    title: 'Camera Access',
    description: 'Capture photos of water gauge for automated level detection',
    key: 'hasCameraPermission' as any,
    critical: true,
  },
  {
    icon: 'images',
    iconFamily: 'Ionicons',
    title: 'Photo Library',
    description: 'Save gauge photos to your device for record keeping',
    key: 'hasMediaLibraryPermission' as any,
    critical: false,
  },
  {
    icon: 'notifications',
    iconFamily: 'Ionicons',
    title: 'Notifications',
    description: 'Receive flood alerts and reading reminders',
    key: 'hasNotificationPermission' as any,
    critical: false,
  },
];

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onComplete, onSkip }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<{ [key: string]: boolean }>({});

  const handleRequestPermissions = async () => {
    setIsRequesting(true);

    try {
      // Request all permissions
      const result = await permissionService.requestAllPermissions();

      // Update status display
      setPermissionStatus({
        location: result.permissions.location,
        camera: result.permissions.camera,
        mediaLibrary: result.permissions.mediaLibrary,
        notifications: result.permissions.notifications,
      });

      // Small delay to show the status
      await new Promise(resolve => setTimeout(resolve, 800));

      if (result.allGranted) {
        // All critical permissions granted
        console.log('✅ All critical permissions granted');
        onComplete();
      } else {
        // Some permissions denied - show warning but allow to proceed
        console.warn('⚠️ Some permissions denied:', result.missingPermissions);
        
        // For critical permissions, show alert
        if (result.missingPermissions.length > 0) {
          permissionService.showPermissionDeniedAlert(result.missingPermissions);
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const renderPermissionItem = (item: PermissionItem, index: number) => {
    const IconComponent = item.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
    const status = permissionStatus[item.key.toString().replace('has', '').replace('Permission', '').toLowerCase()];
    
    return (
      <View key={index} style={[createNeumorphicCard(), styles.permissionItem]}>
        <View style={styles.permissionIcon}>
          <IconComponent 
            name={item.icon as any} 
            size={32} 
            color={status ? Colors.validationGreen : Colors.primary} 
          />
        </View>
        <View style={styles.permissionContent}>
          <View style={styles.permissionHeader}>
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
              {item.title}
            </Text>
            {item.critical && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalText}>Required</Text>
              </View>
            )}
            {status !== undefined && (
              <View style={[styles.statusBadge, status ? styles.grantedBadge : styles.deniedBadge]}>
                <Ionicons 
                  name={status ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={status ? Colors.validationGreen : Colors.danger} 
                />
              </View>
            )}
          </View>
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 4 }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <View style={[createNeumorphicCard(), styles.mainIcon]}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
            </View>
          </View>
          
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary, textAlign: 'center', marginTop: 24, fontSize: 28 }]}>
            Grant Permissions
          </Text>
          
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 }]}>
            To provide you with the best experience, HydroSnap needs the following permissions
          </Text>
        </View>

        {/* Permission List */}
        <View style={styles.permissionList}>
          {permissions.map((item, index) => renderPermissionItem(item, index))}
        </View>

        {/* Info Box */}
        <View style={[createNeumorphicCard(), styles.infoBox]}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginLeft: 12, flex: 1 }]}>
            Your privacy is important to us. These permissions are only used for app functionality.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[createNeumorphicCard(), styles.primaryButton, isRequesting && styles.buttonDisabled]}
            onPress={handleRequestPermissions}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
                  Requesting...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
                  Grant Permissions
                </Text>
              </>
            )}
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              disabled={isRequesting}
            >
              <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criticalBadge: {
    backgroundColor: Colors.warningYellow + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  criticalText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.warningYellow,
  },
  statusBadge: {
    marginLeft: 'auto',
  },
  grantedBadge: {
    opacity: 1,
  },
  deniedBadge: {
    opacity: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: Colors.primary + '08',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...createNeumorphicCard().shadowColor ? {} : { elevation: 4 },
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});

export default PermissionScreen;
