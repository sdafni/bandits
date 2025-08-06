import os
import io
import uuid
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import asyncio

# Core libraries
import fitz  # PyMuPDF for PDF processing
from PIL import Image
import pandas as pd
from dotenv import load_dotenv

# LangChain imports
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOllama
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.language_models.chat_models import BaseChatModel

# Supabase
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
SUPABASE_BUCKET_NAME = "banditsassets3"

# Configuration flags
PARSE_ONLY = True  # Set to True to only parse PDF content without database operations
DEBUG_MODE = True  # Set to True to enable detailed logging for debugging

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Validate environment variables
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


class PDFParser:
    """Enhanced PDF parser that extracts text, images, and metadata"""

    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.pages_data = []

    def extract_all_content(self) -> Dict[str, Any]:
        """Extract all content from PDF including text, images, and metadata"""
        content = {
            'metadata': self.doc.metadata,
            'page_count': len(self.doc),
            'pages': [],
            'images': []
        }

        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            page_data = {
                'page_number': page_num + 1,
                'text': page.get_text(),
                'images': self._extract_images_from_page(page, page_num)
            }
            content['pages'].append(page_data)
            content['images'].extend(page_data['images'])

        return content

    def _extract_images_from_page(self, page, page_num: int) -> List[Dict]:
        """Extract images from a specific page"""
        images = []
        image_list = page.get_images()

        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                pix = fitz.Pixmap(self.doc, xref)

                if pix.n - pix.alpha < 4:  # GRAY or RGB
                    img_data = pix.tobytes("png")
                    images.append({
                        'page_number': page_num + 1,
                        'image_index': img_index,
                        'data': img_data,
                        'filename': f"page_{page_num + 1}_img_{img_index}.png"
                    })
                pix = None
            except Exception as e:
                logger.warning(f"Could not extract image {img_index} from page {page_num + 1}: {e}")

        return images


# Tool Input Models
class UploadImageInput(BaseModel):
    image_data: bytes = Field(description="Binary image data")
    filename: str = Field(description="Name for the uploaded file")
    bucket_name: str = Field(default=SUPABASE_BUCKET_NAME, description="Supabase storage bucket name")


class InsertBanditInput(BaseModel):
    name: str = Field(description="Bandit name")
    age: Optional[int] = Field(description="Bandit age")
    city: Optional[str] = Field(description="Bandit city")
    occupation: Optional[str] = Field(description="Bandit occupation")
    image_url: Optional[str] = Field(description="URL of uploaded image")
    rating: Optional[int] = Field(description="Bandit rating (1-5)")
    description: Optional[str] = Field(description="Bandit description")
    why_follow: Optional[str] = Field(description="Why to follow this bandit")
    family_name: Optional[str] = Field(description="Bandit family name")
    icon: Optional[str] = Field(description="Icon identifier")


class InsertEventInput(BaseModel):
    name: str = Field(description="Event name")
    genre: Optional[str] = Field(description="Event genre")
    description: Optional[str] = Field(description="Event description")
    rating: Optional[int] = Field(description="Event rating (1-5)")
    image_url: Optional[str] = Field(description="URL of uploaded image")
    link: Optional[str] = Field(description="Event link/URL")
    address: Optional[str] = Field(description="Event address")
    city: Optional[str] = Field(description="Event city")
    neighborhood: Optional[str] = Field(description="Event neighborhood")
    start_time: Optional[str] = Field(description="Event start time (ISO format)")
    end_time: Optional[str] = Field(description="Event end time (ISO format)")
    location_lat: Optional[float] = Field(description="Latitude coordinate")
    location_lng: Optional[float] = Field(description="Longitude coordinate")
    image_gallery: Optional[str] = Field(description="Additional image URLs (JSON string)")


class CreateBanditEventInput(BaseModel):
    bandit_id: str = Field(description="UUID of the bandit")
    event_id: str = Field(description="UUID of the event")
    personal_tip: Optional[str] = Field(description="Personal tip from bandit about event")


class ExtractPDFInput(BaseModel):
    pdf_path: str = Field(description="Path to the PDF file to extract content from")


class AnalyzeContentInput(BaseModel):
    content_summary: str = Field(description="Summary of the extracted PDF content to analyze")


class AnalyzeContentTool(BaseTool):
    name: str = "analyze_pdf_content"
    description: str = "Analyze the extracted PDF content to identify bandits (local people) and events"
    args_schema: type = AnalyzeContentInput
    
    def _run(self, content_summary: str) -> str:
        try:
            # This tool helps the model analyze the content systematically
            analysis = f"""
            CONTENT ANALYSIS:
            
            {content_summary}
            
            ANALYSIS INSTRUCTIONS:
            1. Look for any person's name that appears prominently in the text
            2. For each person found, identify if they have:
               - Personal details (age, occupation, city)
               - A description or story about them
               - Any images associated with them
            3. Look for event names, descriptions, and locations
            4. Identify any relationships between people and events
            
            Please use this analysis to guide your extraction of bandits and events.
            """
            
            if DEBUG_MODE:
                logger.info("=== DEBUG: Content Analysis Tool Called ===")
                logger.info(f"Content summary length: {len(content_summary)} characters")
                logger.info("=== END DEBUG ===")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze content: {e}")
            return f"Error analyzing content: {e}"


# LangChain Tools
class UploadImageTool(BaseTool):
    name: str = "upload_image_to_supabase"
    description: str = "Upload an image to Supabase storage and return the public URL"
    args_schema: type = UploadImageInput

    def _run(self, image_data: bytes, filename: str, bucket_name: str = SUPABASE_BUCKET_NAME) -> str:
        try:
            # Check if we should skip actual upload and use fake URL
            if PARSE_ONLY:
                fake_url = f"https://fake-storage.example.com/{bucket_name}/{uuid.uuid4()}_{filename}"
                logger.info(f"PARSE_ONLY=True: Using fake URL: {fake_url}")
                return fake_url
            
            # Upload to Supabase storage
            result = supabase.storage.from_(bucket_name).upload(
                path=f"{uuid.uuid4()}_{filename}",
                file=image_data,
                file_options={"content-type": "image/png"}
            )

            # Check if upload was successful (handle cases where status_code might not be present)
            if hasattr(result, 'status_code') and result.status_code == 200:
                # Get public URL
                public_url = supabase.storage.from_(bucket_name).get_public_url(result.path)
                logger.info(f"Image uploaded successfully: {public_url}")
                return public_url
            elif hasattr(result, 'path'):
                # If no status_code but path exists, assume success
                public_url = supabase.storage.from_(bucket_name).get_public_url(result.path)
                logger.info(f"Image uploaded successfully: {public_url}")
                return public_url
            else:
                raise Exception(f"Upload failed: {result}")

        except Exception as e:
            logger.error(f"Failed to upload image {filename}: {e}")
            return f"Error uploading image: {e}"


class InsertBanditTool(BaseTool):
    name: str = "insert_bandit"
    description: str = "Insert a new bandit record into the database"
    args_schema: type = InsertBanditInput

    def _run(self, **kwargs) -> str:
        try:
            bandit_data = {
                'id': str(uuid.uuid4()),
                'created_at': datetime.utcnow().isoformat(),
                **{k: v for k, v in kwargs.items() if v is not None}
            }

            # Debug: Log bandit data if DEBUG_MODE is enabled
            if DEBUG_MODE:
                logger.info(f"=== DEBUG: Inserting Bandit ===")
                logger.info(f"Name: {bandit_data.get('name', 'N/A')}")
                logger.info(f"Age: {bandit_data.get('age', 'N/A')}")
                logger.info(f"City: {bandit_data.get('city', 'N/A')}")
                logger.info(f"Occupation: {bandit_data.get('occupation', 'N/A')}")
                logger.info(f"Description: {bandit_data.get('description', 'N/A')[:100]}...")
                logger.info("=== END DEBUG ===")

            # Check if we should skip database operations
            if PARSE_ONLY:
                logger.info(f"PARSE_ONLY=True: Skipping bandit insertion for {bandit_data.get('name', 'Unknown')}")
                return f"PARSE_ONLY: Would insert bandit '{bandit_data.get('name', 'Unknown')}' (skipped)"

            result = supabase.table('bandits').insert(bandit_data).execute()
            logger.info(f"Bandit inserted successfully: {result.data[0]['id']}")
            return f"Bandit inserted with ID: {result.data[0]['id']}"

        except Exception as e:
            logger.error(f"Failed to insert bandit: {e}")
            return f"Error inserting bandit: {e}"


class InsertEventTool(BaseTool):
    name: str = "insert_event"
    description: str = "Insert a new event record into the database"
    args_schema: type = InsertEventInput

    def _run(self, **kwargs) -> str:
        try:
            event_data = {
                'id': str(uuid.uuid4()),
                'created_at': datetime.utcnow().isoformat(),
                **{k: v for k, v in kwargs.items() if v is not None}
            }

            # Check if we should skip database operations
            if PARSE_ONLY:
                logger.info(f"PARSE_ONLY=True: Skipping event insertion for {event_data.get('name', 'Unknown')}")
                return f"PARSE_ONLY: Would insert event '{event_data.get('name', 'Unknown')}' (skipped)"

            result = supabase.table('event').insert(event_data).execute()
            logger.info(f"Event inserted successfully: {result.data[0]['id']}")
            return f"Event inserted with ID: {result.data[0]['id']}"

        except Exception as e:
            logger.error(f"Failed to insert event: {e}")
            return f"Error inserting event: {e}"


class CreateBanditEventTool(BaseTool):
    name: str = "create_bandit_event_relation"
    description: str = "Create a relationship between a bandit and an event"
    args_schema: type = CreateBanditEventInput

    def _run(self, bandit_id: str, event_id: str, personal_tip: Optional[str] = None) -> str:
        try:
            relation_data = {
                'id': str(uuid.uuid4()),
                'created_at': datetime.utcnow().isoformat(),
                'bandit_id': bandit_id,
                'event_id': event_id,
                'personal_tip': personal_tip
            }

            # Check if we should skip database operations
            if PARSE_ONLY:
                logger.info(f"PARSE_ONLY=True: Skipping bandit-event relation creation")
                return f"PARSE_ONLY: Would create bandit-event relation (skipped)"

            result = supabase.table('bandit_event').insert(relation_data).execute()
            logger.info(f"Bandit-Event relation created: {result.data[0]['id']}")
            return f"Bandit-Event relation created with ID: {result.data[0]['id']}"

        except Exception as e:
            logger.error(f"Failed to create bandit-event relation: {e}")
            return f"Error creating relation: {e}"


class ExtractPDFContentTool(BaseTool):
    name: str = "extract_pdf_content"
    description: str = "Extract all content from the PDF including text and images"
    args_schema: type = ExtractPDFInput
    extracted_content: Optional[Dict[str, Any]] = None

    def _run(self, pdf_path: str) -> str:
        try:
            parser = PDFParser(pdf_path)
            content = parser.extract_all_content()

            # Save extracted content for the agent to process
            self.extracted_content = content

            # Debug: Log sample content if DEBUG_MODE is enabled
            if DEBUG_MODE and content['pages']:
                logger.info("=== DEBUG: Sample PDF Content ===")
                for i, page in enumerate(content['pages'][:3]):  # First 3 pages
                    sample_text = page['text'][:500] if page['text'] else "No text found"
                    logger.info(f"Page {i+1} sample text: {sample_text}...")
                logger.info("=== END DEBUG ===")

            summary = f"""
            PDF Content Extracted Successfully:
            - Total pages: {content['page_count']}
            - Total images found: {len(content['images'])}
            - Metadata: {content['metadata']}

            The content is now available for processing. Each page contains text and images that can be analyzed.
            """

            return summary

        except Exception as e:
            logger.error(f"Failed to extract PDF content: {e}")
            return f"Error extracting PDF: {e}"


# Model Configuration
class ModelConfig:
    """Configuration for different LLM providers"""

    OPENAI_MODELS = {
        "gpt-4-turbo": "gpt-4-turbo-preview",
        "gpt-4": "gpt-4",
        "gpt-3.5-turbo": "gpt-3.5-turbo-1106"
    }

    DEEPSEEK_MODELS = {
        "deepseek-chat": "deepseek-chat",
        "deepseek-coder": "deepseek-coder"
    }

    ANTHROPIC_MODELS = {
        "claude-3-opus": "claude-3-opus-20240229",
        "claude-3-sonnet": "claude-3-sonnet-20240229",
        "claude-3-haiku": "claude-3-haiku-20240307"
    }

    OLLAMA_MODELS = {
        "llama2": "llama2:latest",
        "codellama": "codellama:latest",
        "mistral": "mistral:latest"
    }


def create_llm(provider: str = "deepseek", model: str = "deepseek-chat", temperature: float = 0.1,
               **kwargs) -> BaseChatModel:
    """
    Create LLM instance based on provider and model

    Args:
        provider: One of 'openai', 'deepseek', 'anthropic', 'ollama'
        model: Model name (varies by provider)
        temperature: Temperature setting
        **kwargs: Additional model-specific parameters

    Returns:
        Configured LLM instance
    """

    if provider.lower() == "openai":
        model_name = ModelConfig.OPENAI_MODELS.get(model, model)
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            **kwargs
        )

    elif provider.lower() == "deepseek":
        model_name = ModelConfig.DEEPSEEK_MODELS.get(model, model)
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base="https://api.deepseek.com/v1",
            **kwargs
        )

    elif provider.lower() == "anthropic":
        model_name = ModelConfig.ANTHROPIC_MODELS.get(model, model)
        return ChatAnthropic(
            model=model_name,
            temperature=temperature,
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            **kwargs
        )

    elif provider.lower() == "ollama":
        model_name = ModelConfig.OLLAMA_MODELS.get(model, model)
        return ChatOllama(
            model=model_name,
            temperature=temperature,
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            **kwargs
        )

    else:
        raise ValueError(f"Unsupported provider: {provider}. Choose from 'openai', 'deepseek', 'anthropic', 'ollama'")


# Agent Setup
def create_pdf_processing_agent(
        provider: str = "deepseek",
        model: str = "deepseek-chat",
        temperature: float = 0.1,
        **model_kwargs
):
    """
    Create the LangChain agent with all tools and configurable LLM

    Args:
        provider: LLM provider ('openai', 'deepseek', 'anthropic', 'ollama')
        model: Model name specific to the provider
        temperature: Model temperature
        **model_kwargs: Additional model-specific parameters
    """

    # Initialize tools
    tools = [
        ExtractPDFContentTool(),
        UploadImageTool(),
        InsertBanditTool(),
        InsertEventTool(),
        CreateBanditEventTool(),
        AnalyzeContentTool()
    ]

    # Initialize LLM with specified provider and model
    llm = create_llm(
        provider=provider,
        model=model,
        temperature=temperature,
        **model_kwargs
    )

    logger.info(f"Initialized {provider} model: {model}")

    # Create prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a PDF processing agent that extracts content from PDFs and populates a Supabase database.

IMPORTANT: Only extract information that actually exists in the PDF content. Do not make up or hallucinate any information.

Database Schema:
- bandits: id, name, age, city, occupation, image_url, rating, is_liked, icon, created_at, description, why_follow, family_name
- event: id, name, genre, description, rating, image_url, link, address, city, neighborhood, start_time, end_time, location_lat, location_lng, image_gallery, created_at
- bandit_event: id, bandit_id, event_id, personal_tip, created_at
- event_user_likes: id, user_id, event_id, created_at
- user_bandit: id, user_id, bandit_id, review, rating, created_at, updated_at, user_name

Note: "Bandits" refers to local people/characters mentioned in the PDF, not criminals. These are typically local guides, personalities, or featured individuals in the city guide.

STEP-BY-STEP PROCESS:
1. Extract all content from the PDF using the extract_pdf_content tool
2. Use the analyze_pdf_content tool to systematically analyze the extracted content
3. Look for any person's name that appears prominently, followed by personal details
4. For each person found, extract their information and insert as a bandit
5. Look for event names, descriptions, and locations
6. For each event found, extract their information and insert as an event
7. Create relationships between bandits and events where appropriate
8. Process any images found and upload them to Supabase storage

CRITICAL: Only insert data that you can clearly identify from the PDF content. If information is missing or unclear, leave those fields as NULL rather than guessing.
"""),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}")
    ])

    # Create agent
    agent = create_openai_tools_agent(llm, tools, prompt)

    # Create executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=20,
        handle_parsing_errors=True
    )

    return agent_executor


def truncate_tables():
    """
    Truncate bandits, events, and relation tables at the start of processing
    """
    try:
        # Skip truncation if PARSE_ONLY is enabled
        if PARSE_ONLY:
            logger.info("PARSE_ONLY=True: Skipping table truncation")
            return
            
        logger.info("Truncating database tables...")
        
        # Truncate tables in order (respecting foreign key constraints)
        tables_to_truncate = [
            'bandit_event',  # Relations first (foreign keys)
            'user_bandit',   # User relations
            'event_user_likes',  # Event likes
            'bandits',       # Main tables
            'event'          # Main tables
        ]
        
        for table in tables_to_truncate:
            try:
                result = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                logger.info(f"Truncated table '{table}': {len(result.data) if result.data else 0} rows deleted")
            except Exception as e:
                logger.warning(f"Failed to truncate table '{table}': {e}")
        
        logger.info("Database tables truncated successfully")
        
    except Exception as e:
        logger.error(f"Error truncating tables: {e}")
        raise


def print_processing_statistics():
    """
    Print statistics about the processed data
    """
    try:
        # Skip statistics if PARSE_ONLY is enabled
        if PARSE_ONLY:
            logger.info("=== PARSE_ONLY MODE ===")
            logger.info("Database operations were skipped. No statistics available.")
            logger.info("Check the logs above to see what would have been inserted.")
            logger.info("=== END PARSE_ONLY MODE ===")
            return {
                'mode': 'parse_only',
                'message': 'Database operations skipped'
            }
            
        logger.info("=== PROCESSING STATISTICS ===")
        
        # Get bandits count
        bandits_result = supabase.table('bandits').select('id', count='exact').execute()
        total_bandits = bandits_result.count if hasattr(bandits_result, 'count') else len(bandits_result.data)
        logger.info(f"Total number of bandits: {total_bandits}")
        
        # Get events count
        events_result = supabase.table('event').select('id', count='exact').execute()
        total_events = events_result.count if hasattr(events_result, 'count') else len(events_result.data)
        logger.info(f"Total number of events: {total_events}")
        
        # Get unique events count (by name)
        unique_events_result = supabase.table('event').select('name').execute()
        unique_event_names = set()
        if unique_events_result.data:
            unique_event_names = set(event['name'] for event in unique_events_result.data if event.get('name'))
        logger.info(f"Total number of unique events: {len(unique_event_names)}")
        
        # Get bandit-event relations count
        relations_result = supabase.table('bandit_event').select('id', count='exact').execute()
        total_relations = relations_result.count if hasattr(relations_result, 'count') else len(relations_result.data)
        logger.info(f"Total number of bandit-event relations: {total_relations}")
        
        logger.info("=== END STATISTICS ===")
        
        return {
            'total_bandits': total_bandits,
            'total_events': total_events,
            'unique_events': len(unique_event_names),
            'total_relations': total_relations
        }
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return None


# Main execution function
async def process_pdf_with_agent(pdf_path: str, processing_prompt: str):
    """
    Main function to process PDF with the LangChain agent

    Args:
        pdf_path: Path to the PDF file
        processing_prompt: Detailed prompt describing the PDF structure and what to extract
    """

    # Truncate tables at the start
    truncate_tables()

    # Create the agent
    agent_executor = create_pdf_processing_agent()

    # Prepare the input
    input_text = f"""
    Please process the PDF located at: {pdf_path}

    Processing Instructions:
    {processing_prompt}

    Steps to follow:
    1. First, extract all content from the PDF
    2. Upload any images found to Supabase storage
    3. Analyze the text content according to the instructions
    4. Insert appropriate records into the database
    5. Create any necessary relationships between records

    Please provide a detailed summary of what was processed and inserted.
    """

    try:
        # Execute the agent
        result = await agent_executor.ainvoke({"input": input_text})
        
        # Print statistics after processing
        stats = print_processing_statistics()
        
        # Add statistics to the result
        if stats:
            result['statistics'] = stats
        
        return result

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        return {"error": str(e)}


# Example usage
if __name__ == "__main__":
    import asyncio

    # Example processing prompt - customize this based on your PDF structure
    example_prompt = """
    This PDF contains information about local bandits and events in various cities.

    BANDIT IDENTIFICATION GUIDE:
    - A "bandit" is a local person/character featured in the city guide
    - Look for sections that start with a person's image followed by name followed by their details
    - Bandits typically have: name, age, city, occupation, description, and sometimes an image
    
    BANDIT SECTION STRUCTURE:
    - Bandit name is RED , use this to detect a bandit section start
    - Starts with: Person's image, than name (often in larger/bold text)
    - Contains: Age, city, occupation, personal description
    - Sometimes Ends with: Reviews from fake users or tips about events
    
    EVENT IDENTIFICATION GUIDE:
    - Events are typically listed after bandit profiles
    - Look for event names, descriptions, locations, addresses
    - Events always end with an address
    - Some events may have images or galleries
    
    SPECIFIC INSTRUCTIONS:
    1. SCAN FOR BANDITS: Look for any person's name that appears prominently, followed by personal details
    2. EXTRACT BANDIT DATA: For each bandit found, extract:
       - name (required)
       - age (if mentioned)
       - city (if mentioned) 
       - occupation (if mentioned)
       - description (personal story/details about them)
       - why_follow (why someone should follow this person)
       - family_name (if mentioned)
    3. SCAN FOR EVENTS: Look for event names, descriptions, locations
    4. CREATE RELATIONSHIPS: If a bandit mentions or recommends an event, create a bandit_event relationship
    5. HANDLE REVIEWS: At the end of bandit sections, there may be fake reviews - create user_bandit relationships
    

    IMPORTANT RULES:
    - Only extract information that actually exists in the text
    - If a field is not mentioned, leave it as NULL
    - Do not make up or guess any information
    - Each bandit should be a real person mentioned in the PDF
    - Each event should be a real event mentioned in the PDF
    
    Genre options: 'Food', 'Culture', 'Nightlife', 'Shopping', 'Coffee' (or NULL if unclear)
    Rating: Set to random 1-5 for both bandits and events
    """
    # Extraction orders:
    #
    # - Extract every bandit and event and their details and insert matching rows to the DB.
    # - if any field is missing, print so i can improve the prompt next time
    # - make the proper link rows in the relation tables


    # Set your OpenAI API key from environment variable
    # openai_api_key = os.getenv("OPENAI_API_KEY")
    # if not openai_api_key:
    #     raise ValueError("Missing OpenAI API key. Please check your .env file")
    # os.environ["OPENAI_API_KEY"] = openai_api_key

    # Process the PDF
    pdf_path = "banditsORIG.docx.pdf"

    result = asyncio.run(process_pdf_with_agent(pdf_path, example_prompt))
    print("Processing complete!")
    
    # Print final statistics
    if 'statistics' in result:
        if result['statistics'].get('mode') == 'parse_only':
            print("\n=== PARSE_ONLY MODE ===")
            print("Database operations were skipped.")
            print("Check the logs above to see what would have been inserted.")
            print("========================")
        else:
            print("\n=== FINAL STATISTICS ===")
            print(f"Total bandits: {result['statistics']['total_bandits']}")
            print(f"Total events: {result['statistics']['total_events']}")
            print(f"Unique events: {result['statistics']['unique_events']}")
            print(f"Bandit-event relations: {result['statistics']['total_relations']}")
            print("========================")
    
    print(json.dumps(result, indent=2))