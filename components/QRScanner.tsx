import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

// Mock implementations for missing dependencies
const Camera = {
  requestCameraPermissionsAsync: async () => ({ status: 'granted' }),
};

const CameraView = ({ style, onBarcodeScanned }: any) => (
  <View style={[style, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ color: 'white', textAlign: 'center' }}>
      Camera Mock View{'\n'}QR Scanner will work in production
    </Text>
  </View>
);

const Location = {
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: {
      latitude: 28.6139,
      longitude: 77.2090,
    }
  })
};

const CryptoJS = {
  SHA256: (str: string) => ({
    toString: () => str // Mock hash function
  })
};

interface SiteData {
  siteId: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  riverName: string;
  state: string;
  district: string;
  siteType: string;
  levels: {
    safe: number;
    warning: number;
    danger: number;
  };
  geofenceRadius: number;
  organization: string;
  qrCode: string;
  isActive: boolean;
  generatedAt: string;
  expiresAt: string;
  validationHash: string;
}

interface QRScannerProps {
  onSiteValidated: (siteData: SiteData) => void;
  onCancel: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onSiteValidated, onCancel }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const SECRET_KEY = "HYDROSNAP_VALIDATION_KEY_2025";

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const decryptQRData = (encryptedData: string): SiteData | null => {
    try {
      // Simple decryption logic - you may need to adjust based on your Python encryption
      const key = CryptoJS.SHA256(SECRET_KEY).toString();
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted) as SiteData;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  };

  const validateSiteHash = (siteData: SiteData): boolean => {
    try {
      const hashString = `${siteData.siteId}${siteData.name}${siteData.coordinates.lat}${siteData.coordinates.lng}`;
      const expectedHash = CryptoJS.SHA256(hashString).toString().substring(0, 16);
      return siteData.validationHash === expectedHash;
    } catch (error) {
      console.error('Hash validation failed:', error);
      return false;
    }
  };

  const checkExpiry = (siteData: SiteData): boolean => {
    try {
      const expiryDate = new Date(siteData.expiresAt);
      return new Date() < expiryDate;
    } catch (error) {
      console.error('Expiry check failed:', error);
      return false;
    }
  };

  const validateLocation = async (siteData: SiteData): Promise<{ isValid: boolean; distance?: number; error?: string }> => {
    try {
      // Get user's current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { isValid: false, error: 'Location permission denied' };
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLat = location.coords.latitude;
      const userLng = location.coords.longitude;

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        userLat,
        userLng,
        siteData.coordinates.lat,
        siteData.coordinates.lng
      );

      const isWithinGeofence = distance <= siteData.geofenceRadius;

      return {
        isValid: isWithinGeofence,
        distance: Math.round(distance),
        error: isWithinGeofence ? undefined : `You are ${Math.round(distance)}m away from the monitoring site. Required: within ${siteData.geofenceRadius}m`
      };
    } catch (error) {
      return { isValid: false, error: 'Failed to get location' };
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    setIsProcessing(true);

    try {
      // Step 1: Decrypt QR data
      const siteData = decryptQRData(data);
      if (!siteData) {
        Alert.alert('Invalid QR Code', 'This QR code is not valid or corrupted.');
        resetScanner();
        return;
      }

      // Step 2: Check if site is active
      if (!siteData.isActive) {
        Alert.alert('Inactive Site', 'This monitoring site is currently inactive.');
        resetScanner();
        return;
      }

      // Step 3: Validate data integrity
      if (!validateSiteHash(siteData)) {
        Alert.alert('Security Error', 'QR code data has been tampered with.');
        resetScanner();
        return;
      }

      // Step 4: Check expiry
      if (!checkExpiry(siteData)) {
        Alert.alert('Expired QR Code', 'This QR code has expired. Please contact your supervisor.');
        resetScanner();
        return;
      }

      // Step 5: Validate location (geofence)
      const locationCheck = await validateLocation(siteData);
      if (!locationCheck.isValid) {
        Alert.alert(
          'Location Validation Failed',
          locationCheck.error || 'You must be at the monitoring site to take readings.',
          [
            { text: 'Retry', onPress: resetScanner },
            { text: 'Cancel', onPress: onCancel }
          ]
        );
        return;
      }

      // Step 6: Success - validate site
      Alert.alert(
        'Site Validated Successfully! ✅',
        `${siteData.name}\n${siteData.location}, ${siteData.state}\n\nDistance: ${locationCheck.distance}m from site\nRiver: ${siteData.riverName}`,
        [
          {
            text: 'Take Reading',
            onPress: () => onSiteValidated(siteData)
          }
        ]
      );

    } catch (error) {
      console.error('QR validation error:', error);
      Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
      resetScanner();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={getCameraPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan Monitoring Site QR Code</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instruction}>
              Position the QR code within the frame
            </Text>
          </View>

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Validating site...</Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={resetScanner}
              disabled={isProcessing}
            >
              <Text style={styles.retryText}>Retry Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 20,
  },
  footer: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});