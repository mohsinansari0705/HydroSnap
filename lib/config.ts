// Environment configuration
export const CONFIG = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fibganvflundperooxfs.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYmdhbnZmbHVuZHBlcm9veGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDc5MjcsImV4cCI6MjA3NTIyMzkyN30.xr_SUkxqfXhveSm7MgFlQIpxoChO4ihiOuDwZk04UOc',
  APP_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.hydrosnap.com',
} as const;

// Validate required environment variables
const requiredEnvVars: (keyof typeof CONFIG)[] = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(key => !CONFIG[key]);

if (missingEnvVars.length > 0 && CONFIG.APP_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}