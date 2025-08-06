# Database Population Workflow

Create `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
BUCKET_NAME=banditsassets3
DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Workflow Steps

### 1. Convert DOCX to PDF
**Input:** `bandits.docx`  
**Output:** `banditsORIG.docx.pdf`  
**Purpose:** Convert source document to PDF format

### 2. Extract Text and Images
**Script:** `pdf_text_parser.py`  
**Input:** `banditsORIG.docx.pdf`  
**Output:** `pdf_output/extracted_text.txt`, `pdf_output/image_mapping.json`  
**Purpose:** Extract clean text with image placeholders for AI processing

### 3. Parse with AI
**Script:** Use DeepSeek web interface  
**Input:** `pdf_output/extracted_text.txt` + `Supabase Snippet Schema Explorer.csv`  
**Output:** `pdf_output/deepseek_json_20250806_2d5475.json`  
**Purpose:** Convert unstructured text to structured JSON data

### 4. Upload Images
**Script:** `image_uploader.py`  
**Input:** `banditsORIG.docx.pdf`  
**Output:** `pdf_output/image_urls.json`  
**Purpose:** Extract and upload images to Supabase storage

### 5. Combine Data
**Script:** `combine_data.py`  
**Input:** `pdf_output/deepseek_json_20250806_2d5475.json`, `pdf_output/image_urls.json`  
**Output:** `pdf_output/combined_data.json`  
**Purpose:** Merge structured data with image URLs

### 6. Populate Database
**Script:** `insert_to_supabase.py`  
**Input:** `pdf_output/combined_data.json`  
**Output:** Populated Supabase tables  
**Purpose:** Insert all data into database tables
