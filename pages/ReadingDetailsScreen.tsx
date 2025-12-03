import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Colors } from '../lib/colors';
import { waterLevelReadingsService } from '../services/waterLevelReadingsService';
import { WaterLevelReading } from '../services/waterLevelReadingsService';
import SafeScreen from '../components/SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';

interface ReadingDetailsScreenProps {
  readingId: string;
  onBack: () => void;
}

const ReadingDetailsScreen: React.FC<ReadingDetailsScreenProps> = ({ readingId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<WaterLevelReading | null>(null);

  useSimpleBackHandler(onBack);

  useEffect(() => {
    fetchReadingDetails();
  }, [readingId]);

  const fetchReadingDetails = async () => {
    try {
      setLoading(true);
      const data = await waterLevelReadingsService.getReadingById(readingId);
      setReading(data);
    } catch (error) {
      console.error('Error fetching reading details:', error);
      Alert.alert('Error', 'Failed to load reading details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'safe': return Colors.successGreen;
      case 'warning': return Colors.warningOrange;
      case 'danger': return Colors.criticalRed;
      case 'critical': return Colors.darkRed;
      default: return Colors.textSecondary;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'rising': return '↑';
      case 'falling': return '↓';
      case 'stable': return '→';
      default: return '–';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reading Details</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        </View>
      </SafeScreen>
    );
  }

  if (!reading) {
    return (
      <SafeScreen>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reading Details</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Reading not found</Text>
            <TouchableOpacity onPress={onBack} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reading Details</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Section */}
          {reading.photo_url && (
            <View style={styles.photoSection}>
              <Image 
                source={{ uri: reading.photo_url }} 
                style={styles.photo}
                resizeMode="cover"
              />
              <View style={styles.photoOverlay}>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(reading.water_level_status) }]}>
                    {reading.water_level_status?.toUpperCase() || 'UNKNOWN'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Main Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Site Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Site Name</Text>
              <Text style={styles.value}>{reading.site_name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Reading Method</Text>
              <Text style={styles.value}>
                {reading.reading_method === 'photo_analysis' ? 'Photo Analysis' : 'Manual Override'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Submitted On</Text>
              <Text style={styles.value}>{formatDate(reading.submission_timestamp)}</Text>
            </View>
          </View>

          {/* Water Level Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Water Level Analysis</Text>
            <View style={styles.waterLevelContainer}>
              <View style={styles.waterLevelMain}>
                <Text style={styles.waterLevelLabel}>Predicted Level</Text>
                <Text style={styles.waterLevelValue}>
                  {reading.predicted_water_level?.toFixed(2) || 'N/A'} m
                </Text>
              </View>
              {reading.trend_status && (
                <View style={styles.trendBadge}>
                  <Text style={styles.trendIcon}>{getTrendIcon(reading.trend_status)}</Text>
                  <Text style={styles.trendText}>{reading.trend_status}</Text>
                </View>
              )}
            </View>
            
            {reading.prediction_confidence && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Confidence</Text>
                  <Text style={[styles.value, { color: Colors.successGreen }]}>
                    {reading.prediction_confidence?.toFixed(1)}%
                  </Text>
                </View>
              </>
            )}

            {reading.previous_reading_diff !== null && reading.previous_reading_diff !== undefined && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Change from Previous</Text>
                  <Text style={[
                    styles.value, 
                    { color: reading.previous_reading_diff > 0 ? Colors.criticalRed : Colors.successGreen }
                  ]}>
                    {reading.previous_reading_diff > 0 ? '+' : ''}
                    {reading.previous_reading_diff?.toFixed(2)} m
                  </Text>
                </View>
              </>
            )}

            {reading.manual_override && (
              <>
                <View style={styles.divider} />
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>⚠️ Manual Override</Text>
                  {reading.manual_override_reason && (
                    <Text style={styles.warningText}>{reading.manual_override_reason}</Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Alert Information */}
          {reading.alert_triggered && (
            <View style={[styles.card, styles.alertCard]}>
              <Text style={styles.sectionTitle}>🚨 Alert Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Alert Type</Text>
                <Text style={[styles.value, { color: Colors.criticalRed }]}>
                  {reading.alert_type?.replace(/_/g, ' ').toUpperCase() || 'ALERT TRIGGERED'}
                </Text>
              </View>
            </View>
          )}

          {/* Location & Validation Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Location & Validation</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Location Valid</Text>
              <Text style={[
                styles.value, 
                { color: reading.is_location_valid ? Colors.successGreen : Colors.criticalRed }
              ]}>
                {reading.is_location_valid ? '✓ Valid' : '✗ Invalid'}
              </Text>
            </View>
            {reading.distance_from_site !== null && reading.distance_from_site !== undefined && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Distance from Site</Text>
                  <Text style={styles.value}>{reading.distance_from_site?.toFixed(0)} m</Text>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Coordinates</Text>
              <Text style={styles.valueSmall}>
                {reading.latitude?.toFixed(6)}, {reading.longitude?.toFixed(6)}
              </Text>
            </View>
            {reading.qr_scanned_at && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>QR Scanned At</Text>
                  <Text style={styles.value}>{formatDate(reading.qr_scanned_at)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Conditions Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Weather</Text>
              <Text style={styles.value}>{reading.weather_conditions || 'Not recorded'}</Text>
            </View>
            {reading.gauge_visibility && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Gauge Visibility</Text>
                  <Text style={styles.value}>
                    {reading.gauge_visibility.charAt(0).toUpperCase() + reading.gauge_visibility.slice(1)}
                  </Text>
                </View>
              </>
            )}
            {reading.lighting_conditions && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Lighting</Text>
                  <Text style={styles.value}>
                    {reading.lighting_conditions.charAt(0).toUpperCase() + reading.lighting_conditions.slice(1)}
                  </Text>
                </View>
              </>
            )}
            {reading.image_quality_score && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Image Quality</Text>
                  <Text style={styles.value}>{reading.image_quality_score}/10</Text>
                </View>
              </>
            )}
          </View>

          {/* Timestamps Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {reading.site_selected_at && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Site Selected</Text>
                  <Text style={styles.valueSmall}>{formatDate(reading.site_selected_at)}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {reading.photo_taken_at && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Photo Taken</Text>
                  <Text style={styles.valueSmall}>{formatDate(reading.photo_taken_at)}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {reading.analysis_started_at && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Analysis Started</Text>
                  <Text style={styles.valueSmall}>{formatDate(reading.analysis_started_at)}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {reading.analysis_completed_at && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Analysis Completed</Text>
                  <Text style={styles.valueSmall}>{formatDate(reading.analysis_completed_at)}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Submitted</Text>
              <Text style={styles.valueSmall}>{formatDate(reading.submission_timestamp)}</Text>
            </View>
          </View>

          {/* Notes Card */}
          {reading.notes && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{reading.notes}</Text>
            </View>
          )}

          {/* Reading ID */}
          <View style={styles.readingIdContainer}>
            <Text style={styles.readingIdLabel}>Reading ID</Text>
            <Text style={styles.readingId}>{reading.id}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  photoSection: {
    height: 280,
    backgroundColor: Colors.backgroundGrey,
    position: 'relative',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  alertCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: Colors.criticalRed,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  valueSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.softLightGrey,
    marginVertical: 8,
  },
  waterLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterLevelMain: {
    flex: 1,
  },
  waterLevelLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  waterLevelValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.aquaTechBlue,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trendIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  warningBox: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warningOrange,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warningOrange,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  readingIdContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 8,
  },
  readingIdLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  readingId: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
});

export default ReadingDetailsScreen;
