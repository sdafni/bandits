#!/usr/bin/env python3
"""
Complete DOCX to Database Pipeline
==================================
This script handles the entire workflow from DOCX file to populated Supabase database:
1. Convert DOCX to PDF (using system tools)
2. Extract text with image placeholders
3. Process with AI (DeepSeek API) to structure data
4. Extract and upload images to Supabase storage
5. Combine structured data with image URLs
6. Populate database with all bandits and events

Usage:
    python docx_to_database.py input.docx

Requirements:
    - Install dependencies: pip install -r requirements.txt
    - Set up .env file with API keys
    - Install LibreOffice for DOCX->PDF conversion: brew install --cask libreoffice
"""

import fitz  # PyMuPDF
import json
import os
import sys
import uuid
import re
import subprocess
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import anthropic
import requests
import time

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
BUCKET_NAME = os.getenv('BUCKET_NAME', 'banditsassets4')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')  # For DeepSeek API
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')  # For geocoding

# Pipeline settings
DRY_RUN = True
EMPTY_BUCKET_BEFORE_UPLOAD = False  # Set to True to empty bucket, False to reuse existing images
MAX_BANDITS = 500  # Maximum number of bandits to process

# Geocoding settings
GEOCODING_CACHE_FILE = "geocoding_cache.json"  # Cache file for geocoding results
USE_FREE_GEOCODING = True  # Use free Nominatim service instead of Google Maps

# AI Model settings
USE_DEEPSEEK = True  # Set to True to use DeepSeek instead of Claude

# Initialize clients
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

ai_client = None
if USE_DEEPSEEK and DEEPSEEK_API_KEY:
    ai_client = requests  # DeepSeek uses direct HTTP requests
elif ANTHROPIC_API_KEY:
    ai_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

class DocumentProcessor:
    def __init__(self, docx_path: str):
        self.docx_path = Path(docx_path)
        # Always use banditsORIG.docx.pdf
        self.pdf_path = Path("banditsORIG.docx.pdf")
        self.output_dir = Path("pdf_output")
        self.output_dir.mkdir(exist_ok=True)
        
    def convert_docx_to_pdf(self) -> Path:
        """Use existing banditsORIG.docx.pdf"""
        print(f"📄 Using existing PDF: {self.pdf_path}")
        
        if self.pdf_path.exists():
            print(f"✅ PDF found: {self.pdf_path}")
            return self.pdf_path
        else:
            raise Exception(f"Required PDF file not found: {self.pdf_path}")
            
    def empty_bucket(self):
        """Empty the entire bucket recursively before uploading new images"""
        print("🗑️  Emptying bucket recursively...")
        
        if not supabase:
            print("❌ Supabase not configured")
            return
        
        try:
            # List all files in the bucket recursively
            all_files = []
            
            # Get root level files
            root_files = supabase.storage.from_(BUCKET_NAME).list()
            for file_info in root_files:
                if 'name' in file_info:
                    all_files.append(file_info['name'])
            
            # Get files from pdf_images folder
            try:
                pdf_files = supabase.storage.from_(BUCKET_NAME).list(path="pdf_images/")
                for file_info in pdf_files:
                    if 'name' in file_info:
                        all_files.append(f"pdf_images/{file_info['name']}")
            except:
                pass  # Folder might not exist
            
            # Get files from vision_images folder
            try:
                vision_files = supabase.storage.from_(BUCKET_NAME).list(path="vision_images/")
                for file_info in vision_files:
                    if 'name' in file_info:
                        all_files.append(f"vision_images/{file_info['name']}")
            except:
                pass  # Folder might not exist
            
            if all_files:
                print(f"   Found {len(all_files)} files to delete")
                
                # Delete all files at once
                try:
                    supabase.storage.from_(BUCKET_NAME).remove(all_files)
                    print(f"   🗑️  Deleted {len(all_files)} files from bucket")
                except Exception as e:
                    print(f"   ❌ Error deleting files: {e}")
                    # Try deleting individually as fallback
                    for file_path in all_files:
                        try:
                            supabase.storage.from_(BUCKET_NAME).remove([file_path])
                            print(f"   🗑️  Deleted {file_path}")
                        except Exception as e2:
                            print(f"   ❌ Error deleting {file_path}: {e2}")
            else:
                print("   ✅ Bucket already empty")
                
        except Exception as e:
            print(f"   ❌ Error emptying bucket: {e}")

    def find_bandit_patterns_in_lines(self, lines: List[str], start_index: int = 0, max_bandits: int = None) -> List[Dict[str, Any]]:
        """Helper method to find bandit patterns by finding Age: and looking backwards for name and image"""
        import re
        found_patterns = []

        for i, line in enumerate(lines[start_index:], start_index):
            if 'Age:' in line:
                age_pattern = re.search(r'Age:\s*(\d+)', line)
                if age_pattern:
                    age_value = age_pattern.group(1)

                    # Look backwards to find the first name and image
                    found_name = None
                    found_image = None

                    # Search backwards from the age line
                    for j in range(i-1, max(i-10, start_index-1), -1):
                        line_stripped = lines[j].strip()

                        # Look for potential name first (if we haven't found one yet)
                        if (found_name is None and line_stripped and '[IMAGE:' not in line_stripped):
                            # Check if this is a single word starting with capital letter
                            words = line_stripped.split()
                            if (len(words) == 1 and  # Single word only
                                words[0][0].isupper() and  # Starts with capital letter
                                words[0].isalpha() and  # All alphabetic characters
                                len(words[0]) > 1):  # At least 2 characters

                                found_name = {
                                    'line_index': j,
                                    'name': line_stripped
                                }

                        # Look for IMAGE placeholder
                        if '[IMAGE:' in line_stripped and found_image is None:
                            image_match = re.search(r'\[IMAGE:\s*([^]]+)\]', line_stripped)
                            if image_match:
                                found_image = {
                                    'line_index': j,
                                    'image_id': image_match.group(1),
                                    'image_line': line_stripped
                                }

                        # Stop if we found both
                        if found_name and found_image:
                            break

                    # If we found both name and image, create a pattern
                    if found_name and found_image:
                        pattern = {
                            'line_index': found_image['line_index'],
                            'image_id': found_image['image_id'],
                            'name': found_name['name'],
                            'age': age_value,
                            'name_line_index': found_name['line_index'],
                            'image_line': found_image['image_line']
                        }
                        found_patterns.append(pattern)

                        # Stop if we've reached the maximum
                        if max_bandits and len(found_patterns) >= max_bandits:
                            break

        return found_patterns

    def clean_text(self, text: str) -> str:
        """Clean text by removing non-readable characters and normalizing whitespace"""
        # Remove common non-readable characters
        text = re.sub(r'[^\x00-\x7F\u00A0-\uFFFF]', '', text)
        text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
        text = re.sub(r'●​', '', text)
        text = re.sub(r'\|]=\[', '', text)
        text = re.sub(r'[^\w\s\.,!?;:()[\]{}"\'-]', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text

    def extract_text_with_placeholders(self) -> Dict[str, Any]:
        """Extract PDF text and replace images with placeholders (limited to first MAX_BANDITS bandits)"""
        print(f"🔍 Extracting text from PDF: {self.pdf_path} (first {MAX_BANDITS} bandits only)")
        
        doc = fitz.open(str(self.pdf_path))
        readable_text = ""
        image_map = {}
        image_counter = 0
        max_bandits = MAX_BANDITS
        found_bandits = []  # Track found bandits to avoid duplicates
        
        # Process all pages to extract text and images
        for page_num in range(1, len(doc) + 1):
            page = doc[page_num - 1]  # fitz uses 0-based indexing
            print(f"📖 Processing page {page_num}...")
            
            blocks = page.get_text("dict")["blocks"]
            sorted_blocks = sorted(blocks, key=lambda b: (b.get("bbox", [0, 0, 0, 0])[1], b.get("bbox", [0, 0, 0, 0])[0]))
            
            for block in sorted_blocks:
                if "lines" in block:  # Text block
                    for line in block["lines"]:
                        for span in line["spans"]:
                            if span["text"].strip():
                                cleaned_text = self.clean_text(span["text"].strip())
                                if cleaned_text:
                                    readable_text += cleaned_text + "\n"
                
                elif "image" in block:  # Image block
                    image_counter += 1
                    placeholder_id = f"img_{page_num:03d}_{image_counter:03d}"
                    readable_text += f"[IMAGE: {placeholder_id}]\n"
                    image_map[placeholder_id] = block["image"]  # Store raw image data
        
        doc.close()
        
        # Now analyze the complete text to find bandits with debugging
        # Pattern: [IMAGE: xxx] followed by name, followed by "Age:"
        print(f"\n🔍 Analyzing complete text for bandit patterns (IMAGE -> Name -> Age)...")
        lines = readable_text.split('\n')

        # Use helper method to find patterns
        patterns = self.find_bandit_patterns_in_lines(lines, max_bandits=max_bandits)

        # Process patterns and create bandit keys
        for pattern in patterns:
            print(f"🖼️  Found image at line {pattern['line_index']}: {pattern['image_line']} -> ID: {pattern['image_id']}")
            print(f"   🤔 Potential name at line {pattern['name_line_index']}: '{pattern['name']}'")
            print(f"   ✅ Found Age: {pattern['age']}")

            # Create a unique identifier: name_age_imageid
            bandit_key = f"{pattern['name']}_{pattern['age']}_{pattern['image_id']}"

            # Check for duplicates (same name+age+image combination)
            if bandit_key not in found_bandits:
                found_bandits.append(bandit_key)
                print(f"🎯 CONFIRMED BANDIT #{len(found_bandits)}: {pattern['name']}, Age: {pattern['age']}, Image: {pattern['image_id']}")
            else:
                print(f"   ⚠️  Duplicate bandit ignored: {pattern['name']} (same name+age+image)")

        if len(found_bandits) >= max_bandits:
            print(f"✅ Reached maximum of {max_bandits} bandits")
        
        print(f"\n📊 BANDIT DETECTION SUMMARY:")
        print(f"   Total bandits found: {len(found_bandits)}")
        print(f"   Bandits list:")
        for i, bandit_key in enumerate(found_bandits, 1):
            parts = bandit_key.split('_')
            if len(parts) >= 3:
                # New format: name_age_imageid
                name = parts[0]
                age = parts[1] if parts[1] and parts[1] != 'None' else "Unknown"
                image_id = '_'.join(parts[2:])  # Join remaining parts for image ID
                print(f"   {i:2d}. {name} (Age: {age}) [Image: {image_id}]")
            else:
                # Fallback for old format
                name = parts[0] if len(parts) > 0 else "Unknown"
                age = parts[1] if len(parts) > 1 else "Unknown"
                print(f"   {i:2d}. {name} (Age: {age})")
        
        return {
            "readable_text": readable_text,
            "image_data": image_map,
            "total_images": len(image_map),
            "detected_bandits_count": len(found_bandits),
            "detected_bandits_list": found_bandits
        }

    def detect_and_crop_face(self, image_data: bytes) -> Tuple[bytes, bool]:
        """Improved face detection and cropping algorithm"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return image_data, False
            
            img_height, img_width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            # Use improved face detection parameters
            faces = face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.02,  # More sensitive
                minNeighbors=2,    # More sensitive  
                minSize=(15, 15)   # Smaller minimum size
            )
            
            if len(faces) == 0:
                return image_data, False
            
            # Get largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            # Validate face size
            face_area_percentage = (w * h) / (img_width * img_height) * 100
            if face_area_percentage < 0.5 or face_area_percentage > 60:
                return image_data, False
            
            # Calculate face center
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            
            # Create square crop centered on face
            face_size = max(w, h)
            padding_factor = 2.0
            crop_size = int(face_size * padding_factor)
            crop_size = min(crop_size, min(img_width, img_height))
            
            half_crop = crop_size // 2
            crop_left = max(0, face_center_x - half_crop)
            crop_right = min(img_width, face_center_x + half_crop)
            crop_top = max(0, face_center_y - half_crop)
            crop_bottom = min(img_height, face_center_y + half_crop)
            
            # Adjust boundaries if needed
            if crop_right - crop_left < crop_size:
                if crop_left == 0:
                    crop_right = min(img_width, crop_size)
                else:
                    crop_left = max(0, img_width - crop_size)
            
            if crop_bottom - crop_top < crop_size:
                if crop_top == 0:
                    crop_bottom = min(img_height, crop_size)
                else:
                    crop_top = max(0, img_height - crop_size)
            
            if crop_left >= crop_right or crop_top >= crop_bottom:
                return image_data, False
            
            # Perform crop
            cropped_img = img[crop_top:crop_bottom, crop_left:crop_right]
            success, encoded_img = cv2.imencode('.jpg', cropped_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            if success:
                return encoded_img.tobytes(), True
            else:
                return image_data, False
                
        except Exception as e:
            print(f"⚠️  Error in improved face detection: {str(e)}")
            return image_data, False

    def load_geocoding_cache(self) -> Dict[str, Dict[str, Any]]:
        """Load geocoding cache from file"""
        cache_path = Path(GEOCODING_CACHE_FILE)
        if cache_path.exists():
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    cache = json.load(f)
                print(f"📂 Loaded geocoding cache with {len(cache)} entries")
                return cache
            except Exception as e:
                print(f"⚠️  Error loading geocoding cache: {str(e)}")
                return {}
        else:
            print(f"📂 No existing geocoding cache found, will create new one")
            return {}
    
    def save_geocoding_cache(self, cache: Dict[str, Dict[str, Any]]):
        """Save geocoding cache to file"""
        try:
            cache_path = Path(GEOCODING_CACHE_FILE)
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)
            print(f"💾 Saved geocoding cache with {len(cache)} entries")
        except Exception as e:
            print(f"❌ Error saving geocoding cache: {str(e)}")
    
    def geocode_with_nominatim(self, full_address: str) -> Tuple[Optional[float], Optional[float]]:
        """Use free Nominatim (OpenStreetMap) geocoding service"""
        try:
            # Nominatim API (free, no API key required)
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': full_address,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            headers = {
                'User-Agent': 'BanditsApp/1.0 (geocoding for Athens events)'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                result = data[0]
                lat = float(result['lat'])
                lng = float(result['lon'])
                return lat, lng
            else:
                return None, None
                
        except Exception as e:
            print(f"   ❌ Nominatim geocoding error: {str(e)}")
            return None, None
    
    def geocode_with_google(self, full_address: str) -> Tuple[Optional[float], Optional[float]]:
        """Use Google Maps geocoding service (requires API key)"""
        if not GOOGLE_MAPS_API_KEY:
            return None, None
            
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                'address': full_address,
                'key': GOOGLE_MAPS_API_KEY
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and len(data['results']) > 0:
                location = data['results'][0]['geometry']['location']
                lat = location['lat']
                lng = location['lng']
                return lat, lng
            elif data['status'] == 'ZERO_RESULTS':
                return None, None
            elif data['status'] == 'OVER_QUERY_LIMIT':
                print(f"   ❌ Google Maps API quota exceeded")
                return None, None
            else:
                print(f"   ❌ Google geocoding failed: {data['status']}")
                return None, None
                
        except Exception as e:
            print(f"   ❌ Google geocoding error: {str(e)}")
            return None, None
    
    def geocode_address(self, address: str, city: str = "Athens, Greece", cache: Dict[str, Dict[str, Any]] = None) -> Tuple[Optional[float], Optional[float]]:
        """Geocode an address to get latitude and longitude coordinates with caching"""
        if not address or not address.strip():
            return None, None
        
        # Clean and format the address
        full_address = f"{address.strip()}, {city}"
        cache_key = full_address.lower()
        
        # Check cache first
        if cache and cache_key in cache:
            cached_result = cache[cache_key]
            lat = cached_result.get('latitude')
            lng = cached_result.get('longitude')
            if lat is not None and lng is not None:
                print(f"📋 Using cached coordinates for: {full_address} -> {lat}, {lng}")
                return lat, lng
            else:
                print(f"📋 Found cached negative result for: {full_address}")
                return None, None
        
        print(f"🌍 Geocoding address: {full_address}")
        
        # Try geocoding services
        lat, lng = None, None
        
        if USE_FREE_GEOCODING:
            print(f"   🆓 Trying Nominatim (free)...")
            lat, lng = self.geocode_with_nominatim(full_address)
            
            # If Nominatim fails and Google API is available, try Google as fallback
            if (lat is None or lng is None) and GOOGLE_MAPS_API_KEY:
                print(f"   🔄 Nominatim failed, trying Google Maps as fallback...")
                lat, lng = self.geocode_with_google(full_address)
        else:
            # Use Google first, fallback to Nominatim
            if GOOGLE_MAPS_API_KEY:
                print(f"   🗺️  Trying Google Maps...")
                lat, lng = self.geocode_with_google(full_address)
            
            if (lat is None or lng is None):
                print(f"   🔄 Google failed, trying Nominatim as fallback...")
                lat, lng = self.geocode_with_nominatim(full_address)
        
        # Cache the result (both success and failure) and save immediately
        if cache is not None:
            cache[cache_key] = {
                'address': full_address,
                'latitude': lat,
                'longitude': lng,
                'timestamp': time.time()
            }
            # Save cache immediately after each geocoding attempt
            self.save_geocoding_cache(cache)
        
        if lat is not None and lng is not None:
            print(f"   ✅ Geocoded to: {lat}, {lng}")
            return lat, lng
        else:
            print(f"   ❌ Geocoding failed for: {full_address}")
            return None, None
    
    def geocode_events_batch(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Geocode all events with addresses in a batch, with caching and rate limiting"""
        print(f"\n🌍 Geocoding {len(events)} events...")
        
        # Load cache
        cache = self.load_geocoding_cache()
        
        geocoded_events = []
        geocoded_count = 0
        cached_count = 0
        skipped_count = 0
        api_calls = 0
        
        service_name = "Nominatim (free)" if USE_FREE_GEOCODING else "Google Maps"
        print(f"🔧 Using {service_name} as primary geocoding service")
        
        for i, event in enumerate(events, 1):
            address = event.get('address', '').strip()
            
            if address:
                print(f"📍 Event {i}/{len(events)}: {event.get('name', 'Unknown')}")
                
                # Check if we need rate limiting (only for API calls, not cached results)
                full_address = f"{address.strip()}, Athens, Greece"
                cache_key = full_address.lower()
                needs_api_call = cache_key not in cache
                
                if needs_api_call and api_calls > 0:
                    # Rate limiting: Nominatim allows 1 request per second, Google allows more
                    delay = 1.1 if USE_FREE_GEOCODING else 0.2
                    time.sleep(delay)
                
                lat, lng = self.geocode_address(address, city="Athens, Greece", cache=cache)
                
                if needs_api_call:
                    api_calls += 1
                
                # Create updated event with coordinates
                updated_event = event.copy()
                if lat is not None and lng is not None:
                    updated_event['latitude'] = lat
                    updated_event['longitude'] = lng
                    if cache_key in cache and cache[cache_key].get('timestamp', 0) < time.time() - 1:
                        cached_count += 1
                    else:
                        geocoded_count += 1
                else:
                    # Keep the event but without coordinates
                    updated_event['latitude'] = None
                    updated_event['longitude'] = None
                    skipped_count += 1
                
                geocoded_events.append(updated_event)
            else:
                # Event has no address, keep as-is
                updated_event = event.copy()
                updated_event['latitude'] = None
                updated_event['longitude'] = None
                geocoded_events.append(updated_event)
                skipped_count += 1
                print(f"📍 Event {i}/{len(events)}: {event.get('name', 'Unknown')} - No address")
        
        # Cache is already saved after each geocoding attempt
        
        print(f"\n📊 Geocoding Summary:")
        print(f"   ✅ Successfully geocoded (new): {geocoded_count} events")
        print(f"   📋 Used cached results: {cached_count} events")
        print(f"   ⚠️  Skipped (no address/failed): {skipped_count} events")
        print(f"   🔗 API calls made: {api_calls}")
        print(f"   💾 Cache now contains: {len(cache)} entries")
        
        return geocoded_events
    def save_bandit_images_locally(self, image_data: Dict[str, bytes], bandit_patterns: List[Dict[str, Any]]) -> None:
        """Save bandit images locally with bandit_name+image_placeholder naming"""
        print(f"💾 Saving bandit images locally...")

        # Create bandit_images folder
        bandit_images_dir = Path("bandit_images")
        bandit_images_dir.mkdir(exist_ok=True)

        # Create a mapping of image_id to bandit name
        image_to_bandit = {}
        for pattern in bandit_patterns:
            image_id = pattern['image_id']
            bandit_name = pattern['name']
            image_to_bandit[image_id] = bandit_name

        saved_count = 0

        for placeholder_id, raw_image_data in image_data.items():
            # Check if this image belongs to a bandit
            if placeholder_id in image_to_bandit:
                bandit_name = image_to_bandit[placeholder_id]

                # Clean bandit name for filename (remove special characters)
                clean_name = re.sub(r'[^\w\-_]', '_', bandit_name)

                # Create filename: bandit_name+image_placeholder.jpg
                filename = f"{clean_name}+{placeholder_id}.jpg"
                file_path = bandit_images_dir / filename

                try:
                    # Apply face detection and cropping if possible
                    processed_data, face_detected = self.detect_and_crop_face(raw_image_data)

                    # Save the processed image
                    with open(file_path, 'wb') as f:
                        f.write(processed_data)

                    status = "Face cropped" if face_detected else "Saved"
                    print(f"   ✅ {status}: {filename}")
                    saved_count += 1

                except Exception as e:
                    print(f"   ❌ Failed to save {filename}: {str(e)}")

        print(f"📊 Saved {saved_count} bandit images to {bandit_images_dir}/")

    def upload_images_to_supabase(self, image_data: Dict[str, bytes], bandit_patterns: List[Dict[str, Any]] = None) -> Dict[str, str]:
        """Upload images to Supabase storage, using pre-cropped bandit images when available"""
        print(f"📤 Processing {len(image_data)} images to Supabase...")

        if not supabase:
            print("⚠️  Supabase not configured, skipping upload")
            return {}

        # Create mapping of image_id to bandit name for pre-cropped images
        bandit_image_map = {}
        bandit_images_dir = Path("bandit_images")

        if bandit_patterns and bandit_images_dir.exists():
            for pattern in bandit_patterns:
                image_id = pattern['image_id']
                bandit_name = pattern['name']
                clean_name = re.sub(r'[^\w\-_]', '_', bandit_name)
                cropped_file = bandit_images_dir / f"{clean_name}+{image_id}.jpg"

                if cropped_file.exists():
                    bandit_image_map[image_id] = cropped_file
                    print(f"🎯 Found pre-cropped bandit image: {cropped_file.name}")

        # First, get list of existing files in the pdf_images folder
        print("🔍 Checking for existing images in bucket...")
        existing_files = set()
        try:
            existing_files_list = supabase.storage.from_(BUCKET_NAME).list(path="pdf_images/")
            for file_info in existing_files_list:
                if 'name' in file_info:
                    existing_files.add(file_info['name'])
            print(f"   Found {len(existing_files)} existing images")
        except Exception as e:
            print(f"   ⚠️  Could not list existing files: {e}")

        image_urls = {}
        uploaded_count = 0
        existing_count = 0

        for placeholder_id, raw_image_data in image_data.items():
            try:
                file_name = f"{placeholder_id}.jpg"
                file_path = f"pdf_images/{file_name}"

                # Check if file already exists
                if file_name in existing_files:
                    # File exists, just get the public URL
                    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
                    image_urls[placeholder_id] = public_url
                    existing_count += 1
                    print(f"✅ Using existing: {placeholder_id} -> {public_url}")
                else:
                    # Check if we have a pre-cropped bandit image to use
                    if placeholder_id in bandit_image_map:
                        # Use pre-cropped image from bandit_images folder
                        cropped_file_path = bandit_image_map[placeholder_id]
                        with open(cropped_file_path, 'rb') as f:
                            processed_data = f.read()
                        status_msg = "Pre-cropped bandit"
                    else:
                        # File doesn't exist and no pre-cropped version, process normally
                        processed_data, face_detected = self.detect_and_crop_face(raw_image_data)
                        status_msg = "Face cropped" if face_detected else "Uploaded"

                    if not DRY_RUN:
                        try:
                            # Upload and get the response
                            upload_response = supabase.storage.from_(BUCKET_NAME).upload(
                                path=file_path,
                                file=processed_data,
                                file_options={"content-type": "image/jpeg"}
                            )

                            # Get public URL from the upload response or construct it
                            if hasattr(upload_response, 'data') and upload_response.data:
                                public_url = upload_response.data.get('publicURL')
                            else:
                                # Fallback: get public URL using the API
                                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

                            image_urls[placeholder_id] = public_url
                            uploaded_count += 1
                            print(f"✅ {status_msg}: {placeholder_id} -> {public_url}")

                        except Exception as upload_error:
                            # If upload fails due to duplicate, still get the public URL
                            if "already exists" in str(upload_error) or "Duplicate" in str(upload_error):
                                print(f"⚠️  File already exists, getting URL: {placeholder_id}")
                                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
                                image_urls[placeholder_id] = public_url
                                existing_count += 1
                                print(f"✅ Using existing: {placeholder_id} -> {public_url}")
                            else:
                                raise upload_error

            except Exception as e:
                print(f"❌ Failed to process {placeholder_id}: {str(e)}")

        print(f"📊 Upload summary: {uploaded_count} uploaded, {existing_count} existing")
        return image_urls

    def split_text_by_bandits(self, text: str, detected_bandits: List[str]) -> List[str]:
        """Split text into chunks by bandit sections using the pre-detected bandits list"""
        print(f"✂️  Splitting text by bandit sections using {len(detected_bandits)} detected bandits...")
        
        lines = text.split('\n')
        sections = []
        current_section = []
        
        # Parse detected bandits: name_age_imageid format
        bandit_info = []
        for bandit in detected_bandits:
            parts = bandit.split('_')
            if len(parts) >= 3:
                name = parts[0]
                age = parts[1] if parts[1] and parts[1] != 'None' else None
                image_id = '_'.join(parts[2:])  # Join remaining parts for image ID
                bandit_info.append({'name': name, 'age': age, 'image_id': image_id, 'full_key': bandit})
            else:
                # Fallback for old format
                name = parts[0] if len(parts) > 0 else "Unknown"
                age = parts[1] if len(parts) > 1 else None
                bandit_info.append({'name': name, 'age': age, 'image_id': None, 'full_key': bandit})
        
        print(f"📝 Looking for these bandit combinations:")
        for info in bandit_info:
            age_str = f", Age: {info['age']}" if info['age'] else ""
            image_str = f", Image: {info['image_id']}" if info['image_id'] else ""
            print(f"   - {info['name']}{age_str}{image_str}")
        
        import re

        # Use helper method to find all patterns in the text
        all_patterns = self.find_bandit_patterns_in_lines(lines)

        for i, line in enumerate(lines):
            line_stripped = line.strip()

            # Look for IMAGE placeholders that start bandit sections
            if '[IMAGE:' in line_stripped:
                # Extract image ID from this line
                image_match = re.search(r'\[IMAGE:\s*([^]]+)\]', line_stripped)
                current_image_id = image_match.group(1) if image_match else None
                print(f"🖼️  Found image at line {i}: {line_stripped} -> ID: {current_image_id}")

                # Check if this image corresponds to any pattern found by our helper
                detected_bandit = None
                pattern_for_this_image = None

                for pattern in all_patterns:
                    if pattern['line_index'] == i and pattern['image_id'] == current_image_id:
                        pattern_for_this_image = pattern
                        break

                if pattern_for_this_image:
                    # Now check if this pattern matches any detected bandit from our list
                    for info in bandit_info:
                        name_match = (info['name'].lower() == pattern_for_this_image['name'].lower() or
                                    info['name'] in pattern_for_this_image['name'] or pattern_for_this_image['name'] in info['name'])
                        age_match = (info['age'] == pattern_for_this_image['age'])
                        image_match = (info['image_id'] == current_image_id) if info['image_id'] else True

                        if name_match and age_match and image_match:
                            detected_bandit = info
                            print(f"   ✅ Found detected bandit: {info['name']}, Age: {info['age']}, Image: {info['image_id']}")
                            break
                
                if detected_bandit:
                    # Save previous section if it has content
                    if current_section and len('\n'.join(current_section).strip()) > 100:
                        sections.append('\n'.join(current_section))
                        print(f"   📄 Saved section #{len(sections)} ({len(current_section)} lines)")
                    
                    # Start new section with the image
                    current_section = [line]
                    print(f"🎯 Starting new section for bandit: {detected_bandit['name']} (Age: {detected_bandit['age']})")
                else:
                    # Not a detected bandit image, add to current section
                    current_section.append(line)
                    if current_image_id:
                        print(f"   ❌ Image {current_image_id} not associated with any detected bandit")
            else:
                # Regular text line, add to current section
                current_section.append(line)
        
        # Add the last section
        if current_section and len('\n'.join(current_section).strip()) > 100:
            sections.append('\n'.join(current_section))
            print(f"   📄 Saved final section #{len(sections)} ({len(current_section)} lines)")
        
        print(f"📊 Split into {len(sections)} bandit-based sections")
        
        # If we found bandit sections, use them; otherwise use fixed chunks
        if len(sections) >= 1:
            print("✅ Using bandit-based sections")
            return sections
        else:
            print("⚠️  No bandit sections found, using fixed chunks...")
            chunk_size = len(lines) // 10  # Split into ~10 chunks
            sections = []
            for i in range(0, len(lines), chunk_size):
                chunk = '\n'.join(lines[i:i + chunk_size])
                if len(chunk.strip()) > 100:
                    sections.append(chunk)
            print(f"📄 Created {len(sections)} fixed chunks")
            return sections

    def call_deepseek_api(self, prompt: str) -> str:
        """Call DeepSeek API for text processing"""
        url = "https://api.deepseek.com/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a data extraction expert. Extract ALL bandits and events from the provided text chunk. For timing info, only extract specific hours, days, or dates - ignore vague time descriptions. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 4000
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content']
            
        except Exception as e:
            raise Exception(f"DeepSeek API error: {str(e)}")

    def process_with_ai(self, text: str, detected_bandits: List[str], max_bandits: int = MAX_BANDITS) -> Dict[str, Any]:
        """Process text with AI (Claude or DeepSeek) using the pre-detected bandits list for accuracy"""
        service_name = "DeepSeek" if USE_DEEPSEEK else "Claude"
        print(f"🤖 Processing text with {service_name} AI using {len(detected_bandits)} pre-detected bandits...")
        
        if USE_DEEPSEEK and not DEEPSEEK_API_KEY:
            raise Exception("DeepSeek API key not configured")
        elif not USE_DEEPSEEK and not ai_client:
            raise Exception("Anthropic API key not configured")
        
        # Create a formatted list of detected bandits for the prompt
        bandits_list = []
        for bandit in detected_bandits[:max_bandits]:
            parts = bandit.split('_')
            if len(parts) >= 3:
                name = parts[0]
                age = parts[1] if parts[1] and parts[1] != 'None' else "Unknown"
                image_id = '_'.join(parts[2:])
                bandits_list.append(f"- {name}, Age: {age}, Image: {image_id}")
            else:
                # Fallback for old format
                name = parts[0] if len(parts) > 0 else "Unknown"
                age = parts[1] if len(parts) > 1 else "Unknown"
                bandits_list.append(f"- {name}, Age: {age}")
        
        bandits_list_str = "\n".join(bandits_list)
        
        print(f"📋 Pre-detected bandits to process:")
        for i, bandit in enumerate(detected_bandits[:max_bandits], 1):
            parts = bandit.split('_')
            if len(parts) >= 3:
                name = parts[0]
                age = parts[1] if parts[1] and parts[1] != 'None' else "Unknown"
                image_id = '_'.join(parts[2:])
                print(f"   {i:2d}. {name} (Age: {age}) [Image: {image_id}]")
            else:
                name = parts[0] if len(parts) > 0 else "Unknown"
                age = parts[1] if len(parts) > 1 else "Unknown"
                print(f"   {i:2d}. {name} (Age: {age})")
        
        # Split text into manageable chunks based on detected bandits
        text_chunks = self.split_text_by_bandits(text, detected_bandits)
        
        # Process each chunk and combine results
        all_bandits = []
        all_events = []
        all_bandit_events = []
        
        for i, chunk in enumerate(text_chunks, 1):
            print(f"🧩 Processing chunk {i}/{len(text_chunks)}...")
            
            chunk_prompt = f"""
Extract bandits and events from this text chunk. This is part {i} of {len(text_chunks)} chunks from a larger document.

IMPORTANT: You must ONLY extract the following PRE-IDENTIFIED bandits (ignore any others):
{bandits_list_str}

Database schema:
- bandit: id (uuid), name, age, city, occupation, rating (0-5), image_url, description, family_name
- event: id (uuid), name, genre (single string, exactly one of: Food, Culture, Nightlife, Shopping, Coffee), description, rating (0-5), image_url, link, address, city, neighborhood, start_time, end_time, timing_info (raw timing text from document), image_gallery (comma-separated string)
- bandit_event: id (uuid), bandit_id, event_id, personal_tip

CRITICAL INSTRUCTIONS:
1. ONLY process bandits from the pre-identified list above - do not create any additional bandits
2. Look for BANDIT sections that start with [IMAGE: img_xxx_xxx] followed by the bandit's name from the list
3. Each bandit has: name, Age: XX, Profession: XXX, bandiVibe: description
4. After bandit details, there are EVENTS they recommend (venues, cafes, etc.)
5. Events have: name, Type: XXX, description, Address: XXX
6. Extract EVERY event you find for the pre-identified bandits
7. For bandits: use the specific image placeholder that appears immediately BEFORE their name as image_url
8. For events: use image placeholders that appear within the same bandit's section AFTER the bandit's details as image_url and image_gallery
9. IMPORTANT: Each bandit section starts with [IMAGE: bandit_photo] followed by bandit details, then their recommended events with event images
10. DO NOT assign bandit images to events - only use images that clearly belong to the event venue/location
11. Set rating to 4 for all bandits and events
12. Set city to "Athens" for all
13. Create bandit_event relationships linking each bandit to their events
14. Use chunk_{i}_ prefix for all UUIDs
15. IMPORTANT: Only include image_gallery field if there are actual images. If no additional images exist for an event, omit the image_gallery field entirely (do not include empty arrays or empty strings)
16. For image_gallery: return as an array of image placeholder IDs (e.g., ["img_001_002", "img_001_003"]) - the system will convert these to comma-separated URLs
17. TIMING INFO: Look for specific timing information in the event text. Extract ONLY:
    - Specific opening hours (e.g., "9 AM - 5 PM", "Monday-Friday 8:00-18:00")
    - Day names (e.g., "Monday", "Tuesday", "Weekends", "Daily")
    - Specific times (e.g., "8:00 AM", "6 PM", "Happy hour 5-7 PM")
    - Date ranges (e.g., "March 15-20", "Every Friday")
    DO NOT extract vague time descriptions like "nighttime", "daytime", "evening vibes", "late night", "early morning"
    If found, extract the raw text and put it in the timing_info field. If no specific timing info is found, set timing_info to an empty string ""

Text chunk:
{chunk}

Return only valid JSON with "bandit", "events", and "bandit_events" arrays.
"""

            try:
                # Make API call to AI service for this chunk
                if USE_DEEPSEEK:
                    response_text = self.call_deepseek_api(chunk_prompt)
                else:
                    response = ai_client.messages.create(
                        model="claude-3-5-sonnet-20241022",
                        max_tokens=4000,  # Smaller limit per chunk
                        temperature=0.1,
                        system="You are a data extraction expert. Extract ALL bandits and events from the provided text chunk. For timing info, only extract specific hours, days, or dates - ignore vague time descriptions. Return only valid JSON.",
                        messages=[
                            {"role": "user", "content": chunk_prompt}
                        ]
                    )
                    response_text = response.content[0].text.strip()
                
                # Clean up response to ensure it's valid JSON
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                # Parse JSON
                chunk_data = json.loads(response_text)
                
                # Accumulate results
                chunk_bandits = chunk_data.get('bandits', []) or chunk_data.get('bandit', [])
                chunk_events = chunk_data.get('events', [])
                chunk_relationships = chunk_data.get('bandit_events', [])
                
                all_bandits.extend(chunk_bandits)
                all_events.extend(chunk_events)
                all_bandit_events.extend(chunk_relationships)
                
                print(f"   ✅ Chunk {i}: {len(chunk_bandits)} bandits, {len(chunk_events)} events, {len(chunk_relationships)} relationships")
                
                # Stop if we've reached the maximum number of bandits
                if len(all_bandits) >= max_bandits:
                    print(f"✅ Reached maximum of {max_bandits} bandits, stopping processing")
                    break
                
            except json.JSONDecodeError as e:
                print(f"   ❌ Chunk {i} - Invalid JSON: {e}")
                continue  # Skip this chunk but continue with others
            except Exception as e:
                print(f"   ❌ Chunk {i} - API error: {str(e)}")
                continue  # Skip this chunk but continue with others
        
        # Limit results to max_bandits
        all_bandits = all_bandits[:max_bandits]
        
        # Filter events and relationships to only include those related to the first max_bandits
        bandit_ids = [bandit.get('id') for bandit in all_bandits]
        filtered_events = []
        filtered_relationships = []
        
        for relationship in all_bandit_events:
            if relationship.get('bandit_id') in bandit_ids:
                filtered_relationships.append(relationship)
                # Find the corresponding event
                event_id = relationship.get('event_id')
                for event in all_events:
                    if event.get('id') == event_id:
                        filtered_events.append(event)
                        break
        
        # Combine all results
        structured_data = {
            'bandit': all_bandits,
            'events': filtered_events,
            'bandit_events': filtered_relationships
        }
        
        print(f"🎯 Total AI processing complete:")
        print(f"   👥 Bandits: {len(all_bandits)}")
        print(f"   🎉 Events: {len(filtered_events)}")
        print(f"   🔗 Relationships: {len(filtered_relationships)}")
        
        return structured_data

    def combine_data_with_images(self, structured_data: Dict[str, Any], image_urls: Dict[str, str]) -> Dict[str, Any]:
        """Combine structured data with image URLs"""
        print("🔗 Combining structured data with image URLs...")
        
        def replace_placeholders(value):
            if isinstance(value, str):
                # Handle [IMAGE: placeholder_id] format
                if value.startswith("[IMAGE: ") and value.endswith("]"):
                    placeholder_id = value[8:-1]
                    return image_urls.get(placeholder_id, value)
                # Handle direct placeholder_id format (img_xxx_xxx)
                elif value.startswith("img_") and value in image_urls:
                    return image_urls.get(value, value)
            elif isinstance(value, list):
                # Process image galleries - convert list to comma-separated string
                urls = []
                for item in value:
                    if isinstance(item, str):
                        if item.startswith("[IMAGE: ") and item.endswith("]"):
                            placeholder_id = item[8:-1]
                            url = image_urls.get(placeholder_id, item)
                            if url and url != item and url.startswith("http"):  # Only add valid URLs
                                urls.append(url)
                        elif item.startswith("img_") and item in image_urls:
                            url = image_urls.get(item, item)
                            if url and url != item and url.startswith("http"):  # Only add valid URLs
                                urls.append(url)
                        elif item.startswith("http"):  # Already a valid URL
                            urls.append(item)
                    else:
                        # Skip non-string items
                        pass
                return ", ".join(urls) if urls else ""
            elif isinstance(value, dict):
                return {k: replace_placeholders(v) for k, v in value.items()}
            return value
        
        # Process all data
        combined_data = {
            'bandit': [],
            'events': [],
            'bandit_events': structured_data.get('bandit_events', [])
        }
        
        # Process bandits
        for bandit in structured_data.get('bandit', []):
            processed_bandit = {}
            for key, value in bandit.items():
                processed_bandit[key] = replace_placeholders(value)
            combined_data['bandit'].append(processed_bandit)
        
        # Process events
        for event in structured_data.get('events', []):
            processed_event = {}
            for key, value in event.items():
                processed_event[key] = replace_placeholders(value)
            
            # Remove empty image_gallery fields
            if 'image_gallery' in processed_event:
                gallery_value = processed_event['image_gallery']
                # Remove if None, empty, empty string, or just whitespace
                if gallery_value is None or not gallery_value or (isinstance(gallery_value, str) and not gallery_value.strip()):
                    del processed_event['image_gallery']
            
            combined_data['events'].append(processed_event)
        
        return combined_data

    def truncate_database_tables(self):
        """Truncate all database tables before insertion"""
        print("🗑️  Truncating existing data...")
        
        if not supabase:
            print("⚠️  Supabase not configured, skipping truncation")
            return
        
        tables = ["bandit_event", "event", "bandit"]
        
        for table in tables:
            try:
                supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                print(f"   ✅ Truncated {table}")
            except Exception as e:
                print(f"   ❌ Error truncating {table}: {str(e)}")

    def insert_to_database(self, data: Dict[str, Any]):
        """Insert all data into Supabase database"""
        print("📊 Inserting data into database...")
        
        if not supabase:
            raise Exception("Supabase not configured")
        
        # Truncate existing data
        self.truncate_database_tables()
        
        # Track ID mappings for relationships
        bandit_id_mapping = {}
        event_id_mapping = {}
        
        # Insert bandits
        print(f"👥 Inserting {len(data.get('bandit', []))} bandits...")
        for i, bandit in enumerate(data.get('bandit', []), 1):
            try:
                new_id = str(uuid.uuid4())
                old_id = bandit.get('id')
                
                bandit_data = {
                    "id": new_id,
                    "name": bandit.get("name"),
                    "age": bandit.get("age"),
                    "city": bandit.get("city"),
                    "occupation": bandit.get("occupation"),
                    "rating": bandit.get("rating", 0),
                    "image_url": bandit.get("image_url"),
                    "description": bandit.get("description"),
                    "family_name": bandit.get("family_name")
                }
                
                supabase.table("bandit").insert(bandit_data).execute()
                bandit_id_mapping[old_id] = new_id
                print(f"   ✅ Bandit {i}: {bandit.get('name')}")
                
            except Exception as e:
                print(f"   ❌ Error inserting bandit: {str(e)}")
        
        # Insert events
        print(f"🎉 Inserting {len(data.get('events', []))} events...")
        for i, event in enumerate(data.get('events', []), 1):
            try:
                new_id = str(uuid.uuid4())
                old_id = event.get('id')
                
                event_data = {
                    "id": new_id,
                    "name": event.get("name"),
                    "genre": event.get("genre"),
                    "description": event.get("description"),
                    "rating": event.get("rating", 0),
                    "image_url": event.get("image_url"),
                    "link": event.get("link"),
                    "address": event.get("address"),
                    "city": event.get("city"),
                    "neighborhood": event.get("neighborhood"),
                    "start_time": event.get("start_time") or "2024-01-01T18:00:00Z",
                    "end_time": event.get("end_time") or "2024-01-01T23:00:00Z",
                    "timing_info": event.get("timing_info", ""),
                    "location_lat": event.get("latitude"),
                    "location_lng": event.get("longitude")
                }
                
                # Only include image_gallery if it exists and is not empty/None
                if "image_gallery" in event and event.get("image_gallery") is not None and event.get("image_gallery"):
                    event_data["image_gallery"] = event.get("image_gallery")
                
                supabase.table("event").insert(event_data).execute()
                event_id_mapping[old_id] = new_id
                
                # Log timing info and geocoding status
                timing_info = event.get("timing_info", "")
                lat = event.get("latitude")  # Internal field name
                lng = event.get("longitude")  # Internal field name
                
                status_parts = []
                if timing_info and timing_info.strip():
                    status_parts.append(f"TIMING: {timing_info}")
                if lat is not None and lng is not None:
                    status_parts.append(f"GEO: {lat:.6f}, {lng:.6f}")
                
                status_str = " | ".join(status_parts) if status_parts else "No timing info or coordinates"
                print(f"   ✅ Event {i}: {event.get('name')} - {status_str}")
                
            except Exception as e:
                print(f"   ❌ Error inserting event: {str(e)}")
        
        # Insert bandit-event relationships
        print(f"🔗 Inserting {len(data.get('bandit_events', []))} relationships...")
        for i, bandit_event in enumerate(data.get('bandit_events', []), 1):
            try:
                old_bandit_id = bandit_event.get("bandit_id")
                old_event_id = bandit_event.get("event_id")
                
                new_bandit_id = bandit_id_mapping.get(old_bandit_id)
                new_event_id = event_id_mapping.get(old_event_id)
                
                if not new_bandit_id or not new_event_id:
                    print(f"   ⚠️  Skipping relationship {i}: Missing mapping")
                    continue
                
                relationship_data = {
                    "id": str(uuid.uuid4()),
                    "bandit_id": new_bandit_id,
                    "event_id": new_event_id,
                    "personal_tip": bandit_event.get("personal_tip")
                }
                
                supabase.table("bandit_event").insert(relationship_data).execute()
                print(f"   ✅ Relationship {i}")
                
            except Exception as e:
                print(f"   ❌ Error inserting relationship: {str(e)}")
        
        print("\n📊 Database population complete!")
        print(f"   👥 Bandits: {len(bandit_id_mapping)}")
        print(f"   🎉 Events: {len(event_id_mapping)}")
        print(f"   🔗 Relationships: {len([r for r in data.get('bandit_events', []) if bandit_id_mapping.get(r.get('bandit_id')) and event_id_mapping.get(r.get('event_id'))])}")

    def print_statistics(self):
        """Print detailed statistics about the data in the database"""
        print("\n📊 DATABASE STATISTICS")
        print("=" * 50)
        
        if not supabase:
            print("❌ Supabase not configured, cannot fetch statistics")
            return
        
        try:
            # Get all data from database
            bandits_response = supabase.table("bandit").select("*").execute()
            events_response = supabase.table("event").select("*").execute()
            bandit_events_response = supabase.table("bandit_event").select("*").execute()
            
            bandits = bandits_response.data
            events = events_response.data
            bandit_events = bandit_events_response.data
            
            # Total number of bandits
            print(f"📊 TOTAL NUMBER OF BANDITS: {len(bandits)}")
            
            # Total number of events
            print(f"📊 TOTAL NUMBER OF EVENTS: {len(events)}")
            
            # List of bandits with their events
            print("\n👥 BANDITS AND THEIR EVENTS:")
            print("-" * 40)
            
            for bandit in bandits:
                bandit_id = bandit['id']
                bandit_name = bandit['name']
                
                # Find events for this bandit
                related_event_ids = [be['event_id'] for be in bandit_events if be['bandit_id'] == bandit_id]
                related_events = [e for e in events if e['id'] in related_event_ids]
                
                print(f"🎯 {bandit_name}")
                print(f"   Number of events: {len(related_events)}")
                if related_events:
                    for event in related_events:
                        print(f"   - {event['name']}")
                else:
                    print("   - No events")
                print()
            
            # Events not associated with any bandit
            associated_event_ids = set(be['event_id'] for be in bandit_events)
            unassociated_events = [e for e in events if e['id'] not in associated_event_ids]
            print(f"🔗 NUMBER OF EVENTS NOT ASSOCIATED WITH A BANDIT: {len(unassociated_events)}")
            if unassociated_events:
                for event in unassociated_events:
                    print(f"   - {event['name']}")
            
            # Events with timing info
            events_with_timing = [e for e in events if e.get('timing_info') and e['timing_info'].strip()]
            print(f"\n⏰ NUMBER OF EVENTS WITH TIMING INFO: {len(events_with_timing)}")
            if events_with_timing:
                print("   Events with timing info:")
                for event in events_with_timing:
                    print(f"   - {event['name']}: {event['timing_info']}")
            
            # Events without location (address)
            events_without_location = [e for e in events if not e.get('address') or not e['address'].strip()]
            print(f"\n📍 NUMBER OF EVENTS WITHOUT LOCATION: {len(events_without_location)}")
            if events_without_location:
                print("   Events without location:")
                for event in events_without_location:
                    print(f"   - {event['name']}")
            
            # Events with no main image
            events_without_main_image = [e for e in events if not e.get('image_url') or not e['image_url'].strip()]
            print(f"\n🖼️ NUMBER OF EVENTS WITH NO MAIN IMAGE: {len(events_without_main_image)}")
            if events_without_main_image:
                print("   Events without main image:")
                for event in events_without_main_image:
                    print(f"   - {event['name']}")
            
            # Events with no gallery
            events_without_gallery = [e for e in events if not e.get('image_gallery') or not e['image_gallery'].strip()]
            print(f"\n🎨 NUMBER OF EVENTS WITH NO GALLERY: {len(events_without_gallery)}")
            if events_without_gallery:
                print("   Events without gallery:")
                for event in events_without_gallery:
                    print(f"   - {event['name']}")
            
            # Events with geocoding coordinates
            events_with_coordinates = [e for e in events if e.get('latitude') is not None and e.get('longitude') is not None]
            events_without_coordinates = [e for e in events if e.get('latitude') is None or e.get('longitude') is None]
            print(f"\n🌍 NUMBER OF EVENTS WITH COORDINATES (GEOCODED): {len(events_with_coordinates)}")
            if events_with_coordinates:
                print("   Events with coordinates:")
                for event in events_with_coordinates:
                    lat = event.get('latitude')
                    lng = event.get('longitude')
                    print(f"   - {event['name']}: {lat:.6f}, {lng:.6f}")
            
            print(f"\n📍 NUMBER OF EVENTS WITHOUT COORDINATES: {len(events_without_coordinates)}")
            if events_without_coordinates:
                print("   Events without coordinates:")
                for event in events_without_coordinates:
                    print(f"   - {event['name']}")
            
            # Show geocoding cache information
            try:
                cache_path = Path(GEOCODING_CACHE_FILE)
                if cache_path.exists():
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        cache = json.load(f)
                    cache_entries = len(cache)
                    successful_cache_entries = sum(1 for entry in cache.values() if entry.get('latitude') is not None)
                    print(f"\n💾 GEOCODING CACHE STATUS:")
                    print(f"   📋 Total cached addresses: {cache_entries}")
                    print(f"   ✅ Successfully geocoded in cache: {successful_cache_entries}")
                    print(f"   ❌ Failed geocoding attempts in cache: {cache_entries - successful_cache_entries}")
            except Exception:
                pass  # Don't fail statistics if cache can't be read
            
            print("\n" + "=" * 50)
            print("📊 STATISTICS COMPLETE")
            
        except Exception as e:
            print(f"❌ Error fetching statistics: {str(e)}")

    def process_document(self):
        """Main pipeline to process document from DOCX to database"""
        print(f"🚀 Starting complete pipeline for: {self.docx_path}")
        
        try:
            # Step 1: Use existing PDF
            pdf_path = self.convert_docx_to_pdf()
            
            # Step 2: Empty bucket before uploading new images (if enabled)
            if EMPTY_BUCKET_BEFORE_UPLOAD and not DRY_RUN:
                self.empty_bucket()
            else:
                print("⏭️  Skipping bucket emptying (EMPTY_BUCKET_BEFORE_UPLOAD=False)")
            
            # Step 3: Extract text with image placeholders (first 10 pages)
            extraction_result = self.extract_text_with_placeholders()

            # Step 4a: Get bandit patterns for local image saving
            bandit_patterns = self.find_bandit_patterns_in_lines(
                extraction_result["readable_text"].split('\n'),
                max_bandits=MAX_BANDITS
            )

            # Step 4b: Save bandit images locally with proper naming
            self.save_bandit_images_locally(extraction_result["image_data"], bandit_patterns)

            # Step 4c: Upload images to Supabase (using pre-cropped bandit images when available)
            image_urls = self.upload_images_to_supabase(extraction_result["image_data"], bandit_patterns)

            # Step 5: Process with AI using pre-detected bandits
            detected_bandits = extraction_result["detected_bandits_list"]
            structured_data = self.process_with_ai(extraction_result["readable_text"], detected_bandits, max_bandits=MAX_BANDITS)
            
            # Step 6: Combine data with image URLs
            final_data = self.combine_data_with_images(structured_data, image_urls)
            
            # Step 7: Geocode events with addresses
            if final_data.get('events'):
                geocoded_events = self.geocode_events_batch(final_data['events'])
                final_data['events'] = geocoded_events
            
            # Step 8: Insert into database
            if not DRY_RUN:
                self.insert_to_database(final_data)
            
            # Step 9: Print statistics
            self.print_statistics()
            
            print("✅ Complete pipeline finished successfully!")
            print(f"🎯 Processed first {MAX_BANDITS} bandits from {self.pdf_path.name}")
            
        except Exception as e:
            print(f"❌ Pipeline failed: {str(e)}")
            raise


def main():
    """Main function"""
    # Always use banditsORIG.docx.pdf
    docx_path = "banditsORIG.docx.pdf"
    
    if not Path(docx_path).exists():
        print(f"❌ Required PDF file not found: {docx_path}")
        print("Please ensure banditsORIG.docx.pdf exists in the current directory")
        sys.exit(1)
    
    # Verify environment setup
    missing_vars = []
    if not SUPABASE_URL:
        missing_vars.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing_vars.append("SUPABASE_ANON_KEY")
    if USE_DEEPSEEK and not DEEPSEEK_API_KEY:
        missing_vars.append("DEEPSEEK_API_KEY")
    elif not USE_DEEPSEEK and not ANTHROPIC_API_KEY:
        missing_vars.append("ANTHROPIC_API_KEY")
    if not BUCKET_NAME:
        missing_vars.append("BUCKET_NAME")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set them in your .env file")
        sys.exit(1)
    
    # Check geocoding configuration
    if USE_FREE_GEOCODING:
        print("🆓 Using Nominatim (free) geocoding service")
        if GOOGLE_MAPS_API_KEY:
            print("   📋 Google Maps API available as fallback")
        else:
            print("   ⚠️  No Google Maps API key - Nominatim only")
    else:
        if GOOGLE_MAPS_API_KEY:
            print("🗺️  Using Google Maps geocoding service")
            print("   📋 Nominatim (free) available as fallback")
        else:
            print("⚠️  No Google Maps API key - falling back to Nominatim (free)")
    
    print(f"💾 Geocoding cache file: {GEOCODING_CACHE_FILE}")
    
    # Show AI service configuration
    ai_service = "DeepSeek" if USE_DEEPSEEK else "Claude"
    print(f"🤖 Using {ai_service} for AI text processing")
    
    # Process the document
    processor = DocumentProcessor(docx_path)
    processor.process_document()


if __name__ == "__main__":
    main()