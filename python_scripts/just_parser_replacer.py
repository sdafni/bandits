import fitz  # PyMuPDF
from pathlib import Path
from PIL import Image
import io
import json
import uuid
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def extract_pdf_with_image_placeholders(pdf_path, output_dir="pdf_output"):
    print(f"🔍 Starting PDF extraction from: {pdf_path}")
    output_dir = Path(output_dir)
    images_dir = output_dir / "images"
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)
    print(f"📁 Created output directory: {output_dir}")

    doc = fitz.open(pdf_path)
    print(f"📄 Opened PDF with {len(doc)} pages")
    text_with_placeholders = ""
    image_map = {}

    for page_num, page in enumerate(doc, start=1):
        print(f"📖 Processing page {page_num}...")
        blocks = page.get_text("blocks", sort=True)
        blocks.sort(key=lambda b: (b[1], b[0]))

        for block in blocks:
            _, _, _, _, text, *_ = block
            if text.strip():
                text_with_placeholders += text.strip() + "\n"

        images_on_page = page.get_images(full=True)
        print(f"🖼️  Found {len(images_on_page)} images on page {page_num}")
        
        for img_index, img in enumerate(images_on_page):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            image_id = f"img_{page_num}_{img_index}_{uuid.uuid4().hex[:6]}"
            image_filename = f"{image_id}.{image_ext}"
            image_path = images_dir / image_filename

            # image = Image.open(io.BytesIO(image_bytes))
            # image.save(image_path)
            print(f"💾 Saved image: {image_filename}")

            text_with_placeholders += f"[IMAGE_ID: {image_id}]\n"
            image_map[image_id] = str(image_path)

    doc.close()

    text_path = output_dir / "text_with_placeholders.txt"
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text_with_placeholders)
    print(f"📝 Saved text with placeholders: {text_path}")

    image_map_path = output_dir / "image_map.json"
    with open(image_map_path, "w", encoding="utf-8") as f:
        json.dump(image_map, f, indent=2)
    print(f"🗺️  Saved image map: {image_map_path}")
    print(f"📊 Total images extracted: {len(image_map)}")

    return text_path, image_map_path, images_dir, text_with_placeholders


def call_deepseek_chat(api_key: str, system_prompt: str, user_input: str, model="deepseek-chat"):
    print(f"🤖 Calling DeepSeek API with model: {model}")
    url = "https://api.deepseek.com/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        "temperature": 0.2,
        "max_tokens": 8192
    }

    print(f"📤 Sending request to DeepSeek API...")
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    print(f"✅ Received response from DeepSeek API")

    return response.json()["choices"][0]["message"]["content"]


def main(pdf_path, api_key, output_dir="pdf_output"):
    print(f"🚀 Starting main processing...")
    print(f"📄 Input PDF: {pdf_path}")
    print(f"🔑 API Key: {'*' * 10 + api_key[-4:] if api_key else 'None'}")
    print(f"📁 Output directory: {output_dir}")
    
    # Phase 1: extract text + image placeholders
    print(f"\n📋 Phase 1: Extracting text and images from PDF...")
    text_path, image_map_path, images_dir, placeholder_text = extract_pdf_with_image_placeholders(pdf_path, output_dir)
    print(f"📏 Extracted text length: {len(placeholder_text)} characters")

    # Phase 2: call DeepSeek-Chat to extract structured JSON
    print(f"\n🤖 Phase 2: Calling DeepSeek API for structured extraction...")

    csv_path = "Supabase Snippet Schema Explorer.csv"
    with open(csv_path, "r", encoding="utf-8") as f:
        csv_data = f.read()

    system_prompt = (
        "You are a helpful assistant that extracts structured data from documents."
        "the text comes from a file that had images, these where replaced with placeholders in the format [IMAGE_ID: img_123456]."
        "The text in hand contains sections of Bandits, each Bandit starts with an image (noted by IMAGE_ID), than name, than other details"
        "than comes a list of events related to the current bandit section,  each event starts with a name and ends with an address"
        "produce a structured json with a list of bandits, a list of events , and list of bandit event links"
        "The json fields should match the target DB schema here:"
        "\n\nReference CSV data:\n" + csv_data + ""


        "Try to infer from the text the matching fields. "
        "Select unique uuids for all objects"
        "Bandits have main image: put the image placeholder there"
        "Events may or may not have images, if they do, the first is the main, th resy are the gallery. in the gallery put a comma separated list of placeholders"
        "Events may appear twice, in that case if one has images and the other doesnt, fill the missing images. also, create 2 event-bandit links in such case"
        "Leave null what you can't figure out"
        "DO not try to geocode"
        "rating should be random between 1 and 5"
    )

    try:
        print(f"📝 Sending text to DeepSeek (first 200 chars): {placeholder_text[:200]}...")
        result = call_deepseek_chat(api_key, system_prompt, placeholder_text)
        print(f"📄 Received response from DeepSeek (length: {len(result)} characters)")
    except requests.exceptions.HTTPError as e:
        print(f"❌ Error during API call: {e.response.text}")
        return
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return

    # Save output
    json_output_path = Path(output_dir) / "deepseek_output.json"
    with open(json_output_path, "w", encoding="utf-8") as f:
        f.write(result)
    print(f"💾 Saved DeepSeek output: {json_output_path}")

    print("\n✅ Processing complete!")
    print(f"📁 Output files:")
    print(f"  - Text with placeholders: {text_path}")
    print(f"  - Image map: {image_map_path}")
    print(f"  - DeepSeek JSON result: {json_output_path}")


if __name__ == "__main__":
    print("🎯 Starting just_parser_replacer.py")
    pdf_path = "banditsORIG.docx.pdf"
    print(f"📄 Using PDF file: {pdf_path}")

    api_key = os.getenv("DEEPSEEK_API_KEY")
    
    if not api_key:
        print("❌ Error: DEEPSEEK_API_KEY not found in environment variables.")
        print("Please add DEEPSEEK_API_KEY to your .env file")
    else:
        print(f"🔑 Found API key: {'*' * 10 + api_key[-4:]}")
        main(pdf_path, api_key)
