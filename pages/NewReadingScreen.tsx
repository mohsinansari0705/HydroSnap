import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
// TODO: Install expo-camera and expo-location packages
// import { Camera } from 'expo-camera';
// import * as Location from 'expo-location';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface NewReadingScreenProps {
  siteId: string;
  siteName: string;
  siteLocation: string;
  targetCoordinates: { latitude: number; longitude: number };
  validRadius: number; // in meters
  onSubmitReading: (data: ReadingData) => void;
  onCancel: () => void;
}

interface ReadingData {
  siteId: string;
  waterLevel: number;
  photo: string;
  coordinates: { latitude: number; longitude: number };
  timestamp: string;
  qrCode?: string;
}

interface LocationValidation {
  isValid: boolean;
  distance: number;
  message: string;
}

const { width } = Dimensions.get('window');

const NewReadingScreen: React.FC<NewReadingScreenProps> = ({
  siteId,
  siteName,
  siteLocation,
  targetCoordinates,
  validRadius = 125,
  onSubmitReading,
  onCancel,
}) => {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [waterLevel, setWaterLevel] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationValidation, setLocationValidation] = useState<LocationValidation>({
    isValid: false,
    distance: 0,
    message: 'Checking location...',
  });
  const [scannedQR] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    requestPermissions();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      validateLocation(currentLocation);
    }
  }, [currentLocation]);

  const requestPermissions = async () => {
    try {
      // TODO: Implement with actual expo-camera and expo-location
      // const cameraPermission = await Camera.requestCameraPermissionsAsync();
      // const locationPermission = await Location.requestForegroundPermissionsAsync();
      
      // Mock permissions for now
      setHasPermissions(true);
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('Permissions Required', 'Camera and location permissions are required to take readings.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      // TODO: Implement with actual expo-location
      // const location = await Location.getCurrentPositionAsync({
      //   accuracy: Location.Accuracy.High,
      // });
      
      // Mock location for now (Delhi coordinates)
      setCurrentLocation({
        latitude: 28.6139,
        longitude: 77.2090,
      });
    } catch (error) {
      console.error('Location fetch failed:', error);
      Alert.alert('Location Error', 'Unable to get current location. Please check GPS settings.');
    }
  };

  const validateLocation = (userLocation: { latitude: number; longitude: number }) => {
    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = (targetCoordinates.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (targetCoordinates.longitude - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(targetCoordinates.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const isValid = distance <= validRadius;
    
    setLocationValidation({
      isValid,
      distance: Math.round(distance),
      message: isValid 
        ? `Inside Valid Zone: ${Math.round(distance)}m` 
        : `Outside Valid Zone: ${Math.round(distance)}m (Max: ${validRadius}m)`
    });
  };

  const takePhoto = async () => {
    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedPhoto(photo.uri);
        setShowCamera(false);
      } catch (error) {
        console.error('Photo capture failed:', error);
        Alert.alert('Capture Failed', 'Unable to capture photo. Please try again.');
      }
    }
  };

  const handleQRScan = () => {
    // TODO: Implement QR scanner
    Alert.alert('QR Scanner', 'QR scanner feature will be implemented.');
  };

  const canSubmit = () => {
    return (
      locationValidation.isValid &&
      capturedPhoto &&
      waterLevel.trim() !== '' &&
      !isNaN(parseFloat(waterLevel)) &&
      parseFloat(waterLevel) > 0
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !currentLocation) {
      Alert.alert('Validation Error', 'Please ensure all requirements are met before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const readingData: ReadingData = {
        siteId,
        waterLevel: parseFloat(waterLevel),
        photo: capturedPhoto!,
        coordinates: currentLocation,
        timestamp: new Date().toISOString(),
        ...(scannedQR && { qrCode: scannedQR }),
      };

      await onSubmitReading(readingData);
      Alert.alert('Success', 'Reading submitted successfully!', [
        { text: 'OK', onPress: onCancel }
      ]);
    } catch (error) {
      console.error('Submit failed:', error);
      Alert.alert('Submission Failed', 'Unable to submit reading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        {/* TODO: Replace with actual Camera component */}
        <View style={styles.camera}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.cameraButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Capture Gauge Reading</Text>
              <View style={styles.placeholder} />
            </View>
            
            <View style={styles.focusFrame} />
            
            <View style={styles.cameraFooter}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={capturePhoto}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Reading</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Status */}
        <View style={[
          styles.locationCard,
          createNeumorphicCard({ size: 'medium' }),
          { borderLeftWidth: 4, borderLeftColor: locationValidation.isValid ? Colors.validationGreen : Colors.alertRed }
        ]}>
          <Text style={[styles.locationTitle, NeumorphicTextStyles.subheading]}>
            📍 Geofence Status
          </Text>
          <Text style={[
            styles.locationMessage,
            { color: locationValidation.isValid ? Colors.validationGreen : Colors.alertRed }
          ]}>
            {locationValidation.message}
          </Text>
          <Text style={[styles.locationDetails, NeumorphicTextStyles.caption]}>
            Target: {siteLocation}
          </Text>
        </View>

        {/* Camera Section */}
        <View style={[styles.photoCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            📸 Photo Verification
          </Text>
          
          {capturedPhoto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
              <TouchableOpacity
                style={[styles.retakeButton, createNeumorphicCard({ size: 'small' })]}
                onPress={takePhoto}
              >
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.cameraPlaceholder, createNeumorphicCard({ size: 'small', depressed: true })]}
              onPress={takePhoto}
            >
              <Text style={styles.cameraPlaceholderIcon}>📷</Text>
              <Text style={styles.cameraPlaceholderText}>Tap to Capture Gauge</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Water Level Input */}
        <View style={[styles.inputCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            💧 Water Level Reading
          </Text>
          <View style={[styles.inputContainer, createNeumorphicCard({ size: 'small', depressed: true })]}>
            <TextInput
              style={styles.input}
              placeholder="Enter water level in cm"
              placeholderTextColor={Colors.textLight}
              value={waterLevel}
              onChangeText={setWaterLevel}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={[styles.qrCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            📱 QR Code (Optional)
          </Text>
          <TouchableOpacity
            style={[styles.qrButton, createNeumorphicCard({ size: 'small' })]}
            onPress={handleQRScan}
          >
            <Text style={styles.qrButtonText}>Scan Site QR Code</Text>
          </TouchableOpacity>
          {scannedQR && (
            <Text style={styles.qrResult}>Scanned: {scannedQR}</Text>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            createNeumorphicCard({ size: 'medium' }),
            { backgroundColor: canSubmit() ? Colors.deepSecurityBlue : Colors.border },
            isSubmitting && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
        >
          <Text style={[
            styles.submitButtonText,
            { color: canSubmit() ? Colors.white : Colors.textLight }
          ]}>
            {isSubmitting ? 'Submitting...' : 'Submit Reading'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: Colors.softLightGrey, // Same as card color
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
    shadowColor: Colors.deepSecurityBlue + '20',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  headerTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 22,
    color: Colors.deepSecurityBlue,
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  locationCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 8,
  },
  locationMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  photoCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 16,
  },
  photoPreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: width - 80,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  retakeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.aquaTechBlue,
  },
  retakeButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
  },
  cameraPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  cameraPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  inputCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
  },
  qrCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  qrButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.aquaTechBlue,
    alignItems: 'center',
  },
  qrButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  qrResult: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.validationGreen,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    marginBottom: 35,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  cameraButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cameraButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  focusFrame: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 12,
  },
  cameraFooter: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.deepSecurityBlue,
  },
});

export default NewReadingScreen;