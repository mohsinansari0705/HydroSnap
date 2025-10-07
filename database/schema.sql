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
    danger_level DECIMAL(8, 2) NOT NULL, -- in cm
    warning_level DECIMAL(8, 2) NOT NULL, -- in cm
    safe_level DECIMAL(8, 2) NOT NULL, -- in cm
    geofence_radius INTEGER DEFAULT 125, -- in meters
    qr_code VARCHAR(100) UNIQUE NOT NULL,
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
  user_role TEXT NOT NULL CHECK (user_role IN ('central_analyst', 'supervisor', 'field_personnel', 'public')), -- Role of the user submitting the reading
  site_id VARCHAR(100) REFERENCES monitoring_sites(id) NOT NULL,
  site_name TEXT NOT NULL,
  water_level DECIMAL(10,2) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  photo_url TEXT,
  is_location_valid BOOLEAN NOT NULL,
  distance_from_site INTEGER, -- Distance from site center in meters
  qr_code_scanned VARCHAR(100),
  reading_method VARCHAR(50) CHECK (reading_method IN ('manual', 'photo_analysis')),
  weather_conditions VARCHAR(100),
  submission_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_level_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sites ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

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

-- SAMPLE MONITORING SITES FOR TESTING
INSERT INTO monitoring_sites (
    id, name, location, latitude, longitude, river_name, state, district,
    organization, site_type, danger_level, warning_level, safe_level,
    qr_code
) VALUES 
    ('SITE001', 'Gomti River Bridge', 'Lucknow, UP', 26.8467, 80.9462, 'Gomti', 'Uttar Pradesh', 'Lucknow', 'CWC UP', 'river', 450.0, 350.0, 250.0, 'QR001'),
    ('SITE002', 'Yamuna Ghat', 'Agra, UP', 27.1767, 78.0081, 'Yamuna', 'Uttar Pradesh', 'Agra', 'CWC UP', 'river', 480.0, 380.0, 280.0, 'QR002'),
    ('SITE003', 'Ganga Ghat', 'Varanasi, UP', 25.3176, 82.9739, 'Ganga', 'Uttar Pradesh', 'Varanasi', 'CWC UP', 'river', 520.0, 420.0, 320.0, 'QR003'),
    ('SITE004', 'Ram Sagar Reservoir', 'Balrampur, UP', 27.4305, 82.1818, 'Ram Sagar', 'Uttar Pradesh', 'Balrampur', 'CWC UP', 'reservoir', 300.0, 250.0, 200.0, 'QR004'),
    ('SITE005', 'Sharda Canal', 'Pilibhit, UP', 28.6329, 79.8043, 'Sharda', 'Uttar Pradesh', 'Pilibhit', 'CWC UP', 'canal', 180.0, 150.0, 120.0, 'QR005');