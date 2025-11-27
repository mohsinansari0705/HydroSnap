import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ValidatedSiteData } from '../services/qrValidationService';
import { waterLevelReadingsService } from '../services/waterLevelReadingsService';
import { useSimpleBackHandler } from '../hooks/useBackHandler';

interface ReviewReadingScreenProps {
  validatedSite: ValidatedSiteData;
  predictedWaterLevel: number;
  finalWaterLevel: number;
  capturedPhoto: string;
  siteDistance: number;
  photoTakenAt: Date;
  
  // Form data
  gaugeVisibility: 'excellent' | 'good' | 'fair' | 'poor';
  weatherConditions: string;
  lightingConditions: 'excellent' | 'good' | 'fair' | 'poor';
  imageQualityScore: number;
  readingMethod: 'photo_analysis' | 'manual_override';
  manualOverride: boolean;
  manualOverrideReason?: string;
  notes?: string;
  
  // Actions
  onSubmit: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onStartOver: () => void;
  isSubmitting: boolean;
}

const ReviewReadingScreen: React.FC<ReviewReadingScreenProps> = ({
  validatedSite,
  predictedWaterLevel,
  finalWaterLevel,
  capturedPhoto,
  siteDistance,
  photoTakenAt,
  gaugeVisibility,
  weatherConditions,
  lightingConditions,
  imageQualityScore,
  readingMethod,
  manualOverride,
  manualOverrideReason,
  notes,
  onSubmit,
  onEdit,
  onCancel,
  onStartOver,
  isSubmitting,
}) => {
  const waterStatus = waterLevelReadingsService.getWaterLevelStatus(
    finalWaterLevel,
    validatedSite.levels
  );

  // Handle back button to go to edit mode
  useSimpleBackHandler(() => {
    if (!isSubmitting) {
      onEdit();
    }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
          Review Reading
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={onStartOver}>
          <Text style={styles.resetText}>Start Over</Text>
        </TouchableOpacity>
      </View>
          {/* Captured Photo */}
          {capturedPhoto && (
            <View style={[createNeumorphicCard(), styles.card]}>
              <View style={styles.reviewSectionHeader}>
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                  Captured Photo
                </Text>
              </View>
              <Image
                source={{ uri: capturedPhoto }}
                style={styles.reviewPhoto}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Site Information */}
          <View style={[createNeumorphicCard(), styles.card]}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                Site Information
              </Text>
            </View>
            <View style={styles.siteDetails}>
              <Text style={styles.siteTitle}>{validatedSite.name}</Text>
              <View style={styles.siteInfoRow}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.siteLocation}>
                  {validatedSite.location}, {validatedSite.state}
                </Text>
              </View>
              <View style={styles.siteInfoRow}>
                <MaterialCommunityIcons name="waves" size={16} color={Colors.primary} />
                <Text style={styles.siteRiver}>{validatedSite.riverName}</Text>
              </View>
              <View style={styles.siteInfoRow}>
                <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
                <Text style={styles.siteDistance}>
                  {siteDistance < 500 ? `${siteDistance}m` : `${(siteDistance / 1000).toFixed(1)} km`} from site
                </Text>
              </View>
            </View>
          </View>

          {/* Water Level Reading */}
          <View style={[createNeumorphicCard(), styles.card]}>
            <View style={styles.reviewSectionHeader}>
              <MaterialCommunityIcons name="chart-line" size={20} color={Colors.primary} />
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                Water Level Reading
              </Text>
            </View>

            <View style={styles.readingDisplay}>
              <View style={styles.mainReading}>
                <Text style={styles.readingValue}>{finalWaterLevel.toFixed(2)}</Text>
                <Text style={styles.readingUnit}>cm</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: waterStatus.color }]}>
                <Text style={styles.statusText}>{waterStatus.message}</Text>
              </View>
            </View>

            {/* Show ML Prediction if different from final */}
            {Math.abs(finalWaterLevel - predictedWaterLevel) > 0.1 && (
              <View style={styles.predictionComparisonBox}>
                <Text style={styles.predictionLabel}>ML Prediction:</Text>
                <Text style={styles.predictionValue}>{predictedWaterLevel.toFixed(2)} cm</Text>
                <Text style={styles.adjustmentLabel}>Manual Adjustment:</Text>
                <Text style={[styles.adjustmentValue, { color: finalWaterLevel > predictedWaterLevel ? Colors.danger : Colors.success }]}>
                  {finalWaterLevel > predictedWaterLevel ? '+' : ''}{(finalWaterLevel - predictedWaterLevel).toFixed(2)} cm
                </Text>
              </View>
            )}

            <View style={styles.validationInfo}>
              <View style={styles.validationItemRow}>
                <View style={styles.validationIcon}>
                  <Ionicons name="qr-code" size={18} color={Colors.success} />
                </View>
                <View style={styles.validationContent}>
                  <Text style={styles.validationTitle}>QR Code Validated</Text>
                  <Text style={styles.validationDetail}>{validatedSite.qrCode}</Text>
                </View>
              </View>
              <View style={styles.validationItemRow}>
                <View style={styles.validationIcon}>
                  <MaterialCommunityIcons name="map-marker-check" size={18} color={Colors.success} />
                </View>
                <View style={styles.validationContent}>
                  <Text style={styles.validationTitle}>Location Verified</Text>
                  <Text style={styles.validationDetail}>
                    Within {validatedSite.geofenceRadius}m geofence ({siteDistance < 500 ? `${siteDistance}m` : `${(siteDistance / 1000).toFixed(1)}km`} away)
                  </Text>
                </View>
              </View>
              <View style={styles.validationItemRow}>
                <View style={styles.validationIcon}>
                  <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
                </View>
                <View style={styles.validationContent}>
                  <Text style={styles.validationTitle}>Organization</Text>
                  <Text style={styles.validationDetail}>{validatedSite.organization}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timestamp Information */}
          <View style={[createNeumorphicCard(), styles.card]}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                Timeline
              </Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Photo Captured:</Text>
              <Text style={styles.reviewValue}>{photoTakenAt.toLocaleString()}</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Submitted:</Text>
              <Text style={styles.reviewValue}>{new Date().toLocaleString()}</Text>
            </View>
          </View>

          {/* Data Quality & Conditions */}
          <View style={[createNeumorphicCard(), styles.card]}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="list" size={20} color={Colors.primary} />
              <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, marginLeft: 8 }]}>
                Reading Details
              </Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Gauge Visibility:</Text>
              <Text style={styles.reviewValue}>{gaugeVisibility.charAt(0).toUpperCase() + gaugeVisibility.slice(1)}</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Lighting Conditions:</Text>
              <Text style={styles.reviewValue}>{lightingConditions.charAt(0).toUpperCase() + lightingConditions.slice(1)}</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Weather:</Text>
              <Text style={styles.reviewValue}>{weatherConditions}</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Image Quality:</Text>
              <Text style={styles.reviewValue}>{imageQualityScore}/10</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Reading Method:</Text>
              <Text style={styles.reviewValue}>{readingMethod === 'photo_analysis' ? 'Photo Analysis' : 'Manual Override'}</Text>
            </View>

            <View style={styles.reviewDetailRow}>
              <Text style={styles.reviewLabel}>Manual Override:</Text>
              <Text style={styles.reviewValue}>{manualOverride ? 'Yes' : 'No'}</Text>
            </View>

            {manualOverride && manualOverrideReason && (
              <View style={[styles.reviewDetailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.reviewLabel}>Override Reason:</Text>
                <Text style={[styles.reviewValue, { marginTop: 4, textAlign: 'left' }]}>{manualOverrideReason}</Text>
              </View>
            )}

            {notes && (
              <View style={[styles.reviewDetailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.reviewLabel}>Additional Notes:</Text>
                <Text style={[styles.reviewValue, { marginTop: 4, textAlign: 'left' }]}>{notes}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[createNeumorphicCard(), styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={onSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white, marginLeft: 8 }]}>
                  Submit Reading
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryButtonsRow}>
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.secondaryButton]}
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={18} color={Colors.textPrimary} />
              <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textPrimary, marginLeft: 6 }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[createNeumorphicCard(), styles.secondaryButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textSecondary, marginLeft: 6 }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  siteDetails: {
    marginTop: 8,
  },
  siteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  siteInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  siteLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  siteRiver: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  siteDistance: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
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
  predictionComparisonBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  predictionValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginRight: 16,
  },
  adjustmentLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  adjustmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  validationInfo: {
    marginTop: 16,
    gap: 12,
  },
  validationItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  validationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationContent: {
    flex: 1,
  },
  validationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  validationDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  reviewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  reviewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default ReviewReadingScreen;