/**
 * Modern Neumorphic/Soft UI Style Utilities for HydroSnap
 * Enhanced reusable style functions for consistent modern design
 */

import { ViewStyle, TextStyle } from 'react-native';
import { Colors } from './colors';

export interface NeumorphicStyleOptions {
  size?: 'small' | 'medium' | 'large';
  pressed?: boolean;
  elevated?: boolean;
  depressed?: boolean;
  borderRadius?: number;
  gradient?: boolean;
}

/**
 * Creates a modern neumorphic card style with subtle shadows
 */
export const createNeumorphicCard = (options: NeumorphicStyleOptions = {}): ViewStyle => {
  const { size = 'medium', pressed = false, elevated = false, depressed = false, borderRadius } = options;
  
  // Modern shadow distances - more subtle
  const shadowDistance = {
    small: 2,
    medium: 4,
    large: 6,
  };
  
  const elevation = {
    small: 2,
    medium: 4,
    large: 8,
  };
  
  const distance = shadowDistance[size];
  const cardElevation = elevation[size];
  const radius = borderRadius || (size === 'small' ? 8 : size === 'medium' ? 12 : 16);
  
  if (pressed || depressed) {
    // Modern inset effect with minimal shadows
    return {
      backgroundColor: Colors.cardBackground,
      borderRadius: radius,
      shadowColor: Colors.darkShadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 0,
      // Subtle border for definition
      borderWidth: 0.5,
      borderColor: Colors.border,
    };
  }
  
  // Modern elevated card with clean shadows
  return {
    backgroundColor: Colors.cardBackground,
    borderRadius: radius,
    shadowColor: Colors.darkShadow,
    shadowOffset: { width: distance, height: distance },
    shadowOpacity: 0.15,
    shadowRadius: distance * 1.5,
    elevation: elevated ? cardElevation : cardElevation / 2,
    // Add light shadow simulation with a subtle border
    borderWidth: 0.5,
    borderColor: Colors.lightShadow,
  };
};

/**
 * Creates a neumorphic button style
 */
export const createNeumorphicButton = (
  variant: 'primary' | 'secondary' | 'success' | 'danger' = 'primary',
  options: NeumorphicStyleOptions = {}
): ViewStyle => {
  const { size = 'medium', pressed = false } = options;
  
  const baseStyle = createNeumorphicCard({ ...options, elevated: true });
  
  const variants = {
    primary: {
      backgroundColor: Colors.deepSecurityBlue,
      shadowColor: Colors.deepSecurityBlue + '40',
    },
    secondary: {
      backgroundColor: Colors.aquaTechBlue,
      shadowColor: Colors.aquaTechBlue + '40',
    },
    success: {
      backgroundColor: Colors.validationGreen,
      shadowColor: Colors.validationGreen + '40',
    },
    danger: {
      backgroundColor: Colors.alertRed,
      shadowColor: Colors.alertRed + '40',
    },
  };
  
  const variantStyle = variants[variant];
  
  if (pressed) {
    return {
      ...baseStyle,
      ...variantStyle,
      shadowOpacity: 0.1,
      shadowOffset: { width: 2, height: 2 },
      elevation: 1,
      transform: [{ translateY: 1 }],
    };
  }
  
  return {
    ...baseStyle,
    ...variantStyle,
    shadowOpacity: 0.25,
    elevation: size === 'small' ? 3 : size === 'medium' ? 4 : 6,
  };
};

/**
 * Creates a neumorphic input field style
 */
export const createNeumorphicInput = (options: NeumorphicStyleOptions = {}): ViewStyle => {
  const { borderRadius } = options;
  
  return createNeumorphicCard({
    ...options,
    depressed: true, // Inputs should appear inset
    borderRadius: borderRadius || 12,
  });
};

/**
 * Text styles for neumorphic components
 */
export const NeumorphicTextStyles = {
  heading: {
    color: Colors.textPrimary,
    fontWeight: '700' as const,
    fontSize: 24,
    letterSpacing: -0.5,
  } as TextStyle,
  
  subheading: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
    fontSize: 18,
    letterSpacing: -0.25,
  } as TextStyle,
  
  body: {
    color: Colors.textPrimary,
    fontWeight: '400' as const,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,
  
  bodySecondary: {
    color: Colors.textSecondary,
    fontWeight: '400' as const,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
  
  buttonPrimary: {
    color: Colors.textOnDark,
    fontWeight: '600' as const,
    fontSize: 16,
    textAlign: 'center' as const,
  } as TextStyle,
  
  buttonSecondary: {
    color: Colors.textOnDark,
    fontWeight: '500' as const,
    fontSize: 16,
    textAlign: 'center' as const,
  } as TextStyle,
  
  caption: {
    color: Colors.textLight,
    fontWeight: '400' as const,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
};

/**
 * Gradient configurations for neumorphic components
 */
export const NeumorphicGradients = {
  primary: [Colors.primaryGradientStart, Colors.primaryGradientEnd],
  secondary: [Colors.aquaTechBlue, Colors.secondary + 'DD'],
  surface: [Colors.lightShadow, Colors.cardBackground],
  success: [Colors.validationGreen, Colors.validationGreen + 'CC'],
  danger: [Colors.alertRed, Colors.alertRed + 'CC'],
};

/**
 * Common spacing and sizing constants for neumorphic design
 */
export const NeumorphicSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const NeumorphicBorderRadius = {
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
  round: 50,
};

/**
 * Helper function to create consistent spacing
 */
export const createSpacing = (multiplier: number) => NeumorphicSpacing.md * multiplier;

/**
 * Helper function to create icon container styles
 */
export const createNeumorphicIconContainer = (size: number = 40): ViewStyle => ({
  ...createNeumorphicCard({ size: 'small', borderRadius: size / 2 }),
  width: size,
  height: size,
  justifyContent: 'center',
  alignItems: 'center',
});