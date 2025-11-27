import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { QRScannerPopup } from './QRScannerPopup';
import { QRResultPopup } from './QRResultPopup';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { 
  validateQRCode, 
  ValidatedSiteData
} from '../services/qrValidationService';
import { MonitoringSite, MonitoringSitesService } from '../services/monitoringSitesService';
import { useSimpleBackHandler } from '../hooks/useBackHandler';

interface QRValidationScreenProps {
  userLocation: { latitude: number; longitude: number };
  onSiteValidated: (siteData: ValidatedSiteData, distance: number) => void;
  onCancel: () => void;
}

export const QRValidationScreen: React.FC<QRValidationScreenProps> = ({
  userLocation,
  onSiteValidated,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allSites, setAllSites] = useState<MonitoringSite[]>([]);
  const [filteredSites, setFilteredSites] = useState<MonitoringSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [validatedSiteData, setValidatedSiteData] = useState<ValidatedSiteData | null>(null);
  const [siteDistance, setSiteDistance] = useState<number | null>(null);
  const [isInRange, setIsInRange] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userAddress, setUserAddress] = useState<string>('Fetching location...');
  const ITEMS_PER_PAGE = 5;

  // Handle back button navigation
  useSimpleBackHandler(() => {
    if (showScanner) {
      setShowScanner(false);
    } else if (showResultPopup) {
      setShowResultPopup(false);
      setValidatedSiteData(null);
      setValidationMessage('');
    } else {
      onCancel();
    }
  });

  // Load all monitoring sites on mount
  useEffect(() => {
    loadSites();
    fetchUserAddress();
  }, []);

  // Fetch user's address from coordinates
  const fetchUserAddress = async () => {
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        
        // Build complete address from available components
        const addressParts = [];
        
        if (address.name) addressParts.push(address.name);
        if (address.street) addressParts.push(address.street);
        if (address.streetNumber) addressParts.push(address.streetNumber);
        if (address.district) addressParts.push(address.district);
        if (address.city) addressParts.push(address.city);
        if (address.subregion && address.subregion !== address.city) addressParts.push(address.subregion);
        if (address.region) addressParts.push(address.region);
        if (address.postalCode) addressParts.push(address.postalCode);
        if (address.country) addressParts.push(address.country);
        
        const fullAddress = addressParts.join(', ');
        setUserAddress(fullAddress || 'Location identified');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      setUserAddress('Location identified');
    }
  };

  // Filter sites based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSites(allSites);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allSites.filter(site => 
        site.name.toLowerCase().includes(query) ||
        site.location.toLowerCase().includes(query) ||
        site.id.toLowerCase().includes(query) ||
        site.river_name?.toLowerCase().includes(query) ||
        site.district?.toLowerCase().includes(query) ||
        site.state?.toLowerCase().includes(query)
      );
      setFilteredSites(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, allSites]);

  // Calculate paginated sites
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSites = filteredSites.slice(startIndex, endIndex);

  const loadSites = async () => {
    try {
      setLoading(true);
      const sites = await MonitoringSitesService.getAllSites();
      
      // Calculate distance for each site
      const sitesWithDistance = sites.map(site => ({
        ...site,
        distanceFromUser: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          site.latitude,
          site.longitude
        )
      }));

      // Shuffle array randomly using Fisher-Yates algorithm
      const shuffledSites = [...sitesWithDistance];
      for (let i = shuffledSites.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSites[i], shuffledSites[j]] = [shuffledSites[j], shuffledSites[i]];
      }
      
      setAllSites(shuffledSites);
      setFilteredSites(shuffledSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      Alert.alert('Error', 'Failed to load monitoring sites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleQRScanned = (scannedData: string) => {
    console.log('📱 QR Code scanned successfully!');
    setShowScanner(false);
    handleValidateQR(scannedData);
  };

  const handleValidateQR = async (qrData: string) => {
    console.log('🔍 Starting QR validation process...');
    setIsValidating(true);

    try {
      const result = await validateQRCode(qrData, userLocation);
      
      if (result.siteData) {
        setValidatedSiteData(result.siteData);
        setSiteDistance(result.distance || null);
        setIsInRange(result.success);
        setValidationMessage(result.message);
        setShowResultPopup(true);
      } else {
        setValidatedSiteData(null);
        setSiteDistance(null);
        setIsInRange(false);
        setValidationMessage(result.message);
        setShowResultPopup(true);
      }
    } catch (error) {
      setValidationMessage('Failed to validate QR code. Please try again.');
      setShowResultPopup(true);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSiteSelect = async (site: MonitoringSite) => {
    console.log('📍 Site selected:', site.name);
    setIsValidating(true);

    try {
      // Calculate distance from user to site
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        site.latitude,
        site.longitude
      );

      // Convert MonitoringSite to ValidatedSiteData format
      const siteData: ValidatedSiteData = {
        siteId: site.id,
        name: site.name,
        location: site.location,
        coordinates: {
          lat: site.latitude,
          lng: site.longitude
        },
        riverName: site.river_name || '',
        state: site.state || '',
        district: site.district || '',
        siteType: site.site_type,
        levels: {
          safe: site.safe_level,
          warning: site.warning_level,
          danger: site.danger_level
        },
        geofenceRadius: site.geofence_radius,
        organization: site.organization,
        qrCode: site.qr_code,
        isActive: site.is_active
      };

      // Check if user is within geofence
      const isWithinGeofence = site.geofence_radius === 0 || distance <= site.geofence_radius;
      
      const formattedDistance = distance < 500 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
      const formattedRadius = site.geofence_radius < 500 ? `${site.geofence_radius}m` : `${(site.geofence_radius / 1000).toFixed(1)}km`;
      
      let message = '';
      if (isWithinGeofence) {
        message = `✓ You are ${formattedDistance} from ${site.name}. You can proceed to take readings.`;
      } else {
        message = `You are ${formattedDistance} away from the monitoring site. You must be within ${formattedRadius} to take readings.`;
      }

      setValidatedSiteData(siteData);
      setSiteDistance(Math.round(distance));
      setIsInRange(isWithinGeofence);
      setValidationMessage(message);
      setShowResultPopup(true);
    } catch (error) {
      console.error('Error validating site:', error);
      Alert.alert('Error', 'Failed to validate site location. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const formatDistance = (meters: number | undefined): string => {
    if (!meters) return 'N/A';
    if (meters < 500) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getSiteIcon = (siteType: string) => {
    switch (siteType) {
      case 'river': return 'water';
      case 'reservoir': return 'water-outline';
      case 'canal': return 'water';
      case 'lake': return 'water-outline';
      case 'groundwater': return 'layers-outline';
      default: return 'location';
    }
  };

  const getSiteTypeColor = (siteType: string): string => {
    switch (siteType) {
      case 'river': return Colors.aquaTechBlue;
      case 'reservoir': return Colors.primary;
      case 'canal': return '#3B82F6';
      case 'lake': return '#8B5CF6';
      case 'groundwater': return '#10B981';
      default: return Colors.textSecondary;
    }
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[NeumorphicTextStyles.heading, styles.title]}>
            Select Monitoring Site
          </Text>
          <Text style={[NeumorphicTextStyles.body, styles.subtitle]}>
            Search and select a site to validate your location
          </Text>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Location Status Card */}
      <View style={[createNeumorphicCard(), styles.locationCard]}>
        <View style={styles.locationHeader}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={22} color={Colors.aquaTechBlue} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, fontSize: 16 }]}>
              Your Location
            </Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={[NeumorphicTextStyles.caption, { color: Colors.validationGreen, fontSize: 11 }]}>
                Active
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.coordinatesContainer}>
          <View style={styles.coordinate}>
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary }]}>Latitude</Text>
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, fontWeight: '600' }]}>
              {userLocation.latitude.toFixed(6)}
            </Text>
          </View>
          <View style={styles.coordinateDivider} />
          <View style={styles.coordinate}>
            <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary }]}>Longitude</Text>
            <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, fontWeight: '600' }]}>
              {userLocation.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
        
        {/* User Address */}
        <View style={styles.addressContainer}>
          <Ionicons name="pin" size={14} color={Colors.aquaTechBlue} style={{ marginTop: 2 }} />
          <Text 
            style={[NeumorphicTextStyles.body, { 
              color: Colors.textPrimary, 
              marginLeft: 6, 
              fontSize: 13, 
              flex: 1,
              lineHeight: 18
            }]}
            numberOfLines={2}
          >
            {userAddress}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[createNeumorphicCard({ depressed: true }), styles.searchContainer]}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location, river..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="rgba(107, 114, 128, 0.5)"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Action Button - QR Scanner */}
      <TouchableOpacity
        style={[createNeumorphicCard(), styles.qrScanButton]}
        onPress={() => setShowScanner(true)}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={22} color={Colors.white} />
        <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.white, fontSize: 15, marginLeft: 10 }]}>
          Scan QR Code Instead
        </Text>
      </TouchableOpacity>

      {/* Sites List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 12 }]}>
            Loading monitoring sites...
          </Text>
        </View>
      ) : filteredSites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color={Colors.textSecondary + '40'} />
          <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textSecondary, marginTop: 16 }]}>
            No sites found
          </Text>
          <Text style={[NeumorphicTextStyles.body, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Try adjusting your search query
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {paginatedSites.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[createNeumorphicCard(), styles.siteCard]}
              onPress={() => handleSiteSelect(item)}
              disabled={isValidating}
            >
              <View style={styles.siteCardHeader}>
                <View style={styles.siteIconContainer}>
                  <Ionicons name={getSiteIcon(item.site_type)} size={24} color={Colors.aquaTechBlue} />
                </View>
                <View style={styles.siteInfo}>
                  <Text style={[NeumorphicTextStyles.subheading, { color: Colors.textPrimary, fontSize: 16 }]}>
                    {item.name}
                  </Text>
                  <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                    {item.location}
                  </Text>
                </View>
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={14} color={Colors.aquaTechBlue} />
                  <Text style={[NeumorphicTextStyles.caption, { color: Colors.textPrimary, marginLeft: 4, fontWeight: '600' }]}>
                    {formatDistance(item.distanceFromUser)}
                  </Text>
                </View>
              </View>

              <View style={styles.siteCardDetails}>
                {item.river_name && (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="waves" size={14} color={Colors.textSecondary} />
                    <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginLeft: 6 }]}>
                      {item.river_name}
                    </Text>
                  </View>
                )}
                {item.district && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginLeft: 6 }]}>
                      {item.district}, {item.state}
                    </Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="radius-outline" size={14} color={Colors.textSecondary} />
                  <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary, marginLeft: 6 }]}>
                    {item.geofence_radius < 500 ? `${item.geofence_radius}m` : `${(item.geofence_radius / 1000).toFixed(1)}km`} radius
                  </Text>
                </View>
              </View>

              <View style={styles.siteCardFooter}>
                <View style={[styles.siteTypeBadge, { backgroundColor: getSiteTypeColor(item.site_type) }]}>
                  <Text style={[NeumorphicTextStyles.caption, { color: Colors.white, fontSize: 11, fontWeight: '600' }]}>
                    {item.site_type.toUpperCase()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Pagination Controls */}
          {filteredSites.length > ITEMS_PER_PAGE && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  createNeumorphicCard(),
                  styles.paginationButton,
                  currentPage === 1 && styles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentPage === 1 ? Colors.textSecondary + '40' : Colors.textPrimary} 
                />
                <Text style={[
                  NeumorphicTextStyles.body, 
                  { 
                    color: currentPage === 1 ? Colors.textSecondary + '40' : Colors.textPrimary,
                    marginLeft: 8,
                    fontWeight: '600'
                  }
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={[NeumorphicTextStyles.body, { color: Colors.textPrimary, fontWeight: '600' }]}>
                  {currentPage}
                </Text>
                <Text style={[NeumorphicTextStyles.caption, { color: Colors.textSecondary }]}>
                  {' of '}{totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  createNeumorphicCard(),
                  styles.paginationButton,
                  currentPage === totalPages && styles.paginationButtonDisabled
                ]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={[
                  NeumorphicTextStyles.body, 
                  { 
                    color: currentPage === totalPages ? Colors.textSecondary + '40' : Colors.textPrimary,
                    marginRight: 8,
                    fontWeight: '600'
                  }
                ]}>
                  Next
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={currentPage === totalPages ? Colors.textSecondary + '40' : Colors.textPrimary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}


      <QRScannerPopup
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onQRScanned={handleQRScanned}
      />
      
      <QRResultPopup
        visible={showResultPopup}
        onClose={() => {
          setShowResultPopup(false);
          setValidationMessage('');
        }}
        onProceedToCamera={() => {
          if (validatedSiteData && siteDistance !== null) {
            console.log('User confirmed site details, proceeding to camera...');
            onSiteValidated(validatedSiteData, siteDistance);
            setShowResultPopup(false);
          }
        }}
        siteData={validatedSiteData}
        distance={siteDistance}
        isInRange={isInRange}
        validationMessage={validationMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...createNeumorphicCard(),
    marginLeft: 12,
  },
  locationCard: {
    padding: 18,
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.validationGreen,
    marginRight: 4,
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  coordinate: {
    flex: 1,
  },
  coordinateDivider: {
    width: 1,
    backgroundColor: Colors.background,
    marginHorizontal: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: 'transparent',
  },
  qrScanButton: {
    backgroundColor: Colors.aquaTechBlue,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  siteCard: {
    padding: 16,
    marginBottom: 12,
  },
  siteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  siteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  siteInfo: {
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  siteCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  siteTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});