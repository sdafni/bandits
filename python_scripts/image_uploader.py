import fitz  # PyMuPDF
import json
import os
import cv2
import numpy as np
from PIL import Image
import io
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
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

def detect_and_crop_face(image_data: bytes) -> Tuple[bytes, bool]:
    """
    Detect faces in image and crop to center the face if found.
    Maintains original aspect ratio by trimming edges to center the face.
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Tuple of (processed_image_bytes, face_detected)
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print("⚠️  Could not decode image")
            return image_data, False
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Load face cascade classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        
        if len(faces) == 0:
            print("📷 No faces detected, using original image")
            return image_data, False
        
        # Get the largest face (most prominent)
        largest_face = max(faces, key=lambda x: x[2] * x[3])
        x, y, w, h = largest_face
        
        # Calculate face center
        img_height, img_width = img.shape[:2]
        face_center_x = x + w // 2
        face_center_y = y + h // 2
        
        # Calculate how much to trim from each side to center the face
        # We want the face to be in the center of the final image
        target_center_x = img_width // 2
        target_center_y = img_height // 2
        
        # Calculate the offset needed to center the face
        offset_x = face_center_x - target_center_x
        offset_y = face_center_y - target_center_y
        
        # Calculate crop boundaries
        crop_left = max(0, offset_x)
        crop_right = min(img_width, img_width + offset_x)
        crop_top = max(0, offset_y)
        crop_bottom = min(img_height, img_height + offset_y)
        
        # Ensure we have a valid crop region
        if crop_left >= crop_right or crop_top >= crop_bottom:
            print("⚠️  Invalid crop region, using original image")
            return image_data, False
        
        # Crop the image to center the face
        cropped_img = img[crop_top:crop_bottom, crop_left:crop_right]
        
        # Convert back to bytes
        success, encoded_img = cv2.imencode('.jpg', cropped_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if success:
            processed_bytes = encoded_img.tobytes()
            print(f"✅ Face detected and centered by trimming edges")
            return processed_bytes, True
        else:
            print("⚠️  Failed to encode cropped image, using original")
            return image_data, False
            
    except Exception as e:
        print(f"⚠️  Error in face detection/cropping: {str(e)}")
        return image_data, False

def upload_image_to_supabase(image_data: bytes, placeholder_id: str) -> str:
    """
    Upload image data to Supabase storage and return the public URL
    """
    if not supabase:
        print(f"⚠️  Skipping upload for {placeholder_id} - Supabase not configured")
        return ""
    
    try:
        # Process image for face detection and cropping
        processed_image_data, face_detected = detect_and_crop_face(image_data)
        
        # Upload to Supabase storage
        file_path = f"pdf_images/{placeholder_id}.jpg"
        result = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=processed_image_data,
            file_options={"content-type": "image/jpeg"}
        )
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        status = "✅ Face cropped and uploaded" if face_detected else "✅ Uploaded"
        print(f"{status} {placeholder_id} to {public_url}")
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