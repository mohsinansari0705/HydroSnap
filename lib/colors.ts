/**
 * HydroSnap Color Palette - Modern UI Theme
 * Inspired by the provided app designs with purple/blue gradients and soft aesthetics
 */

export const Colors = {
  // Main Brand Colors (inspired by the purple/blue UI design)
  softLightGrey: '#F5F6FA',     // Primary Base - Light background with slight purple tint
  deepSecurityBlue: '#6366F1',  // Primary Brand - Modern indigo for CTAs, Navigation
  aquaTechBlue: '#8B5CF6',      // Secondary Accent - Purple accent for highlights
  alertRed: '#EF4444',          // Danger/Warning - Modern red for alerts
  validationGreen: '#10B981',   // Success/Safe - Modern green for success states
  darkText: '#1F2937',          // Typography - Darker text for better readability
  
  // Purple gradient colors (matching the UI design)
  purpleStart: '#8B5CF6',       // Purple gradient start
  purpleEnd: '#6366F1',         // Purple gradient end
  pinkAccent: '#EC4899',        // Pink accent for special elements
  
  // Legacy colors for backward compatibility
  primary: '#6366F1',           // Updated to modern indigo
  secondary: '#8B5CF6',         // Updated to purple
  tertiary: '#3B82F6',          // Modern blue
  white: '#FFFFFF',             // Pure white
  background: '#F5F6FA',        // Updated to soft light grey
  
  // Neumorphic Shadow Colors (updated for modern look)
  lightShadow: '#FFFFFF',       // Top/Left shadow for raised effect
  darkShadow: '#E2E5E9',        // Bottom/Right shadow for depth
  insetShadowLight: '#EAECEF',  // Light inset shadow
  insetShadowDark: '#D4D7DB',   // Dark inset shadow
  
  // Card backgrounds with gradient support
  cardBackground: '#FFFFFF',    // White cards with shadows
  cardGradientStart: '#FFFFFF', // Gradient card start
  cardGradientEnd: '#F8FAFC',   // Gradient card end
  
  // Enhanced Gradients for Modern UI
  primaryGradientStart: '#8B5CF6',  // Purple to indigo gradient
  primaryGradientEnd: '#6366F1',
  
  // Status colors (updated to modern palette)
  success: '#10B981',           // Modern emerald green
  warning: '#F59E0B',           // Modern amber
  error: '#EF4444',             // Modern red
  danger: '#EF4444',            // Alias for error
  info: '#3B82F6',             // Modern blue
  
  // Background variants
  backgroundSecondary: '#FFFFFF',   // Secondary background (cards)
  backgroundTertiary: '#F8FAFC',    // Tertiary background (sections)
  
  // Alert colors
  warningYellow: '#F59E0B',    // Warning level alert
  dangerOrange: '#F97316',     // Danger level alert
  criticalRed: '#EF4444',      // Critical level alert
  
  // Text colors (updated for modern design)
  textPrimary: '#1F2937',       // Dark gray for primary text
  textSecondary: '#6B7280',     // Medium gray for secondary text
  textLight: '#9CA3AF',         // Light gray for disabled/placeholder text
  textOnDark: '#FFFFFF',        // White text on dark backgrounds
  textOnPrimary: '#FFFFFF',     // White text on primary color
  
  // Component specific colors (modern design system)
  border: '#E5E7EB',            // Light border
  borderFocus: '#8B5CF6',       // Purple focus border
  shadow: '#00000008',          // Very light shadow for cards
  overlay: '#00000060',         // Semi-transparent overlay
  
  // Storage/file management colors (inspired by the file management UI)
  storageBlue: '#3B82F6',       // Blue for storage elements
  storageOrange: '#F97316',     // Orange for video/media
  storagePink: '#EC4899',       // Pink for images
  storageGreen: '#10B981',      // Green for files
  storagePurple: '#8B5CF6',     // Purple for folders
  
  // Surface colors for layering
  surfaceElevated: '#F8FAFC',   // Slightly elevated surface
  surfaceDepressed: '#E8EEF4',  // Slightly depressed surface
} as const;

// Soft UI Light Theme
export const LightTheme = {
  ...Colors,
  background: '#F0F4F8',        // Soft Light Grey base
  surface: '#F0F4F8',           // Same as background for seamless neumorphism
  surfaceSecondary: '#F8FAFC',  // Slightly elevated surface
  text: '#1A1A1A',              // Dark text for contrast
  textSecondary: '#4A4A4A',     // Secondary text color
  border: '#E0E7F0',            // Soft border color
};

// Soft UI Dark Theme (adapted for neumorphism)
export const DarkTheme = {
  ...Colors,
  primary: '#70C3D3',           // Aqua tech blue as primary in dark mode
  background: '#1A1D23',        // Darker base for dark neumorphism
  surface: '#1A1D23',           // Same as background
  surfaceSecondary: '#252932',  // Slightly elevated dark surface
  text: '#F0F4F8',              // Light text
  textSecondary: '#B0B8C1',     // Secondary light text
  border: '#3A3F47',            // Dark border
  shadow: '#00000060',          // Stronger shadow in dark mode
  lightShadow: '#2A2F37',       // Lighter shadow for dark neumorphism
  darkShadow: '#0F1115',        // Darker shadow for dark neumorphism
};

export type ColorTheme = typeof LightTheme;