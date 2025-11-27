import { supabase } from '../lib/supabase';
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
  predictedWaterLevel: number; // ML model prediction
  waterLevel: number; // Final water level (may be manually adjusted)
  photoUri: string;
  userLocation: { latitude: number; longitude: number };
  distance: number;
  
  // QR Code Details
  qrScannedAt?: Date;
  
  // Photo Analysis
  photoAnalysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  predictionConfidence?: number; // 0-100
  manualOverride?: boolean;
  manualOverrideReason?: string;
  
  // Water Level Status
  waterLevelStatus: 'safe' | 'warning' | 'danger' | 'critical';
  alertTriggered?: boolean;
  alertType?: 'flood_warning' | 'drought_warning' | 'rapid_rise' | 'rapid_fall' | 'threshold_breach';
  previousReadingDiff?: number;
  trendStatus?: 'rising' | 'falling' | 'stable';
  
  // Data Quality & Conditions
  gaugeVisibility: 'excellent' | 'good' | 'fair' | 'poor';
  weatherConditions: string;
  lightingConditions: 'excellent' | 'good' | 'fair' | 'poor';
  imageQualityScore?: number; // 0-10
  readingMethod: 'photo_analysis' | 'manual_override';
  notes?: string;
  
  // Timestamps
  siteSelectedAt: Date;
  photoTakenAt: Date;
  analysisStartedAt?: Date;
  analysisCompletedAt?: Date;
  
  locationMetadata?: {
    breachCount: number;
    avgDistance: number;
    minDistance: number;
    maxDistance: number;
    avgAccuracy: number;
    timeInGeofence: number;
    totalUpdates: number;
  };
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
  /**
   * Upload photo to Supabase storage in organized folder structure
   */
  private async uploadPhotoToStorage(photoUri: string, siteId: string): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
    try {
      // Get current date components
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-based
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // Create filename: [site_id]_[year][month][day]_[hours][minutes][seconds].jpeg
      const filename = `${siteId}_${year}${String(month).padStart(2, '0')}${day}_${hours}${minutes}${seconds}.jpeg`;
      
      // Create storage path: year/month/filename
      const storagePath = `${year}/${month}/${filename}`;
      
      // For React Native, read the file as ArrayBuffer
      const response = await fetch(photoUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('gauge-photos')
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (error) {
        console.error('Storage upload error:', error);
        return { success: false, error: error.message };
      }
      
      // Generate public URL
      const publicUrl = `https://fibganvflundperooxfs.supabase.co/storage/v1/object/public/gauge-photos/${storagePath}`;
      
      return { success: true, photoUrl: publicUrl };
      
    } catch (error) {
      console.error('Photo upload failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async submitReading(readingData: NewReadingData): Promise<{ success: boolean; message: string; readingId?: string }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User authentication error:', userError);
        return { 
          success: false, 
          message: 'Please log in to submit readings.' 
        };
      }
      
      // Upload photo to storage first
      console.log('📤 Uploading photo to storage...');
      const photoUpload = await this.uploadPhotoToStorage(readingData.photoUri, readingData.siteData.siteId);
      
      if (!photoUpload.success) {
        return {
          success: false,
          message: `Photo upload failed: ${photoUpload.error}`
        };
      }
      
      console.log('✅ Photo uploaded successfully:', photoUpload.photoUrl);
      
      // Get user profile for role information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return {
          success: false,
          message: 'Could not fetch user profile. Please try again.'
        };
      }
      
      // Prepare reading data for database insertion
      const dbReading = {
        user_id: user.id,
        user_role: profile?.role || 'public',
        site_id: readingData.siteData.siteId,
        site_name: readingData.siteData.name,
        latitude: readingData.userLocation.latitude,
        longitude: readingData.userLocation.longitude,
        geofence_radius_used: readingData.siteData.geofenceRadius,
        qr_scanned_at: readingData.qrScannedAt?.toISOString(),
        photo_url: photoUpload.photoUrl,
        photo_analysis_status: readingData.photoAnalysisStatus || 'completed',
        predicted_water_level: readingData.predictedWaterLevel,
        prediction_confidence: readingData.predictionConfidence,
        manual_override: readingData.manualOverride || false,
        manual_override_reason: readingData.manualOverrideReason,
        water_level_status: readingData.waterLevelStatus,
        alert_triggered: readingData.alertTriggered || false,
        alert_type: readingData.alertType,
        previous_reading_diff: readingData.previousReadingDiff,
        trend_status: readingData.trendStatus || 'stable',
        gauge_visibility: readingData.gaugeVisibility,
        weather_conditions: readingData.weatherConditions,
        lighting_conditions: readingData.lightingConditions,
        image_quality_score: readingData.imageQualityScore,
        reading_method: readingData.readingMethod || 'photo_analysis',
        notes: readingData.notes,
        site_selected_at: readingData.siteSelectedAt?.toISOString(),
        photo_taken_at: readingData.photoTakenAt?.toISOString(),
        analysis_started_at: readingData.analysisStartedAt?.toISOString(),
        analysis_completed_at: readingData.analysisCompletedAt?.toISOString(),
        submission_timestamp: new Date().toISOString()
      };
      
      // Fetch the previous reading for this site to calculate difference
      console.log('🔍 Fetching previous reading for trend analysis...');
      const { data: previousReadings, error: previousError } = await supabase
        .from('water_level_readings')
        .select('predicted_water_level, submission_timestamp')
        .eq('site_id', readingData.siteData.siteId)
        .order('submission_timestamp', { ascending: false })
        .limit(1);

      let previousReadingDiff: number | null = null;
      let trendStatus: 'rising' | 'falling' | 'stable' = 'stable';

      if (!previousError && previousReadings && previousReadings.length > 0) {
        const previousWaterLevel = previousReadings[0].predicted_water_level;
        if (previousWaterLevel !== null) {
          previousReadingDiff = readingData.waterLevel - previousWaterLevel;
          
          // Determine trend based on difference (considering 2cm as threshold for significant change)
          if (previousReadingDiff > 2) {
            trendStatus = 'rising';
          } else if (previousReadingDiff < -2) {
            trendStatus = 'falling';
          } else {
            trendStatus = 'stable';
          }
          
          console.log(`📊 Previous reading: ${previousWaterLevel}cm, Current: ${readingData.waterLevel}cm, Diff: ${previousReadingDiff.toFixed(2)}cm, Trend: ${trendStatus}`);
        }
      } else if (previousError) {
        console.warn('⚠️ Could not fetch previous reading:', previousError.message);
      } else {
        console.log('ℹ️ No previous readings found for this site');
      }

      // Update the reading data with calculated values
      dbReading.previous_reading_diff = previousReadingDiff !== null ? previousReadingDiff : undefined;
      dbReading.trend_status = trendStatus;

      console.log('💾 Inserting reading data to database...');
      
      // Insert reading data to database
      const { data: insertedReading, error: insertError } = await supabase
        .from('water_level_readings')
        .insert([dbReading])
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Database insertion error:', insertError);
        return {
          success: false,
          message: `Database error: ${insertError.message}`
        };
      }
      
      console.log('✅ Reading successfully submitted:', insertedReading);
      
      return {
        success: true,
        message: 'Water level reading submitted successfully!',
        readingId: insertedReading.id
      };

    } catch (error) {
      console.error('Failed to submit reading:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit reading. Please try again.'
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