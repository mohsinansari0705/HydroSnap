/**
 * QR Code Validation Service for Monitoring Sites
 * Handles QR code validation without external crypto dependencies
 */

import { isEncryptedQRData, decryptQRData } from './qrDecryptionService';

export interface ValidatedSiteData {
  siteId: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  riverName: string;
  state: string;
  district: string;
  siteType: string;
  levels: {
    safe: number;
    warning: number;
    danger: number;
  };
  geofenceRadius: number;
  organization: string;
  qrCode: string;
  isActive: boolean;
}

export interface QRValidationResult {
  success: boolean;
  message: string;
  siteData?: ValidatedSiteData;
  distance?: number;
}

// All site data now comes dynamically from decrypted QR codes - no hardcoded data

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate QR code and user location
 */
export const validateQRCode = async (
  qrData: string,
  userLocation: { latitude: number; longitude: number }
): Promise<QRValidationResult> => {
  try {
    console.log('🎯 Validating QR code with user location...');
    
    // Parse the QR metadata (either encrypted or JSON)
    const siteData = await parseQRMetadata(qrData);

    if (!siteData) {
      console.error('❌ Could not extract valid site data from QR code');
      return {
        success: false,
        message: "Invalid QR code. Could not extract monitoring site data. Please ensure you are scanning a valid monitoring site QR code."
      };
    }

    console.log('✅ Site data extracted:', siteData.siteId, '-', siteData.name);    // Check if site is active
    if (!siteData.isActive) {
      return {
        success: false,
        message: "This monitoring site is currently inactive.",
        siteData
      };
    }

    // Calculate distance from user to site
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      siteData.coordinates.lat,
      siteData.coordinates.lng
    );

    // Check if user is within geofence (skip if geofence is disabled/zero)
    if (siteData.geofenceRadius > 0 && distance > siteData.geofenceRadius) {
      const formattedDistance = distance < 500 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
      const formattedRadius = siteData.geofenceRadius < 500 ? `${siteData.geofenceRadius}m` : `${(siteData.geofenceRadius / 1000).toFixed(1)}km`;
      return {
        success: false,
        message: `You are ${formattedDistance} away from the monitoring site. You must be within ${formattedRadius} to take readings.`,
        siteData,
        distance: Math.round(distance)
      };
    }

    // Success!
    return {
      success: true,
      message: "Site validated successfully! You can now take water level readings.",
      siteData,
      distance: Math.round(distance)
    };

  } catch (error) {
    console.error('QR validation error:', error);
    return {
      success: false,
      message: "Failed to validate QR code. Please try again."
    };
  }
};

// No more mock data - all site information comes from decrypted QR codes



/**
 * Parse JSON metadata from scanned QR code
 */
/**
 * Validate site data structure
 */
const validateSiteData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Check required fields
  const requiredFields = ['siteId', 'name', 'coordinates', 'levels'];
  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate coordinates
  if (!data.coordinates.lat || !data.coordinates.lng) {
    console.error('❌ Invalid coordinates');
    return false;
  }
  
  // Validate levels
  if (!data.levels.safe || !data.levels.warning || !data.levels.danger) {
    console.error('❌ Invalid water levels');
    return false;
  }
  
  return true;
};

export const parseQRMetadata = async (qrData: string): Promise<ValidatedSiteData | null> => {
  try {
    // Check if it's encrypted data first
    if (isEncryptedQRData(qrData)) {
      console.log('🔐 Processing encrypted QR data...');
      const decryptedData = await decryptQRData(qrData);
      if (decryptedData && validateSiteData(decryptedData)) {
        // Convert DecryptedQRData to ValidatedSiteData format
        console.log('✅ Successfully decrypted site data:', decryptedData.siteId);
        return {
          siteId: decryptedData.siteId,
          name: decryptedData.name,
          location: decryptedData.location,
          coordinates: decryptedData.coordinates,
          riverName: decryptedData.riverName,
          state: decryptedData.state,
          district: decryptedData.district,
          siteType: decryptedData.siteType,
          levels: decryptedData.levels,
          geofenceRadius: decryptedData.geofenceRadius,
          organization: decryptedData.organization,
          qrCode: decryptedData.qrCode,
          isActive: decryptedData.isActive,
        };
      } else {
        console.error('❌ Failed to decrypt or validate site data');
        return null;
      }
    }
    
    // Try to parse as JSON (for plain JSON QR codes)
    console.log('📝 Trying to parse as plain JSON...');
    const metadata = JSON.parse(qrData);
    
    if (validateSiteData(metadata)) {
      console.log('✅ Valid JSON site data found');
      // Convert to our ValidatedSiteData format
      return {
        siteId: metadata.siteId,
        name: metadata.name,
        location: metadata.location || '',
        coordinates: {
          lat: metadata.coordinates.lat,
          lng: metadata.coordinates.lng,
        },
        riverName: metadata.riverName || '',
        state: metadata.state || '',
        district: metadata.district || '',
        siteType: metadata.siteType || 'river',
        levels: {
          safe: metadata.levels.safe,
          warning: metadata.levels.warning,
          danger: metadata.levels.danger,
        },
        geofenceRadius: metadata.geofenceRadius || 125,
        organization: metadata.organization || 'Central Water Commission',
        qrCode: metadata.qrCode,
        isActive: metadata.isActive !== false, // Default to true if not specified
      };
    } else {
      console.error('❌ Invalid site data structure');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to parse QR data:', error);
    return null;
  }
};

/**
 * Simple QR code validator (checks format)
 */
export const isValidQRFormat = async (qrData: string): Promise<boolean> => {
  // Check if it's encrypted data (likely valid QR from your system)
  if (isEncryptedQRData(qrData)) {
    console.log('Detected encrypted QR code, considering as valid');
    return true;
  }
  
  // Check if it's JSON metadata
  const parsedData = await parseQRMetadata(qrData);
  if (parsedData) {
    return true;
  }
  
  // Otherwise check basic format validation for monitoring site QR codes
  // Format: QR-XXX-XX-000 (e.g., QR-YMN-DI-001)
  const qrRegex = /^QR-[A-Z]{3}-[A-Z]{2}-\d{3}$/;
  return qrRegex.test(qrData);
};