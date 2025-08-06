import fitz  # PyMuPDF
import json
import os
from pathlib import Path
from typing import Dict, List, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file in this directory
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
BUCKET_NAME = os.getenv('BUCKET_NAME', 'banditsassets3')

# Configuration flags
SKIP_UPLOAD = False  # Set to True to skip uploading images to Supabase

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("⚠️  Supabase credentials not found in .env file. Upload functionality will be disabled.")

def upload_image_to_supabase(image_data: bytes, placeholder_id: str) -> str:
    """
    Upload image data to Supabase storage and return the public URL
    """
    if not supabase:
        print(f"⚠️  Skipping upload for {placeholder_id} - Supabase not configured")
        return ""
    
    try:
        # Upload to Supabase storage
        file_path = f"pdf_images/{placeholder_id}.jpg"
        result = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=image_data,
            file_options={"content-type": "image/jpeg"}
        )
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        print(f"✅ Uploaded {placeholder_id} to {public_url}")
        return public_url
        
    except Exception as e:
        print(f"❌ Failed to upload {placeholder_id}: {str(e)}")
        return ""

def extract_and_upload_images(pdf_path: str) -> Dict[str, Any]:
    """
    Extract images from PDF and upload them to Supabase without saving to disk
    Creates a mapping from placeholder IDs to image URLs
    """
    print(f"🔍 Processing PDF for images: {pdf_path}")
    
    doc = fitz.open(pdf_path)
    image_map = {}
    image_counter = 0
    
    # Process each page
    for page_num, page in enumerate(doc, 1):
        print(f"📖 Processing page {page_num} for images...")
        
        # Get all content blocks in order with their positions
        blocks = page.get_text("dict")["blocks"]
        
        # Sort blocks by position (top to bottom, left to right)
        sorted_blocks = sorted(blocks, key=lambda b: (b.get("bbox", [0, 0, 0, 0])[1], b.get("bbox", [0, 0, 0, 0])[0]))
        
        for block in sorted_blocks:
            if "image" in block:  # Image block
                # Create deterministic placeholder based on location
                image_counter += 1
                placeholder_id = f"img_{page_num:03d}_{image_counter:03d}"
                
                # Extract image data
                image_data = block["image"]
                
                # Upload image to Supabase if not skipped
                if not SKIP_UPLOAD:
                    public_url = upload_image_to_supabase(image_data, placeholder_id)
                    if public_url:
                        # Map placeholder to URL (simple string mapping)
                        image_map[placeholder_id] = public_url
                else:
                    print(f"⏭️  Skipping upload for {placeholder_id}")
    
    doc.close()
    
    return {
        "image_map": image_map,
        "total_images": len(image_map)
    }

def save_upload_results(result: Dict[str, Any], output_dir: str = "pdf_output") -> None:
    """
    Save the upload results to files
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Save image mapping as JSON (placeholder_id -> url mapping)
    mapping_file = output_path / "image_urls.json"
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(result["image_map"], f, indent=2)
    
    print(f"✅ Saved upload results:")
    print(f"   🖼️  Image URLs mapping: {mapping_file}")
    print(f"   📊 Total images uploaded: {result['total_images']}")

def main():
    """Main function to extract and upload images from PDF"""
    pdf_path = "banditsORIG.docx.pdf"
    
    # Extract and upload images
    result = extract_and_upload_images(pdf_path)
    
    # Save upload results
    save_upload_results(result)

if __name__ == "__main__":
    main() 