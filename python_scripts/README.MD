# Database Population Workflow

This guide describes the complete process of converting a DOCX file to a populated database, including PDF conversion, text extraction, image processing, and data insertion.

## Prerequisites

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `python_scripts` directory with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   BUCKET_NAME=banditsassets3
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```

## Workflow Overview

The process follows these steps:
1. **DOCX → PDF**: Convert the source document
2. **PDF Text Extraction**: Extract text and create image placeholders
3. **AI Processing**: Use DeepSeek to parse and structure the data
4. **Image Upload**: Extract and upload images to Supabase storage
5. **Data Combination**: Merge structured data with image URLs
6. **Database Population**: Insert all data into Supabase tables

## Step-by-Step Process

### Step 1: Convert DOCX to PDF
**Input:** `bandits.docx`  
**Output:** `banditsORIG.docx.pdf`

Convert your DOCX file to PDF format. You can use any PDF converter (Microsoft Word, online converters, etc.).

### Step 2: Extract Text and Create Image Placeholders
**Script:** `pdf_text_parser.py`  
**Input:** `banditsORIG.docx.pdf`  
**Output:** 
- `pdf_output/extracted_text.txt` - Clean text with image placeholders
- `pdf_output/image_mapping.json` - Mapping of placeholders to image files
- `pdf_output/complete_extraction.json` - Complete extraction data

**What it does:** Extracts readable text from the PDF while replacing images with deterministic placeholders like `[IMAGE: img_001_001]`. This maintains the document structure while preparing for AI processing.

```bash
python pdf_text_parser.py
```

### Step 3: AI-Powered Data Parsing
**Script:** none, use a propmpt in DeepSeek web:
extracted_text.txt
TXT 104.18KB
Supabase Snippet Schema Explorer.csv
CSV 1.3KB
ill provide a text file. the text had images but now has placeholders ("[IMAGE: img_") i need to populate a db with the contents of this file. to do that i want to produce a structured json.
ill provide the db schema and some general instructions. try to infer from the text how to populate each column. the file is a list of "bandits". each bandit section starts with a bandit image than some private details. than comes a list of "events". each event ends with its address. starts with its name. some event lists start with a general description of the list, like "art galleries". ignore that for start.
some events have images. the first image is the main image. if there are others, they are "gallery". 
 image fields of bandits and events should be populated with the image placeholders

extract all bandits and events.
 leave null what cannot be infered
dont try to geocode, ill do that later.
as for genre: ANY (ARRAY['Food'::text, 'Culture'::text, 'Nightlife'::text, 'Shopping'::text, 'Coffee'::text])
try to infer from "category" if exists, or from a description line befor the list of events, or from event description.
keep one name field per event 
pages dont matter only bandit sections (i.e where one bandit ends and the oter begins)
ignore event sections within same bandit. they all belong to same bandit. (like "art galleries" "restaurants") i.e list is flattened. 
duplicate events should appear once in events list, and twice in bandit_event list
make the ids unique for all objects
i want the processing done by you (not a script)
they can also belong to other bandits, in this case create the prper bandit-event links to same event
i want each object to have uuid id.
i want the file downloadable at once, no need to show it on screen
**Input:** `pdf_output/extracted_text.txt`  
**Output:** `pdf_output/deepseek_json_20250806_2d5475.json`

**What it does:** Uses the DeepSeek AI model to parse the extracted text and convert it into structured JSON data containing bandits and events. The AI identifies people, their details, events, and relationships between them.



### Step 4: Extract and Upload Images
**Script:** `image_uploader.py`  
**Input:** `banditsORIG.docx.pdf`  
**Output:** `pdf_output/image_urls.json`

**What it does:** Extracts images from the PDF and uploads them directly to Supabase storage. Creates a mapping from placeholder IDs to public URLs.

```bash
python image_uploader.py
```

### Step 5: Combine Data with Image URLs
**Script:** `combine_data.py`  
**Input:** 
- `pdf_output/deepseek_json_20250806_2d5475.json` (structured data)
- `pdf_output/image_urls.json` (image URLs)
**Output:** `pdf_output/combined_data.json`

**What it does:** Merges the AI-generated structured data with the uploaded image URLs, replacing image placeholders with actual URLs.

```bash
python combine_data.py
```

### Step 6: Populate Database
**Script:** `insert_to_supabase.py`  
**Input:** `pdf_output/combined_data.json`  
**Output:** Populated Supabase database tables

**What it does:** Inserts all the processed data into Supabase tables:
- `bandit` table: Individual bandit profiles
- `event` table: Event information
- `bandit_event` table: Junction table linking bandits to events they participate in

```bash
python insert_to_supabase.py
```

## Script Details

### `pdf_text_parser.py`
- **Purpose:** Extracts clean text from PDF while preserving document structure
- **Key Features:** 
  - Removes non-readable characters and normalizes whitespace
  - Creates deterministic image placeholders based on page and position
  - Maintains text flow for AI processing

### `image_uploader.py`
- **Purpose:** Extracts images from PDF and uploads to cloud storage
- **Key Features:**
  - Direct upload to Supabase storage without local file saving
  - Creates public URLs for image access
  - Maps placeholder IDs to actual URLs

### `combine_data.py`
- **Purpose:** Merges structured data with image URLs
- **Key Features:**
  - Replaces image placeholders with actual URLs
  - Handles both single images and image galleries
  - Preserves data structure while adding image references

### `insert_to_supabase.py`
- **Purpose:** Populates the database with processed data
- **Key Features:**
  - Truncates existing data before insertion
  - Generates proper UUIDs for all records
  - Handles relationships between bandits and events
  - Error handling and progress reporting

## Output Files

The workflow generates several intermediate files in the `pdf_output/` directory:
- `extracted_text.txt` - Raw extracted text with placeholders
- `image_mapping.json` - Local image file mappings
- `image_urls.json` - Cloud storage URL mappings
- `deepseek_json_20250806_2d5475.json` - AI-processed structured data
- `combined_data.json` - Final data ready for database insertion

## Database Schema

The scripts populate three main tables:
- **bandit**: Individual profiles with name, age, city, occupation, etc.
- **event**: Event details with title, description, location, etc.
- **bandit_event**: Junction table linking bandits to events they participate in

## Troubleshooting

1. **Missing environment variables:** Ensure all required API keys and URLs are in your `.env` file
2. **PDF conversion issues:** Make sure the PDF is readable and contains extractable text
3. **Image upload failures:** Check Supabase storage permissions and bucket configuration
4. **AI processing errors:** Verify DeepSeek API key and quota limits

## Quick Start

To run the entire workflow:
```bash
# 1. Convert your DOCX to PDF and place as banditsORIG.docx.pdf
# 2. Run the extraction pipeline
python pdf_text_parser.py

Use Web AI 
python image_uploader.py # empty the bucket first
python combine_data.py
python insert_to_supabase.py
```
