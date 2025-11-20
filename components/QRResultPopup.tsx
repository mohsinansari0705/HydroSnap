import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { ValidatedSiteData } from '../services/qrValidationService';

const { width: screenWidth } = Dimensions.get('window');

interface QRResultPopupProps {
  visible: boolean;
  onClose: () => void;
  onProceedToCamera: () => void;
  siteData: ValidatedSiteData | null;
  distance: number | null;
  isInRange: boolean;
  validationMessage: string;
}

// SVG-style icons as React components
const CheckIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.checkIcon, { borderColor: color }]}>
      <Text style={[styles.checkText, { color }]}>✓</Text>
    </View>
  </View>
);

const CrossIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.crossIcon, { borderColor: color }]}>
      <Text style={[styles.crossText, { color }]}>✕</Text>
    </View>
  </View>
);

const LocationIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.smallIcon, { width: size, height: size }]}>
    <View style={[styles.locationDot, { backgroundColor: color }]} />
  </View>
);

const WaterIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.smallIcon, { width: size, height: size }]}>
    <View style={[styles.waterIcon, { borderColor: color }]} />
  </View>
);

const RadiusIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.smallIcon, { width: size, height: size }]}>
    <View style={[styles.radiusIcon, { borderColor: color }]} />
  </View>
);

export const QRResultPopup: React.FC<QRResultPopupProps> = ({
  visible,
  onClose,
  onProceedToCamera,
  siteData,
  distance,
  isInRange,
  validationMessage,
}) => {
  if (!siteData) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[createNeumorphicCard(), styles.popupContainer]}>
            <View style={styles.header}>
              <Text style={[NeumorphicTextStyles.heading, styles.headerTitle]}>
                QR Code Result
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <CrossIcon color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.content}>
              <Text style={[NeumorphicTextStyles.body, styles.errorText]}>
                {validationMessage}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[NeumorphicTextStyles.buttonSecondary, styles.buttonText]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[createNeumorphicCard(), styles.popupContainer]}>
          <View style={styles.header}>
            <Text style={[NeumorphicTextStyles.heading, styles.headerTitle]}>
              Site Information
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CrossIcon color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Site Basic Info */}
            <View style={[createNeumorphicCard(), styles.infoSection]}>
              <Text style={[NeumorphicTextStyles.subheading, styles.sectionTitle]}>
                Site Details
              </Text>
              
              <View style={styles.infoRow}>
                <LocationIcon color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[NeumorphicTextStyles.caption, styles.infoLabel]}>Site ID</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.infoValue]}>{siteData.siteId}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <LocationIcon color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[NeumorphicTextStyles.caption, styles.infoLabel]}>Name</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.infoValue]}>{siteData.name}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <LocationIcon color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[NeumorphicTextStyles.caption, styles.infoLabel]}>Location</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.infoValue]}>{siteData.location || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <LocationIcon color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[NeumorphicTextStyles.caption, styles.infoLabel]}>Coordinates</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.infoValue]}>
                    {siteData.coordinates.lat.toFixed(6)}, {siteData.coordinates.lng.toFixed(6)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Water Levels */}
            <View style={[createNeumorphicCard(), styles.infoSection]}>
              <Text style={[NeumorphicTextStyles.subheading, styles.sectionTitle]}>
                Water Levels
              </Text>
              
              <View style={styles.levelsContainer}>
                <View style={styles.levelItem}>
                  <WaterIcon color={Colors.success} />
                  <Text style={[NeumorphicTextStyles.caption, styles.levelLabel]}>Safe</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.levelValue]}>
                    {siteData.levels?.safe ? `${siteData.levels.safe}m` : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.levelItem}>
                  <WaterIcon color={Colors.warning} />
                  <Text style={[NeumorphicTextStyles.caption, styles.levelLabel]}>Warning</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.levelValue]}>
                    {siteData.levels?.warning ? `${siteData.levels.warning}m` : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.levelItem}>
                  <WaterIcon color={Colors.danger} />
                  <Text style={[NeumorphicTextStyles.caption, styles.levelLabel]}>Danger</Text>
                  <Text style={[NeumorphicTextStyles.body, styles.levelValue]}>
                    {siteData.levels?.danger ? `${siteData.levels.danger}m` : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Geofence Status */}
            <View style={[
              createNeumorphicCard(), 
              styles.geofenceSection,
              isInRange ? styles.geofenceInRange : styles.geofenceOutOfRange
            ]}>
              <View style={styles.geofenceHeader}>
                {isInRange ? (
                  <CheckIcon color={Colors.success} size={32} />
                ) : (
                  <CrossIcon color={Colors.danger} size={32} />
                )}
                <Text style={[
                  NeumorphicTextStyles.subheading, 
                  styles.geofenceTitle,
                  { color: isInRange ? Colors.success : Colors.danger }
                ]}>
                  {isInRange ? 'In Range' : 'Out of Range'}
                </Text>
              </View>
              
              <View style={styles.geofenceDetails}>
                <View style={styles.geofenceRow}>
                  <RadiusIcon color={Colors.textSecondary} />
                  <Text style={[NeumorphicTextStyles.caption, styles.geofenceLabel]}>
                    Required Distance
                  </Text>
                  <Text style={[NeumorphicTextStyles.body, styles.geofenceValue]}>
                    {siteData.geofenceRadius || 0}m
                  </Text>
                </View>
                
                {distance !== null && (
                  <View style={styles.geofenceRow}>
                    <LocationIcon color={Colors.textSecondary} />
                    <Text style={[NeumorphicTextStyles.caption, styles.geofenceLabel]}>
                      Your Distance
                    </Text>
                    <Text style={[NeumorphicTextStyles.body, styles.geofenceValue]}>
                      {Math.round(distance)}m
                    </Text>
                  </View>
                )}
              </View>
              
              {!isInRange && (
                <Text style={[NeumorphicTextStyles.caption, styles.geofenceMessage]}>
                  Move closer to the site to take readings
                </Text>
              )}
            </View>
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[NeumorphicTextStyles.buttonSecondary, styles.buttonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                createNeumorphicCard(), 
                styles.button, 
                isInRange ? styles.proceedButton : styles.disabledButton
              ]}
              onPress={isInRange ? onProceedToCamera : undefined}
              disabled={!isInRange}
            >
              <Text style={[
                NeumorphicTextStyles.buttonPrimary, 
                styles.buttonText,
                !isInRange && styles.disabledButtonText
              ]}>
                Take Reading
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    width: screenWidth * 0.9,
    maxHeight: '80%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    maxHeight: 400,
  },
  content: {
    marginBottom: 20,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    marginVertical: 20,
  },
  infoSection: {
    backgroundColor: Colors.backgroundTertiary,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    marginBottom: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  levelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  levelLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  levelValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  geofenceSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  geofenceInRange: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success + '30',
  },
  geofenceOutOfRange: {
    backgroundColor: Colors.danger + '10',
    borderColor: Colors.danger + '30',
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  geofenceTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  geofenceDetails: {
    marginBottom: 8,
  },
  geofenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  geofenceLabel: {
    flex: 1,
    marginLeft: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  geofenceValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  geofenceMessage: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.backgroundTertiary,
  },
  proceedButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary + '20',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: Colors.textSecondary,
  },
  // Icon styles
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  crossIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  crossText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  smallIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  waterIcon: {
    width: 12,
    height: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  radiusIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
});