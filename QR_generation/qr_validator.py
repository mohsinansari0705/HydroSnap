"""
QR Code Decoder and Validator for Monitoring Sites
Decodes and validates QR codes generated for water level monitoring sites.
"""

import json
import hashlib
import base64
from datetime import datetime
from cryptography.fernet import Fernet
from typing import Dict, Optional, Tuple

class QRCodeValidator:
    def __init__(self, secret_key: str):
        """Initialize with encryption key"""
        # Generate consistent key from secret
        key = hashlib.sha256(secret_key.encode()).digest()
        self.cipher = Fernet(base64.urlsafe_b64encode(key))
        
    def decrypt_qr_data(self, encrypted_data: str) -> Optional[Dict]:
        """Decrypt QR code data"""
        try:
            # Decode base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Decrypt
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)
            
            # Parse JSON
            site_data = json.loads(decrypted_bytes.decode())
            
            return site_data
        except Exception as e:
            print(f"❌ Decryption failed: {e}")
            return None
    
    def validate_site_hash(self, site_data: Dict) -> bool:
        """Validate the site data integrity"""
        try:
            # Extract stored hash
            stored_hash = site_data.get("validationHash", "")
            
            # Create verification hash (same logic as generator)
            hash_string = f"{site_data['siteId']}{site_data['name']}{site_data['coordinates']['lat']}{site_data['coordinates']['lng']}"
            expected_hash = hashlib.sha256(hash_string.encode()).hexdigest()[:16]
            
            return stored_hash == expected_hash
        except Exception as e:
            print(f"❌ Hash validation failed: {e}")
            return False
    
    def check_expiry(self, site_data: Dict) -> bool:
        """Check if QR code is still valid (not expired)"""
        try:
            expires_at = datetime.fromisoformat(site_data.get("expiresAt", ""))
            return datetime.now() < expires_at
        except Exception as e:
            print(f"❌ Expiry check failed: {e}")
            return False
    
    def validate_qr_code(self, qr_content: str) -> Tuple[bool, Optional[Dict], str]:
        """
        Complete QR code validation
        Returns: (is_valid, site_data, error_message)
        """
        
        # Step 1: Decrypt the QR content
        site_data = self.decrypt_qr_data(qr_content)
        if not site_data:
            return False, None, "Invalid QR code format or decryption failed"
        
        # Step 2: Check if site is active
        if not site_data.get("isActive"):
            return False, site_data, "This monitoring site is currently inactive"
        
        # Step 3: Validate data integrity
        if not self.validate_site_hash(site_data):
            return False, site_data, "QR code data has been tampered with"
        
        # Step 4: Check expiry
        if not self.check_expiry(site_data):
            return False, site_data, "QR code has expired"
        
        return True, site_data, "QR code is valid"
    
    def get_site_validation_response(self, site_data: Dict) -> Dict:
        """Generate the response data for app after successful validation"""
        return {
            "success": True,
            "message": "Site validated successfully",
            "siteInfo": {
                "id": site_data["siteId"],
                "name": site_data["name"],
                "location": site_data["location"],
                "river": site_data["riverName"],
                "state": site_data["state"],
                "district": site_data["district"],
                "coordinates": site_data["coordinates"],
                "siteType": site_data["siteType"],
                "organization": site_data["organization"]
            },
            "levels": site_data["levels"],
            "geofence": {
                "radius": site_data["geofenceRadius"],
                "center": site_data["coordinates"]
            },
            "validation": {
                "qrCode": site_data["qrCode"],
                "validatedAt": datetime.now().isoformat(),
                "generatedAt": site_data["generatedAt"]
            }
        }

def demo_validation():
    """Demo function to show QR validation"""
    
    SECRET_KEY = "HYDROSNAP_VALIDATION_KEY_2025"  # Must match the generator
    validator = QRCodeValidator(SECRET_KEY)
    
    # Sample encrypted QR content (you would get this from scanning)
    # For demo, let's use a sample from the generator
    sample_encrypted_qr = "gAAAAABnDvHX..."  # This would be the actual scanned content
    
    print("🔍 QR Code Validation Demo")
    print("=" * 50)
    
    # Validate the QR code
    is_valid, site_data, message = validator.validate_qr_code(sample_encrypted_qr)
    
    if is_valid:
        print("✅ QR Code Validation: SUCCESS")
        response = validator.get_site_validation_response(site_data)
        print(f"📍 Site: {response['siteInfo']['name']}")
        print(f"📍 Location: {response['siteInfo']['location']}, {response['siteInfo']['state']}")
        print(f"🌊 River: {response['siteInfo']['river']}")
        print(f"📊 Safe Level: {response['levels']['safe']} cm")
        print(f"⚠️  Warning Level: {response['levels']['warning']} cm")
        print(f"🚨 Danger Level: {response['levels']['danger']} cm")
        print(f"🎯 Geofence Radius: {response['geofence']['radius']} meters")
        
        return response
    else:
        print(f"❌ QR Code Validation: FAILED")
        print(f"❌ Error: {message}")
        return None

def validate_location_proximity(user_lat: float, user_lng: float, site_data: Dict) -> Tuple[bool, float]:
    """
    Check if user is within the geofence of the monitoring site
    Returns: (is_within_geofence, distance_in_meters)
    """
    from math import radians, cos, sin, asin, sqrt
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points on earth (in meters)"""
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371000  # Radius of earth in meters
        return c * r
    
    site_coords = site_data["coordinates"]
    distance = haversine_distance(
        user_lat, user_lng,
        site_coords["lat"], site_coords["lng"]
    )
    
    geofence_radius = site_data["geofenceRadius"]
    is_within = distance <= geofence_radius
    
    return is_within, distance

if __name__ == "__main__":
    demo_validation()