import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

/**
 * Hook to get safe area padding styles
 * Automatically handles status bar and notch spacing on iOS and Android
 * @returns Object with padding/margin values for safe area
 */
export const useSafeAreaPadding = () => {
  const insets = useSafeAreaInsets();

  return {
    // Top padding to avoid status bar and notches
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,

    // Margin alternatives
    marginTop: insets.top,
    marginBottom: insets.bottom,
    marginLeft: insets.left,
    marginRight: insets.right,

    // Individual insets for custom use
    insets: {
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    },
  };
};

/**
 * Get safe area insets as an object
 * @returns Object with top, bottom, left, right inset values
 */
export const useSafeAreaInsets_Custom = () => {
  return useSafeAreaInsets();
};

/**
 * Get only top safe area padding (most common use case)
 * @returns Top padding value in pixels
 */
export const useSafeAreaTopPadding = () => {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top,
    marginTop: insets.top,
    topInset: insets.top,
  };
};

/**
 * Get safe area styles for header/navbar components
 * Combines top padding with typical navbar styling matching HomeScreen Navbar
 * @returns Style object for navbar components
 */
export const useSafeAreaNavbarStyle = () => {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: insets.top,
    paddingBottom: 8,
    paddingHorizontal: 20,
    height: 110,
    // Can be extended with other navbar specific styles
  };
};

/**
 * Get safe area styles for screen containers
 * Applies appropriate padding on all sides based on device
 * @param extraTopPadding - Additional top padding beyond safe area (default: 0)
 * @returns Style object for screen containers
 */
export const useSafeAreaContainerStyle = (extraTopPadding: number = 0) => {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: insets.top + extraTopPadding,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

/**
 * Fallback safe area style object (for non-hook usage)
 * Use this if you cannot use hooks in your component
 * Returns a basic safe area object with default values
 * @returns Default safe area style object
 */
export const defaultSafeAreaStyle = {
  paddingTop: Platform.OS === 'ios' ? 44 : 24, // Approximate values
  paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  paddingLeft: 0,
  paddingRight: 0,
};
