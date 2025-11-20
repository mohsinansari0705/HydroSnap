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
import { QRScannerPopup } from './QRScannerPopup';
import { QRResultPopup } from './QRResultPopup';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { 
  validateQRCode, 
  ValidatedSiteData, 
  isValidQRFormat 
} from '../services/qrValidationService';

interface QRValidationScreenProps {
  userLocation: { latitude: number; longitude: number };
  onSiteValidated: (siteData: ValidatedSiteData, distance: number) => void;
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
  const [showScanner, setShowScanner] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [validatedSiteData, setValidatedSiteData] = useState<ValidatedSiteData | null>(null);
  const [siteDistance, setSiteDistance] = useState<number | null>(null);
  const [isInRange, setIsInRange] = useState(false);

  const handleQRScanned = (scannedData: string) => {
    console.log('📱 QR Code scanned successfully!');
    console.log('📊 Data length:', scannedData.length);
    console.log('🔍 Data preview:', scannedData.substring(0, 50) + '...');
    console.log('🔐 Is encrypted?', scannedData.startsWith('gAAAAA'));
    
    // Show the actual scanned QR code data in the input field
    setQrInput(scannedData);
    handleValidateQR(scannedData);
  };

  const handleValidateQR = async (qrData: string) => {
    if (!qrData.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid QR code.');
      return;
    }

    console.log('🔍 Starting QR validation process...');
    console.log('📊 QR Data Length:', qrData.length);
    console.log('🔐 Is Encrypted:', qrData.startsWith('gAAAAA'));

    const isValid = await isValidQRFormat(qrData);
    if (!isValid) {
      console.error('❌ QR format validation failed');
      Alert.alert(
        'Invalid QR Code Format', 
        'This QR code does not contain valid monitoring site data. Please scan a valid monitoring site QR code.'
      );
      return;
    }

    console.log('✅ QR format is valid, proceeding with site validation...');
    setIsValidating(true);
    setValidationMessage('🔐 Decrypting and validating site data...');

    try {
      const result = await validateQRCode(qrData, userLocation);
      
      if (result.siteData) {
        // Always show the popup with site data, regardless of validation success
        setValidatedSiteData(result.siteData);
        setSiteDistance(result.distance || null);
        setIsInRange(result.success);
        setValidationMessage(result.message);
        setShowResultPopup(true);
      } else {
        // Show error in popup
        setValidatedSiteData(null);
        setSiteDistance(null);
        setIsInRange(false);
        setValidationMessage(result.message);
        setShowResultPopup(true);
      }
    } catch (error) {
      setValidationMessage('Failed to validate QR code. Please try again.');
      setValidatedSiteData(null);
      setSiteDistance(null);
      setIsInRange(false);
      setShowResultPopup(true);
    } finally {
      setIsValidating(false);
    }
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
            placeholder="Enter QR Code (e.g., QR-YMN-DI-001)"
            value={qrInput}
            onChangeText={setQrInput}
            autoCapitalize="characters"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              createNeumorphicCard(),
              styles.scanButton,
            ]}
            onPress={() => setShowScanner(true)}
          >
            <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white }]}>
              Scan QR Code
            </Text>
          </TouchableOpacity>
          
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
        </View>

        {validationMessage ? (
          <View style={styles.messageContainer}>
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
              {validationMessage}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Quick Test removed for production flow - only manual QR entry and validation allowed */}

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
          Location services active
        </Text>
      </View>

      <QRScannerPopup
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onQRScanned={handleQRScanned}
      />
      
      <QRResultPopup
        visible={showResultPopup}
        onClose={() => {
          setShowResultPopup(false);
          setValidationMessage('');
        }}
        onProceedToCamera={() => {
          if (validatedSiteData && siteDistance !== null) {
            console.log('User confirmed site details, proceeding to camera...');
            onSiteValidated(validatedSiteData, siteDistance);
            setShowResultPopup(false);
          }
        }}
        siteData={validatedSiteData}
        distance={siteDistance}
        isInRange={isInRange}
        validationMessage={validationMessage}
      />
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  scanButton: {
    flex: 1,
    backgroundColor: Colors.aquaTechBlue,
    padding: 16,
    alignItems: 'center',
  },
  validateButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  messageContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },

});