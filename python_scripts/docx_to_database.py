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
from typing import Dict, Any, Tuple
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
        self.pdf_path = self.docx_path.with_suffix('.pdf')
        self.output_dir = Path("pdf_output")
        self.output_dir.mkdir(exist_ok=True)
        
    def convert_docx_to_pdf(self) -> Path:
        """Convert DOCX to PDF using LibreOffice"""
        print(f"📄 Converting {self.docx_path.name} to PDF...")
        
        if self.pdf_path.exists():
            print(f"✅ PDF already exists: {self.pdf_path}")
            return self.pdf_path
            
        try:
            # Use LibreOffice to convert DOCX to PDF
            cmd = [
                "libreoffice", 
                "--headless", 
                "--convert-to", "pdf", 
                "--outdir", str(self.docx_path.parent),
                str(self.docx_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0 and self.pdf_path.exists():
                print(f"✅ Successfully converted to: {self.pdf_path}")
                return self.pdf_path
            else:
                raise Exception(f"LibreOffice conversion failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            raise Exception("PDF conversion timed out (5 minutes)")
        except FileNotFoundError:
            raise Exception("LibreOffice not found. Install with: brew install --cask libreoffice")

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
        """Extract PDF text and replace images with placeholders"""
        print(f"🔍 Extracting text from PDF: {self.pdf_path}")
        
        doc = fitz.open(str(self.pdf_path))
        readable_text = ""
        image_map = {}
        image_counter = 0
        
        for page_num, page in enumerate(doc, 1):
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
        
        return {
            "readable_text": readable_text,
            "image_data": image_map,
            "total_images": len(image_map)
        }

    def detect_and_crop_face(self, image_data: bytes) -> Tuple[bytes, bool]:
        """Detect faces and crop to center the face if found"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return image_data, False
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            if len(faces) == 0:
                return image_data, False
            
            # Get largest face and center it
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            img_height, img_width = img.shape[:2]
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            
            target_center_x = img_width // 2
            target_center_y = img_height // 2
            
            offset_x = face_center_x - target_center_x
            offset_y = face_center_y - target_center_y
            
            crop_left = max(0, offset_x)
            crop_right = min(img_width, img_width + offset_x)
            crop_top = max(0, offset_y)
            crop_bottom = min(img_height, img_height + offset_y)
            
            if crop_left >= crop_right or crop_top >= crop_bottom:
                return image_data, False
            
            cropped_img = img[crop_top:crop_bottom, crop_left:crop_right]
            success, encoded_img = cv2.imencode('.jpg', cropped_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            if success:
                return encoded_img.tobytes(), True
            else:
                return image_data, False
                
        except Exception as e:
            print(f"⚠️  Error in face detection: {str(e)}")
            return image_data, False

    def upload_images_to_supabase(self, image_data: Dict[str, bytes]) -> Dict[str, str]:
        """Upload all images to Supabase storage"""
        print(f"📤 Uploading {len(image_data)} images to Supabase...")
        
        if not supabase:
            print("⚠️  Supabase not configured, skipping upload")
            return {}
        
        image_urls = {}
        
        for placeholder_id, raw_image_data in image_data.items():
            try:
                # Process image for face detection
                processed_data, face_detected = self.detect_and_crop_face(raw_image_data)
                
                # Upload to Supabase
                file_path = f"pdf_images/{placeholder_id}.jpg"
                supabase.storage.from_(BUCKET_NAME).upload(
                    path=file_path,
                    file=processed_data,
                    file_options={"content-type": "image/jpeg"}
                )
                
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
                image_urls[placeholder_id] = public_url
                
                status = "Face cropped" if face_detected else "Uploaded"
                print(f"✅ {status}: {placeholder_id}")
                
            except Exception as e:
                print(f"❌ Failed to upload {placeholder_id}: {str(e)}")
        
        return image_urls

    def split_text_by_bandits(self, text: str) -> List[str]:
        """Split text into chunks by bandit sections"""
        print("✂️  Splitting text by bandit sections...")
        
        # Split by common bandit separators
        sections = []
        lines = text.split('\n')
        current_section = []
        
        for line in lines:
            # Look for bandit start patterns (name + age + occupation patterns)
            line_stripped = line.strip()
            if (line_stripped and 
                len(line_stripped.split()) <= 5 and  # Short lines that could be names
                any(word.isdigit() for word in line_stripped.split()) and  # Contains age
                '[IMAGE:' not in line_stripped):  # Not an image placeholder
                
                # Save previous section if it has content
                if current_section and len('\n'.join(current_section).strip()) > 100:
                    sections.append('\n'.join(current_section))
                
                # Start new section
                current_section = [line]
            else:
                current_section.append(line)
        
        # Add the last section
        if current_section and len('\n'.join(current_section).strip()) > 100:
            sections.append('\n'.join(current_section))
        
        # If automatic splitting didn't work well, use fixed chunks
        if len(sections) < 5:
            print("⚠️  Automatic bandit splitting found few sections, using fixed chunks...")
            chunk_size = len(lines) // 10  # Split into ~10 chunks
            sections = []
            for i in range(0, len(lines), chunk_size):
                chunk = '\n'.join(lines[i:i + chunk_size])
                if len(chunk.strip()) > 100:
                    sections.append(chunk)
        
        print(f"📄 Split text into {len(sections)} sections")
        return sections

    def process_with_claude(self, text: str) -> Dict[str, Any]:
        """Process text with Claude API using chunking to handle ALL bandits"""
        print("🤖 Processing text with Claude AI...")
        
        if not claude_client:
            raise Exception("Anthropic API key not configured")
        
        # Split text into manageable chunks
        text_chunks = self.split_text_by_bandits(text)
        
        # Process each chunk and combine results
        all_bandits = []
        all_events = []
        all_bandit_events = []
        
        for i, chunk in enumerate(text_chunks, 1):
            print(f"🧩 Processing chunk {i}/{len(text_chunks)}...")
            
            chunk_prompt = f"""
Extract bandits and events from this text chunk. This is part {i} of {len(text_chunks)} chunks from a larger document.

Database schema:
- bandit: id (uuid), name, age, city, occupation, rating (0-5), image_url, description, family_name
- event: id (uuid), name, genre (single string, exactly one of: Food, Culture, Nightlife, Shopping, Coffee), description, rating (0-5), image_url, link, address, city, neighborhood, start_time, end_time, image_gallery (comma-separated string)
- bandit_event: id (uuid), bandit_id, event_id, personal_tip

Instructions:
1. Extract ALL bandits and events from this chunk - do not limit the number
2. Each bandit section starts with a bandit image then personal details
3. Events follow, ending with addresses. Some events have multiple images - first is main, others go in image_gallery  
4. For genre: return exactly one of: "Food", "Culture", "Nightlife", "Shopping", "Coffee"
5. Use image placeholders for image_url and image_gallery fields
6. Create unique UUIDs for all objects (use chunk_{i}_ prefix for uniqueness)
7. Create bandit_event relationships linking bandits to their recommended events
8. Leave fields null if they cannot be inferred
9. Return structured JSON with "bandit", "events", and "bandit_events" arrays

Text chunk:
{chunk}

Return only valid JSON without explanation or markdown formatting.
"""

            try:
                # Make API call to Claude for this chunk
                response = claude_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4000,  # Smaller limit per chunk
                    temperature=0.1,
                    system="You are a data extraction expert. Extract ALL bandits and events from the provided text chunk. Return only valid JSON.",
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
                chunk_bandits = chunk_data.get('bandit', [])
                chunk_events = chunk_data.get('events', [])
                chunk_relationships = chunk_data.get('bandit_events', [])
                
                all_bandits.extend(chunk_bandits)
                all_events.extend(chunk_events)
                all_bandit_events.extend(chunk_relationships)
                
                print(f"   ✅ Chunk {i}: {len(chunk_bandits)} bandits, {len(chunk_events)} events, {len(chunk_relationships)} relationships")
                
            except json.JSONDecodeError as e:
                print(f"   ❌ Chunk {i} - Invalid JSON: {e}")
                continue  # Skip this chunk but continue with others
            except Exception as e:
                print(f"   ❌ Chunk {i} - API error: {str(e)}")
                continue  # Skip this chunk but continue with others
        
        # Combine all results
        structured_data = {
            'bandit': all_bandits,
            'events': all_events,
            'bandit_events': all_bandit_events
        }
        
        print(f"🎯 Total AI processing complete:")
        print(f"   👥 Bandits: {len(all_bandits)}")
        print(f"   🎉 Events: {len(all_events)}")
        print(f"   🔗 Relationships: {len(all_bandit_events)}")
        
        return structured_data

    def combine_data_with_images(self, structured_data: Dict[str, Any], image_urls: Dict[str, str]) -> Dict[str, Any]:
        """Combine structured data with image URLs"""
        print("🔗 Combining structured data with image URLs...")
        
        def replace_placeholders(value):
            if isinstance(value, str) and value.startswith("[IMAGE: ") and value.endswith("]"):
                placeholder_id = value[8:-1]
                return image_urls.get(placeholder_id, value)
            elif isinstance(value, list):
                # Process image galleries - convert list to comma-separated string
                urls = []
                for item in value:
                    if isinstance(item, str) and item.startswith("[IMAGE: ") and item.endswith("]"):
                        placeholder_id = item[8:-1]
                        url = image_urls.get(placeholder_id, item)
                        urls.append(url)
                    else:
                        urls.append(str(item))
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
                    "image_gallery": event.get("image_gallery") or ""
                }
                
                supabase.table("event").insert(event_data).execute()
                event_id_mapping[old_id] = new_id
                print(f"   ✅ Event {i}: {event.get('name')}")
                
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

    def process_document(self):
        """Main pipeline to process document from DOCX to database"""
        print(f"🚀 Starting complete pipeline for: {self.docx_path}")
        
        try:
            # Step 1: Convert DOCX to PDF (or use existing PDF)
            if self.docx_path.suffix.lower() == '.pdf':
                # Input is already a PDF
                pdf_path = self.docx_path
                print(f"✅ Using existing PDF: {pdf_path}")
            else:
                # Convert DOCX to PDF
                pdf_path = self.convert_docx_to_pdf()
            
            # Step 2: Extract text with image placeholders
            extraction_result = self.extract_text_with_placeholders()
            
            # Step 3: Upload images to Supabase
            image_urls = self.upload_images_to_supabase(extraction_result["image_data"])
            
            # Step 4: Process with Claude AI (all bandits)
            structured_data = self.process_with_claude(extraction_result["readable_text"])
            
            # Step 5: Combine data with image URLs
            final_data = self.combine_data_with_images(structured_data, image_urls)
            
            # Step 6: Insert into database
            self.insert_to_database(final_data)
            
            print("✅ Complete pipeline finished successfully!")
            print(f"🎯 Processed ALL bandits from {self.docx_path.name}")
            
        except Exception as e:
            print(f"❌ Pipeline failed: {str(e)}")
            raise


def main():
    """Main function"""
    # Default to bandits.docx if no argument provided
    if len(sys.argv) == 1:
        docx_path = "bandits.docx"
    elif len(sys.argv) == 2:
        docx_path = sys.argv[1]
    else:
        print("Usage: python docx_to_database.py [input.docx]")
        print("If no file specified, defaults to 'bandits.docx'")
        sys.exit(1)
    
    if not Path(docx_path).exists():
        print(f"❌ File not found: {docx_path}")
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