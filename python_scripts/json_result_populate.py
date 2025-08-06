import json
from datetime import datetime
import os
import uuid
from supabase import create_client, Client

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file")



JSON_FILE_PATH = "deepseek_json_20250805_e1a07e.json"  # Path to your JSON file

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_uuid():
    return str(uuid.uuid4())


def get_current_timestamp():
    return datetime.now().isoformat()


def process_data(data):
    """Process the data to ensure all required fields are present"""
    # Generate UUIDs for all entries
    for bandit in data["bandits"]:
        bandit["id"] = generate_uuid()
        bandit["created_at"] = get_current_timestamp()

    for event in data["events"]:
        event["id"] = generate_uuid()
        event["created_at"] = get_current_timestamp()

    for be in data["bandit_events"]:
        be["id"] = generate_uuid()
        be["created_at"] = get_current_timestamp()

    return data


def upload_to_supabase(data):
    """Upload processed data to Supabase tables"""
    try:
        # Upload bandits
        print("Uploading bandits...")
        bandit_result = supabase.table("bandits").insert(data["bandits"]).execute()
        print(f"Uploaded {len(data['bandits'])} bandits")

        # Upload events
        print("Uploading events...")
        event_result = supabase.table("event").insert(data["events"]).execute()
        print(f"Uploaded {len(data['events'])} events")

        # Upload bandit_events
        print("Uploading bandit_events...")
        be_result = supabase.table("bandit_event").insert(data["bandit_events"]).execute()
        print(f"Uploaded {len(data['bandit_events'])} bandit-event relationships")

        return True
    except Exception as e:
        print(f"Error uploading to Supabase: {str(e)}")
        return False


def main():
    # Load JSON data
    try:
        with open(JSON_FILE_PATH, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON file: {str(e)}")
        return

    # Process data (generate UUIDs, timestamps)
    processed_data = process_data(data)

    # Upload to Supabase
    if upload_to_supabase(processed_data):
        print("Data upload completed successfully!")
    else:
        print("Data upload failed")


if __name__ == "__main__":
    main()