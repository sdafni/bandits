import fitz  # PyMuPDF
import uuid
import json
import re
from pathlib import Path
from typing import Dict, List, Any

def clean_text(text: str) -> str:
    """
    Clean text by removing non-readable characters and normalizing whitespace
    """
    # Remove common non-readable characters
    text = re.sub(r'[^\x00-\x7F\u00A0-\uFFFF]', '', text)  # Remove non-printable chars
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)  # Remove zero-width spaces
    text = re.sub(r'●​', '', text)  # Remove bullet characters
    text = re.sub(r'\|]=\[', '', text)  # Remove separator characters
    text = re.sub(r'[^\w\s\.,!?;:()[\]{}"\'-]', '', text)  # Keep only readable chars
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = text.strip()
    
    return text

def extract_pdf_with_image_placeholders(pdf_path: str) -> Dict[str, Any]:
    """
    Extract PDF text and replace images with deterministic placeholders based on location.
    """
    print(f"🔍 Processing PDF: {pdf_path}")
    
    doc = fitz.open(pdf_path)
    readable_text = ""
    image_map = {}
    image_counter = 0
    
    # Process each page
    for page_num, page in enumerate(doc, 1):
        print(f"📖 Processing page {page_num}...")
        
        # Get all content blocks in order with their positions
        blocks = page.get_text("dict")["blocks"]
        
        # Sort blocks by position (top to bottom, left to right)
        sorted_blocks = sorted(blocks, key=lambda b: (b.get("bbox", [0, 0, 0, 0])[1], b.get("bbox", [0, 0, 0, 0])[0]))
        
        for block in sorted_blocks:
            if "lines" in block:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        if span["text"].strip():
                            cleaned_text = clean_text(span["text"].strip())
                            if cleaned_text:
                                readable_text += cleaned_text + "\n"
            
            elif "image" in block:  # Image block
                # Create deterministic placeholder based on location
                image_counter += 1
                placeholder_id = f"img_{page_num:03d}_{image_counter:03d}"
                
                # Add placeholder to text
                readable_text += f"[IMAGE: {placeholder_id}]\n"
                
                # Map placeholder to image file path
                image_map[placeholder_id] = f"pdf_output/images/{placeholder_id}.jpg"
    
    doc.close()
    
    return {
        "readable_text": readable_text,
        "image_map": image_map,
        "total_images": len(image_map)
    }

def save_extracted_content(result: Dict[str, Any], output_dir: str = "pdf_output") -> None:
    """
    Save the extracted content to files
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Save readable text
    text_file = output_path / "extracted_text.txt"
    with open(text_file, "w", encoding="utf-8") as f:
        f.write(result["readable_text"])
    
    # Save image mapping as JSON
    mapping_file = output_path / "image_mapping.json"
    with open(mapping_file, "w", encoding="utf-8") as f:
        json.dump(result["image_map"], f, indent=2)
    
    # Save complete result
    complete_file = output_path / "complete_extraction.json"
    with open(complete_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    
    print(f"✅ Saved extracted content:")
    print(f"   📄 Readable text: {text_file}")
    print(f"   🖼️  Image mapping: {mapping_file}")
    print(f"   📊 Complete data: {complete_file}")

def main():
    """Main function to extract PDF with image placeholders and parse to JSON"""
    pdf_path = "banditsORIG.docx.pdf"
    
    # Use the simple extraction method that works well
    result = extract_pdf_with_image_placeholders(pdf_path)
    
    # Save extracted content
    save_extracted_content(result)

if __name__ == "__main__":
    main() 