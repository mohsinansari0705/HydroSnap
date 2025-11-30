/**
 * Centralized Permission Service
 * 
 * Handles all app permissions at launch following modern app development practices.
 * Requests all required permissions upfront rather than during runtime usage.
 */

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export interface PermissionStatus {
  location: boolean;
  camera: boolean;
  mediaLibrary: boolean;
  notifications: boolean;
}

export interface PermissionCheckResult {
  allGranted: boolean;
  permissions: PermissionStatus;
  missingPermissions: string[];
}

class PermissionService {
  private permissionStatus: PermissionStatus = {
    location: false,
    camera: false,
    mediaLibrary: false,
    notifications: false,
  };

  /**
   * Request all critical permissions at app launch
   * This should be called during onboarding or first app launch
   */
  async requestAllPermissions(): Promise<PermissionCheckResult> {
    console.log('🔐 Requesting all app permissions...');
    
    const results: PermissionStatus = {
      location: false,
      camera: false,
      mediaLibrary: false,
      notifications: false,
    };

    try {
      // Request Location Permission (Critical)
      const locationResult = await this.requestLocationPermission();
      results.location = locationResult;

      // Request Camera Permission (Critical)
      const cameraResult = await this.requestCameraPermission();
      results.camera = cameraResult;

      // Request Media Library Permission (Optional but recommended)
      const mediaLibraryResult = await this.requestMediaLibraryPermission();
      results.mediaLibrary = mediaLibraryResult;

      // Request Notification Permission (Optional)
      const notificationResult = await this.requestNotificationPermission();
      results.notifications = notificationResult;

      // Update internal status
      this.permissionStatus = results;

      // Check if all critical permissions are granted
      const allCriticalGranted = results.location && results.camera;
      const missingPermissions = this.getMissingPermissions(results);

      console.log('✅ Permission request completed:', results);
      console.log(`Critical permissions granted: ${allCriticalGranted}`);

      return {
        allGranted: allCriticalGranted,
        permissions: results,
        missingPermissions,
      };
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return {
        allGranted: false,
        permissions: results,
        missingPermissions: ['unknown'],
      };
    }
  }

  /**
   * Request location permission with proper messaging
   */
  private async requestLocationPermission(): Promise<boolean> {
    try {
      console.log('📍 Requesting location permission...');
      
      // Check current status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Location permission already granted');
        return true;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        return true;
      } else {
        console.warn('⚠️ Location permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Request camera permission with proper messaging
   */
  private async requestCameraPermission(): Promise<boolean> {
    try {
      console.log('📷 Requesting camera permission...');
      
      // Check current status first
      const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Camera permission already granted');
        return true;
      }

      // Request permission
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Camera permission granted');
        return true;
      } else {
        console.warn('⚠️ Camera permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request media library permission for saving photos
   */
  private async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      console.log('📸 Requesting media library permission...');
      
      // Check current status first
      const { status: existingStatus } = await MediaLibrary.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Media library permission already granted');
        return true;
      }

      // Request permission with only photos (write-only access)
      const { status } = await MediaLibrary.requestPermissionsAsync(false); // false = writeOnly
      
      if (status === 'granted') {
        console.log('✅ Media library permission granted');
        return true;
      } else {
        console.warn('⚠️ Media library permission denied (optional)');
        return false;
      }
    } catch (error) {
      // Media library permission is optional - if it fails due to config issues, 
      // we can continue as Camera API saves photos automatically
      console.warn('⚠️ Media library permission not available (optional feature):', error);
      return false; // Return false but don't block app usage
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission(): Promise<boolean> {
    try {
      console.log('🔔 Requesting notification permission...');
      
      // Check current status first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Notification permission already granted');
        return true;
      }

      // Request permission
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.warn('⚠️ Notification permission denied (optional)');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check current status of all permissions without requesting
   */
  async checkAllPermissions(): Promise<PermissionCheckResult> {
    console.log('🔍 Checking all permission statuses...');
    
    try {
      const [locationStatus, cameraStatus, mediaLibraryStatus, notificationStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
        Notifications.getPermissionsAsync(),
      ]);

      const results: PermissionStatus = {
        location: locationStatus.status === 'granted',
        camera: cameraStatus.status === 'granted',
        mediaLibrary: mediaLibraryStatus.status === 'granted',
        notifications: notificationStatus.status === 'granted',
      };

      this.permissionStatus = results;
      const allCriticalGranted = results.location && results.camera;
      const missingPermissions = this.getMissingPermissions(results);

      return {
        allGranted: allCriticalGranted,
        permissions: results,
        missingPermissions,
      };
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return {
        allGranted: false,
        permissions: this.permissionStatus,
        missingPermissions: ['unknown'],
      };
    }
  }

  /**
   * Get list of missing critical permissions
   */
  private getMissingPermissions(status: PermissionStatus): string[] {
    const missing: string[] = [];
    
    if (!status.location) missing.push('Location');
    if (!status.camera) missing.push('Camera');
    
    return missing;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PermissionStatus {
    return { ...this.permissionStatus };
  }

  /**
   * Check if a specific permission is granted
   */
  async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async hasCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async hasMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async hasNotificationPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Show alert when critical permissions are missing
   */
  showPermissionDeniedAlert(missingPermissions: string[]): void {
    const permissionList = missingPermissions.join(', ');
    
    Alert.alert(
      '⚠️ Permissions Required',
      `HydroSnap needs the following permissions to function properly:\n\n${permissionList}\n\nPlease grant these permissions in your device settings to use the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // On iOS, you can't directly open settings from code
            // On Android, you would use Linking.openSettings()
            console.log('User should manually open settings');
          }
        },
      ]
    );
  }

  /**
   * Show a friendly prompt before requesting permissions
   */
  showPermissionExplanation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '📱 Welcome to HydroSnap',
        'To provide you with the best experience, HydroSnap needs access to:\n\n' +
        '📍 Location - To verify you are at the monitoring site\n' +
        '📷 Camera - To capture water gauge readings\n' +
        '📸 Photo Library - To save gauge photos\n' +
        '🔔 Notifications - To send flood alerts and reminders\n\n' +
        'Your privacy is important to us. These permissions are only used for app functionality.',
        [
          { 
            text: 'Continue', 
            onPress: () => resolve(true),
            style: 'default'
          },
        ],
        { cancelable: false }
      );
    });
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
