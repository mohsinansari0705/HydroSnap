/**
 * Advanced Geofence Monitoring Service
 * Provides real-time location tracking and validation
 */

import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface GeofenceConfig {
  siteId: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  strictMode: boolean; // Require continuous presence
}

export interface LocationStatus {
  isInGeofence: boolean;
  distance: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

export interface GeofenceEvent {
  type: 'ENTER' | 'EXIT' | 'DWELL' | 'BREACH';
  timestamp: number;
  location: Location.LocationObject;
  distance: number;
}

class GeofenceMonitoringService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private currentGeofence: GeofenceConfig | null = null;
  private locationHistory: LocationStatus[] = [];
  private lastStatus: LocationStatus | null = null;
  private isCurrentlyInside: boolean = false;
  private eventCallbacks: ((event: GeofenceEvent) => void)[] = [];
  private dwellStartTime: number | null = null;
  private breachCount: number = 0;
  private maxHistorySize: number = 50;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs access to your location to validate monitoring site proximity.'
        );
        return false;
      }

      // Request background permissions for enhanced monitoring (optional)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus === 'granted') {
        console.log('✅ Background location access granted');
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get current location with high accuracy
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start monitoring a geofence
   */
  async startMonitoring(
    geofence: GeofenceConfig,
    onStatusChange?: (status: LocationStatus) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Stop any existing monitoring
      this.stopMonitoring();

      this.currentGeofence = geofence;
      this.locationHistory = [];
      this.breachCount = 0;
      this.dwellStartTime = null;

      console.log('🎯 Starting geofence monitoring for site:', geofence.siteId);
      console.log('📍 Center:', geofence.centerLat, geofence.centerLng);
      console.log('📏 Radius:', geofence.radius, 'm');

      // Start watching location with high accuracy
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 5, // Or when moved 5 meters
        },
        (location) => {
          this.handleLocationUpdate(location, onStatusChange);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      return false;
    }
  }

  /**
   * Handle location updates
   */
  private handleLocationUpdate(
    location: Location.LocationObject,
    onStatusChange?: (status: LocationStatus) => void
  ) {
    if (!this.currentGeofence) return;

    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      this.currentGeofence.centerLat,
      this.currentGeofence.centerLng
    );

    const isInside = distance <= this.currentGeofence.radius;
    const accuracy = location.coords.accuracy || 0;

    const status: LocationStatus = {
      isInGeofence: isInside,
      distance: Math.round(distance),
      accuracy: Math.round(accuracy),
      timestamp: location.timestamp,
      ...(location.coords.speed !== null && location.coords.speed !== undefined && { speed: location.coords.speed }),
      ...(location.coords.heading !== null && location.coords.heading !== undefined && { heading: location.coords.heading }),
    };

    // Detect geofence events
    if (isInside && !this.isCurrentlyInside) {
      // ENTER event
      this.triggerEvent({
        type: 'ENTER',
        timestamp: Date.now(),
        location,
        distance,
      });
      this.dwellStartTime = Date.now();
      this.breachCount = 0;
    } else if (!isInside && this.isCurrentlyInside) {
      // EXIT event
      this.triggerEvent({
        type: 'EXIT',
        timestamp: Date.now(),
        location,
        distance,
      });
      this.dwellStartTime = null;
      this.breachCount++;

      // Check for repeated breaches
      if (this.currentGeofence.strictMode && this.breachCount >= 3) {
        this.triggerEvent({
          type: 'BREACH',
          timestamp: Date.now(),
          location,
          distance,
        });
      }
    } else if (isInside && this.dwellStartTime) {
      // DWELL event (inside for extended period)
      const dwellTime = Date.now() - this.dwellStartTime;
      if (dwellTime > 30000 && dwellTime < 35000) {
        // Trigger once after 30 seconds
        this.triggerEvent({
          type: 'DWELL',
          timestamp: Date.now(),
          location,
          distance,
        });
      }
    }

    this.isCurrentlyInside = isInside;
    this.lastStatus = status;

    // Add to history
    this.locationHistory.push(status);
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }

    // Callback for status changes
    if (onStatusChange) {
      onStatusChange(status);
    }
  }

  /**
   * Trigger geofence event
   */
  private triggerEvent(event: GeofenceEvent) {
    console.log(`🚨 Geofence Event: ${event.type} at ${Math.round(event.distance)}m`);
    this.eventCallbacks.forEach((callback) => callback(event));
  }

  /**
   * Subscribe to geofence events
   */
  onGeofenceEvent(callback: (event: GeofenceEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      console.log('⏹️ Stopped geofence monitoring');
    }
    this.currentGeofence = null;
    this.isCurrentlyInside = false;
    this.dwellStartTime = null;
  }

  /**
   * Get current status
   */
  getCurrentStatus(): LocationStatus | null {
    return this.lastStatus;
  }

  /**
   * Get location history
   */
  getLocationHistory(): LocationStatus[] {
    return [...this.locationHistory];
  }

  /**
   * Check if currently in geofence
   */
  isInGeofence(): boolean {
    return this.isCurrentlyInside;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    if (this.locationHistory.length === 0) {
      return null;
    }

    const distances = this.locationHistory.map((h) => h.distance);
    const accuracies = this.locationHistory.map((h) => h.accuracy);

    return {
      avgDistance: Math.round(distances.reduce((a, b) => a + b, 0) / distances.length),
      minDistance: Math.round(Math.min(...distances)),
      maxDistance: Math.round(Math.max(...distances)),
      avgAccuracy: Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length),
      totalUpdates: this.locationHistory.length,
      breachCount: this.breachCount,
      timeInGeofence: this.dwellStartTime ? Date.now() - this.dwellStartTime : 0,
    };
  }

  /**
   * Validate location with tolerance for GPS accuracy
   */
  validateWithAccuracy(location: Location.LocationObject, geofence: GeofenceConfig): {
    isValid: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    distance: number;
    message: string;
  } {
    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      geofence.centerLat,
      geofence.centerLng
    );

    const accuracy = location.coords.accuracy || 50;
    const effectiveRadius = geofence.radius + accuracy; // Add accuracy buffer

    const isValid = distance <= effectiveRadius;
    
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (accuracy < 10) {
      confidence = 'HIGH';
    } else if (accuracy < 30) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    let message = '';
    if (isValid) {
      if (distance <= geofence.radius) {
        message = `✓ Within geofence (${Math.round(distance)}m from site)`;
      } else {
        message = `⚠ Near boundary (${Math.round(distance)}m, accuracy ±${Math.round(accuracy)}m)`;
      }
    } else {
      message = `✗ Outside geofence (${Math.round(distance)}m from site, need ${geofence.radius}m)`;
    }

    return { isValid, confidence, distance: Math.round(distance), message };
  }
}

export const geofenceMonitoringService = new GeofenceMonitoringService();
