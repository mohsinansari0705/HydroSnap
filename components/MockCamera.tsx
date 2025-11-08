import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface MockCameraProps {
  onPhotoTaken: (photoUri: string) => void;
  onCancel: () => void;
}

export const MockCamera: React.FC<MockCameraProps> = ({ onPhotoTaken, onCancel }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = () => {
    setIsCapturing(true);
    
    // Simulate camera capture delay
    setTimeout(() => {
      const timestamp = Date.now();
      const mockPhotoUri = `mock://camera/gauge_photo_${timestamp}.jpg`;
      
      setIsCapturing(false);
      
      Alert.alert(
        'Photo Captured! 📸',
        'Gauge photo has been captured successfully. The system will process this image to calculate the water level.',
        [
          { text: 'Retake', onPress: () => {} },
          { text: 'Use Photo', onPress: () => onPhotoTaken(mockPhotoUri) }
        ]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Camera Viewfinder */}
      <View style={styles.viewfinder}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={[NeumorphicTextStyles.heading, { color: Colors.white }]}>
              Capture Gauge Reading
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>✕</Text>
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

          {/* Capture Controls */}
          <View style={styles.controls}>
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
            
            <Text style={styles.captureText}>
              {isCapturing ? 'Capturing...' : 'Tap to capture'}
            </Text>
          </View>
        </View>

        {/* Mock Camera Background */}
        <View style={styles.cameraBackground}>
          <Text style={styles.mockCameraText}>📸 Mock Camera View</Text>
          <Text style={styles.mockCameraSubtext}>
            In production, this would show the real camera feed
          </Text>
          
          {/* Sample gauge meter image for demo */}
          <View style={styles.sampleImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=400&fit=crop' }}
              style={styles.sampleImage}
              resizeMode="cover"
            />
            <Text style={styles.sampleText}>Sample: Water Level Gauge</Text>
          </View>
        </View>
      </View>

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
            <Text style={[NeumorphicTextStyles.body, { color: Colors.primary }]}>
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
  viewfinder: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraBackground: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mockCameraText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mockCameraSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  sampleImageContainer: {
    alignItems: 'center',
  },
  sampleImage: {
    width: 200,
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  sampleText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 8,
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
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
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
  },
  subInstruction: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  captureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    alignItems: 'center',
  },
});