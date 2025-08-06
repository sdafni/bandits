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

# LangChain imports
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOllama
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.language_models.chat_models import BaseChatModel

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration flags
DEBUG_MODE = True  # Set to True to enable detailed logging for debugging


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
                        'filename': f"page_{page_num + 1}_img_{img_index}.png",
                        'unique_id': f"img_{page_num + 1}_{img_index}_{uuid.uuid4().hex[:8]}"
                    })
                pix = None
            except Exception as e:
                logger.warning(f"Could not extract image {img_index} from page {page_num + 1}: {e}")

        return images


# Tool Input Models
class ExtractPDFInput(BaseModel):
    pdf_path: str = Field(description="Path to the PDF file to extract content from")


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
        temperature: Model temperature
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
            max_tokens=4000,
            top_p=0.9,
            frequency_penalty=0.1,
            presence_penalty=0.1,
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
            **kwargs
        )

    else:
        raise ValueError(f"Unsupported provider: {provider}. Choose from 'openai', 'deepseek', 'anthropic', 'ollama'")


# Agent Setup
def create_pdf_parsing_agent(
        provider: str = "deepseek",
        model: str = "deepseek-chat",
        temperature: float = 0.3,
        **model_kwargs
):
    """
    Create the LangChain agent for PDF parsing and JSON generation

    Args:
        provider: LLM provider ('openai', 'deepseek', 'anthropic', 'ollama')
        model: Model name specific to the provider
        temperature: Model temperature
        **model_kwargs: Additional model-specific parameters
    """

    # Initialize tools
    tools = [
        ExtractPDFContentTool()
    ]

    # Initialize LLM with specified provider and model
    llm = create_llm(
        provider=provider,
        model=model,
        temperature=temperature,
        **model_kwargs
    )

    logger.info(f"Initialized {provider} model: {model}")

    # Create prompt template with the specific prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a PDF parsing agent that extracts content from PDFs and produces structured JSON output.

Your task is to parse a PDF file containing "bandits" and "events" and produce a structured JSON that can be used to populate a database.

CRITICAL: You must ONLY extract information that actually exists in the PDF content. Do NOT invent or hallucinate any information.

STEP-BY-STEP PROCESS:
1. First, extract all content from the PDF using the extract_pdf_content tool
2. Carefully analyze the extracted text to identify:
   - People/characters (bandits) with their details
   - Events, venues, or activities with their information
3. For each identified entity, extract ONLY the information that is explicitly mentioned
4. Produce a structured JSON with the following format:

{{
  "bandits": [
    {{
      "id": "unique_bandit_id",
      "name": "bandit_name",
      "age": null or age_number,
      "city": null or "city_name",
      "occupation": null or "occupation",
      "image_url": "unique_image_id_for_bandit_image",
      "rating": null or rating_1_to_5,
      "description": null or "description_text",
      "why_follow": null or "why_follow_text",
      "family_name": null or "family_name",
      "icon": null or "icon_identifier"
    }}
  ],
  "events": [
    {{
      "id": "unique_event_id",
      "name": "event_name",
      "genre": null or one of ["Food", "Culture", "Nightlife", "Shopping", "Coffee"],
      "description": null or "event_description",
      "rating": null or rating_1_to_5,
      "image_url": "unique_image_id_for_main_event_image",
      "link": null or "event_link",
      "address": "event_address",
      "city": null or "city_name",
      "neighborhood": null or "neighborhood_name",
      "start_time": null or "start_time",
      "end_time": null or "end_time",
      "location_lat": null,
      "location_lng": null,
      "image_gallery": "comma_separated_unique_image_ids_for_additional_images"
    }}
  ],
  "bandit_events": [
    {{
      "id": "unique_relation_id",
      "bandit_id": "bandit_id",
      "event_id": "event_id",
      "personal_tip": null or "personal_tip_text"
    }}
  ]
}}

IMPORTANT RULES:
- Each bandit section starts with a bandit image, then private details
- Each event section starts with event name and ends with address
- Use unique image IDs based on image location in file (e.g., "img_page_1_0_abc123")
- Leave fields as null if information cannot be inferred
- Don't try to geocode - leave location_lat and location_lng as null
- For genre, try to infer from "category" if exists, or from description line before event list, or from event description
- Keep one name field per event
- Pages don't matter, only bandit sections matter
- Ignore event sections within same bandit - they all belong to same bandit
- Duplicate events should appear once in events list, but can be linked to multiple bandits
- Make all IDs unique for all objects
- Extract all bandits and events from the PDF

ANTI-HALLUCINATION RULES:
- If you cannot find clear evidence of a bandit or event in the text, do NOT create one
- If a field's value is not explicitly mentioned, use null
- Do not infer or assume information that is not directly stated
- When in doubt, prefer null over guessing

Ask for clarification if anything is unclear during the parsing process.
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


# Main execution function
async def parse_pdf_to_json(pdf_path: str):
    """
    Main function to parse PDF and produce structured JSON

    Args:
        pdf_path: Path to the PDF file
    """

    # Create the agent
    agent_executor = create_pdf_parsing_agent()

    # Prepare the input
    input_text = f"""
    Please parse the PDF located at: {pdf_path}

    Extract all bandits and events according to the instructions above.
    Produce a complete, valid JSON structure that can be used to populate a database.
    
    Make sure to:
    1. Extract all content from the PDF first
    2. Identify all bandits and their details
    3. Identify all events and their details
    4. Create proper bandit-event relationships
    5. Use unique image IDs for all images
    6. Return a complete, valid JSON structure
    """

    try:
        # Execute the agent
        result = await agent_executor.ainvoke({"input": input_text})
        return result

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        return {"error": str(e)}





# Example usage
if __name__ == "__main__":
    import asyncio

    # Process the PDF
    pdf_path = "banditsORIG.docx.pdf"

    print("Starting PDF parsing...")
    result = asyncio.run(parse_pdf_to_json(pdf_path))
    
    if 'error' in result:
        print(f"Error: {result['error']}")
    else:
        print("Parsing complete!")
        
        # Try to extract JSON from the result
        try:
            # The result should contain the JSON structure
            print("=== PARSED JSON STRUCTURE ===")
            print(json.dumps(result, indent=2))
            
            # Save the JSON to a file
            output_file = "parsed_data.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"JSON saved to: {output_file}")
            
        except Exception as e:
            print(f"Error processing result: {e}")
            print("Raw result:")
            print(result)


async def test_model_directly():
    """Test the model directly without the agent to see if it's a model or agent issue"""
    print("Testing model directly...")
    
    llm = create_llm(provider="deepseek", model="deepseek-chat", temperature=0.3)
    
    test_prompt = """You are a helpful assistant. Please respond with a simple "Hello, I'm working correctly!" message."""
    
    try:
        response = await llm.ainvoke(test_prompt)
        print("Model response:", response.content)
        return True
    except Exception as e:
        print(f"Model test failed: {e}")
        return False


# Uncomment to test the model directly
# if __name__ == "__main__":
#     asyncio.run(test_model_directly()) 