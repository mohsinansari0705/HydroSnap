// import { supabase } from '../lib/supabase';
import { ValidatedSiteData } from './qrValidationService';

export interface WaterLevelReading {
  id: string;
  user_id: string;
  user_role: string;
  site_id: string;
  site_name: string;
  water_level: number;
  latitude: number;
  longitude: number;
  photo_url: string;
  is_location_valid: boolean;
  distance_from_site: number;
  qr_code_scanned: string;
  reading_method: 'manual' | 'photo_analysis' | 'qr_scan';
  weather_conditions: string;
  submission_timestamp: string;
  created_at: string;
}

export interface NewReadingData {
  siteData: ValidatedSiteData;
  waterLevel: number;
  photoUri: string;
  userLocation: { latitude: number; longitude: number };
  distance: number;
  weatherConditions?: string;
}

class WaterLevelReadingsService {
  /**
   * Generate a realistic water level based on site's safe/warning/danger levels
   */
  generateRealisticWaterLevel(siteData: ValidatedSiteData): number {
    const { safe, warning, danger } = siteData.levels;
    
    // Create probability distribution:
    // 60% - Safe range (between safe and warning)
    // 30% - Warning range (between warning and danger) 
    // 10% - Danger range (above danger or below safe for negative cases)
    
    const random = Math.random();
    let waterLevel: number;
    
    if (random < 0.6) {
      // Safe range - between safe and warning levels
      const range = Math.abs(warning - safe);
      const variation = (Math.random() - 0.5) * range * 0.8; // 80% of the range
      waterLevel = safe + Math.abs(variation);
    } else if (random < 0.9) {
      // Warning range - between warning and danger levels  
      const range = Math.abs(danger - warning);
      const variation = Math.random() * range;
      waterLevel = warning + variation;
    } else {
      // Danger range - above danger level
      const excess = Math.random() * (danger * 0.15); // Up to 15% above danger
      waterLevel = danger + excess;
    }
    
    // Add some realistic fluctuation (±2%)
    const fluctuation = (Math.random() - 0.5) * (waterLevel * 0.04);
    waterLevel += fluctuation;
    
    // Ensure we don't go below a reasonable minimum (10% of safe level)
    const minimum = safe * 0.1;
    waterLevel = Math.max(waterLevel, minimum);
    
    // Round to 2 decimal places for realism
    return Math.round(waterLevel * 100) / 100;
  }

  /**
   * Generate mock photo URL for demonstration
   */
  generateMockPhotoUrl(siteId: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const timeCode = new Date().toTimeString().slice(0, 5).replace(':', '');
    const siteCode = siteId.toLowerCase().replace(/-/g, '-');
    
    return `https://storage.hydrosnap.in/readings/${timestamp}/${siteCode}-${timeCode}.jpg`;
  }

  /**
   * Generate weather conditions randomly for demonstration
   */
  generateWeatherConditions(): string {
    const conditions = [
      'Clear sky',
      'Partly cloudy', 
      'Overcast',
      'Light rain',
      'Heavy rain',
      'Sunny',
      'Humid',
      'Misty',
      'Windy',
      'Calm'
    ];
    
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Generate unique ID for reading
   */
  generateReadingId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get user level classification based on water level
   */
  getWaterLevelStatus(waterLevel: number, levels: ValidatedSiteData['levels']): {
    status: 'safe' | 'warning' | 'danger';
    message: string;
    color: string;
  } {
    const { safe, warning, danger } = levels;
    
    if (waterLevel <= safe) {
      return {
        status: 'safe',
        message: 'Safe Level',
        color: '#10B981' // Green
      };
    } else if (waterLevel <= warning) {
      return {
        status: 'safe',
        message: 'Normal Level', 
        color: '#10B981' // Green
      };
    } else if (waterLevel <= danger) {
      return {
        status: 'warning',
        message: 'Warning Level',
        color: '#F59E0B' // Amber
      };
    } else {
      return {
        status: 'danger',
        message: 'Danger Level',
        color: '#EF4444' // Red
      };
    }
  }

  /**
   * Submit a new water level reading
   */
  async submitReading(readingData: NewReadingData): Promise<{ success: boolean; message: string; readingId?: string }> {
    try {
      // Generate realistic water level if not provided
      const waterLevel = readingData.waterLevel || this.generateRealisticWaterLevel(readingData.siteData);
      
      // Create reading record
      const reading: Omit<WaterLevelReading, 'created_at'> = {
        id: this.generateReadingId(),
        user_id: '550e8400-e29b-41d4-a716-446655440001', // Mock user ID
        user_role: 'field_personnel',
        site_id: readingData.siteData.siteId,
        site_name: readingData.siteData.name,
        water_level: waterLevel,
        latitude: readingData.userLocation.latitude,
        longitude: readingData.userLocation.longitude,
        photo_url: readingData.photoUri || this.generateMockPhotoUrl(readingData.siteData.siteId),
        is_location_valid: true,
        distance_from_site: readingData.distance,
        qr_code_scanned: readingData.siteData.qrCode,
        reading_method: 'manual',
        weather_conditions: readingData.weatherConditions || this.generateWeatherConditions(),
        submission_timestamp: new Date().toISOString(),
      };

      // For now, we'll simulate database insertion
      // In production, you would use Supabase:
      // const { data, error } = await supabase
      //   .from('water_level_readings')
      //   .insert(reading);

      // Mock successful insertion
      console.log('📊 New Water Level Reading:', {
        siteId: reading.site_id,
        siteName: reading.site_name,
        waterLevel: `${reading.water_level}cm`,
        location: `${reading.latitude.toFixed(6)}, ${reading.longitude.toFixed(6)}`,
        distance: `${reading.distance_from_site}m from site`,
        qrCode: reading.qr_code_scanned,
        weather: reading.weather_conditions,
        timestamp: reading.submission_timestamp
      });

      // Store in memory for demonstration (in production use AsyncStorage or Supabase)
      // For now, we'll just log the reading
      console.log('✅ Reading saved:', reading);

      return {
        success: true,
        message: 'Water level reading submitted successfully!',
        readingId: reading.id
      };

    } catch (error) {
      console.error('Failed to submit reading:', error);
      return {
        success: false,
        message: 'Failed to submit reading. Please try again.'
      };
    }
  }

  /**
   * Get recent readings for a site
   */
  async getRecentReadings(siteId: string, limit: number = 10): Promise<WaterLevelReading[]> {
    try {
      // For demonstration, return empty array
      // In production, implement with AsyncStorage or Supabase
      console.log(`Getting recent readings for site: ${siteId}, limit: ${limit}`);
      return [];

    } catch (error) {
      console.error('Failed to get recent readings:', error);
      return [];
    }
  }

  /**
   * Get all readings (for demonstration)
   */
  getAllStoredReadings(): WaterLevelReading[] {
    try {
      // For demonstration, return empty array
      // In production, implement with AsyncStorage or Supabase
      return [];
    } catch (error) {
      console.error('Failed to get stored readings:', error);
      return [];
    }
  }
}

export const waterLevelReadingsService = new WaterLevelReadingsService();