// Performance optimization configurations for the HydroSnap app

export const PERFORMANCE_CONFIG = {
  // Reduce initial data load
  INITIAL_SITES_LIMIT: 10,
  
  // Disable heavy operations on startup
  ENABLE_AUTO_REFRESH_ON_STARTUP: false,
  
  // Longer intervals to reduce server load
  DEFAULT_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes
  
  // Location fetch delay to improve initial render
  LOCATION_FETCH_DELAY: 2000, // 2 seconds
  
  // Skip data enrichment for large datasets
  MAX_SITES_FOR_ENRICHMENT: 50,
  
  // Debounce search and filter operations
  SEARCH_DEBOUNCE_MS: 300,
  
  // Lazy load heavy components
  ENABLE_LAZY_LOADING: true,
  
  // Reduce console logging in production
  ENABLE_VERBOSE_LOGGING: __DEV__,
} as const;

export const NETWORK_CONFIG = {
  // Timeout settings
  REQUEST_TIMEOUT: 10000, // 10 seconds
  
  // Retry configuration
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
  
  // Batch operations to reduce network calls
  ENABLE_BATCH_OPERATIONS: true,
} as const;

// App startup optimization
export const STARTUP_CONFIG = {
  // Skip non-essential operations during startup
  SKIP_LOCATION_ON_STARTUP: true,
  SKIP_DATA_ENRICHMENT_ON_STARTUP: true,
  
  // Progressive loading
  ENABLE_PROGRESSIVE_LOADING: true,
  
  // Cache settings
  ENABLE_CACHE: true,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;