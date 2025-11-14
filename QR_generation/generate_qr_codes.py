"""
QR Code Generator for Monitoring Sites
Generates QR codes containing encrypted site validation data for water level monitoring.
Reads from monitoring_sites.csv and generates QR codes for all sites.
Creates organized folder structure: qr_codes/<SITE_ID>/<QR_CODE>.png
"""

import qrcode
import json
import hashlib
import base64
from datetime import datetime, timedelta
import os
import pandas as pd
import zlib
from cryptography.fernet import Fernet
from PIL import Image, ImageDraw, ImageFont

# Configuration
SECRET_KEY = "HydroSnap_QR_graycode@070505"  # Change this to your secret key

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Set paths relative to script location
QR_OUTPUT_DIR = os.path.join(SCRIPT_DIR, "qr_codes")
QR_SIZE = 8
BORDER_SIZE = 4
CSV_FILE = os.path.join(
    SCRIPT_DIR, "a.csv"
)  # CSV file with monitoring sites data


class QRCodeGenerator:
    def __init__(self, secret_key: str):
        """Initialize with encryption key"""
        # Generate consistent key from secret
        key = hashlib.sha256(secret_key.encode()).digest()
        self.cipher = Fernet(base64.urlsafe_b64encode(key))

    def create_validation_hash(self, site_data: dict) -> str:
        """Create a validation hash for the site"""
        # Combine critical site info for hash - using siteId instead of id
        try:
            hash_string = f"{site_data['siteId']}{site_data['name']}{site_data['coordinates']['lat']}{site_data['coordinates']['lng']}"
            return hashlib.sha256(hash_string.encode()).hexdigest()[:16]
        except KeyError as e:
            print(f"❌ Missing key in site_data: {e}")
            print(f"Available keys: {list(site_data.keys())}")
            raise

    def encrypt_site_data(self, site_data: dict) -> str:
        """Encrypt the site data"""
        # Compact JSON
        json_bytes = json.dumps(site_data, separators=(",", ":")).encode()
        # Compress to reduce payload length (helps keep QR version small)
        try:
            compressed = zlib.compress(json_bytes, level=9)
        except Exception:
            compressed = json_bytes
        # Fernet returns URL-safe base64 bytes already; avoid double-encoding
        token = self.cipher.encrypt(compressed)
        return token.decode()

    def generate_qr_data(self, site_info: dict) -> dict:
        """Generate QR data payload for a monitoring site"""

        # Extract only ESSENTIAL data to keep QR code compact and scannable
        try:
            qr_payload = {
                "siteId": str(site_info["id"]),
                "name": str(site_info["name"]),
                "location": str(site_info["location"]),
                "coordinates": {
                    "lat": float(site_info["latitude"]),
                    "lng": float(site_info["longitude"]),
                },
                # Keep only fields required for on-device validation
                "levels": {
                    "safe": float(site_info["safe_level"]),
                    "warning": float(site_info["warning_level"]),
                    "danger": float(site_info["danger_level"]),
                },
                "geofenceRadius": int(site_info["geofence_radius"]),
                "qrCode": str(site_info["qr_code"]),
                "isActive": bool(site_info["is_active"]),
                "generatedAt": datetime.now().isoformat(),
                "expiresAt": (
                    datetime.now() + timedelta(days=365)
                ).isoformat(),  # Valid for 1 year
                "validationHash": "",
            }

            # Add validation hash after creating the payload
            qr_payload["validationHash"] = self.create_validation_hash(qr_payload)

            return qr_payload

        except KeyError as e:
            print(f"❌ Missing required field in site data: {e}")
            print(f"Available fields: {list(site_info.keys())}")
            raise
        except (ValueError, TypeError) as e:
            print(f"❌ Data type conversion error: {e}")
            raise

    def create_qr_code_with_label(self, data: dict, site_info: dict) -> str:
        """Generate QR code image with site ID, name, and location labels"""

        try:
            # Encrypt compact payload for tamper-proof validation
            qr_data = self.encrypt_site_data(data)

            # Create QR code with lower error correction for simpler pattern
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,  # Keep low EC for compact codes
                box_size=QR_SIZE,
                border=BORDER_SIZE,
            )

            qr.add_data(qr_data)
            qr.make(fit=True)

            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")

            # Convert to RGB if needed
            if qr_img.mode != "RGB":
                qr_img = qr_img.convert("RGB")

            # Get QR code dimensions
            qr_width, qr_height = qr_img.size

            # Calculate label area heights
            top_padding = 20
            line_spacing = 10
            bottom_padding = 20

            # Estimate text heights (will be refined with actual font)
            site_id_height = 40
            site_name_height = 35

            total_label_height = site_id_height + line_spacing + site_name_height

            # Create new image with space for labels below QR
            total_height = qr_height + total_label_height + top_padding + bottom_padding
            final_img = Image.new("RGB", (qr_width, total_height), "white")

            # Paste QR code at the top
            paste_y = top_padding
            final_img.paste(qr_img, (0, paste_y, qr_width, paste_y + qr_height))

            # Add labels below QR code
            draw = ImageDraw.Draw(final_img)

            # Load fonts
            try:
                # Try to load Arial font (bold for site ID, regular for location)
                font_id = ImageFont.truetype("arial.ttf", 32)
                font_location = ImageFont.truetype("arial.ttf", 24)
            except Exception:
                try:
                    font_id = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 32)
                    font_location = ImageFont.truetype(
                        "C:\\Windows\\Fonts\\arial.ttf", 24
                    )
                except Exception:
                    # Fallback to default
                    font_id = ImageFont.load_default()
                    font_location = ImageFont.load_default()

            # Site ID text (bold, larger)
            site_id_text = str(site_info["id"])

            # Calculate text width for centering
            try:
                bbox = draw.textbbox((0, 0), site_id_text, font=font_id)
                text_width = bbox[2] - bbox[0]
            except AttributeError:
                text_width, _ = draw.textsize(site_id_text, font=font_id)

            text_x = (qr_width - text_width) // 2
            text_y = qr_height + top_padding + 10

            # Draw site ID
            draw.text((text_x, text_y), site_id_text, fill="black", font=font_id)

            # Site name and location text
            location_text = f"{site_info['name']}, {site_info['location']}"

            # Truncate if too long
            max_chars = 40
            if len(location_text) > max_chars:
                location_text = location_text[: max_chars - 3] + "..."

            # Calculate text width for centering
            try:
                bbox = draw.textbbox((0, 0), location_text, font=font_location)
                text_width = bbox[2] - bbox[0]
            except AttributeError:
                text_width, _ = draw.textsize(location_text, font=font_location)

            text_x = (qr_width - text_width) // 2
            text_y = qr_height + top_padding + 10 + site_id_height + line_spacing

            # Draw location
            draw.text(
                (text_x, text_y), location_text, fill="#333333", font=font_location
            )

            # Create folder structure: qr_codes/SITE_ID/
            safe_site_id = (
                site_info["id"].replace("-", "_").replace("/", "_").replace("\\", "_")
            )

            output_dir = os.path.join(QR_OUTPUT_DIR, safe_site_id)
            os.makedirs(output_dir, exist_ok=True)

            # Generate filename using QR code from CSV
            qr_code = (
                site_info.get("qr_code", "")
                .replace("-", "_")
                .replace("/", "_")
                .replace("\\", "_")
            )
            if not qr_code:
                qr_code = f"QR_{safe_site_id}"
            filename = f"{qr_code}.png"

            # Save the image
            filepath = os.path.join(output_dir, filename)
            final_img.save(filepath, "PNG", quality=95)

            return filepath

        except Exception as e:
            print(f"❌ Error creating QR code image: {e}")
            import traceback

            traceback.print_exc()
            raise

    def create_simple_qr_code(self, data: dict, site_info: dict) -> str:
        """Generate simple QR code without label as fallback"""

        try:
            # Encrypt compact payload for tamper-proof validation
            qr_data = self.encrypt_site_data(data)

            # Create QR code with lower error correction for simpler pattern
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=QR_SIZE,
                border=BORDER_SIZE,
            )

            qr.add_data(qr_data)
            qr.make(fit=True)

            # Create QR code image
            img = qr.make_image(fill_color="black", back_color="white")

            # Create folder structure: qr_codes/SITE_ID/
            safe_site_id = (
                site_info["id"].replace("-", "_").replace("/", "_").replace("\\", "_")
            )

            output_dir = os.path.join(QR_OUTPUT_DIR, safe_site_id)
            os.makedirs(output_dir, exist_ok=True)

            # Generate filename using QR code from CSV
            qr_code = (
                site_info.get("qr_code", "")
                .replace("-", "_")
                .replace("/", "_")
                .replace("\\", "_")
            )
            if not qr_code:
                qr_code = f"QR_{safe_site_id}"
            filename = f"{qr_code}_simple.png"

            # Save the image
            filepath = os.path.join(output_dir, filename)
            img.save(filepath)

            return filepath

        except Exception as e:
            print(f"❌ Error creating simple QR code: {e}")
            raise


def load_monitoring_sites(csv_file: str) -> pd.DataFrame:
    """Load monitoring sites data from CSV file"""
    try:
        df = pd.read_csv(csv_file)
        print(f"✅ Successfully loaded {len(df)} monitoring sites from {csv_file}")
        return df
    except FileNotFoundError:
        print(f"❌ Error: {csv_file} not found in current directory")
        print("📄 Please ensure the monitoring_sites.csv file exists")
        raise
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        raise


def generate_qr_for_site(site_data: dict, generator: QRCodeGenerator) -> tuple:
    """Generate QR code for a specific monitoring site"""

    try:
        site_id = site_data["id"]

        # Generate QR data
        qr_data = generator.generate_qr_data(site_data)

        # Try to generate QR code with label first, fallback to simple if it fails
        filepath = None
        try:
            filepath = generator.create_qr_code_with_label(qr_data, site_data)
        except Exception as e:
            print(f"  ⚠️  Failed to create QR with label: {e}")
            print("  🔄 Falling back to simple QR code...")

            try:
                filepath = generator.create_simple_qr_code(qr_data, site_data)
            except Exception as e2:
                print(f"  ❌ Failed to create simple QR code too: {e2}")
                return None, None

        # Export site data for app integration
        safe_site_id = site_id.replace("-", "_").replace("/", "_").replace("\\", "_")

        output_dir = os.path.join(QR_OUTPUT_DIR, safe_site_id)
        os.makedirs(output_dir, exist_ok=True)

        export_file = os.path.join(output_dir, f"site_data_{safe_site_id}.json")

        with open(export_file, "w") as f:
            json.dump(qr_data, f, indent=2)

        return filepath, qr_data

    except Exception as e:
        print(f"  ❌ Error generating QR code: {e}")
        import traceback

        traceback.print_exc()
        return None, None


def generate_all_qr_codes():
    """Generate QR codes for ALL monitoring sites"""

    try:
        # Create output directory
        os.makedirs(QR_OUTPUT_DIR, exist_ok=True)

        print("=" * 80)
        print("🚀 HydroSnap QR Code Generator")
        print("=" * 80)
        print()

        # Load monitoring sites data
        df = load_monitoring_sites(CSV_FILE)

        total_sites = len(df)
        print(f"📊 Total monitoring sites found: {total_sites}")
        print()

        # Initialize QR generator
        generator = QRCodeGenerator(SECRET_KEY)

        # Statistics
        successful = 0
        failed = 0
        failed_sites = []

        # Generate QR codes for all sites
        for idx, row in df.iterrows():
            site_data = row.to_dict()

            # Replace NaN values with appropriate defaults
            for key, value in site_data.items():
                if pd.isna(value):
                    if key in [
                        "safe_level",
                        "warning_level",
                        "danger_level",
                        "latitude",
                        "longitude",
                        "geofence_radius",
                    ]:
                        site_data[key] = 0.0
                    elif key == "is_active":
                        site_data[key] = True
                    else:
                        site_data[key] = ""

            site_id = site_data["id"]
            print(f"[{idx + 1}/{total_sites}] Processing: {site_id}")
            print(f"  📍 {site_data['name']}, {site_data['location']}")
            print(
                f"  🌊 River: {site_data['river_name']} | State: {site_data['state']}"
            )

            filepath, qr_data = generate_qr_for_site(site_data, generator)

            if filepath and qr_data:
                print(f"  ✅ Generated: {filepath}")
                successful += 1
            else:
                print("  ❌ Failed to generate QR code")
                failed += 1
                failed_sites.append(site_id)

            print()

        # Summary
        print("=" * 80)
        print("📊 Generation Summary")
        print("=" * 80)
        print(f"✅ Successfully generated: {successful}/{total_sites}")
        print(f"❌ Failed: {failed}/{total_sites}")

        if failed_sites:
            print(f"\n⚠️  Failed sites: {', '.join(failed_sites)}")

        print(f"\n📁 Output directory: {os.path.abspath(QR_OUTPUT_DIR)}")
        print(f"🔐 Encryption Key: {SECRET_KEY}")
        print("💡 Use this key in your React Native app for QR validation")
        print()

        # Create a summary JSON file
        summary = {
            "generatedAt": datetime.now().isoformat(),
            "totalSites": total_sites,
            "successful": successful,
            "failed": failed,
            "failedSites": failed_sites,
            "encryptionKey": SECRET_KEY,
            "folderStructure": "qr_codes/<SITE_ID>/<QR_CODE>.png",
        }

        summary_file = os.path.join(QR_OUTPUT_DIR, "generation_summary.json")
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)

        print(f"📄 Summary saved to: {summary_file}")
        print()
        print("=" * 80)
        print("🎉 QR Code generation complete!")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error generating QR codes: {e}")
        import traceback

        traceback.print_exc()


def main():
    """Main function - generates QR codes for all monitoring sites"""
    generate_all_qr_codes()


if __name__ == "__main__":
    try:
        main()
    except ImportError as e:
        print(f"❌ Missing required packages: {e}")
        print("\n📦 Install required packages with:")
        print("pip install qrcode[pil] cryptography pandas pillow")
    except KeyboardInterrupt:
        print("\n\n🛑 Operation cancelled by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback

        traceback.print_exc()
