import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard } from '../lib/neumorphicStyles';
import { Ionicons } from '@expo/vector-icons';

interface ProfilePhotoPickerProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onRemovePhoto?: () => void;
  hasExistingPhoto?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfilePhotoPicker({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
  onRemovePhoto,
  hasExistingPhoto = false,
}: ProfilePhotoPickerProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />
          
          <Text style={styles.title}>Profile Photo</Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.option, createNeumorphicCard()]}
              onPress={() => handleAction(onTakePhoto)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.aquaTechBlue }]}>
                <Ionicons name="camera" size={24} color={Colors.white} />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, createNeumorphicCard()]}
              onPress={() => handleAction(onChooseFromLibrary)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.deepSecurityBlue }]}>
                <Ionicons name="images" size={24} color={Colors.white} />
              </View>
              <Text style={styles.optionText}>Choose from Library</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {hasExistingPhoto && onRemovePhoto && (
              <TouchableOpacity
                style={[styles.option, createNeumorphicCard()]}
                onPress={() => handleAction(onRemovePhoto)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: Colors.alertRed }]}>
                  <Ionicons name="trash" size={24} color={Colors.white} />
                </View>
                <Text style={[styles.optionText, { color: Colors.alertRed }]}>Remove Photo</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textSecondary + '40',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.cardBackground,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
