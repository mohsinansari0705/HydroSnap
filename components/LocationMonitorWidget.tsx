/**
 * Real-Time Location Monitor Widget
 * Displays live geofence status during reading capture
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { 
  geofenceMonitoringService, 
  LocationStatus,
  GeofenceEvent 
} from '../services/geofenceMonitoringService';

interface LocationMonitorWidgetProps {
  onGeofenceExit?: () => void;
  onGeofenceBreach?: () => void;
  compact?: boolean;
}

export const LocationMonitorWidget: React.FC<LocationMonitorWidgetProps> = ({
  onGeofenceExit,
  onGeofenceBreach,
  compact = false,
}) => {
  const [status, setStatus] = useState<LocationStatus | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Start pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  useEffect(() => {
    // Subscribe to geofence events
    const unsubscribe = geofenceMonitoringService.onGeofenceEvent((event: GeofenceEvent) => {
      if (event.type === 'EXIT' && onGeofenceExit) {
        onGeofenceExit();
      }
      if (event.type === 'BREACH' && onGeofenceBreach) {
        onGeofenceBreach();
      }
    });

    // Check if monitoring is active
    const currentStatus = geofenceMonitoringService.getCurrentStatus();
    setIsConnected(currentStatus !== null);
    if (currentStatus) {
      setStatus(currentStatus);
    }

    return unsubscribe;
  }, []);

  const getStatusColor = () => {
    if (!status) return Colors.textSecondary;
    if (status.isInGeofence) {
      return status.distance < 50 ? Colors.validationGreen : Colors.aquaTechBlue;
    }
    return Colors.error;
  };

  const getStatusIcon = () => {
    if (!status) return 'location-outline';
    if (status.isInGeofence) {
      return status.distance < 50 ? 'checkmark-circle' : 'location';
    }
    return 'warning';
  };

  const getStatusText = () => {
    if (!status) return 'Waiting for location...';
    const formattedDistance = status.distance < 500 ? `${status.distance}m` : `${(status.distance / 1000).toFixed(1)}km`;
    if (status.isInGeofence) {
      if (status.distance < 50) {
        return `Perfect position (${status.distance}m)`;
      }
      return `In range (${formattedDistance})`;
    }
    return `Outside range (${formattedDistance})`;
  };

  const getAccuracyText = () => {
    if (!status) return '';
    if (status.accuracy < 10) return 'High accuracy';
    if (status.accuracy < 30) return 'Medium accuracy';
    return 'Low accuracy';
  };

  const getAccuracyColor = () => {
    if (!status) return Colors.textSecondary;
    if (status.accuracy < 10) return Colors.validationGreen;
    if (status.accuracy < 30) return Colors.warning;
    return Colors.error;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, createNeumorphicCard()]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons 
            name={getStatusIcon()} 
            size={20} 
            color={getStatusColor()} 
          />
        </Animated.View>
        <View style={styles.compactTextContainer}>
          <Text style={[NeumorphicTextStyles.caption, { color: getStatusColor(), fontWeight: '600' }]}>
            {getStatusText()}
          </Text>
          {status && (
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, fontSize: 10 }]}>
              ±{status.accuracy < 500 ? `${status.accuracy}m` : `${(status.accuracy / 1000).toFixed(1)}km`} accuracy
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, createNeumorphicCard()]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons 
            name="radar" 
            size={20} 
            color={Colors.aquaTechBlue} 
          />
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, fontSize: 14, marginLeft: 8 }]}>
            Location Monitor
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? Colors.validationGreen : Colors.error }]} />
      </View>

      {/* Main Status */}
      <View style={styles.mainStatus}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons 
            name={getStatusIcon()} 
            size={32} 
            color={getStatusColor()} 
          />
        </Animated.View>
        <View style={styles.statusTextContainer}>
          <Text style={[NeumorphicTextStyles.subheading, { color: getStatusColor(), fontSize: 16 }]}>
            {getStatusText()}
          </Text>
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
            {getAccuracyText()}
          </Text>
        </View>
      </View>

      {/* Detailed Metrics */}
      {status && (
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
            <View style={styles.metricText}>
              <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, fontSize: 10 }]}>
                Distance
              </Text>
              <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 }]}>
                {status.distance < 500 ? `${status.distance}m` : `${(status.distance / 1000).toFixed(1)}km`}
              </Text>
            </View>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <MaterialCommunityIcons name="crosshairs-gps" size={16} color={Colors.textSecondary} />
            <View style={styles.metricText}>
              <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, fontSize: 10 }]}>
                Accuracy
              </Text>
              <Text style={[NeumorphicTextStyles.body, { color: getAccuracyColor(), fontWeight: '600', fontSize: 14 }]}>
                ±{status.accuracy < 500 ? `${status.accuracy}m` : `${(status.accuracy / 1000).toFixed(1)}km`}
              </Text>
            </View>
          </View>

          {status.speed !== undefined && status.speed > 0 && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <MaterialCommunityIcons name="speedometer" size={16} color={Colors.textSecondary} />
                <View style={styles.metricText}>
                  <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, fontSize: 10 }]}>
                    Speed
                  </Text>
                  <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 }]}>
                    {(status.speed * 3.6).toFixed(1)} km/h
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Warning Banner */}
      {status && !status.isInGeofence && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={16} color={Colors.error} />
          <Text style={[NeumorphicTextStyles.caption, { color: Colors.error, marginLeft: 8, flex: 1 }]}>
            You must return to the monitoring site area
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginVertical: 0,
  },
  compactTextContainer: {
    marginLeft: 12,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...createNeumorphicCard({ depressed: true }),
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.textSecondary + '20',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    alignItems: 'flex-start',
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.textSecondary + '20',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
});
