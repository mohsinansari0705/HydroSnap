export interface Profile {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: 'central_analyst' | 'supervisor' | 'field_personnel' | 'public';
  organization?: string;
  location?: string;
  site_id?: string; // For field personnel assigned to specific monitoring sites
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface MonitoringSite {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  river_name?: string;
  state?: string;
  district?: string;
  organization: string;
  site_type: 'river' | 'reservoir' | 'canal' | 'lake' | 'groundwater';
  danger_level: number;
  warning_level: number;
  safe_level: number;
  geofence_radius: number;
  qr_code: string;
  is_active: boolean;
  last_maintenance_date?: string;
  assigned_personnel_id?: string;
  supervisor_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WaterLevelReading {
  id: string;
  user_id: string;
  user_role: string;
  site_id: string;
  site_name: string;
  water_level: number;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  is_location_valid: boolean;
  distance_from_site?: number;
  qr_code_scanned?: string;
  reading_method?: 'manual' | 'photo_analysis';
  weather_conditions?: string;
  submission_timestamp?: string;
  created_at?: string;
}