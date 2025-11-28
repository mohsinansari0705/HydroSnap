/**
 * Custom Hook for Real-Time Location Validation
 * Simplifies integration of geofencing in components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import {
  geofenceMonitoringService,
  GeofenceConfig,
  LocationStatus,
  GeofenceEvent,
} from '../services/geofenceMonitoringService';

export interface UseLocationValidationOptions {
  geofence: GeofenceConfig | null;
  enableContinuousMonitoring?: boolean;
  onGeofenceExit?: () => void;
  onGeofenceBreach?: () => void;
  onLocationUpdate?: (status: LocationStatus) => void;
  strictMode?: boolean;
}

export interface UseLocationValidationReturn {
  currentStatus: LocationStatus | null;
  isInGeofence: boolean;
  isMonitoring: boolean;
  statistics: ReturnType<typeof geofenceMonitoringService.getStatistics>;
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => void;
  refreshLocation: () => Promise<void>;
  error: string | null;
}

/**
 * Hook for managing real-time location validation
 */
export const useLocationValidation = (
  options: UseLocationValidationOptions
): UseLocationValidationReturn => {
  const {
    geofence,
    enableContinuousMonitoring = true,
    onGeofenceExit,
    onGeofenceBreach,
    onLocationUpdate,
    strictMode = false,
  } = options;

  const [currentStatus, setCurrentStatus] = useState<LocationStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<ReturnType<typeof geofenceMonitoringService.getStatistics>>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const eventUnsubscribe = useRef<(() => void) | null>(null);
  const exitHandled = useRef(false);
  const breachHandled = useRef(false);

  /**
   * Start monitoring geofence
   */
  const startMonitoring = useCallback(async () => {
    if (!geofence) {
      setError('No geofence configuration provided');
      return false;
    }

    if (!enableContinuousMonitoring) {
      // Just validate current position without continuous monitoring
      const location = await geofenceMonitoringService.getCurrentLocation();
      if (location) {
        const validation = geofenceMonitoringService.validateWithAccuracy(location, geofence);
        setCurrentStatus({
          isInGeofence: validation.isValid,
          distance: validation.distance,
          accuracy: location.coords.accuracy || 0,
          timestamp: location.timestamp,
        });
        return validation.isValid;
      }
      return false;
    }

    try {
      console.log('🎯 Starting geofence monitoring...');
      setError(null);
      exitHandled.current = false;
      breachHandled.current = false;

      const started = await geofenceMonitoringService.startMonitoring(
        { ...geofence, strictMode },
        (status) => {
          setCurrentStatus(status);
          setStatistics(geofenceMonitoringService.getStatistics());
          
          if (onLocationUpdate) {
            onLocationUpdate(status);
          }
        }
      );

      if (started) {
        setIsMonitoring(true);
        
        // Subscribe to geofence events
        eventUnsubscribe.current = geofenceMonitoringService.onGeofenceEvent(
          (event: GeofenceEvent) => {
            handleGeofenceEvent(event);
          }
        );

        console.log('✅ Geofence monitoring started successfully');
        return true;
      } else {
        setError('Failed to start location monitoring. Please check GPS settings.');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Error starting monitoring:', errorMessage);
      return false;
    }
  }, [geofence, enableContinuousMonitoring, strictMode, onLocationUpdate]);

  /**
   * Stop monitoring geofence
   */
  const stopMonitoring = useCallback(() => {
    console.log('⏹️ Stopping geofence monitoring...');
    geofenceMonitoringService.stopMonitoring();
    
    if (eventUnsubscribe.current) {
      eventUnsubscribe.current();
      eventUnsubscribe.current = null;
    }
    
    setIsMonitoring(false);
    setCurrentStatus(null);
    setStatistics(null);
    exitHandled.current = false;
    breachHandled.current = false;
  }, []);

  /**
   * Refresh current location
   */
  const refreshLocation = useCallback(async () => {
    if (!geofence) return;

    try {
      const location = await geofenceMonitoringService.getCurrentLocation();
      if (location) {
        const validation = geofenceMonitoringService.validateWithAccuracy(location, geofence);
        setCurrentStatus({
          isInGeofence: validation.isValid,
          distance: validation.distance,
          accuracy: location.coords.accuracy || 0,
          timestamp: location.timestamp,
        });
      }
    } catch (err) {
      console.error('Error refreshing location:', err);
    }
  }, [geofence]);

  /**
   * Handle geofence events
   */
  const handleGeofenceEvent = useCallback(
    (event: GeofenceEvent) => {
      console.log(`📍 Geofence Event: ${event.type}`);

      switch (event.type) {
        case 'ENTER':
          console.log('✅ Entered geofence');
          exitHandled.current = false;
          breachHandled.current = false;
          break;

        case 'EXIT':
          console.log('⚠️ Exited geofence');
          if (!exitHandled.current) {
            exitHandled.current = true;
            if (onGeofenceExit) {
              onGeofenceExit();
            } else {
              Alert.alert(
                'Location Alert',
                'You have moved outside the monitoring site area. Please return to the site to continue.',
                [{ text: 'OK' }]
              );
            }
          }
          break;

        case 'BREACH':
          console.log('🚨 Geofence breach detected');
          if (!breachHandled.current) {
            breachHandled.current = true;
            if (onGeofenceBreach) {
              onGeofenceBreach();
            } else {
              Alert.alert(
                'Reading Cancelled',
                'You have left the monitoring site multiple times. The reading process has been cancelled for security reasons.',
                [{ text: 'OK' }]
              );
            }
          }
          break;

        case 'DWELL':
          console.log('✨ User dwelling in geofence');
          // Optional: Reward for staying in place
          break;
      }
    },
    [onGeofenceExit, onGeofenceBreach]
  );

  /**
   * Handle app state changes (background/foreground)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isMonitoring
      ) {
        // App came to foreground - refresh location
        console.log('📱 App resumed, refreshing location...');
        refreshLocation();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isMonitoring, refreshLocation]);

  /**
   * Auto-start monitoring when geofence is set
   */
  useEffect(() => {
    if (geofence && enableContinuousMonitoring && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [geofence?.siteId]); // Only re-run if siteId changes

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return {
    currentStatus,
    isInGeofence: currentStatus?.isInGeofence ?? false,
    isMonitoring,
    statistics,
    startMonitoring,
    stopMonitoring,
    refreshLocation,
    error,
  };
};

/**
 * Hook for one-time location validation (no continuous monitoring)
 */
export const useLocationCheck = (geofence: GeofenceConfig | null) => {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<{
    isValid: boolean;
    distance: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
  } | null>(null);

  const validate = useCallback(async () => {
    if (!geofence) return null;

    setIsValidating(true);
    try {
      const location = await geofenceMonitoringService.getCurrentLocation();
      if (!location) {
        setResult({
          isValid: false,
          distance: 0,
          confidence: 'LOW',
          message: 'Unable to get current location',
        });
        return null;
      }

      const validation = geofenceMonitoringService.validateWithAccuracy(location, geofence);
      setResult(validation);
      return validation;
    } finally {
      setIsValidating(false);
    }
  }, [geofence]);

  return { validate, isValidating, result };
};
