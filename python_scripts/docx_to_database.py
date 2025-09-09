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
from typing import Dict, Any, Tuple, List
from supabase import create_client, Client
from dotenv import load_dotenv
import anthropic

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
BUCKET_NAME = os.getenv('BUCKET_NAME', 'banditsassets4')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Pipeline settings
EMPTY_BUCKET_BEFORE_UPLOAD = False  # Set to True to empty bucket, False to reuse existing images
MAX_BANDITS = 100  # Maximum number of bandits to process

# Initialize clients
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

claude_client = None
if ANTHROPIC_API_KEY:
    claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

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
        import re
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Look for IMAGE placeholders
            if '[IMAGE:' in line_stripped:
                print(f"🖼️  Found image at line {i}: {line_stripped}")
                
                # Look for a potential bandit name in the next few lines
                for j in range(i+1, min(i+5, len(lines))):
                    name_line = lines[j].strip()
                    
                    # Skip empty lines and other image placeholders
                    if not name_line or '[IMAGE:' in name_line:
                        continue
                    
                    # Check if this looks like a name (short line without digits, not too long)
                    if (len(name_line.split()) <= 4 and  # Allow up to 4 words for full names
                        not any(word.isdigit() for word in name_line.split()) and
                        len(name_line) > 2 and
                        len(name_line) < 50):  # Reasonable name length
                        
                        print(f"   🤔 Potential name at line {j}: '{name_line}'")
                        
                        # Now look for "Age:" in the following lines
                        age_found = False
                        age_line = ""
                        for k in range(j+1, min(j+8, len(lines))):
                            if 'Age:' in lines[k]:
                                age_found = True
                                age_line = lines[k].strip()
                                print(f"   ✅ Found Age at line {k}: '{age_line}'")
                                break
                        
                        if age_found:
                            # Extract age number from the age line
                            age_match = None
                            age_pattern = re.search(r'Age:\s*(\d+)', age_line)
                            if age_pattern:
                                age_match = age_pattern.group(1)
                            
                            # Create a unique identifier to avoid duplicates
                            bandit_key = f"{name_line}_{age_match}"
                            
                            if bandit_key not in found_bandits:
                                found_bandits.append(bandit_key)
                                print(f"🎯 CONFIRMED BANDIT #{len(found_bandits)}: {name_line}, Age: {age_match}")
                                
                                if len(found_bandits) >= max_bandits:
                                    print(f"✅ Reached maximum of {max_bandits} bandits, stopping analysis")
                                    break
                            else:
                                print(f"   ⚠️  Duplicate bandit ignored: {name_line}")
                            
                            # Found a valid bandit, break out of name search loop
                            break
                        else:
                            print(f"   ❌ No Age found for '{name_line}' - not a bandit")
                    else:
                        print(f"   ❌ Line doesn't look like a name: '{name_line}' (too long/has digits/etc)")
                
                if len(found_bandits) >= max_bandits:
                    break
        
        print(f"\n📊 BANDIT DETECTION SUMMARY:")
        print(f"   Total bandits found: {len(found_bandits)}")
        print(f"   Bandits list:")
        for i, bandit_key in enumerate(found_bandits, 1):
            name_age = bandit_key.split('_')
            name = name_age[0]
            age = name_age[1] if len(name_age) > 1 else "Unknown"
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
    def upload_images_to_supabase(self, image_data: Dict[str, bytes]) -> Dict[str, str]:
        """Upload images to Supabase storage, checking for existing files first"""
        print(f"📤 Processing {len(image_data)} images to Supabase...")
        
        if not supabase:
            print("⚠️  Supabase not configured, skipping upload")
            return {}
        
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
                    # File doesn't exist, process and upload
                    processed_data, face_detected = self.detect_and_crop_face(raw_image_data)
                    
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
                        status = "Face cropped" if face_detected else "Uploaded"
                        print(f"✅ {status}: {placeholder_id} -> {public_url}")
                        
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
        
        # Extract just the names from detected_bandits for matching
        detected_names = [bandit.split('_')[0] for bandit in detected_bandits]
        print(f"📝 Looking for these bandit names: {detected_names}")
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Look for IMAGE placeholders that start bandit sections
            if '[IMAGE:' in line_stripped:
                print(f"🖼️  Found image at line {i}: {line_stripped}")
                
                # Look for one of our detected bandit names in the next few lines
                is_detected_bandit_start = False
                bandit_name_found = ""
                
                for j in range(i+1, min(i+5, len(lines))):
                    name_line = lines[j].strip()
                    
                    # Skip empty lines and other image placeholders
                    if not name_line or '[IMAGE:' in name_line:
                        continue
                    
                    # Check if this matches one of our detected bandit names
                    for detected_name in detected_names:
                        if detected_name.lower() == name_line.lower() or detected_name in name_line:
                            is_detected_bandit_start = True
                            bandit_name_found = detected_name
                            print(f"   ✅ Found detected bandit: {detected_name}")
                            break
                    
                    if is_detected_bandit_start:
                        break
                
                if is_detected_bandit_start:
                    # Save previous section if it has content
                    if current_section and len('\n'.join(current_section).strip()) > 100:
                        sections.append('\n'.join(current_section))
                        print(f"   📄 Saved section #{len(sections)} ({len(current_section)} lines)")
                    
                    # Start new section with the image
                    current_section = [line]
                    print(f"🎯 Starting new section for bandit: {bandit_name_found}")
                else:
                    # Not a bandit image, add to current section
                    current_section.append(line)
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

    def process_with_claude(self, text: str, detected_bandits: List[str], max_bandits: int = MAX_BANDITS) -> Dict[str, Any]:
        """Process text with Claude API using the pre-detected bandits list for accuracy"""
        print(f"🤖 Processing text with Claude AI using {len(detected_bandits)} pre-detected bandits...")
        
        if not claude_client:
            raise Exception("Anthropic API key not configured")
        
        # Create a formatted list of detected bandits for the prompt
        bandits_list = "\n".join([f"- {bandit.replace('_', ', Age: ')}" for bandit in detected_bandits[:max_bandits]])
        
        print(f"📋 Pre-detected bandits to process:")
        for i, bandit in enumerate(detected_bandits[:max_bandits], 1):
            name_age = bandit.split('_')
            name = name_age[0]
            age = name_age[1] if len(name_age) > 1 else "Unknown"
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
{bandits_list}

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
7. For bandits: use the first image placeholder as image_url
8. For events: use subsequent image placeholders as image_url and image_gallery
9. Set rating to 4 for all bandits and events
10. Set city to "Athens" for all
11. Create bandit_event relationships linking each bandit to their events
12. Use chunk_{i}_ prefix for all UUIDs
13. IMPORTANT: Only include image_gallery field if there are actual images. If no additional images exist for an event, omit the image_gallery field entirely (do not include empty arrays or empty strings)
14. For image_gallery: return as an array of image placeholder IDs (e.g., ["img_001_002", "img_001_003"]) - the system will convert these to comma-separated URLs
15. TIMING INFO: Look for specific timing information in the event text. Extract ONLY:
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
                # Make API call to Claude for this chunk
                response = claude_client.messages.create(
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
                    "timing_info": event.get("timing_info", "")
                }
                
                # Only include image_gallery if it exists and is not empty/None
                if "image_gallery" in event and event.get("image_gallery") is not None and event.get("image_gallery"):
                    event_data["image_gallery"] = event.get("image_gallery")
                
                supabase.table("event").insert(event_data).execute()
                event_id_mapping[old_id] = new_id
                
                # Log timing info status
                timing_info = event.get("timing_info", "")
                if timing_info and timing_info.strip():
                    print(f"   ✅ Event {i}: {event.get('name')} - TIMING INFO: {timing_info}")
                else:
                    print(f"   ✅ Event {i}: {event.get('name')} - No timing info")
                
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
            if EMPTY_BUCKET_BEFORE_UPLOAD:
                self.empty_bucket()
            else:
                print("⏭️  Skipping bucket emptying (EMPTY_BUCKET_BEFORE_UPLOAD=False)")
            
            # Step 3: Extract text with image placeholders (first 10 pages)
            extraction_result = self.extract_text_with_placeholders()
            
            # Step 4: Upload images to Supabase
            image_urls = self.upload_images_to_supabase(extraction_result["image_data"])
            
            # Step 5: Process with Claude AI using pre-detected bandits
            detected_bandits = extraction_result["detected_bandits_list"]
            structured_data = self.process_with_claude(extraction_result["readable_text"], detected_bandits, max_bandits=MAX_BANDITS)
            
            # Step 6: Combine data with image URLs
            final_data = self.combine_data_with_images(structured_data, image_urls)
            
            # Step 7: Insert into database
            self.insert_to_database(final_data)
            
            # Step 8: Print statistics
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
    if not ANTHROPIC_API_KEY:
        missing_vars.append("ANTHROPIC_API_KEY")
    if not BUCKET_NAME:
        missing_vars.append("BUCKET_NAME")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set them in your .env file")
        sys.exit(1)
    
    # Process the document
    processor = DocumentProcessor(docx_path)
    processor.process_document()


if __name__ == "__main__":
    main()