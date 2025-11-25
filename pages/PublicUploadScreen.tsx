import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Colors } from '../lib/colors';
import { useTranslation } from 'react-i18next';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface PublicUploadScreenProps {
  onSubmitReport: (data: PublicReportData) => void;
  onCancel: () => void;
}

interface PublicReportData {
  location: string;
  coordinates?: { latitude: number; longitude: number };
  description: string;
  photo?: string;
  contactInfo?: string;
  timestamp: string;
  waterLevel?: number;
}

const PublicUploadScreen: React.FC<PublicUploadScreenProps> = ({
  onSubmitReport,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [waterLevel, setWaterLevel] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [capturedPhoto] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // TODO: Get current location
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      // TODO: Implement with actual location service
      // For now, mock location
      setCurrentLocation({
        latitude: 28.6139,
        longitude: 77.2090,
      });
    } catch (error) {
      console.error('Location fetch failed:', error);
      // Location is optional for public reports
    }
  };

  const takePhoto = async () => {
    try {
      // TODO: Implement camera functionality
      Alert.alert(
        t('publicUpload.photoCapture'),
        t('publicUpload.cameraImplemented'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Photo capture failed:', error);
      Alert.alert(t('publicUpload.captureFailed'), t('publicUpload.captureError'));
    }
  };

  const canSubmit = () => {
    return (
      location.trim() !== '' &&
      description.trim() !== '' &&
      description.length >= 10
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      Alert.alert(
        t('publicUpload.incompleteInfo'),
        t('publicUpload.incompleteMessage')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData: PublicReportData = {
        location: location.trim(),
        description: description.trim(),
        timestamp: new Date().toISOString(),
        ...(currentLocation && { coordinates: currentLocation }),
        ...(capturedPhoto && { photo: capturedPhoto }),
        ...(contactInfo.trim() && { contactInfo: contactInfo.trim() }),
        ...(waterLevel.trim() && !isNaN(parseFloat(waterLevel)) && {
          waterLevel: parseFloat(waterLevel)
        }),
      };

      await onSubmitReport(reportData);
      
      Alert.alert(
        t('publicUpload.reportSubmitted'),
        t('publicUpload.thankYou'),
        [{ text: t('common.ok'), onPress: onCancel }]
      );
    } catch (error) {
      console.error('Submit failed:', error);
      Alert.alert(t('publicUpload.submissionFailed'), t('publicUpload.tryAgain'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, createNeumorphicCard({ size: 'medium' })]}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Text style={styles.backButtonText}>{t('publicUpload.back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, NeumorphicTextStyles.heading]}>
            {t('publicUpload.reportWaterSituation')}
          </Text>
          <Text style={[styles.headerSubtitle, NeumorphicTextStyles.caption]}>
            {t('publicUpload.helpMonitor')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Information Banner */}
        <View style={[styles.infoBanner, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, NeumorphicTextStyles.subheading]}>
              {t('publicUpload.publicContribution')}
            </Text>
            <Text style={[styles.infoText, NeumorphicTextStyles.caption]}>
              {t('publicUpload.contributionInfo')}
            </Text>
          </View>
        </View>

        {/* Location Input */}
        <View style={[styles.inputCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.location')}
          </Text>
          <View style={[styles.inputContainer, createNeumorphicCard({ size: 'small', depressed: true })]}>
            <TextInput
              style={styles.input}
              placeholder={t('publicUpload.locationPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={location}
              onChangeText={setLocation}
              multiline
            />
          </View>
          {currentLocation && (
            <Text style={styles.gpsInfo}>{t('publicUpload.gpsAttached')}</Text>
          )}
        </View>

        {/* Description Input */}
        <View style={[styles.inputCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.description')}
          </Text>
          <View style={[styles.textAreaContainer, createNeumorphicCard({ size: 'small', depressed: true })]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('publicUpload.descriptionPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
          <Text style={styles.characterCount}>{t('publicUpload.characterCount', { count: description.length })}</Text>
        </View>

        {/* Water Level Input (Optional) */}
        <View style={[styles.inputCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.waterLevelOptional')}
          </Text>
          <View style={[styles.inputContainer, createNeumorphicCard({ size: 'small', depressed: true })]}>
            <TextInput
              style={styles.input}
              placeholder={t('publicUpload.waterLevelPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={waterLevel}
              onChangeText={setWaterLevel}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
          <Text style={styles.helpText}>{t('publicUpload.waterLevelHelper')}</Text>
        </View>

        {/* Photo Section */}
        <View style={[styles.photoCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.photoEvidence')}
          </Text>
          
          {capturedPhoto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
              <TouchableOpacity
                style={[styles.retakeButton, createNeumorphicCard({ size: 'small' })]}
                onPress={takePhoto}
              >
                <Text style={styles.retakeButtonText}>{t('publicUpload.retakePhoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.photoPlaceholder, createNeumorphicCard({ size: 'small', depressed: true })]}
              onPress={takePhoto}
            >
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>{t('publicUpload.tapToAddPhoto')}</Text>
              <Text style={styles.photoPlaceholderSubtext}>{t('publicUpload.photosHelp')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Information (Optional) */}
        <View style={[styles.inputCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.contactInfo')}
          </Text>
          <View style={[styles.inputContainer, createNeumorphicCard({ size: 'small', depressed: true })]}>
            <TextInput
              style={styles.input}
              placeholder={t('publicUpload.contactPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={contactInfo}
              onChangeText={setContactInfo}
            />
          </View>
          <Text style={styles.helpText}>{t('publicUpload.contactPrivacy')}</Text>
        </View>

        {/* Privacy Notice */}
        <View style={[styles.privacyCard, createNeumorphicCard({ size: 'medium' })]}>
          <Text style={[styles.privacyTitle, NeumorphicTextStyles.subheading]}>
            {t('publicUpload.privacyDataUse')}
          </Text>
          <Text style={[styles.privacyText, NeumorphicTextStyles.caption]}>
            {t('publicUpload.privacyPoint1')}{'\n'}
            {t('publicUpload.privacyPoint2')}{'\n'}
            {t('publicUpload.privacyPoint3')}{'\n'}
            {t('publicUpload.privacyPoint4')}{'\n'}
            {t('publicUpload.privacyPoint5')}
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            createNeumorphicCard({ size: 'medium' }),
            {
              backgroundColor: canSubmit() ? Colors.deepSecurityBlue : Colors.border,
              opacity: isSubmitting ? 0.6 : 1,
            }
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
        >
          <Text style={[
            styles.submitButtonText,
            { color: canSubmit() ? Colors.white : Colors.textLight }
          ]}>
            {isSubmitting ? t('publicUpload.submittingReport') : t('publicUpload.submitReport')}
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
    padding: 20,
    margin: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.deepSecurityBlue,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: Colors.aquaTechBlue + '10',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  inputCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
  },
  textAreaContainer: {
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
  },
  gpsInfo: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontStyle: 'italic',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  photoCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
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
  photoPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  photoPlaceholderSubtext: {
    fontSize: 12,
    color: Colors.textLight,
  },
  privacyCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: Colors.validationGreen + '10',
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PublicUploadScreen;