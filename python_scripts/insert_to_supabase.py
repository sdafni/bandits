import json
import os
import sys
import uuid
from pathlib import Path
from typing import Dict, Any, List
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file in this directory
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("❌ Error: Supabase credentials not found in .env file")
    sys.exit(1)

def truncate_tables():
    """Truncate all tables before inserting new data"""
    print("🗑️  Truncating existing data...")
    
    tables = ["bandit_event", "event", "bandit"]
    
    for table in tables:
        try:
            # Delete all records from the table using a condition that matches all records
            result = supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print(f"   ✅ Truncated {table} table")
        except Exception as e:
            print(f"   ❌ Error truncating {table}: {str(e)}")

def generate_uuid() -> str:
    """Generate a proper UUID string"""
    return str(uuid.uuid4())

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

def insert_bandits(bandits: List[Dict[str, Any]]) -> List[str]:
    """Insert bandits into Supabase and return their IDs"""
    print(f"👥 Inserting {len(bandits)} bandits...")
    
    inserted_ids = []
    for i, bandit in enumerate(bandits, 1):
        try:
            # Prepare bandit data for insertion with proper UUID
            bandit_data = {
                "id": generate_uuid(),
                "name": bandit.get("name"),
                "age": bandit.get("age"),
                "city": bandit.get("city"),
                "occupation": bandit.get("occupation"),
                "rating": bandit.get("rating", 0),  # Default to 0 if not present
                "image_url": bandit.get("image_url"),
                "description": bandit.get("description"),
                "family_name": bandit.get("family_name")
            }
            
            # Keep all fields as they are
            
            # Insert into Supabase
            result = supabase.table("bandit").insert(bandit_data).execute()
            
            if result.data:
                inserted_ids.append(bandit_data["id"])
                print(f"   ✅ Bandit {i}/{len(bandits)}: {bandit.get('name')}")
            else:
                print(f"   ❌ Failed to insert bandit: {bandit.get('name')}")
                
        except Exception as e:
            print(f"   ❌ Error inserting bandit {bandit.get('name')}: {str(e)}")
    
    print(f"✅ Successfully inserted {len(inserted_ids)} bandits")
    return inserted_ids

def insert_events(events: List[Dict[str, Any]]) -> List[str]:
    """Insert events into Supabase and return their IDs"""
    print(f"🎉 Inserting {len(events)} events...")
    
    inserted_ids = []
    for i, event in enumerate(events, 1):
        try:
            # Prepare event data for insertion with proper UUID
            event_data = {
                "id": generate_uuid(),
                "name": event.get("name"),
                "genre": event.get("genre"),
                "description": event.get("description"),
                "rating": event.get("rating", 0),  # Default to 0 if not present
                "image_url": event.get("image_url"),
                "link": event.get("link"),
                "address": event.get("address"),
                "city": event.get("city"),
                "neighborhood": event.get("neighborhood"),
                "start_time": event.get("start_time") or "2024-01-01T18:00:00Z",  # Default start time if null/None
                "end_time": event.get("end_time") or "2024-01-01T23:00:00Z",  # Default end time if null/None
                "image_gallery": event.get("image_gallery")
            }
            
            # Keep all fields as they are
            
            # Insert into Supabase
            result = supabase.table("event").insert(event_data).execute()
            
            if result.data:
                inserted_ids.append(event_data["id"])
                print(f"   ✅ Event {i}/{len(events)}: {event.get('name')}")
            else:
                print(f"   ❌ Failed to insert event: {event.get('name')}")
                
        except Exception as e:
            print(f"   ❌ Error inserting event {event.get('name')}: {str(e)}")
    
    print(f"✅ Successfully inserted {len(inserted_ids)} events")
    return inserted_ids

def insert_bandit_events(bandit_events: List[Dict[str, Any]], bandit_id_mapping: Dict[str, str], event_id_mapping: Dict[str, str]) -> List[str]:
    """Insert bandit_events into Supabase and return their IDs"""
    print(f"🔗 Inserting {len(bandit_events)} bandit-event relationships...")
    
    inserted_ids = []
    for i, bandit_event in enumerate(bandit_events, 1):
        try:
            # Get the new UUIDs for bandit and event
            old_bandit_id = bandit_event.get("bandit_id")
            old_event_id = bandit_event.get("event_id")
            
            new_bandit_id = bandit_id_mapping.get(old_bandit_id)
            new_event_id = event_id_mapping.get(old_event_id)
            
            if not new_bandit_id or not new_event_id:
                print(f"   ⚠️  Skipping relationship {i}: Missing mapping for bandit_id={old_bandit_id} or event_id={old_event_id}")
                continue
            
            # Prepare bandit_event data for insertion with proper UUID
            bandit_event_data = {
                "id": generate_uuid(),
                "bandit_id": new_bandit_id,
                "event_id": new_event_id,
                "personal_tip": bandit_event.get("personal_tip")
            }
            
            # Keep all fields as they are
            
            # Insert into Supabase
            result = supabase.table("bandit_event").insert(bandit_event_data).execute()
            
            if result.data:
                inserted_ids.append(bandit_event_data["id"])
                print(f"   ✅ Relationship {i}/{len(bandit_events)}: {old_bandit_id} -> {old_event_id}")
            else:
                print(f"   ❌ Failed to insert relationship: {bandit_event.get('id')}")
                
        except Exception as e:
            print(f"   ❌ Error inserting relationship {bandit_event.get('id')}: {str(e)}")
    
    print(f"✅ Successfully inserted {len(inserted_ids)} bandit-event relationships")
    return inserted_ids

def main():
    """Main function to insert data into Supabase"""
    print(f"🔍 Loading combined data from: {INPUT_FILE}")
    data = load_json_file(INPUT_FILE)
    
    # Truncate existing data
    truncate_tables()
    
    print("🚀 Starting Supabase insertion...")
    
    # Create ID mappings for relationships
    bandit_id_mapping = {}
    event_id_mapping = {}
    
    # Insert bandits and create mapping
    bandit_ids = insert_bandits(data.get('bandit', []))
    for i, bandit in enumerate(data.get('bandit', [])):
        if i < len(bandit_ids):
            bandit_id_mapping[bandit.get('id')] = bandit_ids[i]
    
    # Insert events and create mapping
    event_ids = insert_events(data.get('events', []))
    for i, event in enumerate(data.get('events', [])):
        if i < len(event_ids):
            event_id_mapping[event.get('id')] = event_ids[i]
    
    # Insert bandit_events using the mappings
    bandit_event_ids = insert_bandit_events(data.get('bandit_events', []), bandit_id_mapping, event_id_mapping)
    
    # Print final summary
    print("\n📊 Final Summary:")
    print(f"   👥 Bandits inserted: {len(bandit_ids)}")
    print(f"   🎉 Events inserted: {len(event_ids)}")
    print(f"   🔗 Relationships inserted: {len(bandit_event_ids)}")
    print("✅ All data successfully inserted into Supabase!")

# Configuration - Edit these variables as needed
INPUT_FILE = "pdf_output/combined_data.json"

if __name__ == "__main__":
    main() 