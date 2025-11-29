import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileUpdateSuccessPopupProps {
  visible: boolean;
  onDismiss: () => void;
}

const ProfileUpdateSuccessPopup: React.FC<ProfileUpdateSuccessPopupProps> = ({
  visible,
  onDismiss,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
    return undefined;
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            createNeumorphicCard({ size: 'large', borderRadius: 24 }),
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Success Icon with animated checkmark */}
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.validationGreen} />
          </View>

          {/* Title */}
          <Text style={[NeumorphicTextStyles.heading, styles.title]}>
            Profile Updated!
          </Text>

          {/* Description */}
          <Text style={[NeumorphicTextStyles.body, styles.description]}>
            Your profile has been updated successfully
          </Text>

          {/* Animated checkmark indicator */}
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
            <View style={[styles.indicator, styles.indicatorActive]} />
            <View style={styles.indicator} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    backgroundColor: Colors.cardBackground || Colors.background,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 20,
    zIndex: 9999,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.validationGreen}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontSize: 15,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightShadow,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: Colors.validationGreen,
  },
});

export default ProfileUpdateSuccessPopup;
