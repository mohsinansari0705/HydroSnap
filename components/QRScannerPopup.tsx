import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface QRScannerPopupProps {
  visible: boolean;
  onClose: () => void;
  onQRScanned: (qrData: string) => void;
}

export const QRScannerPopup: React.FC<QRScannerPopupProps> = ({
  visible,
  onClose,
  onQRScanned,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkCameraPermissions = async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    if (visible) {
      checkCameraPermissions();
      setScanned(false); // Reset scanned state when popup opens
      
      // Start corner animation with more intensity
      const animateCorners = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.9,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      
      animateCorners();
    } else {
      // Stop animation when popup closes
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
    }
  }, [visible, scaleAnim]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return; // Prevent multiple scans
    
    setScanned(true);
    console.log('📷 QR Code scanned in popup');
    console.log('📷 Closing scanner popup and passing data to parent');
    
    // Close the popup and pass the data
    onClose();
    onQRScanned(data);
  };

  const handleClose = () => {
    setScanned(false);
    onClose();
  };

  if (hasPermission === null) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[createNeumorphicCard(), styles.permissionContainer]}>
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
              Camera Permission Required
            </Text>
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8 }]}>
              Please allow camera access to scan QR codes.
            </Text>
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.permissionButton]}
              onPress={handleClose}
            >
              <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textPrimary }]}>
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
        <View style={styles.cameraContainer}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.closeButton]}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Camera view */}
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            
            {/* Overlay positioned absolutely over camera */}
            <View style={styles.overlay}>
              {/* Scanning frame */}
              <View style={styles.scanFrame}>
                <Animated.View style={[styles.corner, styles.topLeft, { transform: [{ scale: scaleAnim }] }]} />
                <Animated.View style={[styles.corner, styles.topRight, { transform: [{ scale: scaleAnim }] }]} />
                <Animated.View style={[styles.corner, styles.bottomLeft, { transform: [{ scale: scaleAnim }] }]} />
                <Animated.View style={[styles.corner, styles.bottomRight, { transform: [{ scale: scaleAnim }] }]} />
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                  Position the QR code within the frame
                </Text>
                <Text style={styles.subInstructionText}>
                  The code will be scanned automatically
                </Text>
              </View>
            </View>
          </View>

          {/* Manual input fallback */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.manualButton]}
              onPress={() => {
                handleClose();
                // Could emit a signal to show manual input instead
              }}
            >
              <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textPrimary }]}>
                Enter Manually Instead
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.8,
    backgroundColor: Colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    ...createNeumorphicCard(),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.cardBackground,
  },
  headerTitle: {
    ...NeumorphicTextStyles.subheading,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraWrapper: {
    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.aquaTechBlue,
    borderWidth: 8,
    borderRadius: 10
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subInstructionText: {
    color: Colors.white,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.cardBackground,
  },
  manualButton: {
    backgroundColor: Colors.background,
    padding: 12,
    alignItems: 'center',
  },
  permissionContainer: {
    width: screenWidth * 0.8,
    padding: 30,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  permissionButton: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 30,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: 'center',
  },
});