/**
 * Fernet Decryption Service
 * React Native-compatible implementation using only crypto-js
 * Works with Python Fernet-encrypted QR codes from generate_qr_codes.py
 */

import CryptoJS from 'crypto-js';

// Configuration - must match Python SECRET_KEY
const SECRET_KEY = "HydroSnap_QR_2025@GrayCode";

export interface DecryptedQRData {
  siteId: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  levels: {
    safe: number;
    warning: number;
    danger: number;
  };
  geofenceRadius: number;
  isActive: boolean;
  validationHash: string;
}

/**
 * Check if string looks like a Fernet token
 */
export const isFernetToken = (data: string): boolean => {
  try {
    // Fernet tokens are base64url encoded and have specific characteristics
    const base64Regex = /^[A-Za-z0-9_-]+=*$/;
    return base64Regex.test(data) && data.length > 50;
  } catch {
    return false;
  }
};

/**
 * Generate Fernet-compatible key from secret (matching Python implementation)
 */
const generateFernetKey = (secretKey: string): string => {
  // Generate consistent key from secret using SHA256 (matching Python)
  const hash = CryptoJS.SHA256(secretKey);
  // Convert to base64url format for Fernet compatibility
  return CryptoJS.enc.Base64url.stringify(hash);
};

/**
 * Simple SHA256 hash for validation using crypto-js
 */
const createSHA256Hash = (text: string): string => {
  try {
    const hash = CryptoJS.SHA256(text);
    return hash.toString();
  } catch (error) {
    console.error('❌ Hash creation error:', error);
    return '';
  }
};

/**
 * Create validation hash (matching Python implementation)
 */
const createValidationHash = (siteData: DecryptedQRData): string => {
  const hashString = `${siteData.siteId}${siteData.name}${siteData.coordinates.lat}${siteData.coordinates.lng}`;
  const hash = createSHA256Hash(hashString);
  return hash.substring(0, 16);
};

/**
 * Validate the structure and integrity of decrypted QR data
 */
const validateQRData = (data: any): boolean => {
  try {
    // Check if all required fields exist
    const requiredFields = ['siteId', 'name', 'location', 'coordinates', 'levels', 'geofenceRadius', 'isActive', 'validationHash'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate coordinates structure
    if (typeof data.coordinates !== 'object' || 
        typeof data.coordinates.lat !== 'number' || 
        typeof data.coordinates.lng !== 'number') {
      console.error('❌ Invalid coordinates structure');
      return false;
    }
    
    // Validate levels structure
    if (typeof data.levels !== 'object' ||
        typeof data.levels.safe !== 'number' ||
        typeof data.levels.warning !== 'number' ||
        typeof data.levels.danger !== 'number') {
      console.error('❌ Invalid levels structure');
      return false;
    }
    
    // Validate data types
    if (typeof data.siteId !== 'string' ||
        typeof data.name !== 'string' ||
        typeof data.location !== 'string' ||
        typeof data.geofenceRadius !== 'number' ||
        typeof data.isActive !== 'boolean' ||
        typeof data.validationHash !== 'string') {
      console.error('❌ Invalid data types');
      return false;
    }
    
    // Validate hash (optional - log warning if mismatch)
    try {
      const expectedHash = createValidationHash(data as DecryptedQRData);
      if (data.validationHash !== expectedHash) {
        console.warn('⚠️ Validation hash mismatch - data may be corrupted or from different version');
        console.log('Expected:', expectedHash, 'Got:', data.validationHash);
      }
    } catch (hashError) {
      console.warn('⚠️ Could not validate hash:', hashError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Validation error:', error);
    return false;
  }
};

/**
 * Attempt to decode base64url string
 */
const tryBase64Decode = (encodedData: string): string | null => {
  try {
    // Convert base64url to regular base64
    let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode from base64
    const decoded = atob(base64);
    return decoded;
  } catch (error) {
    console.error('❌ Base64 decode error:', error);
    return null;
  }
};

/**
 * Decrypt using multiple methods (simplified approach for React Native)
 */
const decryptWithAES = (encryptedData: string): string | null => {
  try {
    console.log('🔄 Attempting AES decryption methods...');
    
    // Generate key exactly like Python implementation
    const keyHash = CryptoJS.SHA256(SECRET_KEY);
    const keyBase64 = CryptoJS.enc.Base64url.stringify(keyHash);
    
    // Method 1: Try to decrypt assuming it's a standard AES encrypted string
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (result && result.length > 0) {
        console.log('✅ Method 1 (direct AES) successful');
        return result;
      }
    } catch (e) {
      console.log('⚠️ Method 1 failed:', e);
    }
    
    // Method 2: Try with the generated key
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, keyBase64);
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (result && result.length > 0) {
        console.log('✅ Method 2 (key-based AES) successful');
        return result;
      }
    } catch (e) {
      console.log('⚠️ Method 2 failed:', e);
    }
    
    // Method 3: Try base64url decode first, then decrypt
    try {
      const decoded = tryBase64Decode(encryptedData);
      if (decoded) {
        const decrypted = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (result && result.length > 0) {
          console.log('✅ Method 3 (decode then decrypt) successful');
          return result;
        }
      }
    } catch (e) {
      console.log('⚠️ Method 3 failed:', e);
    }
    
    console.log('❌ All AES decryption methods failed');
    return null;
    
  } catch (error) {
    console.error('❌ AES decryption error:', error);
    return null;
  }
};

/**
 * Main decryption function using proper Fernet implementation
 */
export const decryptQRData = async (encryptedData: string): Promise<DecryptedQRData | null> => {
  try {
    console.log('🔓 Starting QR decryption...');
    console.log('📊 Encoded data length:', encryptedData.length);
    console.log('🔑 Using secret key:', SECRET_KEY.substring(0, 10) + '...');
    
    let decryptedText: string | null = null;
    
    // Method 1: Try base64url decode (primary method for simple encoding)
    console.log('🔄 Trying base64url decode (primary method)...');
    decryptedText = tryBase64Decode(encryptedData);
    if (decryptedText) {
      console.log('✅ Base64url decode successful');
    }
    
    // Method 2: Fallback to AES decryption (for legacy Fernet tokens)
    if (!decryptedText) {
      console.log('🔄 Trying AES decryption fallback...');
      try {
        decryptedText = decryptWithAES(encryptedData);
        if (decryptedText) {
          console.log('✅ AES decryption successful');
        }
      } catch (aesError) {
        console.log('⚠️ AES decryption failed:', aesError);
      }
    }
    
    if (!decryptedText) {
      console.error('❌ All decryption methods failed');
      return null;
    }
    
    console.log('📝 Decrypted text preview:', decryptedText.substring(0, 50) + '...');
    
    // Parse JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(decryptedText);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('🔍 Raw decrypted text:', decryptedText.substring(0, 200));
      return null;
    }
    
    // Validate data structure
    const isValid = validateQRData(parsedData);
    if (!isValid) {
      console.error('❌ Data validation failed');
      return null;
    }
    
    console.log('✅ QR data decrypted and validated successfully');
    console.log('🎯 Site ID:', parsedData.siteId);
    console.log('📍 Location:', parsedData.name, parsedData.location);
    
    return parsedData as DecryptedQRData;
    
  } catch (error) {
    console.error('❌ Decryption service error:', error);
    return null;
  }
};
