/**
 * QR Code Decryption Service
 * Handles decryption of encrypted QR codes from monitoring sites using proper Fernet implementation
 */

import { decryptQRData as fernetDecryptQRData, DecryptedQRData, isFernetToken } from './fernetDecryptionService';

// Re-export the interface for compatibility
export { DecryptedQRData };

/**
 * Detect if QR data is encrypted (Fernet token)
 */
export const isEncryptedQRData = (qrData: string): boolean => {
  return isFernetToken(qrData);
};

/**
 * Main QR decryption function using proper Fernet implementation
 */
export const decryptQRData = async (encryptedData: string): Promise<DecryptedQRData | null> => {
  try {
    console.log('🔓 Starting QR decryption...');
    console.log('📊 Data length:', encryptedData.length);
    
    // Use the proper Fernet decryption service
    const result = await fernetDecryptQRData(encryptedData);
    
    if (result) {
      console.log('✅ Successfully decrypted QR data');
      console.log('🎯 Site ID:', result.siteId);
      return result;
    } else {
      console.error('❌ Failed to decrypt QR data');
      return null;
    }
  } catch (error) {
    console.error('❌ QR decryption error:', error);
    return null;
  }
};

/**
 * Validate decrypted QR data integrity
 */
export const validateDecryptedData = (data: DecryptedQRData): boolean => {
  const requiredFields = ['siteId', 'name', 'coordinates', 'levels'];
  return requiredFields.every(field => data[field as keyof DecryptedQRData] !== undefined);
};

/**
 * Check if QR code has expired
 */
export const isQRCodeExpired = (data: DecryptedQRData): boolean => {
  if (!data.expiresAt) return false;
  
  try {
    const expiryDate = new Date(data.expiresAt);
    const now = new Date();
    return now > expiryDate;
  } catch (error) {
    console.error('Error checking QR expiry:', error);
    return false;
  }
};