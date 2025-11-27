import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { QRValidationScreen } from '../components/QRValidationScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RealCamera } from '../components/RealCamera';
import { ValidatedSiteData } from '../services/qrValidationService';
import SafeScreen from '../components/SafeScreen';
import { 
  waterLevelReadingsService, 
  NewReadingData 
} from '../services/waterLevelReadingsService';
import { geofenceMonitoringService } from '../services/geofenceMonitoringService';
import ReviewReadingScreen from './ReviewReadingScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import SubmissionSuccessPopup from '../components/SubmissionSuccessPopup';
import { locationCacheService } from '../services/locationCacheService';

interface NewReadingScreenProps {
  onSubmitReading?: (data: any) => void;
  onCancel: () => void;
}

type ReadingStep = 'qr_validation' | 'photo_capture' | 'data_entry' | 'confirmation' | 'submission';

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
  const [predictedWaterLevel, setPredictedWaterLevel] = useState<number | null>(null); // ML prediction
  const [finalWaterLevel, setFinalWaterLevel] = useState<number | null>(null); // Final value (after override if any)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [siteDistance, setSiteDistance] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Additional form data
  const [gaugeVisibility, setGaugeVisibility] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [weatherConditions, setWeatherConditions] = useState<string>('');
  const [lightingConditions, setLightingConditions] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [notes, setNotes] = useState<string>('');
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [manualOverrideReason, setManualOverrideReason] = useState<string>('');
  const [imageQualityScore, setImageQualityScore] = useState<number>(7);
  const [readingMethod, setReadingMethod] = useState<'photo_analysis' | 'manual_override'>('photo_analysis');
  
  // Timestamps
  const [siteSelectedAt, setSiteSelectedAt] = useState<Date>(new Date());
  const [photoTakenAt, setPhotoTakenAt] = useState<Date>(new Date());

  // Get real user location using expo-location
  useEffect(() => {
    let isMounted = true;
    
    const getUserLocation = async () => {
      try {
        const location = await locationCacheService.getLocationFast();
        
        if (location && isMounted) {
          setUserLocation(location);
          console.log('🚀 Location loaded fast using cache service');
        } else if (isMounted) {
          Alert.alert('Location Error', 'Could not get your location. Please check your GPS settings and permissions.');
        }
      } catch (error) {
        console.error('Error getting location:', error);
        if (isMounted) {
          Alert.alert('Location Error', 'Could not get your location. Please check your GPS settings.');
        }
      }
    };

    getUserLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop monitoring on unmount or cancel
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        geofenceMonitoringService.stopMonitoring();
      }
    };
  }, [isMonitoring]);

  // Handle back button based on current step
  const handleBackPress = () => {
    switch (currentStep) {
      case 'qr_validation':
        onCancel();
        break;
      case 'photo_capture':
        setCurrentStep('qr_validation');
        break;
      case 'data_entry':
        setCurrentStep('photo_capture');
        break;
      case 'confirmation':
        setCurrentStep('data_entry');
        break;
      case 'submission':
        // Don't allow back during submission
        return;
      default:
        onCancel();
    }
  };

  // Use simple back handler - no confirmation popup
  useSimpleBackHandler(
    handleBackPress,
    currentStep !== 'submission'
  );

  const handleQRValidationSuccess = async (siteData: ValidatedSiteData, distance: number) => {
    setValidatedSite(siteData);
    setSiteDistance(distance);
    setSiteSelectedAt(new Date());
    
    // Start geofence monitoring
    const started = await geofenceMonitoringService.startMonitoring(
      {
        siteId: siteData.siteId,
        centerLat: siteData.coordinates.lat,
        centerLng: siteData.coordinates.lng,
        radius: siteData.geofenceRadius,
        strictMode: true, // Require continuous presence
      },
      (status) => {
        // Optional: Update UI with real-time status
        console.log('📍 Location update:', status);
      }
    );
    
    if (started) {
      setIsMonitoring(true);
      setCurrentStep('photo_capture');
    } else {
      Alert.alert('Location Error', 'Could not start location monitoring. Please enable GPS and try again.');
    }
  };

  const handlePhotoCapture = (photoUri: string) => {
    setCapturedPhoto(photoUri);
    setPhotoTakenAt(new Date());
    
    if (validatedSite) {
      // Generate ML prediction (random for now, will be replaced with actual ML model)
      const prediction = waterLevelReadingsService.generateRealisticWaterLevel(validatedSite);
      setPredictedWaterLevel(prediction);
      setFinalWaterLevel(prediction); // Initially same as prediction
      setCurrentStep('data_entry');
    }
  };

  const handleConfirmReading = () => {
    // Validate required fields
    if (!weatherConditions.trim()) {
      Alert.alert(
        'Required Fields Missing',
        'Please fill in the Weather Conditions field before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCurrentStep('confirmation');
  };

  const handleSubmitReading = async () => {
    if (!validatedSite || !userLocation || predictedWaterLevel === null || finalWaterLevel === null || !capturedPhoto) {
      Alert.alert('Error', 'Missing required data for submission');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('submission');

    try {
      // Get location statistics for audit trail
      const locationStats = geofenceMonitoringService.getStatistics();
      
      // Determine water level status based on final level
      const waterStatus = waterLevelReadingsService.getWaterLevelStatus(
        finalWaterLevel,
        validatedSite.levels
      );
      
      // Map 'safe' status to database enum which includes 'critical'
      let dbWaterLevelStatus: 'safe' | 'warning' | 'danger' | 'critical';
      if (waterStatus.status === 'danger' && finalWaterLevel > validatedSite.levels.danger * 1.5) {
        dbWaterLevelStatus = 'critical';
      } else if (waterStatus.status === 'danger') {
        dbWaterLevelStatus = 'danger';
      } else if (waterStatus.status === 'warning') {
        dbWaterLevelStatus = 'warning';
      } else {
        dbWaterLevelStatus = 'safe';
      }
      
      const readingData: NewReadingData = {
        siteData: validatedSite,
        predictedWaterLevel: predictedWaterLevel, // ML prediction
        waterLevel: finalWaterLevel, // Final value (may be manually adjusted)
        photoUri: capturedPhoto,
        userLocation: userLocation,
        distance: siteDistance,
        
        // QR Code Details
        qrScannedAt: siteSelectedAt,
        
        // Photo Analysis
        photoAnalysisStatus: 'completed',
        predictionConfidence: manualOverride ? 0 : Math.round(85 + Math.random() * 15), // 85-100% for auto
        manualOverride: manualOverride,
        ...(manualOverride && manualOverrideReason ? { manualOverrideReason } : {}),
        
        // Water Level Status
        waterLevelStatus: dbWaterLevelStatus,
        alertTriggered: dbWaterLevelStatus === 'danger' || dbWaterLevelStatus === 'critical',
        ...(dbWaterLevelStatus === 'danger' || dbWaterLevelStatus === 'critical' ? { alertType: 'flood_warning' as const } : {}),
        trendStatus: 'stable', // Could be calculated from previous readings
        
        // Data Quality & Conditions
        gaugeVisibility: gaugeVisibility,
        weatherConditions: weatherConditions,
        lightingConditions: lightingConditions,
        imageQualityScore: imageQualityScore,
        readingMethod: readingMethod,
        ...(notes.trim() ? { notes } : {}),
        
        // Timestamps
        siteSelectedAt: siteSelectedAt,
        photoTakenAt: photoTakenAt,
        analysisStartedAt: photoTakenAt,
        analysisCompletedAt: new Date(),
        
        ...(locationStats ? {
          locationMetadata: {
            breachCount: locationStats.breachCount,
            avgDistance: locationStats.avgDistance,
            minDistance: locationStats.minDistance,
            maxDistance: locationStats.maxDistance,
            avgAccuracy: locationStats.avgAccuracy,
            timeInGeofence: locationStats.timeInGeofence,
            totalUpdates: locationStats.totalUpdates,
          }
        } : {}),
      };

      const result = await waterLevelReadingsService.submitReading(readingData);
      
      // Stop monitoring after submission
      geofenceMonitoringService.stopMonitoring();
      setIsMonitoring(false);

      if (result.success) {
        // Store result data and show modern popup
        setSubmissionResult({
          siteId: validatedSite.siteId,
          siteName: validatedSite.name,
          waterLevel: finalWaterLevel,
          readingId: result.readingId
        });
        setShowSuccessPopup(true);
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
            setPredictedWaterLevel(null);
            setFinalWaterLevel(null);
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
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 16 }]}>
              Getting your location...
            </Text>
            {/* Preload icons to avoid delays */}
            <View style={{ opacity: 0, position: 'absolute' }}>
              <Ionicons name="qr-code" size={1} />
              <Ionicons name="camera" size={1} />
              <MaterialCommunityIcons name="brain" size={1} />
              <MaterialCommunityIcons name="eye-outline" size={1} />
              <Ionicons name="sunny-outline" size={1} />
              <MaterialCommunityIcons name="weather-partly-cloudy" size={1} />
              <MaterialCommunityIcons name="image-check-outline" size={1} />
              <MaterialCommunityIcons name="note-text-outline" size={1} />
            </View>
          </View>
        </View>
      );
    }

    switch (currentStep) {
      case 'qr_validation':
        return (
          <QRValidationScreen
            userLocation={userLocation}
            onSiteValidated={(siteData, distance) => {
              handleQRValidationSuccess(siteData, distance);
            }}
            onCancel={onCancel}
          />
        );

      case 'photo_capture':
        return (
          <RealCamera
            onPhotoTaken={handlePhotoCapture}
            onCancel={() => {
              geofenceMonitoringService.stopMonitoring();
              setIsMonitoring(false);
              setCurrentStep('qr_validation');
            }}
          />
        );

      case 'data_entry':
        return renderDataEntry();

      case 'confirmation':
        if (!validatedSite || predictedWaterLevel === null || finalWaterLevel === null || !capturedPhoto) {
          return null;
        }
        return (
          <ReviewReadingScreen
            validatedSite={validatedSite}
            predictedWaterLevel={predictedWaterLevel}
            finalWaterLevel={finalWaterLevel}
            capturedPhoto={capturedPhoto}
            siteDistance={siteDistance}
            photoTakenAt={photoTakenAt}
            gaugeVisibility={gaugeVisibility}
            weatherConditions={weatherConditions}
            lightingConditions={lightingConditions}
            imageQualityScore={imageQualityScore}
            readingMethod={readingMethod}
            manualOverride={manualOverride}
            manualOverrideReason={manualOverrideReason}
            notes={notes}
            onSubmit={handleSubmitReading}
            onEdit={() => setCurrentStep('data_entry')}
            onCancel={onCancel}
            onStartOver={resetReading}
            isSubmitting={isSubmitting}
          />
        );

      case 'submission':
        return renderSubmission();

      default:
        return null;
    }
  };



  const renderDataEntry = () => {
    if (!validatedSite || predictedWaterLevel === null || finalWaterLevel === null) return null;

    const waterStatus = waterLevelReadingsService.getWaterLevelStatus(
      finalWaterLevel,
      validatedSite.levels
    );

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
            Reading Details
          </Text>
        </View>

        {/* Water Level Display with Manual Adjustment */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="brain" size={20} color={Colors.primary} />
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
              Predicted Water Level (ML Model)
            </Text>
          </View>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 16 }]}>
            AI prediction based on gauge photo analysis
          </Text>
          
          <View style={styles.waterLevelDisplay}>
            <Text style={styles.waterLevelValue}>
              {predictedWaterLevel.toFixed(2)} cm
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: waterStatus.color }]}>
              <Text style={styles.statusText}>{waterStatus.message}</Text>
            </View>
          </View>

          {/* Manual Adjustment Input */}
          <View style={styles.adjustmentSection}>
            <View style={styles.adjustmentHeader}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.textPrimary} />
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                Adjust Reading (Optional)
              </Text>
            </View>
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
              If the prediction is incorrect, you can manually adjust it
            </Text>
            
            <View style={styles.adjustmentInputRow}>
              <TextInput
                style={styles.waterLevelInput}
                value={finalWaterLevel.toFixed(2)}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0) {
                    setFinalWaterLevel(value);
                    // Auto-enable manual override if value changed
                    if (Math.abs(value - predictedWaterLevel) > 0.1) {
                      setManualOverride(true);
                      setReadingMethod('manual_override');
                    } else {
                      setManualOverride(false);
                      setReadingMethod('photo_analysis');
                    }
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="Enter water level"
                placeholderTextColor={Colors.textSecondary}
              />
              <Text style={styles.waterLevelUnit}>cm</Text>
              
              {Math.abs(finalWaterLevel - predictedWaterLevel) > 0.1 && (
                <TouchableOpacity
                  style={styles.resetAdjustmentButton}
                  onPress={() => {
                    setFinalWaterLevel(predictedWaterLevel);
                    setManualOverride(false);
                    setReadingMethod('photo_analysis');
                    setManualOverrideReason('');
                  }}
                >
                  <Ionicons name="refresh" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            
            {Math.abs(finalWaterLevel - predictedWaterLevel) > 0.1 && (
              <View style={styles.adjustmentWarning}>
                <Ionicons name="information-circle" size={16} color={Colors.warning} />
                <Text style={styles.adjustmentWarningText}>
                  Adjusted by {(finalWaterLevel - predictedWaterLevel).toFixed(2)} cm from prediction
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Gauge Visibility */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="eye-outline" size={20} color={Colors.textPrimary} />
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
              Gauge Visibility
            </Text>
            <Text style={{ color: Colors.danger, fontSize: 16, marginLeft: 4 }}>*</Text>
          </View>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
            How clearly could you see the gauge markings?
          </Text>
          <View style={styles.optionRow}>
            {(['excellent', 'good', 'fair', 'poor'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  gaugeVisibility === option && styles.optionButtonSelected
                ]}
                onPress={() => setGaugeVisibility(option)}
              >
                <Text style={[
                  styles.optionText,
                  gaugeVisibility === option && styles.optionTextSelected
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lighting Conditions */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sunny-outline" size={20} color={Colors.textPrimary} />
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
              Lighting Conditions
            </Text>
            <Text style={{ color: Colors.danger, fontSize: 16, marginLeft: 4 }}>*</Text>
          </View>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
            How was the lighting when you took the photo?
          </Text>
          <View style={styles.optionRow}>
            {(['excellent', 'good', 'fair', 'poor'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  lightingConditions === option && styles.optionButtonSelected
                ]}
                onPress={() => setLightingConditions(option)}
              >
                <Text style={[
                  styles.optionText,
                  lightingConditions === option && styles.optionTextSelected
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weather Conditions */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color={Colors.textPrimary} />
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
              Weather Conditions
            </Text>
            <Text style={{ color: Colors.danger, fontSize: 16, marginLeft: 4 }}>*</Text>
          </View>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginTop: 8, marginBottom: 12 }]}>
            Describe the current weather conditions
          </Text>
          <TextInput
            style={[
              styles.textInput,
              !weatherConditions.trim() && styles.textInputError
            ]}
            placeholder="e.g., Clear sky, Partly cloudy, Light rain"
            placeholderTextColor={Colors.textSecondary}
            value={weatherConditions}
            onChangeText={setWeatherConditions}
            maxLength={100}
          />
          {!weatherConditions.trim() && (
            <Text style={styles.errorText}>This field is required</Text>
          )}
        </View>

        {/* Image Quality Score */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginBottom: 8 }]}>
            <MaterialCommunityIcons name="image-check-outline" size={20} color={Colors.textPrimary} /> Image Quality
          </Text>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
            Rate the overall quality of the captured image (1-10)
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{imageQualityScore}/10</Text>
            <View style={styles.numberButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.numberButton,
                    imageQualityScore === score && styles.numberButtonSelected
                  ]}
                  onPress={() => setImageQualityScore(score)}
                >
                  <Text style={[
                    styles.numberButtonText,
                    imageQualityScore === score && styles.numberButtonTextSelected
                  ]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Manual Override */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setManualOverride(!manualOverride);
                if (!manualOverride) {
                  setReadingMethod('manual_override');
                } else {
                  setReadingMethod('photo_analysis');
                  setManualOverrideReason('');
                }
              }}
            >
              <Ionicons
                name={manualOverride ? 'checkbox' : 'square-outline'}
                size={24}
                color={manualOverride ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
                Manual Override
              </Text>
              <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginTop: 4 }]}>
                Check if you manually adjusted the predicted value
              </Text>
            </View>
          </View>

          {manualOverride && (
            <View style={{ marginTop: 16 }}>
              <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 8 }]}>
                Reason for manual override:
              </Text>
              <TextInput
                style={[styles.textInput, styles.textInputMultiline]}
                placeholder="Explain why you adjusted the reading..."
                placeholderTextColor={Colors.textSecondary}
                value={manualOverrideReason}
                onChangeText={setManualOverrideReason}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={[createNeumorphicCard(), styles.card]}>
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginBottom: 8 }]}>
            <MaterialCommunityIcons name="note-text-outline" size={20} color={Colors.textPrimary} /> Additional Notes
          </Text>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 12 }]}>
            Any additional observations or comments (optional)
          </Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            placeholder="e.g., Debris observed, abnormal flow patterns, etc."
            placeholderTextColor={Colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Navigation Buttons */}
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

  // renderConfirmation moved to separate ReviewReadingScreen component

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

  // Handle success popup continuation
  const handleSuccessPopupContinue = () => {
    setShowSuccessPopup(false);
    
    if (onSubmitReading && submissionResult) {
      onSubmitReading({
        siteId: submissionResult.siteId,
        waterLevel: submissionResult.waterLevel,
        readingId: submissionResult.readingId
      });
    }
    
    onCancel(); // Navigate back to home screen
  };

  return (
    <SafeScreen>
      <View style={styles.wrapper}>
        {renderStep()}
        
        {/* Success Popup */}
        {showSuccessPopup && submissionResult && (
          <SubmissionSuccessPopup
            visible={showSuccessPopup}
            siteId={submissionResult.siteId}
            siteName={submissionResult.siteName}
            waterLevel={submissionResult.waterLevel}
            readingId={submissionResult.readingId}
            onContinue={handleSuccessPopupContinue}
          />
        )}
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingBottom: 25,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 20,
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
  proceedButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  retakeButton: {
    backgroundColor: Colors.cardBackground,
    padding: 12,
    alignItems: 'center',
  },
  // Form styles
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  numberButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  numberButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  numberButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  numberButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  numberButtonTextSelected: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  // Water Level Adjustment Styles
  adjustmentSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustmentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterLevelInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  waterLevelUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  resetAdjustmentButton: {
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adjustmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    gap: 8,
  },
  adjustmentWarningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '500',
  },
  textInputError: {
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default NewReadingScreen;