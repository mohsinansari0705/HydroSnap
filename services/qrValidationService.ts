/**
 * QR Code Validation Service for Monitoring Sites
 * Handles QR code validation without external crypto dependencies
 */

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

// Mock QR validation data - In production, this would come from your QR generation system
const MOCK_QR_DATABASE: Record<string, ValidatedSiteData> = {
  "QR-YML-DEL-001": {
    siteId: "CWC-YML-DEL-001",
    name: "Yamuna Test Station (No Geofencing)",
    location: "Delhi",
    coordinates: {
      lat: 28.6139,
      lng: 77.2090
    },
    riverName: "Yamuna",
    state: "Delhi",
    district: "New Delhi",
    siteType: "river",
    levels: {
      safe: 200.00,
      warning: 203.50,
      danger: 205.00
    },
    geofenceRadius: 0, // Disabled for testing
    organization: "Central Water Commission",
    qrCode: "QR-YML-DEL-001",
    isActive: true
  },
  "QR-YMN-DEL-002": {
    siteId: "CWC-YMN-001",
    name: "Yamuna Bridge Station",
    location: "Delhi",
    coordinates: {
      lat: 28.66677700,
      lng: 77.21663900
    },
    riverName: "Yamuna",
    state: "Delhi",
    district: "Central Delhi",
    siteType: "river",
    levels: {
      safe: 203.00,
      warning: 204.80,
      danger: 205.50
    },
    geofenceRadius: 125,
    organization: "Central Water Commission",
    qrCode: "QR-YMN-DEL-002",
    isActive: true
  },
  "QR-GNG-HRD-001": {
    siteId: "CWC-GNG-002",
    name: "Old Railway Bridge Gauge",
    location: "Haridwar",
    coordinates: {
      lat: 29.94591800,
      lng: 78.16402600
    },
    riverName: "Ganges",
    state: "Uttarakhand",
    district: "Haridwar",
    siteType: "river",
    levels: {
      safe: 600.00,
      warning: 750.00,
      danger: 850.00
    },
    geofenceRadius: 125,
    organization: "Central Water Commission",
    qrCode: "QR-GNG-HRD-001",
    isActive: true
  },
  "QR-BRM-GWT-003": {
    siteId: "CWC-BRM-003",
    name: "Brahmaputra Ghat",
    location: "Guwahati",
    coordinates: {
      lat: 26.18440400,
      lng: 91.74761700
    },
    riverName: "Brahmaputra",
    state: "Assam",
    district: "Kamrup",
    siteType: "river",
    levels: {
      safe: 1400.00,
      warning: 1550.00,
      danger: 1650.00
    },
    geofenceRadius: 150,
    organization: "Central Water Commission",
    qrCode: "QR-BRM-GWT-003",
    isActive: true
  },
  "QR-GDV-RJM-004": {
    siteId: "CWC-GDV-004",
    name: "Dowleswaram Barrage",
    location: "Rajahmundry",
    coordinates: {
      lat: 17.00517400,
      lng: 81.78305800
    },
    riverName: "Godavari",
    state: "Andhra Pradesh",
    district: "East Godavari",
    siteType: "river",
    levels: {
      safe: 1100.00,
      warning: 1230.00,
      danger: 1310.00
    },
    geofenceRadius: 125,
    organization: "Central Water Commission",
    qrCode: "QR-GDV-RJM-004",
    isActive: true
  },
  "QR-KRS-MND-005": {
    siteId: "CWC-KRS-005",
    name: "Krishna Raja Sagara Dam",
    location: "Mandya",
    coordinates: {
      lat: 12.42513900,
      lng: 76.57080800
    },
    riverName: "Cauvery",
    state: "Karnataka",
    district: "Mandya",
    siteType: "reservoir",
    levels: {
      safe: 3700.00,
      warning: 3850.00,
      danger: 3950.00
    },
    geofenceRadius: 200,
    organization: "Central Water Commission",
    qrCode: "QR-KRS-MND-005",
    isActive: true
  },
  "QR-TST-DEL-999": {
    siteId: "CWC-TST-DEL-999", 
    name: "Test Site (Development Only)",
    location: "Delhi",
    coordinates: {
      lat: 28.6139,
      lng: 77.2090
    },
    riverName: "Yamuna",
    state: "Delhi", 
    district: "Central Delhi",
    siteType: "river",
    levels: {
      safe: 150.00,
      warning: 170.00,
      danger: 180.00
    },
    geofenceRadius: 0, // Disabled for testing
    organization: "Central Water Commission",
    qrCode: "QR-TST-DEL-999",
    isActive: true
  }
};

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
    // In a real implementation, you would decrypt the QR data
    // For now, we'll treat the QR data as the site code
    const siteData = MOCK_QR_DATABASE[qrData];
    
    if (!siteData) {
      return {
        success: false,
        message: "Invalid QR code. This monitoring site is not recognized."
      };
    }

    // Check if site is active
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

    // Check if user is within geofence (skip for test sites)
    const testSites = ['CWC-YML-DEL-001', 'CWC-TST-DEL-999'];
    if (!testSites.includes(siteData.siteId) && distance > siteData.geofenceRadius) {
      return {
        success: false,
        message: `You are ${Math.round(distance)}m away from the monitoring site. You must be within ${siteData.geofenceRadius}m to take readings.`,
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

/**
 * Get site data by QR code (without location validation)
 */
export const getSiteByQRCode = (qrCode: string): ValidatedSiteData | null => {
  return MOCK_QR_DATABASE[qrCode] || null;
};

/**
 * Get all available monitoring sites (for testing/development)
 */
export const getAllMockSites = (): ValidatedSiteData[] => {
  return Object.values(MOCK_QR_DATABASE);
};

/**
 * Mock QR codes for testing (use these in your QR scanner)
 */
export const MOCK_QR_CODES = Object.keys(MOCK_QR_DATABASE);

/**
 * Simple QR code validator (checks format)
 */
export const isValidQRFormat = (qrData: string): boolean => {
  // Basic format validation for monitoring site QR codes
  const qrRegex = /^QR-[A-Z]{3}-[A-Z]{3}-\d{3}$/;
  return qrRegex.test(qrData);
};