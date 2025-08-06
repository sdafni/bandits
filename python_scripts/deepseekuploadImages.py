import json
from supabase import create_client
import PyPDF2
import hashlib


def upload_images(json_data, pdf_path, supabase_url, supabase_key):
    supabase = create_client(supabase_url, supabase_key)
    bucket = "banditsassets"

    # First ensure the bucket exists
    try:
        supabase.storage.create_bucket(bucket, public=True)
    except Exception as e:
        print(f"Bucket exists or error: {e}")

    # Process PDF for images
    image_map = {}
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        for page_num in range(len(pdf.pages)):
            page = pdf.pages[page_num]
            if '/XObject' in page['/Resources']:
                xObjects = page['/Resources']['/XObject'].get_object()
                for obj in xObjects:
                    if xObjects[obj]['/Subtype'] == '/Image':
                        img_data = xObjects[obj].get_data()
                        img_hash = hashlib.md5(img_data).hexdigest()
                        image_map[img_hash] = img_data

    # Upload images and update JSON
    for bandit in json_data['bandits']:
        if 'image_ref' in bandit:
            img_hash = bandit['image_ref'].split('-')[-1]
            if img_hash in image_map:
                url = f"bandits/{bandit['id']}.jpg"
                supabase.storage.from_(bucket).upload(url, image_map[img_hash])
                bandit['image_url'] = url

    for event in json_data['events']:
        if 'image_ref' in event:
            img_hash = event['image_ref'].split('-')[-1]
            if img_hash in image_map:
                url = f"events/{event['id']}_main.jpg"
                supabase.storage.from_(bucket).upload(url, image_map[img_hash])
                event['image_url'] = url

        if 'gallery_refs' in event:
            event['gallery_urls'] = []
            for i, ref in enumerate(event['gallery_refs']):
                img_hash = ref.split('-')[-1]
                if img_hash in image_map:
                    url = f"events/{event['id']}_gallery_{i}.jpg"
                    supabase.storage.from_(bucket).upload(url, image_map[img_hash])
                    event['gallery_urls'].append(url)

    return json_data

# Usage example:
# final_data = upload_images(loaded_json, "file.pdf", SUPABASE_URL, SUPABASE_KEY)
# with open("bandits_with_urls.json", "w") as f:
#     json.dump(final_data, f, indent=2)