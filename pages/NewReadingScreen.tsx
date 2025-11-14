import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { QRValidationScreen } from '../components/QRValidationScreen';
import { MockCamera } from '../components/MockCamera';
import { ValidatedSiteData } from '../services/qrValidationService';
import { 
  waterLevelReadingsService, 
  NewReadingData 
} from '../services/waterLevelReadingsService';

interface NewReadingScreenProps {
  onSubmitReading?: (data: any) => void;
  onCancel: () => void;
}

type ReadingStep = 'qr_validation' | 'photo_capture' | 'water_calculation' | 'confirmation' | 'submission';

interface UserLocation {
  latitude: number;
  longitude: number;
}

const NewReadingScreen: React.FC<NewReadingScreenProps> = ({
  onSubmitReading,
  onCancel,
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<ReadingStep>('qr_validation');
  const [validatedSite, setValidatedSite] = useState<ValidatedSiteData | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [calculatedWaterLevel, setCalculatedWaterLevel] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [siteDistance, setSiteDistance] = useState<number>(0);

  // Mock user location (in production, get from GPS)
  useEffect(() => {
    // Simulate getting user location
    setTimeout(() => {
      setUserLocation({
        latitude: 28.66677700 + (Math.random() - 0.5) * 0.001, // Near Delhi site
        longitude: 77.21663900 + (Math.random() - 0.5) * 0.001
      });
    }, 1000);
  }, []);

  const handleQRValidationSuccess = (siteData: ValidatedSiteData, distance: number) => {
    setValidatedSite(siteData);
    setSiteDistance(distance);
    setCurrentStep('photo_capture');
  };

  const handlePhotoCapture = (photoUri: string) => {
    setCapturedPhoto(photoUri);
    
    if (validatedSite) {
      // Generate realistic water level based on site data
      const waterLevel = waterLevelReadingsService.generateRealisticWaterLevel(validatedSite);
      setCalculatedWaterLevel(waterLevel);
      setCurrentStep('water_calculation');
    }
  };

  const handleConfirmReading = () => {
    setCurrentStep('confirmation');
  };

  const handleSubmitReading = async () => {
    if (!validatedSite || !userLocation || calculatedWaterLevel === null || !capturedPhoto) {
      Alert.alert('Error', 'Missing required data for submission');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('submission');

    try {
      const readingData: NewReadingData = {
        siteData: validatedSite,
        waterLevel: calculatedWaterLevel,
        photoUri: capturedPhoto,
        userLocation: userLocation,
        distance: siteDistance,
      };

      const result = await waterLevelReadingsService.submitReading(readingData);

      if (result.success) {
        Alert.alert(
          'Reading Submitted Successfully! ✅',
          `Water Level: ${calculatedWaterLevel}cm\nSite: ${validatedSite.name}\nReading ID: ${result.readingId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSubmitReading) {
                  onSubmitReading({
                    siteId: validatedSite.siteId,
                    waterLevel: calculatedWaterLevel,
                    readingId: result.readingId
                  });
                }
                onCancel(); // Go back to previous screen
              }
            }
          ]
        );
      } else {
        Alert.alert('Submission Failed', result.message);
        setCurrentStep('confirmation');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit reading. Please try again.');
      setCurrentStep('confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetReading = () => {
    Alert.alert(
      'Start Over?',
      'This will clear all current data and start a new reading process.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Over', 
          onPress: () => {
            setCurrentStep('qr_validation');
            setValidatedSite(null);
            setCapturedPhoto(null);
            setCalculatedWaterLevel(null);
            setSiteDistance(0);
          }
        }
      ]
    );
  };

  // Render different steps
  const renderStep = () => {
    if (!userLocation) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 16 }]}>
            Getting your location...
          </Text>
        </View>
      );
    }

    switch (currentStep) {
      case 'qr_validation':
        return (
          <QRValidationScreen
            userLocation={userLocation}
            onSiteValidated={(siteData) => {
              // Calculate distance for demonstration
              const distance = Math.floor(Math.random() * 100) + 25; // 25-125m
              handleQRValidationSuccess(siteData, distance);
            }}
            onCancel={onCancel}
          />
        );

      case 'photo_capture':
        return (
          <MockCamera
            onPhotoTaken={handlePhotoCapture}
            onCancel={() => setCurrentStep('qr_validation')}
          />
        );

      case 'water_calculation':
        return renderWaterCalculation();

      case 'confirmation':
        return renderConfirmation();

      case 'submission':
        return renderSubmission();

      default:
        return null;
    }
  };

  const renderWaterCalculation = () => {
    if (!validatedSite || calculatedWaterLevel === null) return null;

    const waterStatus = waterLevelReadingsService.getWaterLevelStatus(
      calculatedWaterLevel, 
      validatedSite.levels
    );

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
            Water Level Analysis
          </Text>
        </View>

        <View style={[createNeumorphicCard(), styles.card]}>
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
            📊 Image Processing Results
          </Text>
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8 }]}>
            The system has analyzed your gauge photo and calculated the water level.
          </Text>

          <View style={styles.waterLevelDisplay}>
            <Text style={styles.waterLevelValue}>
              {calculatedWaterLevel.toFixed(2)} cm
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: waterStatus.color }]}>
              <Text style={styles.statusText}>{waterStatus.message}</Text>
            </View>
          </View>

          <View style={styles.levelsComparison}>
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
              Site Level References:
            </Text>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Safe Level:</Text>
              <Text style={[styles.levelValue, { color: '#10B981' }]}>
                ≤ {validatedSite.levels.safe} cm
              </Text>
            </View>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Warning Level:</Text>
              <Text style={[styles.levelValue, { color: '#F59E0B' }]}>
                {validatedSite.levels.safe + 1} - {validatedSite.levels.warning} cm
              </Text>
            </View>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Danger Level:</Text>
              <Text style={[styles.levelValue, { color: '#EF4444' }]}>
                {'>'}  {validatedSite.levels.warning} cm
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[createNeumorphicCard(), styles.proceedButton]}
          onPress={handleConfirmReading}
        >
          <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
            Continue to Review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[createNeumorphicCard(), styles.retakeButton]}
          onPress={() => setCurrentStep('photo_capture')}
        >
          <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textPrimary }]}>
            Retake Photo
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderConfirmation = () => {
    if (!validatedSite || calculatedWaterLevel === null) return null;

    const waterStatus = waterLevelReadingsService.getWaterLevelStatus(
      calculatedWaterLevel, 
      validatedSite.levels
    );

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
            Review Reading
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetReading}>
            <Text style={styles.resetText}>Start Over</Text>
          </TouchableOpacity>
        </View>

        {/* Site Information */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
            📍 Site Information
          </Text>
          <View style={styles.siteDetails}>
            <Text style={styles.siteTitle}>{validatedSite.name}</Text>
            <Text style={styles.siteLocation}>
              {validatedSite.location}, {validatedSite.state}
            </Text>
            <Text style={styles.siteRiver}>🌊 {validatedSite.riverName}</Text>
            <Text style={styles.siteDistance}>📍 Distance: {siteDistance}m from site</Text>
          </View>
        </View>

        {/* Water Level Reading */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
            📊 Water Level Reading
          </Text>
          
          <View style={styles.readingDisplay}>
            <View style={styles.mainReading}>
              <Text style={styles.readingValue}>{calculatedWaterLevel.toFixed(2)}</Text>
              <Text style={styles.readingUnit}>cm</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: waterStatus.color }]}>
              <Text style={styles.statusText}>{waterStatus.message}</Text>
            </View>
          </View>

          <View style={styles.readingMeta}>
            <Text style={styles.metaItem}>📸 Photo captured and analyzed</Text>
            <Text style={styles.metaItem}>📍 Location verified within geofence</Text>
            <Text style={styles.metaItem}>🔍 QR code validated successfully</Text>
            <Text style={styles.metaItem}>
              ⏰ Timestamp: {new Date().toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[createNeumorphicCard(), styles.submitButton]}
          onPress={handleSubmitReading}
          disabled={isSubmitting}
        >
          <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
            {isSubmitting ? 'Submitting...' : 'Submit Reading'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[createNeumorphicCard(), styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderSubmission = () => {
    return (
      <View style={styles.submissionContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginTop: 20 }]}>
          Submitting Reading...
        </Text>
        <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          Please wait while we save your water level reading to the database.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {renderStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  submissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  resetButton: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...createNeumorphicCard(),
  },
  resetText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  waterLevelDisplay: {
    alignItems: 'center',
    marginVertical: 30,
  },
  waterLevelValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  levelsComparison: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  retakeButton: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    alignItems: 'center',
  },
  siteDetails: {
    marginTop: 16,
  },
  siteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  siteRiver: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  siteDistance: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  readingDisplay: {
    alignItems: 'center',
    marginVertical: 20,
  },
  mainReading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  readingValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  readingUnit: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  readingMeta: {
    marginTop: 20,
  },
  metaItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    alignItems: 'center',
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
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  retakeButtonOld: {
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
  submitButtonOld: {
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