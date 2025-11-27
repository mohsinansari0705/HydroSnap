import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Custom hook to handle Android hardware back button
 * 
 * @param handler - Function to execute when back button is pressed
 * @param enabled - Whether the back handler should be active (default: true)
 * @returns void
 * 
 * Usage:
 * useBackHandler(() => {
 *   // Handle back button press
 *   navigation.goBack();
 *   return true; // Prevent default behavior
 * });
 */
export const useBackHandler = (
  handler: () => boolean | void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const result = handler();
      // If handler returns true, prevent default back behavior
      // If handler returns false/void, allow default back behavior
      return result === true;
    });

    return () => backHandler.remove();
  }, [handler, enabled]);
};

/**
 * Utility hook for simple back navigation
 * 
 * @param onBack - Function to call when back button is pressed
 * @param enabled - Whether the back handler should be active (default: true)
 * 
 * Usage:
 * useSimpleBackHandler(() => {
 *   navigation.goBack();
 * });
 */
export const useSimpleBackHandler = (
  onBack: () => void,
  enabled: boolean = true
) => {
  useBackHandler(() => {
    onBack();
    return true; // Always prevent default behavior
  }, enabled);
};



export default useBackHandler;