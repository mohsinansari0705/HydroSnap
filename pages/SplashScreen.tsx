import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard } from '../lib/neumorphicStyles';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const { width } = Dimensions.get('window');

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations for modern splash effect
    Animated.sequence([
      // Initial logo animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]),
      // Pulse effect for logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ),
    ]).start();

    // Tagline animation with delay
    setTimeout(() => {
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 8000);

    // Progress bar animation
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    }, 1100);

    // Auto-navigate after animations
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideAnim, pulseAnim, progressAnim, taglineAnim]);

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      
      {/* Main Logo Container */}
      <Animated.View 
        style={[
          styles.logoContainer,
          createNeumorphicCard({ size: 'large', borderRadius: 90 }),
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        {/* Logo Gradient Ring */}
        <View style={styles.logoRing} />
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/icons/HydroSnap_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* App Title and Branding */}
      <Animated.View 
        style={[
          styles.textContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.title}>HydroSnap</Text>
        <Text style={styles.subtitle}>Smart Water Level Monitoring</Text>
        
        {/* Feature Tags */}
        <Animated.View style={[styles.featureContainer, { opacity: taglineAnim }]}>
          <View style={[styles.featureTag, { backgroundColor: Colors.aquaTechBlue + '20' }]}>
            <Text style={[styles.featureText, { color: Colors.aquaTechBlue }]}>Real-time</Text>
          </View>
          <View style={[styles.featureTag, { backgroundColor: Colors.validationGreen + '20' }]}>
            <Text style={[styles.featureText, { color: Colors.validationGreen }]}>Secure</Text>
          </View>
          <View style={[styles.featureTag, { backgroundColor: Colors.deepSecurityBlue + '20' }]}>
            <Text style={[styles.featureText, { color: Colors.deepSecurityBlue }]}>Reliable</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Enhanced Loading Section */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingBar}>
          <Animated.View 
            style={[
              styles.loadingFill, 
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.loadingText}>Initializing secure monitoring...</Text>
      </Animated.View>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v1.0.0 • © GrayCode</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.aquaTechBlue + '09',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: 100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.deepSecurityBlue + '09',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 150,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 100,
    backgroundColor: Colors.pinkAccent + '09',
  },
  logoContainer: {
    width: 180,
    height: 180,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    backgroundColor: Colors.softLightGrey,
    position: 'relative',
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    // Modern rounded rectangle
    transform: [{ rotate: '45deg' }],
    borderWidth: 4,
    borderColor: Colors.aquaTechBlue + '20',
  },
  logoRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: Colors.deepSecurityBlue + '25',
    borderStyle: 'dashed',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.deepSecurityBlue,
    marginBottom: 8,
    letterSpacing: 1.2,
    textShadowColor: Colors.deepSecurityBlue + '20',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  featureTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: width - 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingFill: {
    height: '100%',
    backgroundColor: Colors.deepSecurityBlue,
    borderRadius: 3,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  versionContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;