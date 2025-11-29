-- SIMPLIFIED HYDROSNAP DATABASE SCHEMA FOR SUPABASE
-- Minimal schema for testing and deployment

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')) NOT NULL,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('central_analyst', 'supervisor', 'field_personnel', 'public')),
  organization TEXT NOT NULL,
  location TEXT NOT NULL,
  site_id TEXT, -- Only needed for field_personnel
  profile_image_url TEXT, -- URL for user profile image
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Water monitoring sites
CREATE TABLE monitoring_sites (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    river_name VARCHAR(255),
    state VARCHAR(100),
    district VARCHAR(100),
    organization VARCHAR(255) NOT NULL,
    site_type VARCHAR(50) CHECK (site_type IN ('river', 'reservoir', 'canal', 'lake', 'groundwater')),
    danger_level DECIMAL(8, 2) NOT NULL,
    warning_level DECIMAL(8, 2) NOT NULL,
    safe_level DECIMAL(8, 2) NOT NULL,
    geofence_radius INTEGER DEFAULT 125,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    qr_code_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_maintenance_date DATE,
    assigned_personnel_id UUID REFERENCES profiles(id),
    supervisor_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. WATER READINGS TABLE
CREATE TABLE water_level_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('central_analyst', 'supervisor', 'field_personnel', 'public')),
  site_id VARCHAR(100) REFERENCES monitoring_sites(id) NOT NULL,
  site_name TEXT NOT NULL,
  
  -- Site Selection & Location Validation
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  geofence_radius_used INTEGER NOT NULL, -- Radius used for validation
  
  -- QR Code Details (if QR method used)
  qr_scanned_at TIMESTAMP WITH TIME ZONE, -- When QR was scanned
  
  -- Photo Analysis (MANDATORY)
  photo_url TEXT NOT NULL, -- Must have photo to submit
  photo_analysis_status TEXT CHECK (photo_analysis_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  predicted_water_level DECIMAL(10,2), -- ML prediction from photo
  prediction_confidence DECIMAL(5,2), -- 0-100% confidence score
  manual_override BOOLEAN DEFAULT FALSE, -- True if user manually adjusted prediction
  manual_override_reason TEXT, -- Why user overrode prediction
  
  -- Water Level Analysis & Alerts
  water_level_status TEXT CHECK (water_level_status IN ('safe', 'warning', 'danger', 'critical')) NOT NULL,
  alert_triggered BOOLEAN DEFAULT FALSE, -- If this reading triggered an alert
  alert_type TEXT CHECK (alert_type IN ('flood_warning', 'drought_warning', 'rapid_rise', 'rapid_fall', 'threshold_breach')),
  previous_reading_diff DECIMAL(10,2), -- Difference from last reading at this site
  trend_status TEXT CHECK (trend_status IN ('rising', 'falling', 'stable')),
  
  -- Data Quality & Conditions
  gauge_visibility TEXT CHECK (gauge_visibility IN ('excellent', 'good', 'fair', 'poor')) NOT NULL,
  weather_conditions VARCHAR(100),
  lighting_conditions TEXT CHECK (lighting_conditions IN ('excellent', 'good', 'fair', 'poor')),
  image_quality_score DECIMAL(3,1), -- 0-10 score for image quality
  reading_method VARCHAR(50) CHECK (reading_method IN ('photo_analysis', 'manual_override')) DEFAULT 'photo_analysis',
  notes TEXT, -- Additional observations
  
  -- Timestamps for Analytics
  site_selected_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When site was selected/QR scanned
  photo_taken_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When photo was captured
  analysis_started_at TIMESTAMP WITH TIME ZONE, -- When ML analysis began
  analysis_completed_at TIMESTAMP WITH TIME ZONE, -- When ML analysis finished
  submission_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_level_readings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
-- Allow public read access for login phone/email lookup
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS POLICIES FOR WATER LEVEL READINGS
CREATE POLICY "Anyone can view water level readings" ON water_level_readings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own water level readings" ON water_level_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water level readings" ON water_level_readings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS POLICIES FOR MONITORING SITES
CREATE POLICY "Public can view sites" ON monitoring_sites
  FOR SELECT USING (is_active = TRUE);

-- RLS POLICIES FOR STORAGE BUCKET: profile-images
CREATE POLICY "Allow authenticated users to upload profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND name LIKE (storage.foldername(name))[1] || '/' || auth.uid()::text || '_photo%'
  AND (storage.foldername(name))[1] IN ('field_personnel', 'central_analyst', 'supervisor', 'public_user')
);

CREATE POLICY "Allow public to view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'profile-images'
);

CREATE POLICY "Allow users to update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND name LIKE (storage.foldername(name))[1] || '/' || auth.uid()::text || '_photo%'
)
WITH CHECK (
  bucket_id = 'profile-images'
  AND name LIKE (storage.foldername(name))[1] || '/' || auth.uid()::text || '_photo%'
  AND (storage.foldername(name))[1] IN ('field_personnel', 'central_analyst', 'supervisor', 'public_user')
);

CREATE POLICY "Allow users to delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND name LIKE (storage.foldername(name))[1] || '/' || auth.uid()::text || '_photo%'
);

-- UPDATE TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_monitoring_sites_updated_at
  BEFORE UPDATE ON monitoring_sites
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
