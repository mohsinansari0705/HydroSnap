import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
interface CardProps {
  title: string;
  date: string;
  description: string;
  location: string;
  type: 'outbreak' | 'water_quality' | 'prevention' | 'alert' | 'flood_alert' | 'site_status' | 'reading';
  severity: 'high' | 'medium' | 'low';
  caseCount?: number;
  waterLevel?: number;
  dangerLevel?: number;
  lastReading?: string;
  fieldPersonnel?: string;
  onPress: () => void;
}

const Card: React.FC<CardProps> = ({ 
  title, 
  date, 
  description, 
  location, 
  type, 
  severity, 
  caseCount: _caseCount, 
  waterLevel, 
  dangerLevel, 
  lastReading, 
  fieldPersonnel, 
  onPress 
}) => {
  const isAlert = type === 'alert';

  const styles = React.useMemo(() => createStyles(), []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityColor = () => {
    if (severity === 'high') return Colors.alertRed;
    if (severity === 'medium') return Colors.warning || '#FFA726';
    return Colors.validationGreen;
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'outbreak': return 'medical';
      case 'water_quality': return 'water';
      case 'prevention': return 'shield-checkmark';
      case 'alert': return 'warning';
      case 'flood_alert': return 'water-outline';
      case 'site_status': return 'location';
      case 'reading': return 'analytics';
      default: return 'document-text';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'outbreak': return 'Disease Outbreak';
      case 'water_quality': return 'Water Quality';
      case 'prevention': return 'Prevention';
      case 'alert': return 'Alert';
      case 'flood_alert': return 'Flood Alert';
      case 'site_status': return 'Site Status';
      case 'reading': return 'Water Reading';
      default: return 'Report';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.cardWrapper}>
      <View style={[styles.card, { borderLeftColor: getPriorityColor() }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getPriorityColor() + '15' }]}>
            <Ionicons name={getTypeIcon() as any} size={24} color={getPriorityColor()} />
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color={Colors.textSecondary} />
                <Text style={styles.location} numberOfLines={1}>{location}</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() + '15' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
              {severity.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        
        {/* Water Level Information */}
        {waterLevel !== undefined && (
          <View style={styles.waterLevelInfo}>
            <View style={styles.levelItem}>
              <View style={styles.levelIconContainer}>
                <MaterialCommunityIcons name="waves" size={16} color={Colors.aquaTechBlue} />
              </View>
              <View>
                <Text style={styles.levelLabel}>Current Level</Text>
                <Text style={styles.levelValue}>{waterLevel.toFixed(2)}m</Text>
              </View>
            </View>
            {dangerLevel !== undefined && (
              <View style={styles.levelItem}>
                <View style={[styles.levelIconContainer, { backgroundColor: Colors.alertRed + '15' }]}>
                  <Ionicons name="alert-circle" size={16} color={Colors.alertRed} />
                </View>
                <View>
                  <Text style={styles.levelLabel}>Danger Level</Text>
                  <Text style={[styles.levelValue, { color: Colors.alertRed }]}>{dangerLevel.toFixed(2)}m</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Field Personnel Information */}
        {fieldPersonnel && (
          <View style={styles.personnelInfo}>
            <Ionicons name="person-circle-outline" size={16} color={Colors.deepSecurityBlue} />
            <Text style={styles.personnelText}>
              Recorded by: <Text style={styles.personnelName}>{fieldPersonnel}</Text>
            </Text>
          </View>
        )}
        
        {/* Last Reading Information */}
        {lastReading && (
          <View style={styles.lastReadingInfo}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.lastReadingText}>
              Last Reading: <Text style={styles.lastReadingValue}>{lastReading}</Text>
            </Text>
          </View>
        )}
        
        <View style={styles.cardFooter}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.date}>{formatDate(date)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = () => StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  location: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  waterLevelInfo: {
    flexDirection: 'row',
    backgroundColor: Colors.softLightGrey,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 16,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  levelIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.aquaTechBlue + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  levelValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.aquaTechBlue,
  },
  personnelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.deepSecurityBlue + '08',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  personnelText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  personnelName: {
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  lastReadingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  lastReadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lastReadingValue: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.softLightGrey,
  },
  typeContainer: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 11,
    color: Colors.deepSecurityBlue,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

export default Card;
