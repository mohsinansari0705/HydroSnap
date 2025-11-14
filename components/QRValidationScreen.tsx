import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { 
  validateQRCode, 
  ValidatedSiteData, 
  MOCK_QR_CODES,
  isValidQRFormat 
} from '../services/qrValidationService';

interface QRValidationScreenProps {
  userLocation: { latitude: number; longitude: number };
  onSiteValidated: (siteData: ValidatedSiteData) => void;
  onCancel: () => void;
}

export const QRValidationScreen: React.FC<QRValidationScreenProps> = ({
  userLocation,
  onSiteValidated,
  onCancel,
}) => {
  const [qrInput, setQrInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const handleValidateQR = async (qrData: string) => {
    if (!qrData.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid QR code.');
      return;
    }

    if (!isValidQRFormat(qrData)) {
      Alert.alert('Invalid Format', 'QR code format is invalid. Expected format: QR-XXX-XXX-000');
      return;
    }

    setIsValidating(true);
    setValidationMessage('Validating site...');

    try {
      const result = await validateQRCode(qrData, userLocation);
      
      if (result.success && result.siteData) {
        setValidationMessage(`✅ Site validated! Distance: ${result.distance}m`);
        
        Alert.alert(
          'Site Validated Successfully! ✅',
          `${result.siteData.name}\n${result.siteData.location}, ${result.siteData.state}\n\nRiver: ${result.siteData.riverName}\nDistance: ${result.distance}m from site\n\nSafe Level: ${result.siteData.levels.safe}cm\nWarning Level: ${result.siteData.levels.warning}cm\nDanger Level: ${result.siteData.levels.danger}cm`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Take Reading',
              onPress: () => onSiteValidated(result.siteData!)
            }
          ]
        );
      } else {
        setValidationMessage(`❌ ${result.message}`);
        Alert.alert('Validation Failed', result.message);
      }
    } catch (error) {
      setValidationMessage('❌ Validation failed');
      Alert.alert('Error', 'Failed to validate QR code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleQuickSelect = (qrCode: string) => {
    setQrInput(qrCode);
    handleValidateQR(qrCode);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
          QR Code Validation
        </Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[createNeumorphicCard(), styles.card]}>
        <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
          Scan or Enter QR Code
        </Text>
        <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8 }]}>
          Enter the QR code from the monitoring site to validate your location and take readings.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[createNeumorphicCard({ depressed: true }), styles.input]}
            placeholder="Enter QR Code (e.g., QR-YMN-DEL-002)"
            value={qrInput}
            onChangeText={setQrInput}
            autoCapitalize="characters"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[
            createNeumorphicCard(),
            styles.validateButton,
            { backgroundColor: isValidating ? Colors.cardBackground : Colors.primary }
          ]}
          onPress={() => handleValidateQR(qrInput)}
          disabled={isValidating}
        >
          <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
            {isValidating ? 'Validating...' : 'Validate QR Code'}
          </Text>
        </TouchableOpacity>

        {validationMessage ? (
          <View style={styles.messageContainer}>
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
              {validationMessage}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[createNeumorphicCard(), styles.card]}>
        <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
          Quick Test (Development)
        </Text>
        <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginBottom: 16 }]}>
          Tap on a QR code to test validation:
        </Text>

        {MOCK_QR_CODES.map((qrCode) => (
          <TouchableOpacity
            key={qrCode}
            style={[createNeumorphicCard({ depressed: true }), styles.quickButton]}
            onPress={() => handleQuickSelect(qrCode)}
          >
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textPrimary }]}>
              {qrCode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[createNeumorphicCard(), styles.card]}>
        <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
          Your Location
        </Text>
        <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
          Lat: {userLocation.latitude.toFixed(6)}
        </Text>
        <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
          Lng: {userLocation.longitude.toFixed(6)}
        </Text>
        <Text style={[NeumorphicTextStyles.caption, { color: Colors.validationGreen, marginTop: 8 }]}>
          ✓ Location services active
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...createNeumorphicCard(),
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginVertical: 20,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: 12,
    minHeight: 50,
  },
  validateButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  messageContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  quickButton: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
});