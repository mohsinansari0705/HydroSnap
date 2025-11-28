import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

const { width: screenWidth } = Dimensions.get('window');

interface SubmissionSuccessPopupProps {
  visible: boolean;
  siteId: string;
  siteName: string;
  waterLevel: number;
  readingId: string;
  onContinue: () => void;
}

const SubmissionSuccessPopup: React.FC<SubmissionSuccessPopupProps> = ({
  visible,
  siteId,
  siteName,
  waterLevel,
  readingId,
  onContinue,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <View style={[createNeumorphicCard(), styles.modal]}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          </View>
          
          {/* Title */}
          <Text style={[NeumorphicTextStyles.heading, styles.title]}>
            Reading Submitted Successfully!
          </Text>
          
          {/* Description */}
          <Text style={[NeumorphicTextStyles.body, styles.description]}>
            Your water level reading has been saved to the database and the photo has been uploaded successfully.
          </Text>
          
          {/* Reading Details */}
          <View style={[createNeumorphicCard({ depressed: true }), styles.detailsCard]}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Site:</Text>
              <Text style={styles.detailValue}>{siteName}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Site ID:</Text>
              <Text style={styles.detailValue}>{siteId}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Water Level:</Text>
              <Text style={[styles.detailValue, styles.waterLevelValue]}>
                {waterLevel}cm
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reading ID:</Text>
              <Text style={[styles.detailValue, styles.readingIdValue]}>
                {readingId.slice(0, 8)}...
              </Text>
            </View>
          </View>
          
          {/* Continue Button */}
          <TouchableOpacity
            style={[createNeumorphicCard(), styles.continueButton]}
            onPress={onContinue}
          >
            <Ionicons name="home" size={20} color={Colors.white} style={styles.buttonIcon} />
            <Text style={[NeumorphicTextStyles.buttonPrimary, styles.buttonText]}>
              Go to Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.success}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  waterLevelValue: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  readingIdValue: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  continueButton: {
    width: '100%',
    backgroundColor: Colors.success,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubmissionSuccessPopup;