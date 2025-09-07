import json
import sys
from pathlib import Path
from typing import Dict, Any, List

def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load JSON file and return the data"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{file_path}' not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in '{file_path}': {e}")
        sys.exit(1)

def replace_image_placeholders(data: Dict[str, Any], image_urls: Dict[str, str]) -> Dict[str, Any]:
    """
    Replace image placeholders in the data with actual URLs
    """
    def replace_in_value(value: Any) -> Any:
        if isinstance(value, str):
            # Check if it's an image placeholder
            if value.startswith("[IMAGE: ") and value.endswith("]"):
                placeholder = value[8:-1]  # Remove "[IMAGE: " and "]"
                return image_urls.get(placeholder, value)  # Return URL or original if not found
            return value
        elif isinstance(value, list):
            return [replace_in_value(item) for item in value]
        elif isinstance(value, dict):
            return {key: replace_in_value(val) for key, val in value.items()}
        else:
            return value
    
    return replace_in_value(data)

def process_image_gallery(gallery: List[str], image_urls: Dict[str, str]) -> str:
    """
    Convert image gallery list to comma-separated URLs
    Returns empty string for empty lists
    """
    if not gallery:  # Handle empty lists
        return ""
    
    urls = []
    for placeholder in gallery:
        if placeholder.startswith("[IMAGE: ") and placeholder.endswith("]"):
            placeholder_id = placeholder[8:-1]
            url = image_urls.get(placeholder_id, placeholder)
            urls.append(url)
        else:
            urls.append(placeholder)
    
    return ", ".join(urls)

def main():
    """Main function to combine JSON data with image URLs"""
    print(f"🔍 Loading data from: {DATA_FILE}")
    data = load_json_file(DATA_FILE)
    
    print(f"🖼️  Loading image URLs from: {IMAGES_FILE}")
    image_urls = load_json_file(IMAGES_FILE)
    
    print("🔄 Replacing image placeholders with URLs...")
    
    # Replace image_url fields
    for bandit in data.get('bandit', []):
        if 'image_url' in bandit and bandit['image_url']:
            bandit['image_url'] = replace_image_placeholders(bandit['image_url'], image_urls)
    
    for event in data.get('events', []):
        if 'image_url' in event and event['image_url']:
            event['image_url'] = replace_image_placeholders(event['image_url'], image_urls)
        
        if 'image_gallery' in event and event['image_gallery'] is not None:
            # Convert image_gallery from list to comma-separated string (even if empty)
            if isinstance(event['image_gallery'], list):
                event['image_gallery'] = process_image_gallery(event['image_gallery'], image_urls)
            # If it's already a string, leave it as is
    
    # Save the combined data
    output_path = Path(OUTPUT_FILE)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Combined data saved to: {output_path}")
    
    # Print summary
    bandit_count = len(data.get('bandit', []))
    event_count = len(data.get('events', []))
    image_count = len(image_urls)
    
    print(f"📊 Summary:")
    print(f"   👥 Bandits processed: {bandit_count}")
    print(f"   🎉 Events processed: {event_count}")
    print(f"   🖼️  Image URLs available: {image_count}")

# Configuration - Edit these variables as needed
DATA_FILE = "pdf_output/deepseek_json_20250806_2d5475.json"
IMAGES_FILE = "pdf_output/image_urls.json"
OUTPUT_FILE = "pdf_output/combined_data.json"

if __name__ == "__main__":
    main() 