/**
 * Distance Formatting Utility
 * Provides consistent distance display across the application
 */

/**
 * Format distance in meters to a human-readable string
 * Shows in meters if < 500m, otherwise in kilometers
 * 
 * @param meters - Distance in meters
 * @returns Formatted distance string (e.g., "150m" or "1.5km")
 */
export const formatDistance = (meters: number | undefined | null): string => {
  if (meters === undefined || meters === null) return 'N/A';
  
  // Show in meters if less than 500m
  if (meters < 500) {
    return `${Math.round(meters)}m`;
  }
  
  // Show in kilometers if 500m or more
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Format distance for detailed display with unit flexibility
 * 
 * @param meters - Distance in meters
 * @param threshold - Threshold in meters to switch to km (default: 500)
 * @returns Formatted distance string
 */
export const formatDistanceDetailed = (
  meters: number | undefined | null,
  threshold: number = 500
): string => {
  if (meters === undefined || meters === null) return 'N/A';
  
  if (meters < threshold) {
    return `${Math.round(meters)}m`;
  }
  
  return `${(meters / 1000).toFixed(1)}km`;
};
