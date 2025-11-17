import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface RealCameraProps {
  onPhotoTaken: (photoUri: string) => void;
  onCancel: () => void;
}

export const RealCamera: React.FC<RealCameraProps> = ({ onPhotoTaken, onCancel }) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Request media library permission on mount
    if (!mediaLibraryPermission?.granted) {
      requestMediaLibraryPermission();
    }
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

        Alert.alert(
          'Photo Captured! 📸',
          'Gauge photo has been captured successfully. The system will process this image to calculate the water level.',
          [
            { text: 'Retake', onPress: () => setIsCapturing(false) },
            { text: 'Use Photo', onPress: () => onPhotoTaken(photo.uri) }
          ]
        );
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
          <Text style={[NeumorphicTextStyles.heading, { color: Colors.textPrimary, textAlign: 'center' }]}>
            📸 Camera Permission Required
          </Text>
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: 16 }]}>
            We need access to your camera to capture gauge readings. This is essential for the water level measurement process.
          </Text>
          <TouchableOpacity
            style={[createNeumorphicCard(), styles.permissionButton]}
            onPress={requestPermission}
          >
            <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.primary }]}>
              Grant Camera Permission
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
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={[NeumorphicTextStyles.heading, { color: Colors.white }]}>
              Capture Gauge Reading
            </Text>
            <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
              <Text style={styles.headerButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Gauge Frame Guide */}
          <View style={styles.gaugeFrame}>
            <View style={styles.frameGuide}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              <View style={styles.centerCrosshair}>
                <View style={styles.horizontalLine} />
                <View style={styles.verticalLine} />
              </View>
            </View>
            
            <Text style={styles.instruction}>
              Position the water gauge meter within the frame
            </Text>
            <Text style={styles.subInstruction}>
              Ensure the water level marking is clearly visible
            </Text>
          </View>

          {/* Camera Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.flipButtonText}>🔄</Text>
            </TouchableOpacity>

            <View style={styles.captureButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  isCapturing && styles.capturingButton
                ]}
                onPress={capturePhoto}
                disabled={isCapturing}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.placeholderButton} />
          </View>

          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing...' : 'Tap to capture'}
          </Text>
        </View>
      </CameraView>

      {/* Information Panel */}
      <View style={[createNeumorphicCard(), styles.infoPanel]}>
        <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary }]}>
          📋 Photo Capture Tips
        </Text>
        <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8 }]}>
          • Keep the gauge meter centered in the frame{'\n'}
          • Ensure good lighting for clear visibility{'\n'}
          • Hold the device steady while capturing{'\n'}
          • Make sure the water level mark is visible
        </Text>
        
        {isCapturing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[NeumorphicTextStyles.body, { color: Colors.primary, marginLeft: 10 }]}>
              📸 Processing image...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gaugeFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  frameGuide: {
    width: 280,
    height: 350,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  centerCrosshair: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalLine: {
    position: 'absolute',
    width: 60,
    height: 2,
    backgroundColor: Colors.primary,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    height: 60,
    backgroundColor: Colors.primary,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subInstruction: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 24,
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
  captureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  infoPanel: {
    margin: 20,
    padding: 20,
  },
  processingIndicator: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    padding: 30,
  },
  permissionButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  cancelButton: {
    marginTop: 20,
    padding: 15,
  },
});