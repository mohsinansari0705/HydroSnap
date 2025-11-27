import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { LocationMonitorWidget } from './LocationMonitorWidget';

interface RealCameraProps {
  onPhotoTaken: (photoUri: string) => void;
  onCancel: () => void;
}

export const RealCamera: React.FC<RealCameraProps> = ({ onPhotoTaken, onCancel }) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const cameraRef = useRef<CameraView>(null);
  
  // Animation values for corner scanning effect
  const cornerAnim1 = useRef(new Animated.Value(0)).current;
  const cornerAnim2 = useRef(new Animated.Value(0)).current;
  const cornerAnim3 = useRef(new Animated.Value(0)).current;
  const cornerAnim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Request media library permission on mount
    if (!mediaLibraryPermission?.granted) {
      requestMediaLibraryPermission();
    }
    
    // Start corner animations
    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    const animations = [
      createPulseAnimation(cornerAnim1, 0),
      createPulseAnimation(cornerAnim2, 375),
      createPulseAnimation(cornerAnim3, 750),
      createPulseAnimation(cornerAnim4, 1125),
    ];
    
    animations.forEach(anim => anim.start());
    
    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      if (photo) {
        // Save to media library if permission is granted
        if (mediaLibraryPermission?.granted) {
          const asset = await MediaLibrary.createAssetAsync(photo.uri);
          await MediaLibrary.createAlbumAsync('HydroSnap', asset, false);
        }

        setCapturedPhotoUri(photo.uri);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'off';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash';
      default: return 'flash-off';
    }
  };

  const handleRetake = () => {
    setShowPreviewModal(false);
    setCapturedPhotoUri(null);
    setIsCapturing(false);
  };

  const handleUsePhoto = () => {
    if (capturedPhotoUri) {
      setShowPreviewModal(false);
      onPhotoTaken(capturedPhotoUri);
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, marginTop: 20 }]}>
            Loading camera...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <View style={[createNeumorphicCard(), styles.permissionContainer]}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={64} color={Colors.primary} />
          </View>
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary, textAlign: 'center', marginTop: 20 }]}>
            Camera Permission Required
          </Text>
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 16, paddingHorizontal: 20 }]}>
            We need access to your camera to capture gauge readings. This is essential for the water level measurement process.
          </Text>
          <TouchableOpacity
            style={[createNeumorphicCard(), styles.permissionButton]}
            onPress={requestPermission}
          >
            <Ionicons name="camera" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.primary }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        enableTorch={flashMode === 'on'}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          {/* Header with gradient background */}
          <View style={styles.header}>
              <View style={styles.headerContent}>
                <MaterialCommunityIcons name="water" size={24} color="#fff" />
                <Text style={styles.headerTitle}>Capture Gauge Reading</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={() => setShowTipsModal(true)}
                >
                  <Ionicons name="information-circle" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location Monitor Widget - Small Popup */}
            <View style={styles.locationWidgetContainer}>
              <LocationMonitorWidget compact={true} />
            </View>

          {/* Scanning Frame with Animated Corners */}
          <View style={styles.scanningArea}>
            <View style={styles.frameGuide}>
              {/* Animated Corner Indicators */}
              <Animated.View 
                style={[
                  styles.corner, 
                  styles.topLeft,
                  {
                    opacity: cornerAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.corner, 
                  styles.topRight,
                  {
                    opacity: cornerAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.corner, 
                  styles.bottomLeft,
                  {
                    opacity: cornerAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.corner, 
                  styles.bottomRight,
                  {
                    opacity: cornerAnim4.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }
                ]} 
              />
              
              {/* Center Grid */}
              <View style={styles.gridOverlay}>
                <View style={styles.gridLine} />
                <View style={[styles.gridLine, styles.gridLineVertical]} />
              </View>
            </View>
            
            <View style={styles.instructionContainer}>
              <View style={styles.instructionBadge}>
                <MaterialCommunityIcons name="target" size={16} color="#fff" />
                <Text style={styles.instruction}>
                  Align gauge within frame
                </Text>
              </View>
            </View>
          </View>

          {/* Camera Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.captureButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    isCapturing && styles.capturingButton
                  ]}
                  onPress={capturePhoto}
                  disabled={isCapturing}
                  activeOpacity={0.8}
                >
                  {isCapturing ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <View style={styles.captureButtonInner}>
                      <Ionicons name="camera" size={32} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.captureText}>
                  {isCapturing ? 'Processing...' : 'Capture'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.flashButton,
                  flashMode !== 'off' && styles.flashButtonActive
                ]}
                onPress={toggleFlash}
              >
                <Ionicons name={getFlashIcon()} size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CameraView>

        {/* Tips Modal */}
      <Modal
        visible={showTipsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[createNeumorphicCard(), styles.tipsModal]}>
            <View style={styles.tipsHeader}>
              <View style={styles.tipsIconContainer}>
                <Ionicons name="bulb" size={28} color={Colors.primary} />
              </View>
              <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary }]}>
                Photo Capture Tips
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowTipsModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tipsContent}>
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="locate" size={20} color={Colors.primary} />
                </View>
                <Text style={[NeumorphicTextStyles.body, styles.tipText]}>
                  Keep the gauge meter centered in the frame
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="sunny" size={20} color={Colors.warning} />
                </View>
                <Text style={[NeumorphicTextStyles.body, styles.tipText]}>
                  Ensure good lighting for clear visibility
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <MaterialCommunityIcons name="hand-okay" size={20} color={Colors.success} />
                </View>
                <Text style={[NeumorphicTextStyles.body, styles.tipText]}>
                  Hold the device steady while capturing
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <MaterialCommunityIcons name="water-check" size={20} color={Colors.info} />
                </View>
                <Text style={[NeumorphicTextStyles.body, styles.tipText]}>
                  Make sure the water level mark is clearly visible
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[createNeumorphicCard(), styles.gotItButton]}
              onPress={() => setShowTipsModal(false)}
            >
              <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.primary }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={handleRetake}
      >
        <View style={styles.previewModalOverlay}>
          <View style={[createNeumorphicCard(), styles.previewModal]}>
            <View style={styles.previewHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              </View>
              <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary, marginTop: 12 }]}>
                Photo Captured Successfully
              </Text>
              <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                Review your photo before proceeding
              </Text>
            </View>
            
            {capturedPhotoUri && (
              <View style={styles.previewImageContainer}>
                <Image 
                  source={{ uri: capturedPhotoUri }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            )}
            
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[createNeumorphicCard(), styles.retakeButton]}
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
                <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textSecondary, marginLeft: 8 }]}>
                  Retake
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[createNeumorphicCard(), styles.usePhotoButton]}
                onPress={handleUsePhoto}
              >
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
                <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.primary, marginLeft: 8 }]}>
                  Use Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  locationWidgetContainer: {
    position: 'absolute',
    top: 85,
    left: 30,
    right: 30,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  frameGuide: {
    width: 320,
    height: 420,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 5,
    borderRadius: 6,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  gridOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  instructionContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 8,
  },
  instruction: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  controlsContainer: {
    paddingBottom: 18,
    paddingTop: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flashButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flashButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderColor: 'rgba(255,215,0,0.6)',
  },
  captureButtonContainer: {
    alignItems: 'center',
    gap: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  capturingButton: {
    backgroundColor: Colors.primary,
  },
  captureButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    padding: 40,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 20,
    padding: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tipsModal: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  tipsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  tipsContent: {
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  gotItButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewModal: {
    width: '100%',
    maxWidth: 450,
    padding: 24,
    borderRadius: 20,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  usePhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: `${Colors.primary}15`,
  },
});